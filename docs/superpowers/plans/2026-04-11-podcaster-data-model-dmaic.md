# Podcaster Data Model + DMAIC Quality Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the podcaster data model to remove the free tier, add delivery preferences + dual-channel pricing + DMAIC tracking, and build the quality gate that grades every deliverable before it reaches the client.

**Architecture:** Extends existing `perform/src/lib/podcasters/plans.ts` and `perform/migrations/004_podcaster_tables.sql` with new fields. Creates a new `perform/src/lib/dmaic/` module that grades deliverables against tier promises. The DMAIC gate runs as a pure function — input is a deliverable + tier definition, output is a grade (S/A/B/C/D) + pass/fail + issues list. Chronicle Charter is a formatted receipt document generated after grading.

**Tech Stack:** TypeScript (Next.js App Router), PostgreSQL/Neon via postgres.js, Vitest for tests.

**Depends on (already shipped):**
- `perform/src/lib/podcasters/plans.ts` — tier definitions (needs update)
- `perform/migrations/004_podcaster_tables.sql` — base schema (needs extension)
- `perform/src/lib/analysts/personas.ts` — analyst definitions (read-only reference)

---

## File Map

### Create
- `perform/src/lib/podcasters/pricing.ts` — Dual-channel pricing (one-off + monthly per tier)
- `perform/src/lib/podcasters/delivery-preferences.ts` — Delivery schedule types + defaults
- `perform/src/lib/dmaic/grader.ts` — DMAIC quality gate engine
- `perform/src/lib/dmaic/formatting-checks.ts` — Zero-tolerance formatting scanner
- `perform/src/lib/dmaic/chronicle-charter.ts` — Charter receipt generator
- `perform/src/lib/dmaic/types.ts` — Grade, DeliverableAudit, ChronicleCharter types
- `perform/src/lib/dmaic/__tests__/grader.test.ts` — Grader tests
- `perform/src/lib/dmaic/__tests__/formatting-checks.test.ts` — Formatting scanner tests
- `perform/src/lib/dmaic/__tests__/chronicle-charter.test.ts` — Charter tests
- `perform/migrations/007_podcaster_delivery_dmaic.sql` — Schema extension

### Modify
- `perform/src/lib/podcasters/plans.ts` — Remove free tier, add delivery + pricing fields
- `perform/migrations/004_podcaster_tables.sql` — Change default from 'free' to 'bmc'

---

## Task 1: Remove Free Tier + Update Plan Definitions

**Files:**
- Modify: `perform/src/lib/podcasters/plans.ts`

- [ ] **Step 1: Read current plans.ts to confirm state**

Run: `head -102 ~/foai/perform/src/lib/podcasters/plans.ts`
Expected: See the `free` tier in `PlanTier` union and `PLAN_FEATURES`

- [ ] **Step 2: Update PlanTier type — remove 'free'**

In `perform/src/lib/podcasters/plans.ts`, replace:

```typescript
export type PlanTier = 'free' | 'bmc' | 'premium' | 'bucket_list' | 'lfg';
```

with:

```typescript
export type PlanTier = 'bmc' | 'premium' | 'bucket_list' | 'lfg';
```

- [ ] **Step 3: Remove the free tier from PLAN_FEATURES**

Remove the entire `free` block from the `PLAN_FEATURES` record:

```typescript
  free: {
    name: 'Free Trial',
    description: 'Explore the War Room — see what your team data looks like.',
    warRoom: true,
    workbench: false,
    distribution: false,
    customHawks: false,
    whiteLabel: false,
    maxScriptsPerMonth: 0,
    maxClipsPerMonth: 0,
    hawkScrapesPerMonth: 0,
  },
```

- [ ] **Step 4: Update BMC description**

Replace the BMC entry:

```typescript
  bmc: {
    name: 'BMC',
    description: 'War Room + Workbench. Write scripts, prep shows.',
    warRoom: true,
    workbench: true,
    distribution: false,
    customHawks: false,
    whiteLabel: false,
    maxScriptsPerMonth: 20,
    maxClipsPerMonth: 10,
    hawkScrapesPerMonth: 0,
  },
```

with:

```typescript
  bmc: {
    name: 'BMC',
    description: 'War Room access. 1 episode package per cycle. Token-based extras.',
    warRoom: true,
    workbench: true,
    distribution: false,
    customHawks: false,
    whiteLabel: false,
    maxScriptsPerMonth: 5,
    maxClipsPerMonth: 3,
    maxEpisodePackages: 1,
    hawkScrapesPerMonth: 0,
    dailyBriefing: false,
    guestResearch: false,
    sponsorScan: false,
    clipsPerEpisode: 0,
  },
```

- [ ] **Step 5: Update PlanConfig interface to include new fields**

Replace the `PlanConfig` interface:

```typescript
export interface PlanConfig {
  name: string;
  description: string;
  warRoom: boolean;
  workbench: boolean;
  distribution: boolean;
  customHawks: boolean;
  whiteLabel: boolean;
  maxScriptsPerMonth: number;
  maxClipsPerMonth: number;
  hawkScrapesPerMonth: number;
}
```

with:

