import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth-guard';

/**
 * POST /api/podcasters/content — Save a script/content item (auth required)
 * GET  /api/podcasters/content — List user's content sorted by updated_at DESC (auth required)
 */

export async function POST(req: NextRequest) {
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const users = await sql`SELECT id FROM podcaster_users WHERE firebase_uid = ${auth.userId}`;
  if (!users.length) return NextResponse.json({ error: 'Not registered' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { title, content_type, body: content } = body as {
    title?: string;
    content_type?: string;
    body?: string;
  };

  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 });

  const safeType = ['script', 'outline', 'notes', 'segment'].includes(content_type || '')
    ? content_type!
    : 'script';

  const [item] = await sql`
    INSERT INTO podcaster_content (user_id, title, content_type, body, status)
    VALUES (${users[0].id}, ${title.trim()}, ${safeType}, ${(content as string) || ''}, 'draft')
    RETURNING *
  `;

  return NextResponse.json({ content: item, ok: true });
}

export async function GET(req: NextRequest) {
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const users = await sql`SELECT id FROM podcaster_users WHERE firebase_uid = ${auth.userId}`;
  if (!users.length) return NextResponse.json({ error: 'Not registered' }, { status: 404 });

  const items = await sql`
    SELECT * FROM podcaster_content
    WHERE user_id = ${users[0].id}
    ORDER BY updated_at DESC
    LIMIT 50
  `;

  return NextResponse.json({ content: items, count: items.length });
}
