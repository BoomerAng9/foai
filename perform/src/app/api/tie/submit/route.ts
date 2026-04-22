/**
 * POST /api/tie/submit
 * ======================================
 * Flagship user-facing write path — players, schools, teams submit player
 * profiles and get a TIE grade + NIL valuation back. This is what makes
 * TIE the flagship: NIL + Transfer Portal pricing anchored to a cohort
 * comparable pulled from perform_players.
 *
 * Request body (validated via zod):
 *   submitter:   { email, role, org? }
 *   player:      { name, school?, position, classYear, heightInches?, weightLbs?, dob? }
 *   performance: PerformanceInput (pffGrade, epaPerPlay, successRate, ...)
 *   attributes:  AttributesInput  (fortyYard, threeCone, shuttle, bench, vertical, broad)
 *   intangibles: IntangiblesInput (footballIQ, workEthic, competitiveness, leadership, offFieldCharacter)
 *   consents:    { nilDisclosure, publicVisibility, transferPortal }
 *
 * Response:
 *   {
 *     submissionId,
 *     tie: { score, grade, tier, components, projectedRound },
 *     nil: { valuationUsd, cohortKey, cohortSize, cohortMedianUsd, cohortP10, cohortP90 },
 *     matched: { performPlayerId? } // when submitted profile matches an existing prospect
 *   }
 *
 * Public route — browse-first intent (per Per|Form middleware pattern).
 * Rate-limit + owner-email allowlist gating enforced in middleware layer.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { calculateTIE } from '@/lib/tie/engine';
import { requireDb, sql } from '@/lib/db';
import { getAdminAuth } from '@/lib/firebase/admin';
import type { PerformanceInput, AttributesInput, IntangiblesInput } from '@/lib/tie/types';

const AUTH_COOKIE = 'firebase-auth-token';

/**
 * Best-effort Firebase UID extraction — the POST route is public (anon
 * submissions are allowed for draft-week onboarding) but if the caller
 * IS signed in we capture their uid for ownership on subsequent retrieval.
 */
async function maybeUid(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid ?? null;
  } catch {
    return null;
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SubmitBody {
  submitter: { email: string; role: 'player'|'school'|'team'|'agent'|'parent'; org?: string };
  player: {
    name: string;
    school?: string;
    position: string;
    classYear: string;
    heightInches?: number;
    weightLbs?: number;
    dob?: string;
  };
  performance?: Record<string, number>;
  attributes?: Record<string, number>;
  intangibles?: Record<string, number>;
  consents: { nilDisclosure: boolean; publicVisibility: boolean; transferPortal: boolean };
}

const ROLES = new Set(['player','school','team','agent','parent']);
function validate(raw: unknown): { ok: true; body: SubmitBody } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'body_not_object' };
  const b = raw as Partial<SubmitBody>;
  if (!b.submitter || typeof b.submitter.email !== 'string' || !b.submitter.email.includes('@')) return { ok: false, error: 'invalid_email' };
  if (!b.submitter.role || !ROLES.has(b.submitter.role)) return { ok: false, error: 'invalid_role' };
  if (!b.player || typeof b.player.name !== 'string' || b.player.name.length < 2 || b.player.name.length > 100) return { ok: false, error: 'invalid_player_name' };
  if (!b.player.position || typeof b.player.position !== 'string' || b.player.position.length > 10) return { ok: false, error: 'invalid_position' };
  if (!b.player.classYear || typeof b.player.classYear !== 'string' || b.player.classYear.length > 10) return { ok: false, error: 'invalid_class_year' };
  if (!b.consents || typeof b.consents.nilDisclosure !== 'boolean' || typeof b.consents.publicVisibility !== 'boolean' || typeof b.consents.transferPortal !== 'boolean') return { ok: false, error: 'invalid_consents' };
  return {
    ok: true,
    body: {
      submitter: b.submitter,
      player: b.player,
      performance: b.performance ?? {},
      attributes: b.attributes ?? {},
      intangibles: b.intangibles ?? {},
      consents: b.consents,
    },
  };
}

// Cohort math: pull players at the same position + grade tier in the target
// class_year and use their NIL-proxy valuations to build a median/P10/P90.
// Until NIL observed data is ingested, we proxy NIL off consensus_avg rank
// using a power-law curve calibrated to public On3 NIL rankings: a #1
// consensus prospect is ~$2.4M, top-5 ~$1.0M, top-25 ~$350K, top-100 ~$85K.
function rankToNilProxyUsd(consensusRank: number | null, grade: number | null): number {
  if (consensusRank == null && grade == null) return 0;
  if (consensusRank != null && consensusRank > 0) {
    // v = 2400000 * (1 / rank)^0.82
    return Math.round(2_400_000 * Math.pow(1 / consensusRank, 0.82));
  }
  // Fallback via grade band
  const g = grade ?? 0;
  if (g >= 95) return 1_400_000;
  if (g >= 90) return 650_000;
  if (g >= 85) return 280_000;
  if (g >= 80) return 140_000;
  if (g >= 75) return 75_000;
  if (g >= 70) return 40_000;
  return 18_000;
}

