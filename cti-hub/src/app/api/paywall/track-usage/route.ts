import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';

async function ensureUsageTable() {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS usage_tracking (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      metric TEXT NOT NULL,
      amount INTEGER NOT NULL DEFAULT 1,
      tracked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const body = await request.json();
  const { userId, metric, amount = 1 } = body;

  if (!userId || !metric) {
    return NextResponse.json({ error: 'userId and metric are required' }, { status: 400 });
  }

  try {
    await sql`
      INSERT INTO usage_tracking (user_id, metric, amount)
      VALUES (${userId}, ${metric}, ${amount})
    `;
  } catch {
    // Table might not exist — create it and retry
    await ensureUsageTable();
    await sql`
      INSERT INTO usage_tracking (user_id, metric, amount)
      VALUES (${userId}, ${metric}, ${amount})
    `;
  }

  return NextResponse.json({ success: true });
}
