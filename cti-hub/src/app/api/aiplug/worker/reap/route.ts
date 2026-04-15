import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';
import { ensureAiplugTables } from '@/lib/aiplug/schema';

/**
 * POST /api/aiplug/worker/reap
 * ==============================
 * Reaps stale plug_runs rows. A run is considered stale when it's
 * still in the `running` state but hasn't emitted a heartbeat in
 * more than N seconds (default 300 = 5 minutes).
 *
 * This is the I-2d fix for the known I-2 limitation: if the cti-hub
 * container restarts mid-run, the worker that was executing the
 * cycle disappears and the row is left in `running` forever. This
 * endpoint finds those orphaned rows and marks them `failed` so
 * the UI + Live Look In show the correct state.
 *
 * Auth: PIPELINE_AUTH_KEY bearer token. No user auth — this is
 * ops infrastructure, called by n8n / systemd / cron / GitHub
 * Actions, NOT by end users.
 *
 * Query params (optional):
 *   stale_seconds=N   — override the staleness threshold (default 300, min 60, max 3600)
 *   dry_run=1         — don't mutate, just return what would be reaped
 *
 * Response:
 *   {
 *     reaped: number,
 *     examined: number,
 *     dry_run: boolean,
 *     stale_seconds: number,
 *     runs: [{ id, plug_id, started_at, last_heartbeat, stale_for_seconds }]
 *   }
 */

const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';
const DEFAULT_STALE_SECONDS = 300;  // 5 minutes
const MIN_STALE_SECONDS = 60;        // 1 minute
const MAX_STALE_SECONDS = 3600;      // 1 hour

interface StaleRow {
  id: string;
  plug_id: string;
  started_at: string | null;
  last_heartbeat: string | null;
  stale_for_seconds: number;
}

export async function POST(request: NextRequest) {
  // Auth: PIPELINE_AUTH_KEY bearer. No user session — ops endpoint.
  // Use timing-safe comparison to prevent token-probing attacks.
  const { checkBearerKey } = await import('@/lib/security/timing-safe');
  const authResult = checkBearerKey(request, PIPELINE_KEY);
  if (!authResult.ok) {
    return NextResponse.json(authResult.body, { status: authResult.status });
  }

  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  // Parse params
  const url = new URL(request.url);
  const rawStale = Number(url.searchParams.get('stale_seconds') || DEFAULT_STALE_SECONDS);
  const staleSeconds = Math.max(
    MIN_STALE_SECONDS,
    Math.min(MAX_STALE_SECONDS, Number.isFinite(rawStale) ? Math.floor(rawStale) : DEFAULT_STALE_SECONDS),
  );
  const dryRun = url.searchParams.get('dry_run') === '1' || url.searchParams.get('dry_run') === 'true';

  try {
    await ensureAiplugTables();

    // Find stale runs. A run is stale if status='running' AND either:
    //   - last_heartbeat exists and is older than threshold, OR
    //   - last_heartbeat is NULL but started_at is older than threshold
    // (the second case catches runs that transitioned to 'running' but
    // never emitted a heartbeat, likely because the worker process died
    // before the first emit)
    const staleRows = (await sql`
      SELECT
        id,
        plug_id,
        started_at::text AS started_at,
        last_heartbeat::text AS last_heartbeat,
        EXTRACT(EPOCH FROM (now() - COALESCE(last_heartbeat, started_at, created_at)))::int AS stale_for_seconds
      FROM plug_runs
      WHERE status = 'running'
        AND COALESCE(last_heartbeat, started_at, created_at) < (now() - (${staleSeconds} || ' seconds')::interval)
      ORDER BY COALESCE(last_heartbeat, started_at, created_at) ASC
      LIMIT 100
    `) as unknown as StaleRow[];

    if (dryRun) {
      return NextResponse.json({
        reaped: 0,
        examined: staleRows.length,
        dry_run: true,
        stale_seconds: staleSeconds,
        runs: staleRows,
      });
    }

    let reaped = 0;
    for (const row of staleRows) {
      try {
        const errorMsg = `Reaped after ${row.stale_for_seconds}s of silence — likely orphaned by container restart or worker crash`;
        await sql`
          UPDATE plug_runs
          SET
            status = 'failed',
            error_message = ${errorMsg},
            finished_at = now()
          WHERE id = ${row.id}
            AND status = 'running'
        `;
        // Emit an error event so the Live Look In panel shows the reap reason
        await sql`
          INSERT INTO plug_run_events (run_id, kind, stage, message, payload)
          VALUES (
            ${row.id},
            'error',
            'reaped',
            ${errorMsg},
            ${JSON.stringify({ stale_for_seconds: row.stale_for_seconds, reaped_at: new Date().toISOString() })}::jsonb
          )
        `;
        reaped += 1;
      } catch (err) {
        console.error(
          `[aiplug reap] failed to reap ${row.id}:`,
          err instanceof Error ? err.message : err,
        );
        // Continue — best effort
      }
    }

    return NextResponse.json({
      reaped,
      examined: staleRows.length,
      dry_run: false,
      stale_seconds: staleSeconds,
      runs: staleRows,
    });
  } catch (err) {
    console.error('[aiplug reap] fatal:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Reap failed' },
      { status: 500 },
    );
  }
}
