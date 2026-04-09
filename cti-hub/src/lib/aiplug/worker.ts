/**
 * aiPLUG worker — async runtime dispatcher
 * ===========================================
 * Given a queued plug_runs row, looks up the runtime function via
 * the registry and executes it. Manages status transitions,
 * heartbeat timestamps, event emission, and output writeback.
 *
 * I-2 invocation pattern: the launch endpoint fires this
 * function WITHOUT awaiting so the HTTP response returns
 * immediately while the worker runs in the background of the
 * Node process. Next.js standalone mode keeps the process alive
 * across requests so background tasks complete normally.
 *
 * Known limitations (I-2d fixes):
 *   - If the container restarts mid-run, the run stays in
 *     `running` state forever. A cron-based reaper should mark
 *     stale rows (last_heartbeat > 5 min old) as `failed`.
 *   - No retries on runtime failure yet.
 *   - No resume-from-checkpoint.
 */

import { sql } from '@/lib/insforge';
import { ensureAiplugTables } from '@/lib/aiplug/schema';
import type {
  PlugRow,
  PlugRunRow,
} from '@/lib/aiplug/types';
import { getRuntime, type RuntimeContext } from './runtimes/registry';

async function emitEvent(
  runId: string,
  kind: 'heartbeat' | 'stage' | 'info' | 'output' | 'error',
  stage: string,
  message: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  if (!sql) return;
  try {
    await sql`
      INSERT INTO plug_run_events (run_id, kind, stage, message, payload)
      VALUES (${runId}, ${kind}, ${stage}, ${message}, ${JSON.stringify(payload)}::jsonb)
    `;
    if (kind === 'heartbeat' || kind === 'stage') {
      await sql`
        UPDATE plug_runs SET last_heartbeat = now() WHERE id = ${runId}
      `;
    }
  } catch (err) {
    console.error('[aiplug-worker] emit failed:', err instanceof Error ? err.message : err);
  }
}

async function persistOutputs(
  runId: string,
  outputs: Record<string, unknown>,
): Promise<void> {
  if (!sql) return;
  await sql`
    UPDATE plug_runs
    SET outputs = ${JSON.stringify(outputs)}::jsonb,
        last_heartbeat = now()
    WHERE id = ${runId}
  `;
}

/**
 * Fire-and-forget: the caller does NOT await this. Runs the
 * requested plug_run to completion, writing events + status
 * transitions along the way.
 */
export async function runPlugAsync(runId: string): Promise<void> {
  if (!sql) {
    console.error('[aiplug-worker] no sql client; cannot run');
    return;
  }

  try {
    await ensureAiplugTables();

    const rows = (await sql`
      SELECT
        pr.id, pr.plug_id, pr.user_id, pr.status, pr.inputs, pr.outputs,
        pr.error_message, pr.started_at, pr.finished_at, pr.last_heartbeat,
        pr.cost_tokens, pr.created_at,
        p.id as p_id, p.slug as p_slug, p.name as p_name, p.tagline as p_tagline,
        p.description as p_description, p.category as p_category,
        p.hero_image_url as p_hero_image_url, p.status as p_status,
        p.features as p_features, p.tags as p_tags, p.price_cents as p_price_cents,
        p.runtime_key as p_runtime_key, p.featured as p_featured,
        p.created_at as p_created_at, p.updated_at as p_updated_at
      FROM plug_runs pr
      INNER JOIN plugs p ON p.id = pr.plug_id
      WHERE pr.id = ${runId} AND pr.status = 'queued'
      LIMIT 1
    `) as unknown as Array<
      PlugRunRow & {
        p_id: string;
        p_slug: string;
        p_name: string;
        p_tagline: string;
        p_description: string;
        p_category: string;
        p_hero_image_url: string;
        p_status: string;
        p_features: string[];
        p_tags: string[];
        p_price_cents: number;
        p_runtime_key: string;
        p_featured: boolean;
        p_created_at: string;
        p_updated_at: string;
      }
    >;

    if (rows.length === 0) {
      console.warn(`[aiplug-worker] run ${runId} not found or not queued`);
      return;
    }

    const row = rows[0];
    const plug: PlugRow = {
      id: row.p_id,
      slug: row.p_slug,
      name: row.p_name,
      tagline: row.p_tagline,
      description: row.p_description,
      category: row.p_category,
      hero_image_url: row.p_hero_image_url,
      status: row.p_status as PlugRow['status'],
      features: row.p_features,
      tags: row.p_tags,
      price_cents: row.p_price_cents,
      runtime_key: row.p_runtime_key,
      featured: row.p_featured,
      created_at: row.p_created_at,
      updated_at: row.p_updated_at,
    };
    const run: PlugRunRow = {
      id: row.id,
      plug_id: row.plug_id,
      user_id: row.user_id,
      status: row.status,
      inputs: row.inputs,
      outputs: row.outputs,
      error_message: row.error_message,
      started_at: row.started_at,
      finished_at: row.finished_at,
      last_heartbeat: row.last_heartbeat,
      cost_tokens: row.cost_tokens,
      created_at: row.created_at,
    };

    const runtime = getRuntime(plug.runtime_key);
    if (!runtime) {
      await sql`
        UPDATE plug_runs
        SET status = 'failed',
            error_message = ${`No runtime registered for key: ${plug.runtime_key}`},
            finished_at = now()
        WHERE id = ${runId}
      `;
      await emitEvent(runId, 'error', 'registry', `No runtime for key ${plug.runtime_key}`);
      return;
    }

    // Transition to running
    await sql`
      UPDATE plug_runs
      SET status = 'running', started_at = now(), last_heartbeat = now()
      WHERE id = ${runId}
    `;
    await emitEvent(runId, 'stage', 'starting', `Runtime ${plug.runtime_key} starting`);

    const ctx: RuntimeContext = {
      run,
      plug,
      emit: (kind, stage, message, payload) =>
        emitEvent(runId, kind, stage, message, payload ?? {}),
      persistOutputs: outputs => persistOutputs(runId, outputs),
    };

    let result;
    try {
      result = await runtime(ctx);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await emitEvent(runId, 'error', 'runtime', `Runtime threw: ${msg.slice(0, 200)}`);
      result = {
        outputs: {},
        status: 'failed' as const,
        errorMessage: msg,
        costTokens: 0,
      };
    }

    // Final writeback
    await sql`
      UPDATE plug_runs
      SET status = ${result.status},
          outputs = ${JSON.stringify(result.outputs)}::jsonb,
          error_message = ${result.errorMessage ?? ''},
          cost_tokens = ${result.costTokens ?? 0},
          finished_at = now(),
          last_heartbeat = now()
      WHERE id = ${runId}
    `;
    await emitEvent(
      runId,
      result.status === 'succeeded' ? 'stage' : 'error',
      'finished',
      result.status === 'succeeded' ? 'Run complete' : `Run failed: ${result.errorMessage ?? 'unknown'}`,
      { cost_tokens: result.costTokens ?? 0 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[aiplug-worker] fatal:', msg);
    try {
      if (sql) {
        await sql`
          UPDATE plug_runs
          SET status = 'failed',
              error_message = ${`Worker fatal: ${msg.slice(0, 200)}`},
              finished_at = now()
          WHERE id = ${runId}
        `;
      }
    } catch {
      // best effort
    }
  }
}
