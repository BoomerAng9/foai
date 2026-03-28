import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';

export async function GET(request: NextRequest) {
  if (!sql) return NextResponse.json({ policies: [] });
  const orgId = request.nextUrl.searchParams.get('orgId');
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 });

  const rows = await sql`
    SELECT * FROM policies WHERE organization_id = ${orgId} ORDER BY created_at DESC
  `;
  return NextResponse.json({ policies: rows });
}

export async function POST(request: NextRequest) {
  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  const body = await request.json();

  const rows = await sql`
    INSERT INTO policies (organization_id, name, description, type, rules, is_active)
    VALUES (${body.organization_id}, ${body.name}, ${body.description || ''}, ${body.type}, ${JSON.stringify(body.rules || [])}, ${body.is_active ?? true})
    RETURNING *
  `;
  return NextResponse.json({ policy: rows[0] });
}

export async function PATCH(request: NextRequest) {
  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  const { id, updates } = await request.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const rows = await sql`
    UPDATE policies SET
      name = COALESCE(${updates.name ?? null}, name),
      description = COALESCE(${updates.description ?? null}, description),
      is_active = COALESCE(${updates.is_active ?? null}, is_active),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return NextResponse.json({ policy: rows[0] });
}