```typescript
export interface PlanConfig {
  name: string;
  description: string;
  warRoom: boolean;
  workbench: boolean;
  distribution: boolean;
  customHawks: boolean;
  whiteLabel: boolean;
  maxScriptsPerMonth: number;
  maxClipsPerMonth: number;
  maxEpisodePackages: number;
  hawkScrapesPerMonth: number;
  dailyBriefing: boolean;
  guestResearch: boolean;
  sponsorScan: boolean;
  clipsPerEpisode: number;
}
```

- [ ] **Step 6: Update Premium, Bucket List, and LFG tiers with new fields**

```typescript
  premium: {
    name: 'Premium',
    description: 'Full production pipeline. Daily briefing. 3 clips per episode.',
    warRoom: true,
    workbench: true,
    distribution: true,
    customHawks: false,
    whiteLabel: false,
    maxScriptsPerMonth: 100,
    maxClipsPerMonth: 50,
    maxEpisodePackages: 4,
    hawkScrapesPerMonth: 0,
    dailyBriefing: true,
    guestResearch: false,
    sponsorScan: false,
    clipsPerEpisode: 3,
  },
  bucket_list: {
    name: 'Bucket List',
    description: 'Everything + guest research, analytics, sponsor scan. 5 clips per episode.',
    warRoom: true,
    workbench: true,
    distribution: true,
    customHawks: true,
    whiteLabel: false,
    maxScriptsPerMonth: -1,
    maxClipsPerMonth: -1,
    maxEpisodePackages: 8,
    hawkScrapesPerMonth: 50,
    dailyBriefing: true,
    guestResearch: true,
    sponsorScan: true,
    clipsPerEpisode: 5,
  },
  lfg: {
    name: 'LFG',
    description: 'Unlimited. White-label. Custom data feeds. API access.',
    warRoom: true,
    workbench: true,
    distribution: true,
    customHawks: true,
    whiteLabel: true,
    maxScriptsPerMonth: -1,
    maxClipsPerMonth: -1,
    maxEpisodePackages: -1,
    hawkScrapesPerMonth: -1,
    dailyBriefing: true,
    guestResearch: true,
    sponsorScan: true,
    clipsPerEpisode: -1,
  },
```

- [ ] **Step 7: Update fallback in getPlanConfig**

Replace:

```typescript
export function getPlanConfig(tier: PlanTier): PlanConfig {
  return PLAN_FEATURES[tier] || PLAN_FEATURES.free;
}
```

with:

```typescript
export function getPlanConfig(tier: PlanTier): PlanConfig {
  return PLAN_FEATURES[tier] || PLAN_FEATURES.bmc;
}
```

- [ ] **Step 8: Verify TypeScript compiles**

Run: `cd ~/foai/perform && npx tsc --noEmit src/lib/podcasters/plans.ts`
Expected: No errors

- [ ] **Step 9: Commit**

```bash
cd ~/foai/perform
git add src/lib/podcasters/plans.ts
git commit -m "$(cat <<'EOF'
feat(perform): remove free tier, add Producer capabilities to plan config

Nothing is free — BMC $7 entry is the floor. Added maxEpisodePackages,
dailyBriefing, guestResearch, sponsorScan, clipsPerEpisode fields
to PlanConfig. Fallback changed from free to bmc.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Dual-Channel Pricing Module

**Files:**
- Create: `perform/src/lib/podcasters/pricing.ts`

- [ ] **Step 1: Create the pricing module**

```typescript
// perform/src/lib/podcasters/pricing.ts
/**
 * Dual-channel pricing: One-off (Fiverr) and Monthly (Direct).
 * One-off is ~2.5-3x monthly — the no-commitment premium.
 */

import type { PlanTier } from './plans';

export interface TierPricing {
  tier: PlanTier;
  oneOff: number;    // Fiverr gig price (USD)
  monthly: number;   // Direct subscription (USD/mo)
  tokenPackage: number; // Starting tokens (BMC only, 0 for subscription tiers)
}

export const TIER_PRICING: Record<PlanTier, TierPricing> = {
  bmc: {
    tier: 'bmc',
    oneOff: 15,
    monthly: 7,
    tokenPackage: 50000,
  },
  premium: {
    tier: 'premium',
    oneOff: 97,
    monthly: 47,
    tokenPackage: 0,
  },
  bucket_list: {
    tier: 'bucket_list',
    oneOff: 197,
    monthly: 87,
    tokenPackage: 0,
  },
  lfg: {
    tier: 'lfg',
    oneOff: 347,
    monthly: 147,
    tokenPackage: 0,
  },
};

export type SalesChannel = 'fiverr' | 'direct';

export function getPriceForChannel(tier: PlanTier, channel: SalesChannel): number {
  const pricing = TIER_PRICING[tier];
  if (!pricing) return 0;
  return channel === 'fiverr' ? pricing.oneOff : pricing.monthly;
}

