import { NextRequest, NextResponse } from 'next/server';
import { sql, requireDb } from '@/lib/db';
import { getAdminAuth } from '@/lib/firebase/admin';

/**
 * GET /api/tie/submissions/[id] — retrieve a TIE submission (SHIP-CHECKLIST Gate 3 · Items 18 + 19).
 *
 * Visibility rules, evaluated in order:
 *   1. Submission not found → 404 `not_found`
 *   2. Submission is public (consent_public_visibility = true) → 200
 *   3. Requester is the owner (verified Firebase UID matches submitter_uid) → 200
 *   4. Otherwise → 404 `not_found` (anti-enumeration: never confirm existence of a
 *      private submission to an outsider)
 *
 * Owner check is done via Firebase admin verifyIdToken; no fallback on the
 * user-controlled submitter_email field.
 */

const AUTH_COOKIE = 'firebase-auth-token';

type SubmissionRow = {
  id: string;
  submitter_email: string;
  submitter_role: string;
  submitter_org: string | null;
  submitter_uid: string | null;
  player_name: string;
  player_school: string | null;
  player_position: string;
  player_class_year: string;
  tie_score: string | number | null;
  tie_grade: string | null;
  tie_tier: string | null;
  tie_components: unknown;
  projected_round: number | null;
  nil_valuation_usd: number | null;
  nil_cohort_key: string | null;
  nil_cohort_size: number | null;
  nil_cohort_median_usd: number | null;
  nil_cohort_p10_usd: number | null;
  nil_cohort_p90_usd: number | null;
  consent_public_visibility: boolean;
  created_at: string;
};

async function getRequesterUid(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const dbErr = requireDb();
  if (dbErr) return NextResponse.json({ error: 'db_unavailable' }, { status: 503 });

  const { id } = await params;
  // Defensive validation — UUIDs are 36 chars with dashes; reject anything
  // that obviously isn't a UUID to keep the DB from seeing garbage ids.
  if (!/^[0-9a-fA-F-]{8,64}$/.test(id)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const rows = await sql!<SubmissionRow[]>`
    SELECT
      id, submitter_email, submitter_role, submitter_org, submitter_uid,
      player_name, player_school, player_position, player_class_year,
      tie_score, tie_grade, tie_tier, tie_components, projected_round,
      nil_valuation_usd, nil_cohort_key, nil_cohort_size,
      nil_cohort_median_usd, nil_cohort_p10_usd, nil_cohort_p90_usd,
      consent_public_visibility, created_at
    FROM perform_submissions
    WHERE id = ${id}::uuid
    LIMIT 1
  `.catch(() => [] as SubmissionRow[]);

  const row = rows[0];
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const uid = await getRequesterUid(request);
  const isOwner = !!(uid && row.submitter_uid && uid === row.submitter_uid);
  const isPublic = row.consent_public_visibility === true;

  if (!isPublic && !isOwner) {
    // Anti-enumeration: return the same 404 as if the row didn't exist.
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Owners see their own email + role + org; public viewers see the graded
  // subject plus non-PII fields.
  const body = {
    submissionId: row.id,
    player: {
      name: row.player_name,
      school: row.player_school,
      position: row.player_position,
      classYear: row.player_class_year,
    },
    tie: {
      score: typeof row.tie_score === 'string' ? parseFloat(row.tie_score) : row.tie_score,
      grade: row.tie_grade,
      tier: row.tie_tier,
      components: row.tie_components,
      projectedRound: row.projected_round,
    },
    nil: {
      valuationUsd: row.nil_valuation_usd,
      cohortKey: row.nil_cohort_key,
      cohortSize: row.nil_cohort_size,
      cohortMedianUsd: row.nil_cohort_median_usd,
      cohortP10Usd: row.nil_cohort_p10_usd,
      cohortP90Usd: row.nil_cohort_p90_usd,
    },
    visibility: isPublic ? 'public' : 'owner_only',
    createdAt: row.created_at,
    ...(isOwner
      ? {
          submitter: {
            email: row.submitter_email,
            role: row.submitter_role,
            org: row.submitter_org,
          },
        }
      : {}),
  };

  return NextResponse.json(body);
}
