/**
 * GET  /api/analysts/[name]/feed
 * POST /api/analysts/[name]/feed
 * ===============================
 * Feed = the analyst's published posts (analyst_posts table, owned by
 * migration 008). GET returns published rows only. POST queues a new
 * post; caller either supplies an explicit publish_at that matches the
 * analyst's 3-day stagger slot, or omits it and gets the next legal
 * slot.
 *
 * POST is gated by PIPELINE_AUTH_KEY — content is drafted by the
 * pipeline / Boomer_Ang orchestration, not by end users.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql, requireDb } from '@/lib/db';
import { getAnalyst } from '@/lib/analysts/personas';
import { nextSlot, validateSlot } from '@/lib/analysts/stagger';
import { safeCompare } from '@/lib/auth-guard';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  const analyst = getAnalyst(name);
  if (!analyst) {
    return NextResponse.json({ error: 'Analyst not found' }, { status: 404 });
  }

  const dbErr = requireDb();
  if (dbErr) return NextResponse.json({ articles: [] }, { status: dbErr.status });

  try {
    const rows = await sql!`
      SELECT
        id,
        analyst_id,
        player_id,
        content_type,
        title,
        body AS content,
        COALESCE(published_at, publish_at) AS created_at,
        publish_at,
        published
      FROM analyst_posts
      WHERE analyst_id = ${analyst.id}
        AND published = TRUE
      ORDER BY publish_at DESC
      LIMIT 20
    `;

    return NextResponse.json({ articles: rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Feed fetch failed';
    return NextResponse.json({ error: msg, articles: [] }, { status: 500 });
  }
}

interface PostBody {
  title?: unknown;
  body?: unknown;
  content_type?: unknown;
  player_id?: unknown;
  publish_at?: unknown;
}

const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';

export async function POST(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  // Pipeline auth — only the drafting pipeline can queue posts.
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!PIPELINE_KEY || !safeCompare(token, PIPELINE_KEY)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const analyst = getAnalyst(name);
  if (!analyst) {
    return NextResponse.json({ error: 'Analyst not found' }, { status: 404 });
  }

  const dbErr = requireDb();
  if (dbErr) return NextResponse.json(dbErr, { status: dbErr.status });

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const content = typeof body.body === 'string' ? body.body.trim() : '';
  if (!title || !content) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
  }

  const contentType =
    typeof body.content_type === 'string' && body.content_type.trim().length > 0
      ? body.content_type.trim()
      : 'article';

  const playerId =
    typeof body.player_id === 'number' && Number.isFinite(body.player_id)
      ? Math.floor(body.player_id)
      : null;

  // Compute publish slot: explicit if valid, otherwise next cadence slot.
  let publishAt: Date;
  if (body.publish_at && typeof body.publish_at === 'string') {
    const parsed = new Date(body.publish_at);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: 'publish_at is not a valid ISO timestamp' }, { status: 400 });
    }
    const slotErr = validateSlot(analyst.id, parsed);
    if (slotErr) {
      return NextResponse.json({ error: `publish_at invalid: ${slotErr}` }, { status: 400 });
    }
    publishAt = parsed;
  } else {
    publishAt = nextSlot(analyst.id).publishAt;
  }

  try {
    const [row] = (await sql!`
      INSERT INTO analyst_posts (analyst_id, player_id, content_type, title, body, publish_at)
      VALUES (${analyst.id}, ${playerId}, ${contentType}, ${title}, ${content}, ${publishAt})
      RETURNING id, analyst_id, player_id, content_type, title, publish_at, published, created_at
    `) as Array<{
      id: number;
      analyst_id: string;
      player_id: number | null;
      content_type: string;
      title: string;
      publish_at: Date;
      published: boolean;
      created_at: Date;
    }>;

    return NextResponse.json({ ok: true, post: row }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Queue failed';
    // Unique constraint = stagger collision, fail loud.
    if (msg.includes('uniq_analyst_posts_slot')) {
      return NextResponse.json(
        { error: 'Slot already taken for this analyst — stagger collision.', detail: msg },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
