/**
 * GET /api/teams
 * ===============
 * Lists teams for the Player Index side panel. Filterable by sport, conference,
 * search. Returns team summary + roster count.
 *
 * Public, browse-first. No auth required.
 *
 * Query:
 *   sport       — 'nfl' | 'nba' | 'mlb' | 'cfb' (default: all)
 *   conference  — narrow within sport (AFC, Big Ten, etc.)
 *   search      — substring match on full_name / abbreviation
 *   limit       — default 100, max 500
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const url = req.nextUrl;
  const sport = url.searchParams.get('sport');
  const conference = url.searchParams.get('conference');
  const search = url.searchParams.get('search');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);

  const conditions: string[] = [];
  const values: (string | number)[] = [];
  let i = 0;

  if (sport)      { i++; conditions.push(`sport = $${i}`);          values.push(sport); }
  if (conference) { i++; conditions.push(`conference = $${i}`);     values.push(conference); }
  if (search) {
    i++;
    conditions.push(`(LOWER(full_name) LIKE $${i} OR LOWER(abbreviation) LIKE $${i})`);
    values.push(`%${search.toLowerCase()}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  i++;
  values.push(limit);

  const query = `
    SELECT
      id, team_external_id, sport, league, abbreviation, full_name, short_name,
      location, conference, division, primary_color, secondary_color, logo_url,
      window_state, roster_count, updated_at
    FROM perform_teams_with_roster_counts
    ${where}
    ORDER BY sport ASC, conference ASC NULLS LAST, full_name ASC
    LIMIT $${i}
  `;

  const teamsResult = await sql.unsafe(query, values);
  const teams = teamsResult as unknown as Array<Record<string, unknown>>;

  // Group by sport for client convenience
  const bySport: Record<string, unknown[]> = {};
  for (const t of teams) {
    const k = String(t.sport ?? '');
    if (!bySport[k]) bySport[k] = [];
    bySport[k].push(t);
  }

  return NextResponse.json({
    teams,
    by_sport: bySport,
    total: teams.length,
  });
}
