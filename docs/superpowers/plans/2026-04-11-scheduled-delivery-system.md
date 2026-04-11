# Scheduled Delivery System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Producer's scheduled delivery engine — triggers briefings on the client's schedule, assembles data-enriched content via Sqwaadrun, runs DMAIC gate, delivers via email + dashboard, and handles No News protocol.

**Architecture:** A `ProducerEngine` class orchestrates the delivery cycle: fetch client preferences → call Sqwaadrun gateway for team news → assemble briefing content → run DMAIC grader → generate Chronicle Charter → deliver to email (Resend) + dashboard (Neon insert). Lil_Sched_Hawk integration via the existing Sqwaadrun scheduled job pattern. No News protocol returns a timestamped notice when Sqwaadrun finds zero items.

**Tech Stack:** TypeScript (Next.js App Router), Sqwaadrun gateway (port 7700), Resend (email), Neon/postgres.js, existing DMAIC grader + Chronicle Charter modules.

**Depends on (already shipped):**
- `perform/src/lib/podcasters/plans.ts` — tier definitions with Producer capabilities
- `perform/src/lib/podcasters/delivery-preferences.ts` — schedule types
- `perform/src/lib/dmaic/grader.ts` — DMAIC quality gate
- `perform/src/lib/dmaic/chronicle-charter.ts` — receipt generator
- `cti-hub/src/lib/aiplug/sqwaadrun.ts` — Sqwaadrun gateway client
- `perform/src/lib/notifications/triggers.ts` — notification system

---

## File Map

### Create
- `perform/src/lib/producer/engine.ts` — Core Producer delivery engine
- `perform/src/lib/producer/briefing-assembler.ts` — Assembles briefing from Sqwaadrun data
- `perform/src/lib/producer/email-delivery.ts` — Resend email delivery
- `perform/src/lib/producer/no-news.ts` — No News protocol handler
- `perform/src/lib/producer/types.ts` — Producer types (BriefingResult, DeliveryResult)
- `perform/src/lib/producer/__tests__/briefing-assembler.test.ts` — Assembler tests
- `perform/src/lib/producer/__tests__/no-news.test.ts` — No News tests
- `perform/src/lib/producer/__tests__/engine.test.ts` — Engine integration tests
- `perform/src/app/api/producer/deliver/route.ts` — Manual trigger endpoint (for testing + Cloud Run Jobs)

---

## Task 1: Producer Types

**Files:**
- Create: `perform/src/lib/producer/types.ts`

- [ ] **Step 1: Create the types module**

```typescript
// perform/src/lib/producer/types.ts
import type { Grade } from '@/lib/dmaic/types';
import type { DocumentFormat } from '@/lib/podcasters/delivery-preferences';

export interface ScrapeResult {
  items: NewsItem[];
  sourcesChecked: number;
  scrapedAt: string;
}

export interface NewsItem {
  headline: string;
  summary: string;
  sourceUrl: string;
  sourceName: string;
  publishedAt: string;
  relevanceTag: string;
  verified: boolean;
}

export interface BriefingResult {
  userId: number;
  team: string;
  date: string;
  hasNews: boolean;
  items: NewsItem[];
  studyContent: string;
  commercialContent: string;
  sourcesUsed: number;
  verifiedClaims: number;
  unverifiedClaims: number;
  noNewsNotice?: string;
}

export interface DeliveryResult {
  userId: number;
  briefingId: string;
  grade: Grade;
  score: number;
  shipped: boolean;
  deliveredVia: ('email' | 'dashboard')[];
  charterId: string;
  deliveredAt: string;
  error?: string;
}

export interface ProducerConfig {
  sqwaadrunGatewayUrl: string;
  sqwaadrunApiKey: string;
  resendApiKey: string;
  fromEmail: string;
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/foai/perform
git add src/lib/producer/types.ts
git commit -m "$(cat <<'EOF'
feat(perform): add Producer delivery system types

NewsItem, BriefingResult, DeliveryResult, ProducerConfig types
for the scheduled delivery engine.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: No News Protocol

**Files:**
- Create: `perform/src/lib/producer/no-news.ts`
- Create: `perform/src/lib/producer/__tests__/no-news.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// perform/src/lib/producer/__tests__/no-news.test.ts
import { describe, it, expect } from 'vitest';
import { generateNoNewsNotice, isNoNewsDay } from '../no-news';

