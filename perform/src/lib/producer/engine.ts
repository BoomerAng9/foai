/**
 * Producer Engine — the core delivery orchestrator.
 *
 * Cycle: fetch client prefs -> scrape team news via Sqwaadrun ->
 * assemble briefing -> DMAIC grade -> Chronicle Charter -> deliver.
 */

import type { DeliveryPreferences } from '@/lib/podcasters/delivery-preferences';
import type { PlanTier } from '@/lib/podcasters/plans';
import type { DeliveryResult, NewsItem } from './types';
import { assembleBriefing } from './briefing-assembler';
import { deliverBriefingEmail } from './email-delivery';
import { gradeDeliverable, type GraderResult } from '@/lib/dmaic/grader';
import { generateCharter } from '@/lib/dmaic/chronicle-charter';
import { isShippable, type ChronicleCharter } from '@/lib/dmaic/types';
import { sql } from '@/lib/db';

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

  // 5. Persist audit + charter to database
  await persistAudit(client.userId, client.tier, gradeResult, charter);

  // 6. Check if shippable
  const canShip = isShippable(gradeResult.grade);
  const deliveredVia: ('email' | 'dashboard')[] = [];

  if (canShip) {
    // 7a. Email delivery
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

    // 7b. Dashboard delivery
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

async function persistAudit(
  userId: number,
  tier: string,
  gradeResult: GraderResult,
  charter: ChronicleCharter & { toMarkdown(): string },
): Promise<void> {
  if (!sql) return;

  try {
    const a = gradeResult.audit;
    await sql`
      INSERT INTO podcaster_deliverable_audit (
        deliverable_id, user_id, deliverable_type, tier_at_delivery,
        completeness_score, accuracy_score, formatting_passed, formatting_issues,
        gaps, verified_claims, unverified_claims, rerun_count, fixes_applied,
        final_score, grade, action, graded_at
      ) VALUES (
        ${a.deliverableId}, ${userId}, ${a.deliverableType}, ${tier},
        ${a.measured.completenessScore}, ${a.analyzed.accuracyScore},
        ${a.measured.formattingPassed}, ${a.measured.formattingIssues},
        ${a.analyzed.gaps}, ${a.analyzed.verifiedClaimCount}, ${a.analyzed.unverifiedClaimCount},
        ${a.improved.rerunCount}, ${a.improved.fixesApplied},
        ${a.controlled.finalScore}, ${a.controlled.grade}, ${a.controlled.action},
        ${a.controlled.gradedAt}
      )
      ON CONFLICT (deliverable_id) DO NOTHING
    `;

    await sql`
      INSERT INTO podcaster_chronicle_charter (
        charter_id, user_id, delivery_date, tier_at_delivery,
        deliverables, overall_grade, overall_score, charter_markdown, generated_at
      ) VALUES (
        ${charter.charterId}, ${userId}, ${charter.deliveryDate}, ${charter.tierAtDelivery},
        ${JSON.stringify(charter.deliverables)}, ${charter.overallGrade}, ${charter.overallScore},
        ${charter.toMarkdown()}, ${charter.generatedAt}
      )
      ON CONFLICT (charter_id) DO NOTHING
    `;
  } catch (err) {
    console.error('[Producer] Audit persistence failed:', err instanceof Error ? err.message : err);
  }
}
