import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';

export async function GET(request: NextRequest) {
  if (!sql) return NextResponse.json([]);
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const rows = await sql`
    SELECT * FROM usage_tracking
    WHERE user_id = ${userId} AND period_start >= ${periodStart}
  `;
  return NextResponse.json(rows);
}
