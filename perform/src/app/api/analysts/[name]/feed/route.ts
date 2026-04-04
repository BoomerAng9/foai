import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAnalyst } from '@/lib/analysts/personas';

async function ensureTable() {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS analyst_content (
      id SERIAL PRIMARY KEY,
      analyst_id TEXT NOT NULL,
      content_type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  const analyst = getAnalyst(name);
  if (!analyst) {
    return NextResponse.json({ error: 'Analyst not found' }, { status: 404 });
  }

  if (!sql) {
    return NextResponse.json({ articles: [] });
  }

  try {
    await ensureTable();

    const articles = await sql`
      SELECT id, analyst_id, content_type, title, content, created_at
      FROM analyst_content
      WHERE analyst_id = ${analyst.id}
      ORDER BY created_at DESC
      LIMIT 20
    `;

    return NextResponse.json({ articles });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Feed fetch failed';
    return NextResponse.json({ error: msg, articles: [] }, { status: 500 });
  }
}
