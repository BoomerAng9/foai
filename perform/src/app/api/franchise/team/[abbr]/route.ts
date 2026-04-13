import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const VALID_SPORTS = ['nfl', 'nba', 'mlb'];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ abbr: string }> }
) {
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const { abbr } = await params;
  const sport = req.nextUrl.searchParams.get('sport');

  if (!abbr || abbr.length > 5) {
    return NextResponse.json({ error: 'Invalid abbreviation' }, { status: 400 });
  }

  if (sport && !VALID_SPORTS.includes(sport.toLowerCase())) {
    return NextResponse.json({ error: 'Invalid sport. Use nfl, nba, or mlb.' }, { status: 400 });
  }

  const upperAbbr = abbr.toUpperCase();

  if (sport) {
    const teams = await sql`
      SELECT * FROM franchise.team_profiles
      WHERE abbreviation = ${upperAbbr}
        AND sport = ${sport.toLowerCase()}
      LIMIT 1
    `;
    if (teams.length === 0) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Also fetch personnel for this team
    const personnel = await sql`
      SELECT * FROM franchise.personnel_pool
      WHERE current_team = ${upperAbbr}
        AND sport = ${sport.toLowerCase()}
      ORDER BY person_type
    `;

    return NextResponse.json({ team: teams[0], personnel });
  }

  // No sport specified — return all matches across sports
  const teams = await sql`
    SELECT * FROM franchise.team_profiles
    WHERE abbreviation = ${upperAbbr}
    ORDER BY sport
  `;

  if (teams.length === 0) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }

  return NextResponse.json({ teams, count: teams.length });
}
