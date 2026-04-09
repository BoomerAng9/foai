import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';
import { ensureAiplugTables } from '@/lib/aiplug/schema';
import type { PlugRow, PlugRunRow } from '@/lib/aiplug/types';

/**
 * POST /api/aiplug/[slug]/launch
 * ================================
 * Creates a new plug_runs row in `queued` state. I-1 does not
 * actually execute the runtime — it returns the queued run so
 * the UI can show a "launching..." state and the detail page can
 * link to the run. I-2 wires the real autonomous runtime that
 * picks up queued rows, runs the long-loop worker with heartbeat,
 * streams events into plug_run_events, and writes outputs.
 *
 * Body: { inputs?: Record<string, unknown> }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { slug } = await params;
  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
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

    // Seed an info event so the Live Look In panel has something to show
    // before the runtime (I-2) begins streaming real heartbeats.
    await sql`
      INSERT INTO plug_run_events (run_id, kind, stage, message, payload)
      VALUES (
        ${inserted[0].id},
        'info',
        'queued',
        ${`Queued ${plug.slug} launch. Runtime will begin shortly.`},
        ${'{}'}::jsonb
      )
    `;

    return NextResponse.json({ run: inserted[0] }, { status: 201 });
  } catch (err) {
    console.error('[aiplug launch] POST error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to launch plug' }, { status: 500 });
  }
}
