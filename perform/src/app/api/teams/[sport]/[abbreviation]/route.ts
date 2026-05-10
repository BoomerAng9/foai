/**
 * GET /api/teams/[sport]/[abbreviation]
 * ======================================
 * Returns one team + its roster. CFB rosters are pulled from perform_players
 * (school = team.full_name). NFL/NBA/MLB rosters come from perform_team_rosters
 * once seeded.
 *
 * Public, browse-first.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TeamRow {
  id: number;
  sport: string;
  abbreviation: string;
  full_name: string;
  league: string | null;
  conference: string | null;
  division: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  ownership: Record<string, unknown> | null;
  general_manager: Record<string, unknown> | null;
  head_coach: Record<string, unknown> | null;
  decision_chain: string | null;
  draft_capital_2026: Record<string, unknown> | null;
  team_needs: unknown[] | null;
  key_storylines: unknown[] | null;
  window_state: string | null;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ sport: string; abbreviation: string }> },
): Promise<NextResponse> {
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const { sport, abbreviation } = await ctx.params;
  const sportLower = sport.toLowerCase();
  // The URL path segment can be either:
  //   (a) a pro league abbreviation in either case  — 'KC', 'kc', 'BAL'
  //   (b) a CFB slug (lowercase hyphenated)         — 'michigan-state'
  // Match against both abbreviation (case-insensitive) AND slug so callers can
  // hit the same URL shape for every sport.
  const key = decodeURIComponent(abbreviation);

  const teamRows = await sql<TeamRow[]>`
    SELECT * FROM perform_teams
    WHERE sport = ${sportLower}
      AND (LOWER(abbreviation) = LOWER(${key}) OR slug = LOWER(${key}))
    ORDER BY (slug = LOWER(${key})) DESC, id ASC
    LIMIT 1
  `;
  if (teamRows.length === 0) {
    return NextResponse.json({ error: 'team not found' }, { status: 404 });
  }
  const team = teamRows[0];

  let roster: readonly Record<string, unknown>[];

  if (sportLower === 'cfb') {
    // CFB: pull from perform_players where school matches team.full_name
    roster = await sql<Record<string, unknown>[]>`
      SELECT
        id, name, position, jersey_number, height, weight, class_year,
        unit, conference, birthplace, grade, tie_tier, overall_rank, position_rank,
        projected_round, drafted_by_team
      FROM perform_players
      WHERE school = ${team.full_name}
        AND sport = 'football'
        AND level = 'college'
      ORDER BY
        CASE WHEN overall_rank IS NOT NULL THEN 0 ELSE 1 END ASC,
        overall_rank ASC NULLS LAST,
        position ASC,
        name ASC
      LIMIT 200
    `;
  } else {
    // Pro leagues: from perform_team_rosters when seeded
    roster = await sql<Record<string, unknown>[]>`
      SELECT
        id, player_name AS name, position, jersey_number, height, weight, age,
        college, contract_status, depth_chart_rank, injury_status, perform_player_id
      FROM perform_team_rosters
      WHERE team_id = ${team.id}
      ORDER BY position ASC, depth_chart_rank ASC, player_name ASC
      LIMIT 200
    `;
  }

  return NextResponse.json({ team, roster, roster_count: roster.length });
}
