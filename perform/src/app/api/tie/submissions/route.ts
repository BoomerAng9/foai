import { NextRequest, NextResponse } from 'next/server';
import { sql, requireDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth-guard';

/**
 * GET /api/tie/submissions — list the caller's own submissions (SHIP-CHECKLIST Gate 3 · Item 19).
 *
 * Requires a valid session. Returns only submissions where submitter_uid
 * matches the caller's Firebase UID. Ordered newest first, capped at 50
 * rows — pagination left for a follow-up if usage demands it.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ListRow = {
  id: string;
  player_name: string;
  player_position: string;
  player_class_year: string;
  tie_score: string | number | null;
  tie_grade: string | null;
  tie_tier: string | null;
  nil_valuation_usd: number | null;
  consent_public_visibility: boolean;
  created_at: string;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const dbErr = requireDb();
  if (dbErr) return NextResponse.json({ error: 'db_unavailable' }, { status: 503 });

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const rows = await sql!<ListRow[]>`
    SELECT
      id, player_name, player_position, player_class_year,
      tie_score, tie_grade, tie_tier, nil_valuation_usd,
      consent_public_visibility, created_at
    FROM perform_submissions
    WHERE submitter_uid = ${auth.userId}
    ORDER BY created_at DESC
    LIMIT 50
  `;

  return NextResponse.json({
    submissions: rows.map(r => ({
      submissionId: r.id,
      player: {
        name: r.player_name,
        position: r.player_position,
        classYear: r.player_class_year,
      },
      tie: {
        score: typeof r.tie_score === 'string' ? parseFloat(r.tie_score) : r.tie_score,
        grade: r.tie_grade,
        tier: r.tie_tier,
      },
      nil: { valuationUsd: r.nil_valuation_usd },
      visibility: r.consent_public_visibility ? 'public' : 'owner_only',
      createdAt: r.created_at,
    })),
    count: rows.length,
  });
}
