import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { rateLimit } from '@/lib/rate-limit-simple';
import { sql } from '@/lib/insforge';
import { ensureAiplugTables } from '@/lib/aiplug/schema';
import type { PlugRow, PlugRunRow } from '@/lib/aiplug/types';
import { runPlugAsync } from '@/lib/aiplug/worker';

/**
 * POST /api/aiplug/[slug]/launch
 * ================================
 * Creates a queued plug_runs row and fires the runtime worker in
 * the background (fire-and-forget — the HTTP response returns
 * immediately while the worker runs the agentic cycle in the Node
 * process). The client polls /api/aiplug/runs/[runId] to see live
 * progress.
 *
 * Body: { inputs?: Record<string, unknown> }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (!rateLimit(auth.userId, 5, 60000)) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' }, { status: 429 });
  }

  const { slug } = await params;
  if (!sql) {
    return NextResponse.json({ error: 'Service temporarily unavailable. Please try again in a moment.' }, { status: 503 });
  }

  let inputs: Record<string, unknown> = {};
  try {
    const raw = await request.text();
    if (raw.trim().length > 0) {
      const body = JSON.parse(raw) as { inputs?: Record<string, unknown> };
      inputs = body.inputs ?? {};
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    await ensureAiplugTables();

    const plugRows = (await sql`
      SELECT id, slug, status, runtime_key FROM plugs WHERE slug = ${slug} LIMIT 1
    `) as unknown as Pick<PlugRow, 'id' | 'slug' | 'status' | 'runtime_key'>[];

    if (plugRows.length === 0) {
      return NextResponse.json({ error: 'Plug not found' }, { status: 404 });
    }

    const plug = plugRows[0];
    if (plug.status !== 'ready' && plug.status !== 'beta') {
      return NextResponse.json(
        { error: `Plug status is ${plug.status} — cannot launch` },
        { status: 409 },
      );
    }

    const inserted = (await sql`
      INSERT INTO plug_runs (plug_id, user_id, status, inputs)
      VALUES (${plug.id}, ${auth.userId}, 'queued', ${JSON.stringify(inputs)}::jsonb)
      RETURNING id, plug_id, user_id, status, inputs, outputs, error_message,
                started_at, finished_at, last_heartbeat, cost_tokens, created_at
    `) as unknown as PlugRunRow[];

    const run = inserted[0];

    // Seed an info event so the Live Look In panel has something to
    // show before the worker transitions the run to 'running'.
    await sql`
      INSERT INTO plug_run_events (run_id, kind, stage, message, payload)
      VALUES (
        ${run.id},
        'info',
        'queued',
        ${`Queued ${plug.slug} launch. Runtime will begin shortly.`},
        ${'{}'}::jsonb
      )
    `;

    // Fire the runtime worker in the background. Do NOT await — the
    // HTTP response returns immediately while the worker runs in
    // the Node process. Errors inside the worker are logged and
    // persisted to plug_runs.status = 'failed'.
    runPlugAsync(run.id).catch(err => {
      console.error(`[aiplug launch] worker ${run.id} threw:`, err);
    });

    return NextResponse.json({ run }, { status: 201 });
  } catch (err) {
    console.error('[aiplug launch] POST error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to launch plug' }, { status: 500 });
  }
}
