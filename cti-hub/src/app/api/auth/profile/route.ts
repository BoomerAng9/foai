import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';

export async function GET(request: NextRequest) {
  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const [profiles, subs] = await Promise.all([
    sql`SELECT * FROM profiles WHERE user_id = ${userId} LIMIT 1`,
    sql`SELECT * FROM subscriptions WHERE user_id = ${userId} LIMIT 1`,
  ]);

  return NextResponse.json({ profile: profiles[0] ?? null, subscription: subs[0] ?? null });
}

export async function PATCH(request: NextRequest) {
  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  const { userId, updates } = await request.json();
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const setClauses: string[] = [];
  const values: Record<string, unknown> = {};

  if (updates.display_name !== undefined) { setClauses.push('display_name'); values.display_name = updates.display_name; }
  if (updates.avatar_url !== undefined) { setClauses.push('avatar_url'); values.avatar_url = updates.avatar_url; }
  if (updates.default_org_id !== undefined) { setClauses.push('default_org_id'); values.default_org_id = updates.default_org_id; }

  if (setClauses.length > 0) {
    // Build update object for postgres.js
    const updateData: Record<string, unknown> = { updated_at: new Date() };
    if (updates.display_name !== undefined) updateData.display_name = updates.display_name;
    if (updates.avatar_url !== undefined) updateData.avatar_url = updates.avatar_url;
    if (updates.default_org_id !== undefined) updateData.default_org_id = updates.default_org_id;

    await sql`
      UPDATE profiles SET ${sql(updateData, ...Object.keys(updateData))}
      WHERE user_id = ${userId}
    `;
  }

  return NextResponse.json({ ok: true });
}
