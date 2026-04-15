import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { safeCompare } from '@/lib/auth-guard';
import { ANALYSTS } from '@/lib/analysts/personas';
import { generateHeygenVideo, heygenAvailable } from '@/lib/voice/heygen-client';

/**
 * POST /api/analysts/generate-intros — kick off HeyGen intro renders
 *
 * One talking-head intro video per analyst (5 total). Each analyst
 * reads a 15-20s intro in their own voice. HeyGen returns async
 * video_ids that complete via /api/webhooks/heygen.
 *
 * Auth: PIPELINE_AUTH_KEY bearer.
 * Body (optional): { analystIds?: string[] } — restrict to subset.
 */

const INTRO_SCRIPTS: Record<string, string> = {
  'void-caster': "I'm Void-Caster. I've called every pick since the first. When the lights go dark and the commissioner steps to the mic, that's my time. Welcome to draft night.",
  'the-haze': "Yo, we The Haze. Haze and Smoke, two Blinn boys who see this draft two completely different ways. If you want takes that are too clean, this ain't it.",
  'the-colonel': "The Colonel here, broadcasting from Tony's Pizza in the back booth. I played ball in '87. I've seen every draft since. Let me tell you what these kids got right — and what they don't.",
  'astra-novatos': "Astra Novatos. I read tape the way I read cashmere — through the details. The things nobody else sees. This is the lens.",
  'bun-e': "Bun-E. Phone Home. Covering the draft through the lens of leadership, sharp analysis, and the women who built the teams you think you know.",
};

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
  const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!PIPELINE_KEY || !safeCompare(token, PIPELINE_KEY)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!heygenAvailable()) {
    return NextResponse.json({ error: 'HEYGEN_API_KEY not provisioned' }, { status: 503 });
  }
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  await ensureTable();

  let body: { analystIds?: string[] } = {};
  try { body = await req.json(); } catch {}
  const origin = req.nextUrl.origin;
  const targets = body.analystIds?.length
    ? ANALYSTS.filter(a => body.analystIds!.includes(a.id))
    : ANALYSTS;

  const results: { analystId: string; videoId: string | null; error?: string }[] = [];

  for (const analyst of targets) {
    const script = INTRO_SCRIPTS[analyst.id];
    if (!script) {
      results.push({ analystId: analyst.id, videoId: null, error: 'No intro script' });
      continue;
    }
    const photoUrl = `${origin}${analyst.imagePath}`;

    const result = await generateHeygenVideo({
      analystId: analyst.id,
      photoUrl,
      inputText: script,
      title: `${analyst.name} — intro`,
      talkingStyle: 'expressive',
      width: 1920,
      height: 1080,
      backgroundType: 'color',
      backgroundColor: analyst.color || '#0A0A0F',
    });

    if (result.videoId) {
      await sql`
        INSERT INTO analyst_intro_videos (analyst_id, video_id, status)
        VALUES (${analyst.id}, ${result.videoId}, 'pending')
        ON CONFLICT (video_id) DO NOTHING
      `;
    }
    results.push({ analystId: analyst.id, videoId: result.videoId, error: result.error });
  }

  return NextResponse.json({
    dispatched: results.filter(r => r.videoId).length,
    failed: results.filter(r => !r.videoId).length,
    results,
  });
}

export async function GET(req: NextRequest) {
  const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!PIPELINE_KEY || !safeCompare(token, PIPELINE_KEY)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  await ensureTable();
  const rows = await sql`
    SELECT analyst_id, video_id, status, video_url, error, created_at, completed_at
    FROM analyst_intro_videos
    ORDER BY created_at DESC
  `;
  return NextResponse.json({ videos: rows });
}
