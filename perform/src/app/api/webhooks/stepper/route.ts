import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * POST /api/webhooks/stepper — Webhook receiver for Stepper and n8n
 *
 * Accepts form submissions, triggers Per|Form actions (grade player,
 * run pipeline, generate content), and logs the call for reliability tracking.
 *
 * Body: {
 *   action: 'grade' | 'pipeline' | 'content' | 'ping',
 *   payload: { ... action-specific data }
 *   source: 'stepper' | 'n8n' | 'test'
 * }
 */

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

async function ensureWebhookLog() {
  if (!sql) return;
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS webhook_log (
      id SERIAL PRIMARY KEY,
      source TEXT NOT NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'received',
      payload JSONB,
      response JSONB,
      latency_ms INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function POST(req: NextRequest) {
  const start = Date.now();

  // Webhook auth — REQUIRED. If WEBHOOK_SECRET is not configured, reject all POST requests.
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook not configured — WEBHOOK_SECRET env var required' }, { status: 503 });
  }
  const auth = req.headers.get('x-webhook-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
  if (auth !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { action?: string; payload?: Record<string, unknown>; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const action = body.action || 'ping';
  const source = body.source || 'unknown';
  const payload = body.payload || {};

  try {
    await ensureWebhookLog();

    let result: Record<string, unknown> = {};

    switch (action) {
      case 'ping':
        result = { pong: true, timestamp: new Date().toISOString() };
        break;

      case 'grade': {
        // Grade a player by name
        if (!sql) throw new Error('Database not configured');
        const name = payload.name as string;
        if (!name) throw new Error('payload.name required');
        const safeName = name.replace(/[%_\\]/g, '\\$&');
        const players = await sql`SELECT id, name, school, position, grade, tie_grade, tie_tier
          FROM perform_players WHERE LOWER(name) LIKE LOWER(${`%${safeName}%`}) LIMIT 5`;
        result = { players, count: players.length };
        break;
      }

      case 'pipeline': {
        // Trigger a data pipeline action
        result = { status: 'acknowledged', action: 'pipeline', note: 'Pipeline trigger received' };
        break;
      }

      case 'content': {
        // Request content generation
        result = { status: 'acknowledged', action: 'content', note: 'Content request received' };
        break;
      }

      case 'generate-post': {
        if (!sql) throw new Error('Database not configured');
        const analystId = (payload.analyst_id as string) || 'void-caster';
        const postType = (payload.post_type as string) || 'take';
        const playerName = payload.player as string;
        if (!playerName && postType !== 'prediction') throw new Error('payload.player required');

        // Import dynamically to avoid circular deps
        const { generateTakeFromPlayer, generateScoutingPost, generatePredictionPost } = await import('@/lib/huddle/post-generator');
        let generated;
        if (postType === 'prediction') generated = await generatePredictionPost(analystId);
        else if (postType === 'scouting') generated = await generateScoutingPost(analystId, playerName);
        else generated = await generateTakeFromPlayer(analystId, playerName);

        if (!generated) throw new Error('Post generation failed');

        const [post] = await sql`INSERT INTO huddle_posts (analyst_id, content, post_type, tags, player_ref)
          VALUES (${generated.analyst_id}, ${generated.content}, ${generated.post_type}, ${generated.tags}, ${generated.player_ref})
          RETURNING id, analyst_id, post_type, created_at`;
        result = { post, generated: true };
        break;
      }

      case 'lookup': {
        // Look up a college player
        if (!sql) throw new Error('Database not configured');
        const search = payload.search as string;
        if (!search) throw new Error('payload.search required');
        const safeSearch = search.replace(/[%_\\]/g, '\\$&');
        const cfbPlayers = await sql`SELECT id, name, school, position, height, weight, class, conference
          FROM cfb_players WHERE LOWER(name) LIKE LOWER(${`%${safeSearch}%`}) AND season = '2026' LIMIT 10`;
        result = { players: cfbPlayers, count: cfbPlayers.length };
        break;
      }

      default:
        result = { error: `Unknown action: ${action}` };
    }

    const latency = Date.now() - start;

    // Log the webhook call
    if (sql) {
      await sql`INSERT INTO webhook_log (source, action, status, payload, response, latency_ms)
        VALUES (${source}, ${action}, 'success', ${JSON.stringify(payload)}::jsonb, ${JSON.stringify(result)}::jsonb, ${latency})`;
    }

    return NextResponse.json({ ok: true, action, result, latency_ms: latency });
  } catch (err) {
    const latency = Date.now() - start;
    const error = err instanceof Error ? err.message : 'Unknown error';

    if (sql) {
      try {
        await sql`INSERT INTO webhook_log (source, action, status, payload, response, latency_ms)
          VALUES (${source}, ${action}, 'error', ${JSON.stringify(payload)}::jsonb, ${JSON.stringify({ error })}::jsonb, ${latency})`;
      } catch {}
    }

    return NextResponse.json({ ok: false, error, latency_ms: latency }, { status: 500 });
  }
}

/**
 * GET /api/webhooks/stepper — Reliability report
 * Returns webhook call stats for monitoring.
 */
export async function GET(req: NextRequest) {
  // Require webhook secret or Firebase auth to view stats
  const secret = req.headers.get('x-webhook-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    const { requireAuth } = await import('@/lib/auth-guard');
    const authResult = await requireAuth(req);
    if (!authResult.ok) return authResult.response;
  }

  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    await ensureWebhookLog();

    const stats = await sql`
      SELECT
        source,
        action,
        status,
        COUNT(*)::int as calls,
        ROUND(AVG(latency_ms))::int as avg_latency_ms,
        MIN(created_at) as first_call,
        MAX(created_at) as last_call
      FROM webhook_log
      GROUP BY source, action, status
      ORDER BY source, action
    `;

    const total = await sql`SELECT COUNT(*)::int as total FROM webhook_log`;
    const success = await sql`SELECT COUNT(*)::int as cnt FROM webhook_log WHERE status = 'success'`;

    return NextResponse.json({
      total_calls: total[0].total,
      success_count: success[0].cnt,
      success_rate: total[0].total > 0 ? (success[0].cnt / total[0].total * 100).toFixed(1) + '%' : 'N/A',
      breakdown: stats,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
