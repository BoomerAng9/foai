import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';

export async function GET(request: NextRequest) {
  if (!sql) return NextResponse.json({ allowed: false });
  const userId = request.nextUrl.searchParams.get('userId');
  const feature = request.nextUrl.searchParams.get('feature');
  if (!userId || !feature) return NextResponse.json({ error: 'userId and feature required' }, { status: 400 });

  const profiles = await sql`SELECT tier FROM profiles WHERE user_id = ${userId} LIMIT 1`;
  if (!profiles[0]) return NextResponse.json({ allowed: false });

  const rows = await sql`SELECT get_tier_limits(${profiles[0].tier}) as limits`;
  const limits = rows[0]?.limits ?? {};
  const limit = limits[feature];

  let allowed = false;
  if (typeof limit === 'boolean') allowed = limit;
  else if (typeof limit === 'number') allowed = limit === -1 || limit > 0;

  return NextResponse.json({ allowed });
}