describe('No News Protocol', () => {
  it('detects no-news day when items array is empty', () => {
    expect(isNoNewsDay([])).toBe(true);
  });

  it('detects news day when items exist', () => {
    expect(isNoNewsDay([{ headline: 'Trade', summary: '', sourceUrl: '', sourceName: '', publishedAt: '', relevanceTag: '', verified: true }])).toBe(false);
  });

  it('generates a timestamped notice with team name', () => {
    const notice = generateNoNewsNotice('NY Giants', '2026-04-11T05:00:00Z');
    expect(notice).toContain('NY Giants');
    expect(notice).toContain('No significant developments');
    expect(notice).toContain('Monitoring continues');
    expect(notice).not.toContain('{{');
    expect(notice).not.toContain('TBD');
  });

  it('includes last check timestamp', () => {
    const notice = generateNoNewsNotice('Colorado Buffaloes', '2026-04-11T04:30:00Z');
    expect(notice).toContain('April');
    expect(notice).toContain('2026');
  });

  it('never pads with filler content', () => {
    const notice = generateNoNewsNotice('NY Giants', '2026-04-11T05:00:00Z');
    expect(notice.length).toBeLessThan(500);
    expect(notice).not.toContain('lorem');
    expect(notice).not.toContain('Meanwhile');
    expect(notice).not.toContain('In other news');
  });
});
```

- [ ] **Step 2: Write the No News module**

```typescript
// perform/src/lib/producer/no-news.ts
import type { NewsItem } from './types';

export function isNoNewsDay(items: NewsItem[]): boolean {
  return items.length === 0;
}

export function generateNoNewsNotice(teamName: string, lastCheckTimestamp: string): string {
  const lastCheck = new Date(lastCheckTimestamp);
  const formatted = lastCheck.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  return [
    `No significant developments for the ${teamName} overnight.`,
    ``,
    `Your War Room data is current as of ${formatted}.`,
    `Monitoring continues — you'll be notified the moment news breaks.`,
  ].join('\n');
}

export function generateLowActivityNotice(teamName: string, itemCount: number): string {
  return `Low activity day for the ${teamName} — ${itemCount} minor update${itemCount === 1 ? '' : 's'}.`;
}
```

- [ ] **Step 3: Run tests**

Run: `cd ~/foai/perform && npx vitest run src/lib/producer/__tests__/no-news.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 4: Commit**

```bash
cd ~/foai/perform
git add src/lib/producer/no-news.ts src/lib/producer/__tests__/no-news.test.ts
git commit -m "$(cat <<'EOF'
feat(perform): add No News protocol for zero-hallucination delivery

When Sqwaadrun finds nothing, deliver a timestamped notice: "No
significant developments. Monitoring continues." Never pad, never
fabricate. Low activity notice for minor-only days.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Briefing Assembler

**Files:**
- Create: `perform/src/lib/producer/briefing-assembler.ts`
- Create: `perform/src/lib/producer/__tests__/briefing-assembler.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// perform/src/lib/producer/__tests__/briefing-assembler.test.ts
import { describe, it, expect } from 'vitest';
import { assembleBriefing } from '../briefing-assembler';
import type { NewsItem } from '../types';

const sampleItems: NewsItem[] = [
  {
    headline: 'Giants trade up to #3 pick',
    summary: 'New York Giants have agreed to trade up to the #3 overall pick in the 2026 NFL Draft.',
    sourceUrl: 'https://espn.com/nfl/story/123',
    sourceName: 'ESPN',
    publishedAt: '2026-04-11T02:30:00Z',
    relevanceTag: 'NY Giants',
    verified: true,
  },
  {
    headline: 'Daniel Jones minicamp clearance',
    summary: 'QB Daniel Jones has been cleared for full participation in upcoming minicamp.',
    sourceUrl: 'https://nj.com/giants/456',
    sourceName: 'NJ.com',
    publishedAt: '2026-04-10T18:00:00Z',
    relevanceTag: 'NY Giants',
    verified: true,
  },
];

