import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

async function ensureProfiles() {
  if (!sql) throw new Error('Database not configured');
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS huddle_profiles (
    id SERIAL PRIMARY KEY, analyst_id TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL,
    handle TEXT UNIQUE NOT NULL, bio TEXT, show_name TEXT, avatar_color TEXT,
    followers INTEGER DEFAULT 0, following INTEGER DEFAULT 0, post_count INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}

export async function GET(req: NextRequest) {
  try {
    await ensureProfiles();
    if (!sql) throw new Error('Database not configured');
    const analyst = req.nextUrl.searchParams.get('analyst');

    if (analyst) {
      const [profile] = await sql`SELECT * FROM huddle_profiles WHERE analyst_id = ${analyst}`;
      if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      return NextResponse.json({ profile });
    }

    const profiles = await sql`SELECT * FROM huddle_profiles ORDER BY post_count DESC`;
    return NextResponse.json({ profiles });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
