import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/data/stats — Aggregate stats about the player database
 */
export async function GET() {
  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const [totals] = await sql`
      SELECT
        COUNT(*)::int AS total_players,
        COUNT(grade)::int AS graded_count,
        ROUND(AVG(grade)::numeric, 1) AS avg_grade,
        MAX(updated_at) AS last_updated
      FROM perform_players
    `;

    const positionRows = await sql`
      SELECT position, COUNT(*)::int AS count
      FROM perform_players
      GROUP BY position
      ORDER BY count DESC
    `;

    const roundRows = await sql`
      SELECT projected_round, COUNT(*)::int AS count
      FROM perform_players
      WHERE projected_round IS NOT NULL
      GROUP BY projected_round
      ORDER BY projected_round ASC
    `;

    // Completeness: count players that have all key fields filled
    const [completeness] = await sql`
      SELECT COUNT(*)::int AS complete
      FROM perform_players
      WHERE grade IS NOT NULL
        AND projected_round IS NOT NULL
        AND nfl_comparison IS NOT NULL AND nfl_comparison != ''
        AND strengths IS NOT NULL AND strengths != ''
        AND weaknesses IS NOT NULL AND weaknesses != ''
        AND scouting_summary IS NOT NULL AND scouting_summary != ''
    `;

    const totalPlayers = totals.total_players || 0;
    const completeCount = completeness.complete || 0;
    const completenessPercentage = totalPlayers > 0
      ? Math.round((completeCount / totalPlayers) * 100)
      : 0;

    const positionBreakdown: Record<string, number> = {};
    for (const r of positionRows) {
      positionBreakdown[r.position] = r.count;
    }

    const roundBreakdown: Record<string, number> = {};
    for (const r of roundRows) {
      roundBreakdown[`Round ${r.projected_round}`] = r.count;
    }

    // Count unique position groups
    const positionGroups = Object.keys(positionBreakdown).length;

    // Data sources (static — our known pipelines)
    const dataSources = [
      'Brave Search API',
      'ESPN Player Data',
      'YouTube Film Analysis',
      'Pipeline Scraped Articles',
      'Manual Scout Reports',
      'Combine/Pro Day Results',
    ];

    return NextResponse.json({
      total_players: totalPlayers,
      graded_count: totals.graded_count || 0,
      avg_grade: totals.avg_grade ? Number(totals.avg_grade) : 0,
      position_breakdown: positionBreakdown,
      position_groups: positionGroups,
      round_breakdown: roundBreakdown,
      data_sources_count: dataSources.length,
      data_sources: dataSources,
      completeness_percentage: completenessPercentage,
      last_updated: totals.last_updated || null,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Stats fetch failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
