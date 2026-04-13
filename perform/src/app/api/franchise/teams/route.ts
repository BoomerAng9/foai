import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const VALID_SPORTS = ['nfl', 'nba', 'mlb'];

export async function GET(req: NextRequest) {
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const sport = req.nextUrl.searchParams.get('sport');
  const include = req.nextUrl.searchParams.get('include');
  const includeProfile = include === 'profile';

  if (sport && !VALID_SPORTS.includes(sport.toLowerCase())) {
    return NextResponse.json({ error: 'Invalid sport. Use nfl, nba, or mlb.' }, { status: 400 });
  }

  const selectCols = includeProfile
    ? sql`id, sport, team_name, abbreviation, conference, division, profile, updated_at`
    : sql`id, sport, team_name, abbreviation, conference, division, updated_at`;

  if (sport) {
    const teams = await sql`
      SELECT ${selectCols}
      FROM franchise.team_profiles
      WHERE sport = ${sport.toLowerCase()}
      ORDER BY conference, division, team_name
    `;
    return NextResponse.json({ teams, count: teams.length });
  }

  const teams = await sql`
    SELECT ${selectCols}
    FROM franchise.team_profiles
    ORDER BY sport, conference, division, team_name
  `;
  return NextResponse.json({ teams, count: teams.length });
}
