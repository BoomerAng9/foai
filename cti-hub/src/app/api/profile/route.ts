import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const card = await req.json();
    if (!sql) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

    await sql`
      INSERT INTO user_profiles (user_id, email, card_data, updated_at)
      VALUES (${auth.userId}, ${auth.email}, ${JSON.stringify(card)}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        card_data = ${JSON.stringify(card)},
        updated_at = NOW()
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    if (!sql) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

    // Auto-create table
    await sql`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id TEXT PRIMARY KEY,
        email TEXT,
        card_data JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    const rows = await sql`SELECT card_data FROM user_profiles WHERE user_id = ${auth.userId} LIMIT 1`;
    if (rows.length === 0) return NextResponse.json({ card: null });
    return NextResponse.json({ card: rows[0].card_data });
  } catch {
    return NextResponse.json({ error: 'Load failed' }, { status: 500 });
  }
}