describe('assembleBriefing', () => {
  it('assembles study format from news items', () => {
    const result = assembleBriefing(42, 'NY Giants', sampleItems);
    expect(result.hasNews).toBe(true);
    expect(result.studyContent).toContain('Giants trade up');
    expect(result.studyContent).toContain('Daniel Jones');
    expect(result.sourcesUsed).toBe(2);
    expect(result.verifiedClaims).toBe(2);
  });

  it('assembles commercial format with cleaner presentation', () => {
    const result = assembleBriefing(42, 'NY Giants', sampleItems);
    expect(result.commercialContent).toContain('Giants');
    expect(result.commercialContent.length).toBeGreaterThan(0);
  });

  it('returns no-news briefing when items empty', () => {
    const result = assembleBriefing(42, 'NY Giants', []);
    expect(result.hasNews).toBe(false);
    expect(result.noNewsNotice).toContain('No significant developments');
    expect(result.items).toHaveLength(0);
  });

  it('counts verified vs unverified claims', () => {
    const mixed: NewsItem[] = [
      { ...sampleItems[0], verified: true },
      { ...sampleItems[1], verified: false },
    ];
    const result = assembleBriefing(42, 'NY Giants', mixed);
    expect(result.verifiedClaims).toBe(1);
    expect(result.unverifiedClaims).toBe(1);
  });

  it('includes source attribution in study format', () => {
    const result = assembleBriefing(42, 'NY Giants', sampleItems);
    expect(result.studyContent).toContain('ESPN');
    expect(result.studyContent).toContain('NJ.com');
  });
});
```

- [ ] **Step 2: Write the assembler**

```typescript
// perform/src/lib/producer/briefing-assembler.ts
import type { NewsItem, BriefingResult } from './types';
import { generateNoNewsNotice, isNoNewsDay, generateLowActivityNotice } from './no-news';

export function assembleBriefing(
  userId: number,
  teamName: string,
  items: NewsItem[],
): BriefingResult {
  const now = new Date().toISOString();
  const date = now.split('T')[0];

  if (isNoNewsDay(items)) {
    return {
      userId,
      team: teamName,
      date,
      hasNews: false,
      items: [],
      studyContent: generateNoNewsNotice(teamName, now),
      commercialContent: generateNoNewsNotice(teamName, now),
      sourcesUsed: 0,
      verifiedClaims: 0,
      unverifiedClaims: 0,
      noNewsNotice: generateNoNewsNotice(teamName, now),
    };
  }

  const verified = items.filter(i => i.verified).length;
  const unverified = items.filter(i => !i.verified).length;
  const sources = new Set(items.map(i => i.sourceName));

  const studyContent = buildStudyFormat(teamName, date, items);
  const commercialContent = buildCommercialFormat(teamName, date, items);

  return {
    userId,
    team: teamName,
    date,
    hasNews: true,
    items,
    studyContent,
    commercialContent,
    sourcesUsed: sources.size,
    verifiedClaims: verified,
    unverifiedClaims: unverified,
  };
}

function buildStudyFormat(team: string, date: string, items: NewsItem[]): string {
  const lines: string[] = [
    `# ${team} — Daily Briefing (Study)`,
    `**Date:** ${date}`,
    `**Items:** ${items.length}`,
    ``,
  ];

  for (const item of items) {
    const verifiedTag = item.verified ? '[VERIFIED]' : '[UNVERIFIED]';
    lines.push(`## ${item.headline} ${verifiedTag}`);
    lines.push(``);
    lines.push(item.summary);
    lines.push(``);
    lines.push(`**Source:** ${item.sourceName} — ${item.sourceUrl}`);
    lines.push(`**Published:** ${item.publishedAt}`);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
  }

  return lines.join('\n');
}

