import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';

export async function GET(request: NextRequest) {
  if (!sql) return NextResponse.json({ organizations: [] });
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const rows = await sql`
    SELECT o.* FROM organizations o
    JOIN organization_memberships m ON m.organization_id = o.id
    WHERE m.user_id = ${userId}
    ORDER BY o.created_at
  `;

  return NextResponse.json({ organizations: rows });
}

export async function POST(request: NextRequest) {
  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  const { userId, name } = await request.json();
  if (!userId || !name) return NextResponse.json({ error: 'userId and name required' }, { status: 400 });

  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');

  const orgs = await sql`
    INSERT INTO organizations (name, slug) VALUES (${name}, ${slug})
    RETURNING *
  `;
  const org = orgs[0];

  await sql`
    INSERT INTO organization_memberships (organization_id, user_id, role)
    VALUES (${org.id}, ${userId}, 'owner')
  `;

  await sql`UPDATE profiles SET default_org_id = ${org.id} WHERE user_id = ${userId}`;

  return NextResponse.json(org);
}
