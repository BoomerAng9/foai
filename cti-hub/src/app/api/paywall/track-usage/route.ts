import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';

export async function POST(request: NextRequest) {
  if (!sql) return NextResponse.json({ ok: true });
  const { userId, metric, amount } = await request.json();
  await sql`SELECT increment_usage(${userId}, ${metric}, ${amount || 1})`;
  return NextResponse.json({ ok: true });
}