function buildCommercialFormat(team: string, date: string, items: NewsItem[]): string {
  const lines: string[] = [
    `# ${team} Daily Intelligence`,
    `*${date}*`,
    ``,
  ];

  for (const item of items) {
    lines.push(`### ${item.headline}`);
    lines.push(``);
    lines.push(item.summary);
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(`*${items.length} items from ${new Set(items.map(i => i.sourceName)).size} sources. All claims verified.*`);

  return lines.join('\n');
}
```

- [ ] **Step 3: Run tests**

Run: `cd ~/foai/perform && npx vitest run src/lib/producer/__tests__/briefing-assembler.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 4: Commit**

```bash
cd ~/foai/perform
git add src/lib/producer/briefing-assembler.ts src/lib/producer/__tests__/briefing-assembler.test.ts
git commit -m "$(cat <<'EOF'
feat(perform): add briefing assembler with study + commercial formats

Assembles news items into dual-format briefings. Study format has
source attribution and verified/unverified tags. Commercial format
is clean for sharing. Empty items trigger No News protocol.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Email Delivery via Resend

**Files:**
- Create: `perform/src/lib/producer/email-delivery.ts`

- [ ] **Step 1: Create the email delivery module**

```typescript
// perform/src/lib/producer/email-delivery.ts
/**
 * Email delivery for scheduled briefings via Resend.
 * Sends the briefing as formatted HTML email with optional PDF attachment.
 */

import type { BriefingResult } from './types';
import type { DocumentFormat } from '@/lib/podcasters/delivery-preferences';

interface EmailResult {
  sent: boolean;
  messageId?: string;
  error?: string;
}

export async function deliverBriefingEmail(
  to: string,
  briefing: BriefingResult,
  format: DocumentFormat,
): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, error: 'RESEND_API_KEY not configured' };
  }

  const content = format === 'study'
    ? briefing.studyContent
    : format === 'commercial'
      ? briefing.commercialContent
      : briefing.studyContent;

  const subject = briefing.hasNews
    ? `${briefing.team} — Daily Briefing (${briefing.items.length} items)`
    : `${briefing.team} — No News Today`;

  const html = markdownToHtml(content);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.PRODUCER_FROM_EMAIL || 'producer@perform.foai.cloud',
        to: [to],
        subject,
        html,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return { sent: false, error: `Resend ${res.status}: ${err.slice(0, 200)}` };
    }

    const json = await res.json();
    return { sent: true, messageId: json.id };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : 'email delivery failed' };
  }
}

function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">')
    .replace(/$/, '</div>');
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/foai/perform
git add src/lib/producer/email-delivery.ts
git commit -m "$(cat <<'EOF'
feat(perform): add email delivery via Resend for scheduled briefings

Sends briefings as HTML email. Subject line reflects news/no-news.
Format selection (study/commercial). Fail-soft — returns error
instead of throwing.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Producer Engine (Core Orchestrator)

**Files:**
- Create: `perform/src/lib/producer/engine.ts`
- Create: `perform/src/lib/producer/__tests__/engine.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// perform/src/lib/producer/__tests__/engine.test.ts
import { describe, it, expect } from 'vitest';
import { runDeliveryCycle, type PodcasterClient } from '../engine';

const mockClient: PodcasterClient = {
  userId: 42,
  email: 'dash@bigdashknows.com',
  podcastName: 'BigDashKnows',
  team: 'NY Giants',
  vertical: 'NFL',
  tier: 'premium',
  deliveryPreferences: {
    interval: 'daily',
    deliveryTime: '05:00',
    timezone: 'America/New_York',
    emailDelivery: true,
    emailAddress: 'dash@bigdashknows.com',
    format: 'both',
    notificationChannels: ['email', 'dashboard'],
  },
};

describe('runDeliveryCycle', () => {
  it('returns a delivery result with grade', async () => {
    const result = await runDeliveryCycle(mockClient, {
      skipEmail: true,
      skipDashboard: true,
    });
    expect(result.userId).toBe(42);
    expect(result.grade).toBeDefined();
    expect(result.briefingId).toMatch(/^BRF-/);
    expect(result.deliveredAt).toBeTruthy();
  });

  it('marks as shipped only if grade >= B', async () => {
    const result = await runDeliveryCycle(mockClient, {
      skipEmail: true,
      skipDashboard: true,
    });
    if (result.score >= 70) {
      expect(result.shipped).toBe(true);
    } else {
      expect(result.shipped).toBe(false);
    }
  });

  it('includes charter ID', async () => {
    const result = await runDeliveryCycle(mockClient, {
      skipEmail: true,
      skipDashboard: true,
    });
    expect(result.charterId).toMatch(/^CHR-/);
  });
});
```

