import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/dashboard/stats
 * Parallel count queries across all core tables + recent activity.
 */
export async function GET() {
  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    // Run all count queries in parallel
    const [
      [players],
      [cfb],
      [nfl],
      [huddle],
      [podcasts],
      recentHuddle,
      topProspects,
    ] = await Promise.all([
      sql`SELECT COUNT(*)::int AS count FROM perform_players`,
      sql`SELECT COUNT(*)::int AS count FROM cfb_players`,
      sql`SELECT COUNT(*)::int AS count FROM nfl_draft_picks`,
      sql`SELECT COUNT(*)::int AS count FROM huddle_posts`,
      sql`SELECT COUNT(*)::int AS count FROM podcast_episodes`,
      sql`
        SELECT id, title, author_name, created_at, excerpt
        FROM huddle_posts
        ORDER BY created_at DESC
        LIMIT 5
      `,
      sql`
        SELECT name, position, school, grade, projected_round, overall_rank
        FROM perform_players
        WHERE overall_rank IS NOT NULL
        ORDER BY overall_rank ASC
        LIMIT 5
      `,
    ]);

    return NextResponse.json({
      counts: {
        perform_players: players.count,
        cfb_players: cfb.count,
        nfl_draft_picks: nfl.count,
        huddle_posts: huddle.count,
        podcast_episodes: podcasts.count,
      },
      recentHuddle,
      topProspects,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Dashboard stats fetch failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
