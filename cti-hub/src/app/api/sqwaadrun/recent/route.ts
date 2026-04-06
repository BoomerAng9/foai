import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';
import { requireAuthenticatedRequest } from '@/lib/server-auth';

/**
 * GET /api/sqwaadrun/recent
 * Returns the last N missions for the authenticated user. Reads from
 * sqwaadrun_staging.mission_log filtered by the user's quota period.
 *
 * Query:
 *   limit  — default 20, max 100
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuthenticatedRequest(req);
  if (!auth.ok) return auth.response;

  if (!sql) {
    return NextResponse.json({ missions: [] });
  }

  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 20)));

  try {
    // The mission_log doesn't have user_id directly — we filter by the
    // primary_domain matching domains the user has dispatched to in
    // their current period. For MVP we just return the most recent
    // missions globally; tighten the filter once per-user mission
    // attribution lands.
    const rows = await sql`
      SELECT
        mission_id,
        mission_type,
        status,
        primary_domain,
        results_count,
        throughput_pps,
        created_at,
        error
      FROM sqwaadrun_staging.mission_log
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return NextResponse.json({ missions: rows });
  } catch (err) {
    // Schema may not exist yet on this Neon database
    return NextResponse.json({
      missions: [],
      error: err instanceof Error ? err.message : 'query failed',
    });
  }
}
