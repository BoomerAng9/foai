import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

async function ensureTable() {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS podcast_episodes (
      id SERIAL PRIMARY KEY,
      analyst_id TEXT NOT NULL,
      title TEXT NOT NULL,
      transcript TEXT NOT NULL,
      audio_url TEXT,
      duration_seconds INTEGER DEFAULT 0,
      type TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function GET(req: NextRequest) {
  try {
    if (!sql) {
      return NextResponse.json({ episodes: [], message: 'Database unavailable' });
    }

    await ensureTable();

    const { searchParams } = new URL(req.url);
    const analyst = searchParams.get('analyst');

    let episodes;
    if (analyst) {
      episodes = await sql`
        SELECT id, analyst_id, title, transcript, audio_url, duration_seconds, type, created_at
        FROM podcast_episodes
        WHERE analyst_id = ${analyst}
        ORDER BY created_at DESC
        LIMIT 20
      `;
    } else {
      episodes = await sql`
        SELECT id, analyst_id, title, transcript, audio_url, duration_seconds, type, created_at
        FROM podcast_episodes
        ORDER BY created_at DESC
        LIMIT 20
      `;
    }

    return NextResponse.json({ episodes });
  } catch (error) {
    console.error('Episodes list error:', error);
    return NextResponse.json({ episodes: [], error: 'Failed to fetch episodes' });
  }
}