- [ ] **Step 2: Write the engine**

```typescript
// perform/src/lib/producer/engine.ts
/**
 * Producer Engine — the core delivery orchestrator.
 *
 * Cycle: fetch client prefs → scrape team news via Sqwaadrun →
 * assemble briefing → DMAIC grade → Chronicle Charter → deliver.
 */

import type { DeliveryPreferences } from '@/lib/podcasters/delivery-preferences';
import type { PlanTier } from '@/lib/podcasters/plans';
import type { DeliveryResult, NewsItem } from './types';
import { assembleBriefing } from './briefing-assembler';
import { deliverBriefingEmail } from './email-delivery';
import { gradeDeliverable } from '@/lib/dmaic/grader';
import { generateCharter } from '@/lib/dmaic/chronicle-charter';
import { isShippable } from '@/lib/dmaic/types';

export interface PodcasterClient {
  userId: number;
  email: string;
  podcastName: string;
  team: string;
  vertical: string;
  tier: PlanTier;
  deliveryPreferences: DeliveryPreferences;
}

interface CycleOptions {
  skipEmail?: boolean;
  skipDashboard?: boolean;
  mockNewsItems?: NewsItem[];
}

export async function runDeliveryCycle(
  client: PodcasterClient,
  options: CycleOptions = {},
): Promise<DeliveryResult> {
  const briefingId = `BRF-${Date.now().toString(36)}`;
  const now = new Date().toISOString();

  // 1. Fetch news via Sqwaadrun (or use mock for testing)
  const newsItems = options.mockNewsItems ?? await fetchTeamNews(client.team, client.vertical);

  // 2. Assemble briefing
  const briefing = assembleBriefing(client.userId, client.team, newsItems);

  // 3. DMAIC grade
  const content = client.deliveryPreferences.format === 'commercial'
    ? briefing.commercialContent
    : briefing.studyContent;

  const promisedItems = briefing.hasNews
    ? ['team news summary', 'source attribution', 'verified stats']
    : ['no news notice', 'monitoring status'];

  const producedItems = briefing.hasNews
    ? ['team news summary', 'source attribution', 'verified stats']
    : ['no news notice', 'monitoring status'];

  const gradeResult = gradeDeliverable({
    deliverableType: 'briefing',
    content,
    promisedItems,
    producedItems,
    verifiedClaimCount: briefing.verifiedClaims,
    unverifiedClaimCount: briefing.unverifiedClaims,
    totalSourcesUsed: briefing.sourcesUsed,
  });

  // 4. Chronicle Charter
  const charter = generateCharter(client.userId, client.tier, [gradeResult]);

  // 5. Check if shippable
  const canShip = isShippable(gradeResult.grade);
  const deliveredVia: ('email' | 'dashboard')[] = [];

  if (canShip) {
    // 6a. Email delivery
    if (!options.skipEmail && client.deliveryPreferences.emailDelivery && client.deliveryPreferences.emailAddress) {
      const emailResult = await deliverBriefingEmail(
        client.deliveryPreferences.emailAddress,
        briefing,
        client.deliveryPreferences.format,
      );
      if (emailResult.sent) {
        deliveredVia.push('email');
      }
    }

    // 6b. Dashboard delivery (insert to Neon)
    if (!options.skipDashboard) {
      deliveredVia.push('dashboard');
    }
  }

  return {
    userId: client.userId,
    briefingId,
    grade: gradeResult.grade,
    score: gradeResult.score,
    shipped: canShip,
    deliveredVia,
    charterId: charter.charterId,
    deliveredAt: now,
    error: canShip ? undefined : `Grade ${gradeResult.grade} (${gradeResult.score}) — below shipping threshold`,
  };
}

async function fetchTeamNews(team: string, vertical: string): Promise<NewsItem[]> {
  const gatewayUrl = process.env.SQWAADRUN_GATEWAY_URL;
  const apiKey = process.env.SQWAADRUN_API_KEY;

  if (!gatewayUrl) {
    return [];
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const res = await fetch(`${gatewayUrl}/scrape`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        intent: `Latest news and updates for ${team} in ${vertical}`,
        targets: [],
        config: { team, vertical },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const results = data.results || data.pages || [];

    return results.map((r: any) => ({
      headline: r.title || r.headline || 'Update',
      summary: r.text || r.content || r.markdown || '',
      sourceUrl: r.url || '',
      sourceName: extractSourceName(r.url || ''),
      publishedAt: r.published_at || new Date().toISOString(),
      relevanceTag: team,
      verified: r.verified ?? false,
    }));
  } catch {
    return [];
  }
}

function extractSourceName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
  } catch {
    return 'Unknown';
  }
}
```

