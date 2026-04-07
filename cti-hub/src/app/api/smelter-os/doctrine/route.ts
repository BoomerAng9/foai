import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';
import { requireAuthenticatedRequest } from '@/lib/server-auth';
import { isOwner } from '@/lib/allowlist';

/**
 * GET /api/smelter-os/doctrine?limit=N
 * -------------------------------------
 * Owner-only. Returns the full mission audit from Neon
 * sqwaadrun_staging.mission_log (what General_Ang audits), ordered
 * by created_at desc.
 *
 * Unlike /api/sqwaadrun/recent (which filters to the caller's own
 * user_id), this returns EVERY mission across every tenant —
 * owner-only surface.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuthenticatedRequest(req);
  if (!auth.ok) return auth.response;
  if (!isOwner(auth.context.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!sql) {
    return NextResponse.json({ entries: [], total: 0, error: 'DB unavailable' });
  }

  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 50)));

  try {
    const rows = await sql`
      SELECT
        mission_id,
        mission_type,
        intent,
        target_count,
        status,
        signed_off_by,
        primary_domain,
        results_count,
        elapsed_seconds,
        throughput_pps,
        error,
        created_at,
        completed_at,
        kpi_snapshot
      FROM sqwaadrun_staging.mission_log
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    // Compute summary counts
    const [stats] = (await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
        COUNT(*) FILTER (WHERE signed_off_by = 'general_ang')::int AS general_signed,
        COUNT(*) FILTER (WHERE signed_off_by = 'auto')::int AS auto_dispatched,
        COUNT(*) FILTER (WHERE signed_off_by = 'trcc_pipeline_auto')::int AS trcc_auto
      FROM sqwaadrun_staging.mission_log
    `) as unknown as Array<{
      total: number;
      completed: number;
      failed: number;
      general_signed: number;
      auto_dispatched: number;
      trcc_auto: number;
    }>;

    return NextResponse.json({
      entries: rows.map((r) => {
        const kpi = r.kpi_snapshot as Record<string, unknown> | null;
        return {
          mission_id: r.mission_id,
          mission_type: r.mission_type,
          intent: r.intent,
          target_count: Number(r.target_count || 0),
          status: r.status,
          signed_off_by: r.signed_off_by,
          primary_domain: r.primary_domain,
          results_count: Number(r.results_count || 0),
          elapsed_seconds: Number(r.elapsed_seconds || 0),
          throughput_pps: Number(r.throughput_pps || 0),
          error: r.error,
          user_id: (kpi?.user_id as string | undefined) || null,
          tier: (kpi?.tier as string | undefined) || null,
          created_at: r.created_at,
          completed_at: r.completed_at,
        };
      }),
      stats: stats || { total: 0, completed: 0, failed: 0, general_signed: 0, auto_dispatched: 0, trcc_auto: 0 },
      returned: rows.length,
    });
  } catch (err) {
    return NextResponse.json(
      {
        entries: [],
        stats: { total: 0, completed: 0, failed: 0 },
        error: err instanceof Error ? err.message : 'Query failed',
      },
      { status: 500 },
    );
  }
}
