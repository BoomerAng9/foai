import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';
import { requireAuthenticatedRequest } from '@/lib/server-auth';
import { applyRateLimit } from '@/lib/rate-limit';

/**
 * GET /api/sqwaadrun/mission/[id]
 * --------------------------------
 * Authenticated. Returns the mission + its artifacts, strictly scoped
 * to the caller. Any mission without a matching user_id attribution
 * is treated as forbidden — no silent fall-through.
 *
 * Pagination + truncation to bound the response:
 *   - Artifacts capped at MAX_ARTIFACTS
 *   - markdown/clean_text capped at MAX_CONTENT_CHARS per artifact
 *   - total_artifacts + truncation flags returned for client UX
 */

const MAX_ARTIFACTS = 200;
const MAX_CONTENT_CHARS = 50_000;

// Loose ID format — supports MISSION-#### now, future prefixes/UUIDs
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

interface MissionRow {
  mission_id: string;
  mission_type: string;
  intent: string | null;
  target_count: number | string;
  status: string;
  signed_off_by: string | null;
  primary_domain: string | null;
  results_count: number | string;
  elapsed_seconds: number | string | null;
  throughput_pps: number | string | null;
  error: string | null;
  kpi_snapshot: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
}

interface ArtifactRow {
  id: number | string;
  url: string;
  content_hash: string | null;
  source_domain: string;
  status_code: number | null;
  title: string | null;
  meta_description: string | null;
  markdown: string | null;
  clean_text: string | null;
  links: unknown;
  images: unknown;
  structured_data: unknown;
  gcs_html_path: string | null;
  scraped_at: string;
}

function truncate(s: string | null, max: number): { value: string | null; truncated: boolean } {
  if (s == null) return { value: null, truncated: false };
  if (s.length <= max) return { value: s, truncated: false };
  return { value: s.slice(0, max), truncated: true };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedRequest(req);
  if (!auth.ok) return auth.response;

  const rateLimitResponse = applyRateLimit(req, 'sqwaadrun-mission-detail', {
    maxRequests: 60,
    windowMs: 60 * 1000,
    subject: auth.context.user.uid,
  });
  if (rateLimitResponse) return rateLimitResponse;

  if (!sql) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const { id: rawId } = await ctx.params;
  const id = (rawId || '').trim();
  if (!id || !ID_PATTERN.test(id)) {
    return NextResponse.json({ error: 'Invalid mission id' }, { status: 400 });
  }

  const userId = auth.context.user.uid;

  let missionRow: MissionRow | undefined;
  let artifactRows: ArtifactRow[] = [];
  let totalArtifacts = 0;

  try {
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
    `;
    missionRow = missionRows[0] as MissionRow | undefined;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Query failed' },
      { status: 500 },
    );
  }

  if (!missionRow) {
    return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
  }

  // ── STRICT attribution guard ──
  // A missing user_id is treated as "not yours". This prevents any
  // background / system-owned mission from leaking through this
  // customer endpoint.
  const kpi = missionRow.kpi_snapshot;
  const missionUserId =
    (kpi?.user_id as string | undefined) ||
    ((kpi?.config as Record<string, unknown> | undefined)?.user_id as string | undefined);

  if (!missionUserId || missionUserId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ── Artifacts (paginated + counted) ──
  try {
    const countResult = (await sql`
      SELECT COUNT(*)::int AS total
      FROM sqwaadrun_staging.scrape_artifact
      WHERE mission_id = ${id}
    `) as unknown as Array<{ total: number }>;
    totalArtifacts = countResult[0]?.total ?? 0;

    artifactRows = (await sql`
      SELECT
        id,
        url,
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
      LIMIT ${MAX_ARTIFACTS}
    `) as unknown as ArtifactRow[];
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Artifact query failed' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    mission: {
      mission_id: missionRow.mission_id,
      mission_type: missionRow.mission_type,
      intent: missionRow.intent,
      target_count: Number(missionRow.target_count || 0),
      status: missionRow.status,
      primary_domain: missionRow.primary_domain,
      results_count: Number(missionRow.results_count || 0),
      elapsed_seconds: Number(missionRow.elapsed_seconds || 0),
      throughput_pps: Number(missionRow.throughput_pps || 0),
      error: missionRow.error,
      created_at: missionRow.created_at,
      completed_at: missionRow.completed_at,
    },
    artifacts: artifactRows.map((a) => {
      const md = truncate(a.markdown, MAX_CONTENT_CHARS);
      const ct = truncate(a.clean_text, MAX_CONTENT_CHARS);
      return {
        id: Number(a.id),
        url: a.url,
        content_hash: a.content_hash,
        source_domain: a.source_domain,
        status_code: a.status_code,
        title: a.title,
        meta_description: a.meta_description,
        markdown: md.value,
        markdown_truncated: md.truncated,
        clean_text: ct.value,
        clean_text_truncated: ct.truncated,
        links: Array.isArray(a.links) ? a.links : [],
        images: Array.isArray(a.images) ? a.images : [],
        structured_data:
          a.structured_data && typeof a.structured_data === 'object'
            ? (a.structured_data as Record<string, unknown>)
            : {},
        gcs_html_path: a.gcs_html_path,
        scraped_at: a.scraped_at,
      };
    }),
    pagination: {
      total_artifacts: totalArtifacts,
      returned: artifactRows.length,
      capped_at: MAX_ARTIFACTS,
      more_available: totalArtifacts > artifactRows.length,
    },
  });
}
