import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';

const VALID_CATEGORIES = ['player', 'draft', 'api', 'competitor', 'market', 'production', 'general'] as const;
const VALID_STATUSES = ['draft', 'active', 'archived'] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }
  if (!sql) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const { id } = await params;
  const rows = await sql`SELECT * FROM research_items WHERE id = ${Number(id)} LIMIT 1`;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Research item not found' }, { status: 404 });
  }

  return NextResponse.json({ item: rows[0] });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }
  if (!sql) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const { id } = await params;
  const body = await request.json();
  const { title, category, content, tags, source_url, status } = body;

  if (category && !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` }, { status: 400 });
  }
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
  }

  // Build dynamic update
  const existing = await sql`SELECT * FROM research_items WHERE id = ${Number(id)} LIMIT 1`;
  if (existing.length === 0) {
    return NextResponse.json({ error: 'Research item not found' }, { status: 404 });
  }

  const tagArray = tags !== undefined
    ? (Array.isArray(tags) ? tags.filter((t: string) => typeof t === 'string' && t.trim()) : [])
    : undefined;

  const rows = await sql`
    UPDATE research_items SET
      title = ${title !== undefined ? title.trim() : existing[0].title},
      category = ${category || existing[0].category},
      content = ${content !== undefined ? content : existing[0].content},
      tags = ${tagArray !== undefined ? tagArray : existing[0].tags},
      source_url = ${source_url !== undefined ? (source_url || null) : existing[0].source_url},
      status = ${status || existing[0].status},
      updated_at = NOW()
    WHERE id = ${Number(id)}
    RETURNING *
  `;

  return NextResponse.json({ item: rows[0] });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }
  if (!sql) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const { id } = await params;
  const rows = await sql`DELETE FROM research_items WHERE id = ${Number(id)} RETURNING id`;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Research item not found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true, id: Number(id) });
}
