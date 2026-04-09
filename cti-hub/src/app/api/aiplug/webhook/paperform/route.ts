import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';

/**
 * POST /api/aiplug/webhook/paperform
 * =====================================
 * Receives Paperform/Stepper webhook payloads when a form is submitted.
 * Maps the submission to a plug via form_id → plugs.paperform_form_id,
 * creates a queued plug_run with the submission data as inputs, and
 * (once I-2 runtime is deployed) fires the runtime.
 *
 * Auth: Paperform signs webhooks, but their signature verification
 * isn't documented in the public API. For now we use a shared secret
 * via the X-Webhook-Secret header, verified against PAPERFORM_WEBHOOK_SECRET
 * env. If unset, the webhook is OPEN (dev mode).
 *
 * Stepper configuration (done in the Paperform UI):
 *   1. Create a Stepper automation triggered "on form submission"
 *   2. Add a "Send webhook" action pointed at:
 *      https://cti.foai.cloud/api/aiplug/webhook/paperform
 *   3. Set the X-Webhook-Secret header to match PAPERFORM_WEBHOOK_SECRET
 *   4. Body format: raw JSON (Paperform sends the full submission object)
 *
 * For scheduled triggers (e.g. reaper every 5 min):
 *   1. Create a Stepper automation triggered "on schedule"
 *   2. Add a "Send webhook" action pointed at:
 *      https://cti.foai.cloud/api/aiplug/worker/reap
 *   3. Set Authorization: Bearer $PIPELINE_AUTH_KEY header
 *   4. Method: POST, no body needed
 *
 * The reaper endpoint (#117) is already built — Stepper just
 * needs to be pointed at it in the Paperform UI. This endpoint
 * handles the FORM SUBMISSION → PLUG LAUNCH flow.
 */

const WEBHOOK_SECRET = process.env.PAPERFORM_WEBHOOK_SECRET || '';

interface PaperformWebhookPayload {
  /** Paperform form slug or ID */
  form_id?: string;
  form_slug?: string;
  /** Submission ID from Paperform */
  submission_id?: string;
  /** Key-value pairs from the form fields */
  data?: Record<string, unknown>;
  /** Completed flag */
  completed?: boolean;
  /** Timestamp */
  created_at?: string;
}

export async function POST(request: NextRequest) {
  // Verify shared secret — REQUIRED in production. Never open.
  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Webhook not configured. Set PAPERFORM_WEBHOOK_SECRET.' },
      { status: 503 },
    );
  }
  const secret = request.headers.get('x-webhook-secret') || '';
  if (secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
  }

  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  let payload: PaperformWebhookPayload;
  try {
    payload = (await request.json()) as PaperformWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const formId = payload.form_id || payload.form_slug || '';
  if (!formId) {
    return NextResponse.json(
      { error: 'Missing form_id or form_slug in webhook payload' },
      { status: 400 },
    );
  }

  try {
    // Look up which plug is mapped to this Paperform form.
    // The plugs table needs a paperform_form_id column for this lookup.
    // If not present yet (schema hasn't been migrated), fall back to
    // matching by slug convention: form slug "smb-marketing-intake"
    // maps to plug slug "smb-marketing" via prefix match.
    let plugRows = await sql`
      SELECT id, slug, runtime_key, status
      FROM plugs
      WHERE slug = ${formId}
      LIMIT 1
    `;

    // Fallback: try prefix match (e.g. "smb-marketing-intake" → "smb-marketing")
    if (plugRows.length === 0 && formId.includes('-')) {
      const prefix = formId.split('-').slice(0, -1).join('-');
      plugRows = await sql`
        SELECT id, slug, runtime_key, status
        FROM plugs
        WHERE slug = ${prefix}
        LIMIT 1
      `;
    }

    if (plugRows.length === 0) {
      return NextResponse.json(
        {
          error: `No plug mapped to form "${formId}". Create a plug with matching slug or add a paperform_form_id mapping.`,
          code: 'no_plug_mapping',
        },
        { status: 404 },
      );
    }

    const plug = plugRows[0] as { id: string; slug: string; runtime_key: string; status: string };

    if (plug.status !== 'ready' && plug.status !== 'beta') {
      return NextResponse.json(
        { error: `Plug "${plug.slug}" status is ${plug.status} — cannot launch` },
        { status: 409 },
      );
    }

    // Build inputs from the Paperform submission data
    const inputs: Record<string, unknown> = {
      ...(payload.data || {}),
      _source: 'paperform_webhook',
      _form_id: formId,
      _submission_id: payload.submission_id || '',
      _submitted_at: payload.created_at || new Date().toISOString(),
    };

    // Create the queued run
    const inserted = await sql`
      INSERT INTO plug_runs (plug_id, user_id, status, inputs)
      VALUES (
        ${plug.id},
        'paperform-webhook',
        'queued',
        ${JSON.stringify(inputs)}::jsonb
      )
      RETURNING id, plug_id, user_id, status, created_at
    `;

    const run = inserted[0] as { id: string; plug_id: string; status: string; created_at: string };

    // Seed the initial event
    await sql`
      INSERT INTO plug_run_events (run_id, kind, stage, message, payload)
      VALUES (
        ${run.id},
        'info',
        'queued',
        ${`Queued via Paperform webhook (form: ${formId}, submission: ${payload.submission_id || 'N/A'})`},
        ${JSON.stringify({ form_id: formId, submission_id: payload.submission_id })}::jsonb
      )
    `;

    // NOTE: The runtime worker fires from the launch endpoint (I-2).
    // This webhook creates the queued row — the worker picks it up.
    // If the fire-and-forget pattern from the launch endpoint isn't
    // running here, the reaper + a polling worker would be needed.
    // For now, the queued row sits until a launch or worker tick picks it up.

    return NextResponse.json(
      {
        received: true,
        run_id: run.id,
        plug_slug: plug.slug,
        form_id: formId,
        message: `Queued ${plug.slug} run from Paperform submission`,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('[aiplug webhook/paperform] error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
