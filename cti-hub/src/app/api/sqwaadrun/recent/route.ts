import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';
import { requireAuthenticatedRequest } from '@/lib/server-auth';
import { applyRateLimit } from '@/lib/rate-limit';

/**
 * GET /api/sqwaadrun/recent
 * Returns the last N missions for the authenticated user. Reads from
 * sqwaadrun_staging.mission_log filtered by user_id attribution.
 *
 * Query:
 *   limit  — default 20, max 100
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuthenticatedRequest(req);
  if (!auth.ok) return auth.response;

  const rateLimitResponse = applyRateLimit(req, 'sqwaadrun-recent', {
    maxRequests: 60,
    windowMs: 60 * 1000,
    subject: auth.context.user.uid,
  });
  if (rateLimitResponse) return rateLimitResponse;

  if (!sql) {
    return NextResponse.json({ missions: [] });
  }

  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 20)));

  const userId = auth.context.user.uid;

  try {
    // Missions are attributed via kpi_snapshot.user_id (injected by the
    // mission proxy when the user dispatches). Falls back to the
    // primary_domain filter for legacy rows without attribution.
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
      WHERE kpi_snapshot->>'user_id' = ${userId}
         OR kpi_snapshot->'config'->>'user_id' = ${userId}
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