export function getOneOffMarkup(tier: PlanTier): number {
  const pricing = TIER_PRICING[tier];
  if (!pricing || pricing.monthly === 0) return 0;
  return Math.round((pricing.oneOff / pricing.monthly) * 10) / 10;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd ~/foai/perform && npx tsc --noEmit src/lib/podcasters/pricing.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd ~/foai/perform
git add src/lib/podcasters/pricing.ts
git commit -m "$(cat <<'EOF'
feat(perform): add dual-channel pricing for podcasters

One-off (Fiverr) at 2.5-3x premium. Monthly (direct) at base rate.
BMC $15/$7, Premium $97/$47, Bucket List $197/$87, LFG $347/$147.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Delivery Preferences Module

**Files:**
- Create: `perform/src/lib/podcasters/delivery-preferences.ts`

- [ ] **Step 1: Create the delivery preferences module**

```typescript
// perform/src/lib/podcasters/delivery-preferences.ts
/**
 * Client delivery schedule and format preferences.
 * Set during onboarding (Stepper), stored on podcaster_users row.
 */

export type DeliveryInterval = 'daily' | 'weekly' | 'per_episode' | 'custom';
export type DocumentFormat = 'study' | 'commercial' | 'both';
export type NotificationChannel = 'email' | 'dashboard' | 'webhook';

export interface DeliveryPreferences {
  interval: DeliveryInterval;
  deliveryTime: string;           // HH:MM in 24hr format, e.g. "05:00"
  timezone: string;               // IANA timezone, e.g. "America/New_York"
  emailDelivery: boolean;
  emailAddress: string;
  format: DocumentFormat;
  notificationChannels: NotificationChannel[];
  customCron?: string;            // Only when interval === 'custom'
}

export const DEFAULT_PREFERENCES: DeliveryPreferences = {
  interval: 'daily',
  deliveryTime: '05:00',
  timezone: 'America/New_York',
  emailDelivery: true,
  emailAddress: '',
  format: 'both',
  notificationChannels: ['email', 'dashboard'],
};

export function validatePreferences(prefs: Partial<DeliveryPreferences>): string[] {
  const errors: string[] = [];

  if (prefs.deliveryTime && !/^\d{2}:\d{2}$/.test(prefs.deliveryTime)) {
    errors.push('deliveryTime must be HH:MM format');
  }

  if (prefs.emailDelivery && !prefs.emailAddress) {
    errors.push('emailAddress required when emailDelivery is true');
  }

  if (prefs.interval === 'custom' && !prefs.customCron) {
    errors.push('customCron required when interval is custom');
  }

  return errors;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd ~/foai/perform && npx tsc --noEmit src/lib/podcasters/delivery-preferences.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd ~/foai/perform
git add src/lib/podcasters/delivery-preferences.ts
git commit -m "$(cat <<'EOF'
feat(perform): add delivery preferences for podcaster scheduled delivery

Interval (daily/weekly/per_episode/custom), delivery time, timezone,
email toggle, format (study/commercial/both), notification channels.
Default: daily 5AM ET, both formats, email + dashboard.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: DMAIC Types

**Files:**
- Create: `perform/src/lib/dmaic/types.ts`

- [ ] **Step 1: Create the DMAIC types module**

```typescript
// perform/src/lib/dmaic/types.ts
/**
 * DMAIC Quality Gate types for Per|Form deliverable grading.
 * Every deliverable — one-off or monthly — is graded before delivery.
 */

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D';

export interface GradeThreshold {
  grade: Grade;
  minScore: number;
  action: 'ship' | 'ship_with_note' | 'hold_and_improve' | 'escalate';
}

export const GRADE_THRESHOLDS: GradeThreshold[] = [
  { grade: 'S', minScore: 95, action: 'ship' },
  { grade: 'A', minScore: 85, action: 'ship' },
  { grade: 'B', minScore: 70, action: 'ship_with_note' },
  { grade: 'C', minScore: 55, action: 'hold_and_improve' },
  { grade: 'D', minScore: 0,  action: 'escalate' },
];

export type DeliverableType =
  | 'briefing'
  | 'show_notes'
  | 'social_clip'
  | 'episode_package'
  | 'guest_research'
  | 'analytics_digest'
  | 'sponsor_scan';

export interface DeliverableAudit {
  deliverableId: string;
  deliverableType: DeliverableType;
  userId: number;
  tierAtDelivery: string;

  // DMAIC phases
  defined: {
    promisedItems: string[];
    qualityMetrics: string[];
  };
  measured: {
    producedItems: string[];
    completenessScore: number;    // 0-100
    formattingPassed: boolean;
    formattingIssues: string[];
  };
  analyzed: {
    gaps: string[];
    accuracyScore: number;        // 0-100
    verifiedClaimCount: number;
    unverifiedClaimCount: number;
  };
  improved: {
    rerunCount: number;
    fixesApplied: string[];
  };
  controlled: {
    finalScore: number;
    grade: Grade;
    action: string;
    gradedAt: string;             // ISO 8601
  };
}

export interface ChronicleCharter {
  charterId: string;
  userId: number;
  deliveryDate: string;           // ISO 8601
  tierAtDelivery: string;
  deliverables: Array<{
    type: DeliverableType;
    title: string;
    grade: Grade;
    score: number;
    sourceCount: number;
    verifiedClaims: number;
  }>;
  overallGrade: Grade;
  overallScore: number;
  generatedAt: string;            // ISO 8601
}

export function scoreToGrade(score: number): Grade {
  for (const threshold of GRADE_THRESHOLDS) {
    if (score >= threshold.minScore) {
      return threshold.grade;
    }
  }
  return 'D';
}

export function gradeToAction(grade: Grade): string {
  const threshold = GRADE_THRESHOLDS.find(t => t.grade === grade);
  return threshold?.action ?? 'escalate';
}

export function isShippable(grade: Grade): boolean {
  return grade === 'S' || grade === 'A' || grade === 'B';
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd ~/foai/perform && npx tsc --noEmit src/lib/dmaic/types.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd ~/foai/perform
git add src/lib/dmaic/types.ts
git commit -m "$(cat <<'EOF'
feat(perform): add DMAIC quality gate types

Grade S/A/B/C/D with thresholds and actions. DeliverableAudit tracks
all 5 DMAIC phases. ChronicleCharter is the client-facing receipt.
isShippable() gates delivery — nothing below B ships.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Formatting Checks (Zero Tolerance Scanner)

**Files:**
- Create: `perform/src/lib/dmaic/formatting-checks.ts`
- Create: `perform/src/lib/dmaic/__tests__/formatting-checks.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// perform/src/lib/dmaic/__tests__/formatting-checks.test.ts
import { describe, it, expect } from 'vitest';
import { scanFormatting, type FormattingResult } from '../formatting-checks';

describe('scanFormatting', () => {
  it('passes clean content', () => {
    const result = scanFormatting('Daniel Jones cleared for minicamp on April 10, 2026.');
    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('catches template variables with double braces', () => {
    const result = scanFormatting('Hello {{name}}, your team is {{team}}.');
    expect(result.passed).toBe(false);
    expect(result.issues).toContain('Template variable found: {{name}}');
    expect(result.issues).toContain('Template variable found: {{team}}');
  });

  it('catches template variables with parentheses', () => {
    const result = scanFormatting('Hello (name), welcome to (platform).');
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.includes('(name)'))).toBe(true);
  });

  it('catches bracket placeholders', () => {
    const result = scanFormatting('The [INSERT TEAM NAME] played well.');
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.includes('[INSERT'))).toBe(true);
  });

  it('catches common placeholder words', () => {
    const result = scanFormatting('Player scored TBD points in the game.');
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.includes('TBD'))).toBe(true);
  });

  it('does not flag normal parentheses usage', () => {
    const result = scanFormatting('Jones (QB, #8) threw for 300 yards (season high).');
    expect(result.passed).toBe(true);
  });

  it('catches broken markdown links', () => {
    const result = scanFormatting('Check out [this link]() for details.');
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.includes('Empty markdown link'))).toBe(true);
  });

  it('catches Lorem Ipsum', () => {
    const result = scanFormatting('Lorem ipsum dolor sit amet, the Giants won.');
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.includes('Lorem ipsum'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/foai/perform && npx vitest run src/lib/dmaic/__tests__/formatting-checks.test.ts`
Expected: FAIL with `Cannot find module '../formatting-checks'`

- [ ] **Step 3: Write the formatting scanner**

```typescript
// perform/src/lib/dmaic/formatting-checks.ts
/**
 * Zero-tolerance formatting scanner for deliverables.
 * A single failure = automatic grade reduction to C.
 */

export interface FormattingResult {
  passed: boolean;
  issues: string[];
}

// Template variable patterns — these should NEVER appear in output
const TEMPLATE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\{\{(\w+)\}\}/g, label: 'Template variable found: {{$1}}' },
  { pattern: /\[INSERT[^\]]*\]/gi, label: 'Bracket placeholder found: $&' },
  { pattern: /\$\{(\w+)\}/g, label: 'String interpolation found: ${$1}' },
  { pattern: /<%[^%]*%>/g, label: 'EJS/ERB template tag found: $&' },
];

// Suspicious parenthetical patterns — (name), (team), (placeholder)
// Must distinguish from legitimate parens like "(QB, #8)" or "(season high)"
const SUSPICIOUS_PARENS = /\((?:name|team|player|date|time|platform|company|user|client|insert|placeholder|value|amount|number|email|url|link)\)/gi;

// Placeholder words that should never appear standalone
const PLACEHOLDER_WORDS = /\b(?:TBD|TODO|FIXME|PLACEHOLDER|UNDEFINED|NULL|N\/A|LOREM|IPSUM)\b/gi;

// Broken markdown
const BROKEN_MARKDOWN_LINK = /\[[^\]]+\]\(\s*\)/g;

// Lorem ipsum
const LOREM_IPSUM = /lorem\s+ipsum/gi;

export function scanFormatting(content: string): FormattingResult {
  const issues: string[] = [];

  // Check template patterns
  for (const { pattern, label } of TEMPLATE_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      issues.push(label.replace('$1', match[1] || '').replace('$&', match[0]));
    }
  }

  // Check suspicious parenthetical placeholders
  let parenMatch: RegExpExecArray | null;
  const parenRegex = new RegExp(SUSPICIOUS_PARENS.source, SUSPICIOUS_PARENS.flags);
  while ((parenMatch = parenRegex.exec(content)) !== null) {
    issues.push(`Suspicious placeholder found: ${parenMatch[0]}`);
  }

  // Check placeholder words
  let wordMatch: RegExpExecArray | null;
  const wordRegex = new RegExp(PLACEHOLDER_WORDS.source, PLACEHOLDER_WORDS.flags);
  while ((wordMatch = wordRegex.exec(content)) !== null) {
    issues.push(`Placeholder word found: ${wordMatch[0]}`);
  }

  // Check broken markdown links
  let linkMatch: RegExpExecArray | null;
  const linkRegex = new RegExp(BROKEN_MARKDOWN_LINK.source, BROKEN_MARKDOWN_LINK.flags);
  while ((linkMatch = linkRegex.exec(content)) !== null) {
    issues.push(`Empty markdown link found: ${linkMatch[0]}`);
  }

  // Check Lorem Ipsum
  if (LOREM_IPSUM.test(content)) {
    issues.push('Lorem ipsum detected — placeholder text in deliverable');
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `cd ~/foai/perform && npx vitest run src/lib/dmaic/__tests__/formatting-checks.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
cd ~/foai/perform
git add src/lib/dmaic/formatting-checks.ts src/lib/dmaic/__tests__/formatting-checks.test.ts
git commit -m "$(cat <<'EOF'
feat(perform): add zero-tolerance formatting scanner for DMAIC gate

Catches template variables ({{name}}, [INSERT], ${var}), suspicious
placeholders ((name), (team)), placeholder words (TBD, TODO), broken
markdown links, and Lorem ipsum. Single failure = grade C.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: DMAIC Grader Engine

**Files:**
- Create: `perform/src/lib/dmaic/grader.ts`
- Create: `perform/src/lib/dmaic/__tests__/grader.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// perform/src/lib/dmaic/__tests__/grader.test.ts
import { describe, it, expect } from 'vitest';
import { gradeDeliverable, type GraderInput } from '../grader';

const baseInput: GraderInput = {
  deliverableType: 'briefing',
  content: 'Daniel Jones cleared for minicamp. Verified by 3 sources.',
  promisedItems: ['team news summary', 'verified stats'],
  producedItems: ['team news summary', 'verified stats'],
  verifiedClaimCount: 5,
  unverifiedClaimCount: 0,
  totalSourcesUsed: 3,
};

describe('gradeDeliverable', () => {
  it('grades a complete deliverable as S or A', () => {
    const result = gradeDeliverable(baseInput);
    expect(['S', 'A']).toContain(result.grade);
    expect(result.isShippable).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(85);
  });

  it('reduces grade when formatting fails', () => {
    const result = gradeDeliverable({
      ...baseInput,
      content: 'Hello {{name}}, your team {{team}} played well.',
    });
    expect(result.isShippable).toBe(false);
    expect(result.formattingPassed).toBe(false);
    expect(result.grade).toBe('C');
  });

  it('reduces grade when items are missing', () => {
    const result = gradeDeliverable({
      ...baseInput,
      producedItems: ['team news summary'], // missing 'verified stats'
    });
    expect(result.score).toBeLessThan(95);
  });

  it('reduces grade when unverified claims exist', () => {
    const result = gradeDeliverable({
      ...baseInput,
      verifiedClaimCount: 2,
      unverifiedClaimCount: 5,
    });
    expect(result.score).toBeLessThan(85);
  });

  it('returns D for empty content', () => {
    const result = gradeDeliverable({
      ...baseInput,
      content: '',
      producedItems: [],
    });
    expect(result.grade).toBe('D');
    expect(result.isShippable).toBe(false);
  });

  it('includes all DMAIC phase data in audit', () => {
    const result = gradeDeliverable(baseInput);
    expect(result.audit.defined.promisedItems).toEqual(baseInput.promisedItems);
    expect(result.audit.measured.completenessScore).toBeGreaterThan(0);
    expect(result.audit.analyzed.gaps).toBeDefined();
    expect(result.audit.controlled.grade).toBeDefined();
    expect(result.audit.controlled.gradedAt).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/foai/perform && npx vitest run src/lib/dmaic/__tests__/grader.test.ts`
Expected: FAIL with `Cannot find module '../grader'`

- [ ] **Step 3: Write the grader**

```typescript
// perform/src/lib/dmaic/grader.ts
/**
 * DMAIC Quality Gate Grader.
 * Grades a deliverable through all 5 DMAIC phases.
 * Returns a grade (S/A/B/C/D), score (0-100), and full audit trail.
 */

import { scanFormatting } from './formatting-checks';
import {
  type Grade,
  type DeliverableAudit,
  type DeliverableType,
  scoreToGrade,
  gradeToAction,
  isShippable as checkShippable,
} from './types';

export interface GraderInput {
  deliverableType: DeliverableType;
  content: string;
  promisedItems: string[];
  producedItems: string[];
  verifiedClaimCount: number;
  unverifiedClaimCount: number;
  totalSourcesUsed: number;
}

export interface GraderResult {
  score: number;
  grade: Grade;
  isShippable: boolean;
  action: string;
  formattingPassed: boolean;
  formattingIssues: string[];
  audit: DeliverableAudit;
}

export function gradeDeliverable(input: GraderInput): GraderResult {
  const now = new Date().toISOString();

  // ── DEFINE: What was promised ──
  const defined = {
    promisedItems: input.promisedItems,
    qualityMetrics: ['formatting_clean', 'claims_verified', 'content_complete'],
  };

  // ── MEASURE: What was produced ──
  const formatting = scanFormatting(input.content);
  const completenessScore = input.promisedItems.length === 0
    ? 0
    : Math.round((input.producedItems.length / input.promisedItems.length) * 100);

  const measured = {
    producedItems: input.producedItems,
    completenessScore,
    formattingPassed: formatting.passed,
    formattingIssues: formatting.issues,
  };

  // ── ANALYZE: Find gaps ──
  const missingItems = input.promisedItems.filter(
    item => !input.producedItems.includes(item)
  );
  const totalClaims = input.verifiedClaimCount + input.unverifiedClaimCount;
  const accuracyScore = totalClaims === 0
    ? 100
    : Math.round((input.verifiedClaimCount / totalClaims) * 100);

  const gaps: string[] = [];
  if (missingItems.length > 0) {
    gaps.push(`Missing items: ${missingItems.join(', ')}`);
  }
  if (input.unverifiedClaimCount > 0) {
    gaps.push(`${input.unverifiedClaimCount} unverified claims`);
  }
  if (!input.content || input.content.trim().length === 0) {
    gaps.push('Content is empty');
  }

  const analyzed = {
    gaps,
    accuracyScore,
    verifiedClaimCount: input.verifiedClaimCount,
    unverifiedClaimCount: input.unverifiedClaimCount,
  };

  // ── IMPROVE: (tracked, but actual re-run happens outside the grader) ──
  const improved = {
    rerunCount: 0,
    fixesApplied: [],
  };

  // ── CONTROL: Compute final score and grade ──
  let score = 0;

  if (!input.content || input.content.trim().length === 0) {
    score = 0;
  } else {
    // Weighted scoring
    const completenessWeight = 0.35;
    const accuracyWeight = 0.35;
    const sourceWeight = 0.15;
    const contentLengthWeight = 0.15;

    const sourceScore = Math.min(input.totalSourcesUsed * 20, 100);
    const contentScore = Math.min(input.content.length / 5, 100);

    score = Math.round(
      completenessScore * completenessWeight +
      accuracyScore * accuracyWeight +
      sourceScore * sourceWeight +
      contentScore * contentLengthWeight
    );
  }

  // Formatting failure = automatic cap at C (55)
  if (!formatting.passed) {
    score = Math.min(score, 55);
  }

  const grade = scoreToGrade(score);
  const action = gradeToAction(grade);

  const audit: DeliverableAudit = {
    deliverableId: `DEL-${Date.now().toString(36)}`,
    deliverableType: input.deliverableType,
    userId: 0, // Set by caller
    tierAtDelivery: '', // Set by caller
    defined,
    measured,
    analyzed,
    improved,
    controlled: {
      finalScore: score,
      grade,
      action,
      gradedAt: now,
    },
  };

  return {
    score,
    grade,
    isShippable: checkShippable(grade),
    action,
    formattingPassed: formatting.passed,
    formattingIssues: formatting.issues,
    audit,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `cd ~/foai/perform && npx vitest run src/lib/dmaic/__tests__/grader.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
cd ~/foai/perform
git add src/lib/dmaic/grader.ts src/lib/dmaic/__tests__/grader.test.ts
git commit -m "$(cat <<'EOF'
feat(perform): add DMAIC grader engine

5-phase grading: Define (promised items) → Measure (completeness +
formatting) → Analyze (gaps + accuracy) → Improve (tracked) →
Control (weighted score → grade). Formatting failure caps at C.
Nothing below B ships.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Chronicle Charter Generator

**Files:**
- Create: `perform/src/lib/dmaic/chronicle-charter.ts`
- Create: `perform/src/lib/dmaic/__tests__/chronicle-charter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// perform/src/lib/dmaic/__tests__/chronicle-charter.test.ts
import { describe, it, expect } from 'vitest';
import { generateCharter } from '../chronicle-charter';
import type { GraderResult } from '../grader';

describe('generateCharter', () => {
  const mockResult: GraderResult = {
    score: 92,
    grade: 'A',
    isShippable: true,
    action: 'ship',
    formattingPassed: true,
    formattingIssues: [],
    audit: {
      deliverableId: 'DEL-test123',
      deliverableType: 'briefing',
      userId: 42,
      tierAtDelivery: 'premium',
      defined: { promisedItems: ['team news', 'stats'], qualityMetrics: [] },
      measured: { producedItems: ['team news', 'stats'], completenessScore: 100, formattingPassed: true, formattingIssues: [] },
      analyzed: { gaps: [], accuracyScore: 95, verifiedClaimCount: 8, unverifiedClaimCount: 0 },
      improved: { rerunCount: 0, fixesApplied: [] },
      controlled: { finalScore: 92, grade: 'A', action: 'ship', gradedAt: '2026-04-11T05:00:00Z' },
    },
  };

  it('generates a charter with correct structure', () => {
    const charter = generateCharter(42, 'premium', [mockResult]);
    expect(charter.userId).toBe(42);
    expect(charter.tierAtDelivery).toBe('premium');
    expect(charter.deliverables).toHaveLength(1);
    expect(charter.overallGrade).toBe('A');
    expect(charter.charterId).toMatch(/^CHR-/);
  });

  it('computes overall grade from multiple deliverables', () => {
    const secondResult: GraderResult = {
      ...mockResult,
      score: 75,
      grade: 'B',
      audit: { ...mockResult.audit, controlled: { ...mockResult.audit.controlled, finalScore: 75, grade: 'B' } },
    };
    const charter = generateCharter(42, 'premium', [mockResult, secondResult]);
    expect(charter.overallScore).toBe(84); // avg of 92 + 75 = 83.5 → 84
    expect(charter.overallGrade).toBe('B');
  });

  it('renders to markdown string', () => {
    const charter = generateCharter(42, 'premium', [mockResult]);
    const md = charter.toMarkdown();
    expect(md).toContain('Chronicle Charter');
    expect(md).toContain('premium');
    expect(md).toContain('briefing');
    expect(md).toContain('Grade: A');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/foai/perform && npx vitest run src/lib/dmaic/__tests__/chronicle-charter.test.ts`
Expected: FAIL with `Cannot find module '../chronicle-charter'`

- [ ] **Step 3: Write the charter generator**

```typescript
// perform/src/lib/dmaic/chronicle-charter.ts
/**
 * Chronicle Charter — the client's transparent delivery receipt.
 * Shows what was promised, what was delivered, and how it scored.
 */

import type { GraderResult } from './grader';
import { scoreToGrade, type Grade, type ChronicleCharter } from './types';

interface CharterWithMarkdown extends ChronicleCharter {
  toMarkdown(): string;
}

export function generateCharter(
  userId: number,
  tier: string,
  results: GraderResult[],
): CharterWithMarkdown {
  const now = new Date().toISOString();
  const charterId = `CHR-${Date.now().toString(36)}`;

  const deliverables = results.map(r => ({
    type: r.audit.deliverableType,
    title: r.audit.deliverableId,
    grade: r.grade,
    score: r.score,
    sourceCount: r.audit.analyzed.verifiedClaimCount + r.audit.analyzed.unverifiedClaimCount,
    verifiedClaims: r.audit.analyzed.verifiedClaimCount,
  }));

  const overallScore = results.length === 0
    ? 0
    : Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
  const overallGrade = scoreToGrade(overallScore);

  return {
    charterId,
    userId,
    deliveryDate: now,
    tierAtDelivery: tier,
    deliverables,
    overallGrade,
    overallScore,
    generatedAt: now,
    toMarkdown() {
      const lines: string[] = [
        `# Chronicle Charter`,
        ``,
        `**Charter ID:** ${this.charterId}`,
        `**Delivery Date:** ${this.deliveryDate}`,
        `**Plan:** ${this.tierAtDelivery}`,
        `**Overall Grade:** ${this.overallGrade} (${this.overallScore}/100)`,
        ``,
        `## Deliverables`,
        ``,
        `| Item | Type | Grade | Score | Sources | Verified |`,
        `|------|------|-------|-------|---------|----------|`,
      ];

      for (const d of this.deliverables) {
        lines.push(
          `| ${d.title} | ${d.type} | ${d.grade} | ${d.score} | ${d.sourceCount} | ${d.verifiedClaims} |`
        );
      }

      lines.push('', `---`, `*Generated: ${this.generatedAt}*`);
      return lines.join('\n');
    },
  };
}
```

- [ ] **Step 4: Run tests**

Run: `cd ~/foai/perform && npx vitest run src/lib/dmaic/__tests__/chronicle-charter.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
cd ~/foai/perform
git add src/lib/dmaic/chronicle-charter.ts src/lib/dmaic/__tests__/chronicle-charter.test.ts
git commit -m "$(cat <<'EOF'
feat(perform): add Chronicle Charter receipt generator

