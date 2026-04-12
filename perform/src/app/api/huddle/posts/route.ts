import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { notifyNewHuddlePost } from '@/lib/notifications/triggers';
import { safeCompare, requireAuth } from '@/lib/auth-guard';

const CREATE_POSTS = `
  CREATE TABLE IF NOT EXISTS huddle_posts (
    id SERIAL PRIMARY KEY,
    analyst_id TEXT NOT NULL,
    post_type TEXT NOT NULL DEFAULT 'take',
    content TEXT NOT NULL,
    tags TEXT[],
    player_ref TEXT,
    likes INTEGER DEFAULT 0,
    reposts INTEGER DEFAULT 0,
    replies INTEGER DEFAULT 0,
    pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

const CREATE_PROFILES = `
  CREATE TABLE IF NOT EXISTS huddle_profiles (
    id SERIAL PRIMARY KEY,
    analyst_id TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    handle TEXT UNIQUE NOT NULL,
    bio TEXT,
    show_name TEXT,
    avatar_color TEXT,
    followers INTEGER DEFAULT 0,
    following INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

async function ensureTables() {
  if (!sql) throw new Error('Database not configured');
  await sql.unsafe(CREATE_POSTS);
  await sql.unsafe(CREATE_PROFILES);
}

const VALID_POST_TYPES = ['take', 'analysis', 'news', 'prediction', 'thread'];
const MAX_CONTENT_LENGTH = 10000;
const MAX_TAGS = 10;

export async function GET(req: NextRequest) {
  try {
    await ensureTables();
    if (!sql) throw new Error('Database not configured');
    const url = req.nextUrl;
    const analyst = url.searchParams.get('analyst');
    const type = url.searchParams.get('type');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = `SELECT id, analyst_id, post_type, content, tags, player_ref, likes, reposts, replies, pinned, created_at FROM huddle_posts WHERE 1=1`;
    const params: (string | number)[] = [];
    let paramIdx = 1;

    if (analyst) {
      query += ` AND analyst_id = $${paramIdx++}`;
      params.push(analyst);
    }
    if (type && VALID_POST_TYPES.includes(type)) {
      query += ` AND post_type = $${paramIdx++}`;
      params.push(type);
    }

    const countQuery = query.replace(/SELECT .+ FROM/, 'SELECT COUNT(*)::int as total FROM');
    query += ` ORDER BY pinned DESC, created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);

    const [posts, countResult] = await Promise.all([
      sql.unsafe(query, params),
      sql.unsafe(countQuery, params.slice(0, -2)),
    ]);

    return NextResponse.json({
      posts,
      total: countResult[0]?.total || 0,
      limit,
      offset,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Auth: pipeline key OR Firebase session — must pass one
  const pipelineKey = process.env.PIPELINE_AUTH_KEY;
  const authHeader = req.headers.get('authorization')?.replace('Bearer ', '') || '';
  const hasPipelineAuth = pipelineKey && safeCompare(authHeader, pipelineKey);

  if (!hasPipelineAuth) {
    const authResult = await requireAuth(req);
    if (!authResult.ok) return authResult.response;
  }

  try {
    await ensureTables();
    if (!sql) throw new Error('Database not configured');

    const body = await req.json();
    const { analyst_id, content, post_type, tags, player_ref } = body;

    // Input validation
    if (!analyst_id || typeof analyst_id !== 'string' || analyst_id.length > 100) {
      return NextResponse.json({ error: 'Invalid analyst_id' }, { status: 400 });
    }
    if (!content || typeof content !== 'string' || content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json({ error: `content required, max ${MAX_CONTENT_LENGTH} chars` }, { status: 400 });
    }
    if (post_type && !VALID_POST_TYPES.includes(post_type)) {
      return NextResponse.json({ error: `Invalid post_type. Allowed: ${VALID_POST_TYPES.join(', ')}` }, { status: 400 });
    }
    if (tags && (!Array.isArray(tags) || tags.length > MAX_TAGS)) {
      return NextResponse.json({ error: `tags must be array, max ${MAX_TAGS}` }, { status: 400 });
    }
    if (player_ref && (typeof player_ref !== 'string' || player_ref.length > 200)) {
      return NextResponse.json({ error: 'Invalid player_ref' }, { status: 400 });
    }

    const [post] = await sql`
      INSERT INTO huddle_posts (analyst_id, content, post_type, tags, player_ref)
      VALUES (${analyst_id}, ${content}, ${post_type || 'take'}, ${tags || []}, ${player_ref || null})
      RETURNING id, analyst_id, post_type, content, tags, player_ref, likes, reposts, replies, pinned, created_at`;

    await sql`UPDATE huddle_profiles SET post_count = post_count + 1 WHERE analyst_id = ${analyst_id}`;

    notifyNewHuddlePost(post).catch(() => {});

    return NextResponse.json({ ok: true, post });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
