import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';
import { requireAuthenticatedRequest } from '@/lib/server-auth';

/**
 * GET /api/sqwaadrun/mission/[id]
 * --------------------------------
 * Returns the full mission + every scrape_artifact for that mission,
 * filtered to the caller's user_id. 403 if the mission was dispatched
 * by someone else. 404 if no such mission.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedRequest(req);
  if (!auth.ok) return auth.response;

  if (!sql) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const { id: rawId } = await ctx.params;
  const id = rawId.trim();
  if (!id || !/^MISSION-\d+$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid mission id' }, { status: 400 });
  }

  const userId = auth.context.user.uid;

  try {
    // ── Mission log row ──
    const missionRows = await sql`
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
        kpi_snapshot,
        created_at,
        completed_at
      FROM sqwaadrun_staging.mission_log
      WHERE mission_id = ${id}
      LIMIT 1
    `;

    const mission = missionRows[0];
    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    // ── User attribution guard ──
    const kpi = mission.kpi_snapshot as Record<string, unknown> | null;
    const missionUserId = (kpi?.user_id as string | undefined) ||
      ((kpi?.config as Record<string, unknown> | undefined)?.user_id as string | undefined);

    if (missionUserId && missionUserId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── Artifacts for the mission ──
    const artifactRows = await sql`
      SELECT
        id,
        url,
        url_hash,
        content_hash,
        source_domain,
        status_code,
        title,
        meta_description,
        markdown,
        clean_text,
        links,
        images,
        structured_data,
        gcs_html_path,
        scraped_at
      FROM sqwaadrun_staging.scrape_artifact
      WHERE mission_id = ${id}
      ORDER BY scraped_at ASC
    `;

    return NextResponse.json({
      mission: {
        mission_id: mission.mission_id,
        mission_type: mission.mission_type,
        intent: mission.intent,
        target_count: Number(mission.target_count || 0),
        status: mission.status,
        primary_domain: mission.primary_domain,
        results_count: Number(mission.results_count || 0),
        elapsed_seconds: Number(mission.elapsed_seconds || 0),
        throughput_pps: Number(mission.throughput_pps || 0),
        error: mission.error,
        created_at: mission.created_at,
        completed_at: mission.completed_at,
      },
      artifacts: artifactRows.map((a) => ({
        id: Number(a.id),
        url: a.url,
        content_hash: a.content_hash,
        source_domain: a.source_domain,
        status_code: a.status_code,
        title: a.title,
        meta_description: a.meta_description,
        markdown: a.markdown,
        clean_text: a.clean_text,
        links: a.links ?? [],
        images: a.images ?? [],
        structured_data: a.structured_data ?? {},
        gcs_html_path: a.gcs_html_path,
        scraped_at: a.scraped_at,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Query failed',
        mission: null,
        artifacts: [],
      },
      { status: 500 },
    );
  }
}
