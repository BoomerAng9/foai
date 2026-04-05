import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';

const VALID_CATEGORIES = ['player', 'draft', 'api', 'competitor', 'market', 'production', 'general'] as const;
const VALID_STATUSES = ['draft', 'active', 'archived'] as const;

async function ensureTable() {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS research_items (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      content TEXT NOT NULL DEFAULT '',
      tags TEXT[] DEFAULT '{}',
      source_url TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

let tableReady = false;

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }
  if (!sql) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  if (!tableReady) {
    await ensureTable();
    tableReady = true;
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search');

  let rows;
  if (category && search) {
    rows = await sql`
      SELECT * FROM research_items
      WHERE category = ${category}
        AND (title ILIKE ${'%' + search + '%'} OR content ILIKE ${'%' + search + '%'})
      ORDER BY created_at DESC
    `;
  } else if (category) {
    rows = await sql`
      SELECT * FROM research_items
      WHERE category = ${category}
      ORDER BY created_at DESC
    `;
  } else if (search) {
    rows = await sql`
      SELECT * FROM research_items
      WHERE title ILIKE ${'%' + search + '%'} OR content ILIKE ${'%' + search + '%'}
      ORDER BY created_at DESC
    `;
  } else {
    rows = await sql`
      SELECT * FROM research_items
      ORDER BY created_at DESC
    `;
  }

  return NextResponse.json({ items: rows });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }
  if (!sql) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  if (!tableReady) {
    await ensureTable();
    tableReady = true;
  }

  const body = await request.json();
  const { title, category, content, tags, source_url, status } = body;

  if (!title || !title.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }
  if (category && !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` }, { status: 400 });
  }
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
  }

  const tagArray = Array.isArray(tags) ? tags.filter((t: string) => typeof t === 'string' && t.trim()) : [];

  const rows = await sql`
    INSERT INTO research_items (user_id, title, category, content, tags, source_url, status)
    VALUES (
      ${auth.userId},
      ${title.trim()},
      ${category || 'general'},
      ${content || ''},
      ${tagArray},
      ${source_url || null},
      ${status || 'draft'}
    )
    RETURNING *
  `;

  return NextResponse.json({ item: rows[0] }, { status: 201 });
}
