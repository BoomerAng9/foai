import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';
import type { PlugRunRow, PlugRunEventRow } from '@/lib/aiplug/types';

/**
 * GET /api/aiplug/runs/[runId]
 * ==============================
 * Returns the run row + ordered event stream for the Live Look In
 * panel. Auth-gated — users can only view their own runs; owners
 * can view any run.
 *
 * The client polls this endpoint every ~2 seconds while the run
 * is in `queued` or `running` state, then stops polling once the
 * status transitions to a terminal state (succeeded, failed,
 * canceled, waiting_for_user).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { runId } = await params;
  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const runRows = (await sql`
      SELECT id, plug_id, user_id, status, inputs, outputs, error_message,
             started_at, finished_at, last_heartbeat, cost_tokens, created_at
      FROM plug_runs
      WHERE id = ${runId}
      LIMIT 1
    `) as unknown as PlugRunRow[];

    if (runRows.length === 0) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    const run = runRows[0];

    // Owner can see any run; other users only their own
    if (auth.role !== 'owner' && run.user_id !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const events = (await sql`
      SELECT id, run_id, kind, stage, message, payload, created_at
      FROM plug_run_events
      WHERE run_id = ${runId}
      ORDER BY created_at ASC
      LIMIT 500
    `) as unknown as PlugRunEventRow[];

    return NextResponse.json({ run, events });
  } catch (err) {
    console.error('[aiplug runs] GET error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to fetch run' }, { status: 500 });
  }
}
