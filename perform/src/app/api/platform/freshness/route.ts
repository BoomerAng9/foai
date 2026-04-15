import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import teamNeeds from '../../../../../data/nfl-teams/team-needs-2026.json';

export const revalidate = 60; // fresh lookup every minute

/**
 * GET /api/platform/freshness
 * Single source of truth for homepage "Updated X ago" badges.
 * Aggregates lastUpdated from each data domain so every widget can show
 * how current its data actually is.
 */
export async function GET() {
  const now = new Date().toISOString();
  const freshness: Record<string, string | null> = {
    now,
    teamNeeds: (teamNeeds as { generatedAt?: string }).generatedAt || null,
    players: null,
    podcasts: null,
    prospects: null,
  };

  if (sql) {
    try {
      const [p] = await sql`
        SELECT MAX(roster_updated_at) AS ts FROM perform_players WHERE roster_updated_at IS NOT NULL
      `;
      freshness.players = p?.ts ? new Date(p.ts).toISOString() : null;
    } catch { /* column may not exist yet */ }

    try {
      const [p] = await sql`SELECT MAX(updated_at) AS ts FROM perform_players`;
      freshness.prospects = p?.ts ? new Date(p.ts).toISOString() : null;
    } catch {}

    try {
      const [e] = await sql`SELECT MAX(created_at) AS ts FROM podcast_episodes`;
      freshness.podcasts = e?.ts ? new Date(e.ts).toISOString() : null;
    } catch {}
  }

  return NextResponse.json(freshness);
}