Client-facing delivery receipt showing what was promised, delivered,
and graded. Renders to markdown. Computes overall grade from multiple
deliverables. Transparent quality evidence — the refund killer.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Database Schema Extension

**Files:**
- Create: `perform/migrations/007_podcaster_delivery_dmaic.sql`
- Modify: `perform/migrations/004_podcaster_tables.sql` (update default)

- [ ] **Step 1: Update the default plan tier in 004**

In `perform/migrations/004_podcaster_tables.sql`, change:

```sql
  plan_tier TEXT DEFAULT 'free',
```

to:

```sql
  plan_tier TEXT DEFAULT 'bmc',
```

- [ ] **Step 2: Create the delivery + DMAIC schema extension**

```sql
-- perform/migrations/007_podcaster_delivery_dmaic.sql
-- Migration 007: Delivery preferences, DMAIC tracking, dual-channel pricing

-- Delivery preferences on podcaster_users
ALTER TABLE podcaster_users
  ADD COLUMN IF NOT EXISTS delivery_interval TEXT DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS delivery_time TEXT DEFAULT '05:00',
  ADD COLUMN IF NOT EXISTS delivery_timezone TEXT DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS email_delivery BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS delivery_email TEXT,
  ADD COLUMN IF NOT EXISTS delivery_format TEXT DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS notification_channels TEXT[] DEFAULT '{email,dashboard}'::TEXT[],
  ADD COLUMN IF NOT EXISTS sales_channel TEXT DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS fiverr_order_id TEXT;

COMMENT ON COLUMN podcaster_users.delivery_interval IS 'daily | weekly | per_episode | custom';
COMMENT ON COLUMN podcaster_users.delivery_time IS 'HH:MM 24hr format';
COMMENT ON COLUMN podcaster_users.delivery_format IS 'study | commercial | both';
COMMENT ON COLUMN podcaster_users.sales_channel IS 'fiverr | direct';

-- DMAIC deliverable audit log
CREATE TABLE IF NOT EXISTS podcaster_deliverable_audit (
  id SERIAL PRIMARY KEY,
  deliverable_id TEXT NOT NULL UNIQUE,
  user_id INT NOT NULL REFERENCES podcaster_users(id) ON DELETE CASCADE,
  deliverable_type TEXT NOT NULL,
  tier_at_delivery TEXT NOT NULL,
  completeness_score INT NOT NULL,
  accuracy_score INT NOT NULL,
  formatting_passed BOOLEAN NOT NULL,
  formatting_issues TEXT[] DEFAULT '{}'::TEXT[],
  gaps TEXT[] DEFAULT '{}'::TEXT[],
  verified_claims INT DEFAULT 0,
  unverified_claims INT DEFAULT 0,
  rerun_count INT DEFAULT 0,
  fixes_applied TEXT[] DEFAULT '{}'::TEXT[],
  final_score INT NOT NULL,
  grade TEXT NOT NULL,
  action TEXT NOT NULL,
  graded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliverable_audit_user ON podcaster_deliverable_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_audit_grade ON podcaster_deliverable_audit(grade);

-- Chronicle Charter receipts
CREATE TABLE IF NOT EXISTS podcaster_chronicle_charter (
  id SERIAL PRIMARY KEY,
  charter_id TEXT NOT NULL UNIQUE,
  user_id INT NOT NULL REFERENCES podcaster_users(id) ON DELETE CASCADE,
  delivery_date TIMESTAMPTZ NOT NULL,
  tier_at_delivery TEXT NOT NULL,
  deliverables JSONB NOT NULL DEFAULT '[]'::JSONB,
  overall_grade TEXT NOT NULL,
  overall_score INT NOT NULL,
  charter_markdown TEXT,
  generated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_charter_user ON podcaster_chronicle_charter(user_id);
CREATE INDEX IF NOT EXISTS idx_charter_date ON podcaster_chronicle_charter(delivery_date);
```

