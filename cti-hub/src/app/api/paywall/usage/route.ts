import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  if (!sql) return NextResponse.json([]);

  try {
    const rows = await sql`
      SELECT metric, amount, tracked_at
      FROM usage_tracking
      WHERE user_id = ${userId}
      ORDER BY tracked_at DESC
      LIMIT 100
    `;
    return NextResponse.json(rows);
  } catch {
    // Table doesn't exist yet — return empty
    return NextResponse.json([]);
  }
}
