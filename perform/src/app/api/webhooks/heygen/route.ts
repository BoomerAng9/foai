import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { safeCompare } from '@/lib/auth-guard';

/**
 * POST /api/webhooks/heygen — HeyGen video-ready callback
 *
 * HeyGen calls this when an async video render completes.
 * Body shape (HeyGen v2):
 *   { event_type: 'avatar_video.success' | 'avatar_video.fail',
 *     event_data: { video_id, url, callback_id?, error? } }
 *
 * Auth: HeyGen signs with a shared secret in `x-signature` or
 * query param `token`. We verify via HEYGEN_WEBHOOK_SECRET.
 */

const SECRET = process.env.HEYGEN_WEBHOOK_SECRET || '';

async function ensureTable() {
  if (!sql) return;
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS analyst_intro_videos (
      id SERIAL PRIMARY KEY,
      analyst_id TEXT NOT NULL,
      video_id TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      video_url TEXT,
      error TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )
  `);
}

export async function POST(req: NextRequest) {
  if (!SECRET) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }
  const provided =
    req.headers.get('x-signature') ||
    req.headers.get('x-heygen-signature') ||
    req.nextUrl.searchParams.get('token') ||
    '';
  if (!safeCompare(provided, SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  let body: { event_type?: string; event_data?: { video_id?: string; url?: string; error?: string } };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const videoId = body.event_data?.video_id;
  if (!videoId) return NextResponse.json({ error: 'video_id missing' }, { status: 400 });

  await ensureTable();

  const success = body.event_type === 'avatar_video.success';
  const videoUrl = body.event_data?.url || null;
  const error = body.event_data?.error || null;

  await sql`
    UPDATE analyst_intro_videos
    SET status = ${success ? 'completed' : 'failed'},
        video_url = ${videoUrl},
        error = ${error},
        completed_at = NOW()
    WHERE video_id = ${videoId}
  `;

  return NextResponse.json({ ok: true });
}