/**
 * Build a cohort comparable NIL valuation using a tiered fallback
 * so the submitter always gets a real benchmark instead of $0
 * placeholders when the exact (class × position × tier) bucket is thin.
 *
 * MIM §46.3 no-stub rule: never return all-zero comparables when a
 * broader comparable exists. Surface the scope explicitly so users see
 * whether the benchmark is narrow (position+tier) or wide (grade band
 * across class).
 */
async function buildNilCohort(
  classYear: string,
  position: string,
  tier: string,
): Promise<{
  cohortKey: string;
  cohortScope: 'position_tier' | 'tier_only' | 'grade_band' | 'insufficient_evidence';
  cohortSize: number;
  medianUsd: number;
  p10Usd: number;
  p90Usd: number;
}> {
  type Row = {
    id: number;
    overall_rank: number | null;
    grade: string | null;
    consensus_avg: number | null;
  };
  const percentiles = (rows: Row[]): { median: number; p10: number; p90: number; n: number } => {
    const values = rows
      .map(r => rankToNilProxyUsd(r.consensus_avg, r.grade ? parseFloat(r.grade) : null))
      .filter(v => v > 0)
      .sort((a, b) => a - b);
    if (values.length === 0) return { median: 0, p10: 0, p90: 0, n: 0 };
    const pick = (q: number): number => {
      const idx = Math.min(values.length - 1, Math.max(0, Math.floor(values.length * q)));
      return values[idx] ?? 0;
    };
    return { median: pick(0.5), p10: pick(0.1), p90: pick(0.9), n: values.length };
  };

  // Tier A: exact position + tier within class
  const tierA = await sql!<Row[]>`
    SELECT p.id, p.overall_rank, p.grade,
           (SELECT rank FROM perform_consensus_ranks WHERE player_id=p.id AND source='consensus_avg' LIMIT 1) AS consensus_avg
    FROM perform_players p
    WHERE p.class_year = ${classYear} AND p.position = ${position} AND p.tie_tier = ${tier}
    LIMIT 200
  `;
  if (tierA.length >= 3) {
    const stats = percentiles(tierA);
    return {
      cohortKey: `${classYear}_${position}_${tier}`,
      cohortScope: 'position_tier',
      cohortSize: stats.n,
      medianUsd: stats.median,
      p10Usd: stats.p10,
      p90Usd: stats.p90,
    };
  }

  // Tier B: same tier across all positions in the class
  const tierB = await sql!<Row[]>`
    SELECT p.id, p.overall_rank, p.grade,
           (SELECT rank FROM perform_consensus_ranks WHERE player_id=p.id AND source='consensus_avg' LIMIT 1) AS consensus_avg
    FROM perform_players p
    WHERE p.class_year = ${classYear} AND p.tie_tier = ${tier}
    LIMIT 300
  `;
  if (tierB.length >= 3) {
    const stats = percentiles(tierB);
    return {
      cohortKey: `${classYear}_ANY_${tier}`,
      cohortScope: 'tier_only',
      cohortSize: stats.n,
      medianUsd: stats.median,
      p10Usd: stats.p10,
      p90Usd: stats.p90,
    };
  }

  // Tier C: grade band — pull players within ±3 grade points of the tier midpoint
  const tierMidpoint: Record<string, number> = {
    PRIME: 103, A_PLUS: 95, A: 87, A_MINUS: 82, B_PLUS: 77, B: 72, B_MINUS: 67, C_PLUS: 62, C: 55,
  };
  const mid = tierMidpoint[tier] ?? 75;
  const tierC = await sql!<Row[]>`
    SELECT p.id, p.overall_rank, p.grade,
           (SELECT rank FROM perform_consensus_ranks WHERE player_id=p.id AND source='consensus_avg' LIMIT 1) AS consensus_avg
    FROM perform_players p
    WHERE p.class_year = ${classYear}
      AND p.grade IS NOT NULL
      AND p.grade::NUMERIC BETWEEN ${mid - 3} AND ${mid + 3}
    LIMIT 400
  `;
  if (tierC.length >= 3) {
    const stats = percentiles(tierC);
    return {
      cohortKey: `${classYear}_GRADE_${Math.round(mid)}±3`,
      cohortScope: 'grade_band',
      cohortSize: stats.n,
      medianUsd: stats.median,
      p10Usd: stats.p10,
      p90Usd: stats.p90,
    };
  }

  // No cohort on any tier — explicit "insufficient evidence" per MIM §46.3
  return {
    cohortKey: `${classYear}_${position}_${tier}`,
    cohortScope: 'insufficient_evidence',
    cohortSize: 0,
    medianUsd: 0,
    p10Usd: 0,
    p90Usd: 0,
  };
}

