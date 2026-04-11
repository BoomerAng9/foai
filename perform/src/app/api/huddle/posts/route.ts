import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { notifyNewHuddlePost } from '@/lib/notifications/triggers';
import { safeCompare } from '@/lib/auth-guard';

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

export async function GET(req: NextRequest) {
  try {
    await ensureTables();
    if (!sql) throw new Error('Database not configured');
    const url = req.nextUrl;
    const analyst = url.searchParams.get('analyst');
    const type = url.searchParams.get('type');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = `SELECT * FROM huddle_posts WHERE 1=1`;
    const params: (string | number)[] = [];
    let paramIdx = 1;

    if (analyst) {
      query += ` AND analyst_id = $${paramIdx++}`;
      params.push(analyst);
    }
    if (type) {
      query += ` AND post_type = $${paramIdx++}`;
      params.push(type);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)::int as total');
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
  // Auth required for POST — pipeline key or Firebase session
  const pipelineKey = process.env.PIPELINE_AUTH_KEY;
  const authHeader = req.headers.get('authorization')?.replace('Bearer ', '') || '';
  const hasPipelineAuth = pipelineKey && safeCompare(authHeader, pipelineKey);

  if (!hasPipelineAuth) {
    // Fall back to Firebase session auth
    const { requireAuth } = await import('@/lib/auth-guard');
    const authResult = await requireAuth(req);
    if (!authResult.ok) return authResult.response;
  }

  try {
    await ensureTables();
    if (!sql) throw new Error('Database not configured');

    const body = await req.json();
    const { analyst_id, content, post_type, tags, player_ref } = body;

    if (!analyst_id || !content) {
      return NextResponse.json({ error: 'analyst_id and content required' }, { status: 400 });
    }

    const [post] = await sql`
      INSERT INTO huddle_posts (analyst_id, content, post_type, tags, player_ref)
      VALUES (${analyst_id}, ${content}, ${post_type || 'take'}, ${tags || []}, ${player_ref || null})
      RETURNING *`;

    await sql`UPDATE huddle_profiles SET post_count = post_count + 1 WHERE analyst_id = ${analyst_id}`;

    // Send push notification for new huddle post (fire-and-forget)
    notifyNewHuddlePost(post).catch(() => {});

    return NextResponse.json({ ok: true, post });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