- [ ] **Step 3: Verify SQL syntax**

Run: `head -5 ~/foai/perform/migrations/007_podcaster_delivery_dmaic.sql`
Expected: First 5 lines visible, no syntax errors

- [ ] **Step 4: Commit**

```bash
cd ~/foai/perform
git add migrations/004_podcaster_tables.sql migrations/007_podcaster_delivery_dmaic.sql
git commit -m "$(cat <<'EOF'
feat(perform): add delivery preferences + DMAIC audit schema

Default plan_tier changed from 'free' to 'bmc'. Added delivery
schedule columns to podcaster_users. Created podcaster_deliverable_audit
(DMAIC 5-phase tracking) and podcaster_chronicle_charter (client
receipt) tables with indexes.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Follow-Up Plans (Separate Sessions)

These subsystems depend on the data model + DMAIC foundation above:

1. **Scheduled Delivery System** — Lil_Sched_Hawk trigger integration, Producer execution in Cloud Run Jobs, email delivery via Resend, No News protocol
2. **Live Ticker + Notifications** — Lil_Feed_Hawk continuous monitoring, WebSocket/SSE push to dashboard, direct alerts per client
3. **Dual Format Document Generation** — Study vs Commercial templates, Ingot watermark (pressed ANG stamp), PDF/DOCX/PNG export pipeline
4. **Dashboard SaaS Frontend** — React pages, delivery timeline, clips panel, ticker, settings, grade badges
5. **LUC Discovery + Pricing Intelligence** — Sqwaadrun persona campaign, PodcasterProfile schema, market rate substantiation
6. **Fiverr Integration** — One-off gig flow, escrow-aligned delivery, upsell to monthly

Each gets its own spec → plan → implementation cycle, gated by this foundation being complete.

---

**Self-review:**

1. **Spec coverage:** Tier pricing (spec §2) → Tasks 1+2. Delivery preferences (spec §3) → Task 3. DMAIC gate (spec §7) → Tasks 4+5+6. Chronicle Charter (spec §7.5) → Task 7. Database (spec §3+7) → Task 8. Live Ticker, Dashboard, Document Generation, LUC, Fiverr → listed as follow-up plans.

2. **Placeholder scan:** No TBD, TODO, or "implement later." All steps have complete code.

3. **Type consistency:** `PlanTier` in Task 1 matches usage in Task 2 `pricing.ts`. `Grade` type in Task 4 matches Task 6 grader and Task 7 charter. `DeliverableType` consistent across types.ts, grader.ts, and charter. `FormattingResult` interface in Task 5 matches import in Task 6. `GraderResult` in Task 6 matches import in Task 7.

Self-review passes.