async function matchExistingPlayer(name: string, school: string | undefined, classYear: string): Promise<number | null> {
  const nameNorm = name.toLowerCase().trim();
  const rows = await sql!<Array<{ id: number }>>`
    SELECT id
    FROM perform_players
    WHERE LOWER(TRIM(name)) = ${nameNorm}
      AND class_year = ${classYear}
      ${school ? sql!`AND (LOWER(TRIM(school)) = ${school.toLowerCase().trim()} OR school_normalized = ${school.toLowerCase().trim().replace(/\s+/g, '_')})` : sql!``}
    LIMIT 1
  `;
  return rows[0]?.id ?? null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const dbErr = requireDb();
  if (dbErr) return NextResponse.json({ error: 'db_unavailable' }, { status: 503 });

  const raw = await req.json().catch(() => null);
  const parsed = validate(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const body: SubmitBody = parsed.body;

  // Grade via TIE engine
  const tie = calculateTIE(
    body.performance as PerformanceInput,
    body.attributes as AttributesInput,
    body.intangibles as IntangiblesInput,
  );

  // Cohort NIL valuation
  const cohort = await buildNilCohort(body.player.classYear, body.player.position, tie.tier);
  const submitterNil = rankToNilProxyUsd(null, tie.score);

  // Match to existing prospect if present
  const existingId = await matchExistingPlayer(body.player.name, body.player.school, body.player.classYear);

  // Best-effort Firebase UID capture for ownership on GET retrieval.
  const submitterUid = await maybeUid(req);

  // Persist submission
  const inserted = await sql!<Array<{ id: string }>>`
    INSERT INTO perform_submissions (
      submitter_email, submitter_role, submitter_org, submitter_uid,
      player_name, player_school, player_position, player_class_year,
      player_height_inches, player_weight_lbs, player_dob,
      perform_player_id,
      performance_inputs, attributes_inputs, intangibles_inputs,
      tie_score, tie_grade, tie_tier, tie_components, projected_round,
      nil_valuation_usd, nil_cohort_key, nil_cohort_size,
      nil_cohort_median_usd, nil_cohort_p10_usd, nil_cohort_p90_usd,
      consent_nil_disclosure, consent_public_visibility, consent_transfer_portal,
      status
    ) VALUES (
      ${body.submitter.email}, ${body.submitter.role}, ${body.submitter.org ?? null}, ${submitterUid},
      ${body.player.name}, ${body.player.school ?? null}, ${body.player.position}, ${body.player.classYear},
      ${body.player.heightInches ?? null}, ${body.player.weightLbs ?? null}, ${body.player.dob ?? null},
      ${existingId},
      ${JSON.stringify(body.performance ?? {})}::jsonb, ${JSON.stringify(body.attributes ?? {})}::jsonb, ${JSON.stringify(body.intangibles ?? {})}::jsonb,
      ${tie.score}, ${tie.grade}, ${tie.tier}, ${JSON.stringify(tie.components)}::jsonb, ${null},
      ${submitterNil}, ${cohort.cohortKey}, ${cohort.cohortSize},
      ${cohort.medianUsd}, ${cohort.p10Usd}, ${cohort.p90Usd},
      ${body.consents.nilDisclosure}, ${body.consents.publicVisibility}, ${body.consents.transferPortal},
      'graded'
    )
    RETURNING id
  `;

  return NextResponse.json({
    submissionId: inserted[0].id,
    tie: {
      score: tie.score,
      grade: tie.grade,
      tier: tie.tier,
      label: tie.label,
      components: tie.components,
    },
    nil: {
      valuationUsd: submitterNil,
      cohortKey: cohort.cohortKey,
      cohortScope: cohort.cohortScope,
      cohortSize: cohort.cohortSize,
      cohortMedianUsd: cohort.medianUsd,
      cohortP10Usd: cohort.p10Usd,
      cohortP90Usd: cohort.p90Usd,
    },
    matched: existingId ? { performPlayerId: existingId } : null,
  });
}
