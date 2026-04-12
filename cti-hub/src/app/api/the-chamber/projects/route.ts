import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';

let tableReady = false;

async function ensureTable() {
  if (tableReady || !sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS chamber_projects (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id     TEXT NOT NULL,
      name        TEXT NOT NULL,
      tool_id     TEXT NOT NULL,
      scenario    JSONB NOT NULL DEFAULT '{}',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  tableReady = true;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  if (!sql) return NextResponse.json({ projects: [] });

  try {
    await ensureTable();
    const rows = await sql`
      SELECT id, name, tool_id, updated_at FROM chamber_projects
      WHERE user_id = ${auth.userId}
      ORDER BY updated_at DESC
      LIMIT 50
    `;
    return NextResponse.json({ projects: rows });
  } catch {
    return NextResponse.json({ projects: [] });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.toolId) {
    return NextResponse.json({ error: 'Missing name or toolId' }, { status: 400 });
  }

  try {
    await ensureTable();
    const scenario = {
      method: body.method ?? 'POST',
      headers: body.headers ?? '{}',
      body: body.body ?? '{}',
    };

    if (body.id) {
      await sql`
        UPDATE chamber_projects
        SET name = ${body.name}, tool_id = ${body.toolId}, scenario = ${JSON.stringify(scenario)}, updated_at = now()
        WHERE id = ${body.id} AND user_id = ${auth.userId}
      `;
      return NextResponse.json({ ok: true, id: body.id });
    }

    const [row] = await sql`
      INSERT INTO chamber_projects (user_id, name, tool_id, scenario)
      VALUES (${auth.userId}, ${body.name}, ${body.toolId}, ${JSON.stringify(scenario)})
      RETURNING id
    `;
    return NextResponse.json({ ok: true, id: row.id });
  } catch {
    return NextResponse.json({ error: 'Failed to save project' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    await ensureTable();
    await sql`DELETE FROM chamber_projects WHERE id = ${id} AND user_id = ${auth.userId}`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