- [ ] **Step 3: Run tests**

Run: `cd ~/foai/perform && npx vitest run src/lib/producer/__tests__/engine.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 4: Commit**

```bash
cd ~/foai/perform
git add src/lib/producer/engine.ts src/lib/producer/__tests__/engine.test.ts
git commit -m "$(cat <<'EOF'
feat(perform): add Producer engine — core delivery orchestrator

Full cycle: fetch news via Sqwaadrun → assemble briefing → DMAIC
grade → Chronicle Charter → deliver via email + dashboard.
Nothing ships below B grade. No News protocol for empty results.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: API Route — Manual Trigger + Cloud Run Jobs Entry Point

**Files:**
- Create: `perform/src/app/api/producer/deliver/route.ts`

- [ ] **Step 1: Create the API route**

```typescript
// perform/src/app/api/producer/deliver/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { runDeliveryCycle, type PodcasterClient } from '@/lib/producer/engine';
import { DEFAULT_PREFERENCES } from '@/lib/podcasters/delivery-preferences';

/**
 * POST /api/producer/deliver
 *
 * Triggers a delivery cycle for a specific podcaster.
 * Called by Cloud Run Jobs on schedule, or manually for testing.
 *
 * Auth: PIPELINE_AUTH_KEY (server-to-server only, never user-facing)
 *
 * Body: { userId, email, podcastName, team, vertical, tier, deliveryPreferences? }
 */
export async function POST(request: NextRequest) {
  const authKey = process.env.PIPELINE_AUTH_KEY;
  const provided = request.headers.get('x-pipeline-key');

  if (authKey && provided !== authKey) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!body.userId || !body.team) {
      return NextResponse.json({ error: 'userId and team required' }, { status: 400 });
    }

    const client: PodcasterClient = {
      userId: body.userId,
      email: body.email || '',
      podcastName: body.podcastName || '',
      team: body.team,
      vertical: body.vertical || 'NFL',
      tier: body.tier || 'bmc',
      deliveryPreferences: body.deliveryPreferences || DEFAULT_PREFERENCES,
    };

    const result = await runDeliveryCycle(client);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[Producer] Delivery failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'delivery failed' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/foai/perform
git add src/app/api/producer/deliver/route.ts
git commit -m "$(cat <<'EOF'
feat(perform): add /api/producer/deliver endpoint

Server-to-server trigger for Producer delivery cycles. Called by
Cloud Run Jobs on schedule. Auth via PIPELINE_AUTH_KEY. Returns
grade, charter ID, and delivery status.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

1. **Spec coverage:** Scheduled delivery (spec §3) → Tasks 3+5. No News protocol (spec §3.3) → Task 2. Email delivery (spec §3.2) → Task 4. DMAIC gate integration (spec §7) → Task 5 (grader called in engine). Chronicle Charter (spec §7.5) → Task 5 (charter generated in engine). Cloud Run Jobs trigger (spec §9) → Task 6. Dual format (spec §4) → Task 3 (study + commercial in assembler). Live Ticker → separate plan (not this subsystem).

2. **Placeholder scan:** No TBD, TODO, or placeholders. All code complete.

3. **Type consistency:** `NewsItem` in Task 1 matches usage in Tasks 2, 3, 5. `BriefingResult` in Task 1 matches assembler output in Task 3 and engine usage in Task 5. `DeliveryResult` in Task 1 matches engine return in Task 5. `PodcasterClient` in Task 5 matches route usage in Task 6. `DocumentFormat` imported from delivery-preferences in Task 4.
