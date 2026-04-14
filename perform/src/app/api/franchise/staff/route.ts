import { NextRequest, NextResponse } from 'next/server';
import { getTeamByAbbr } from '@/lib/franchise/teams';
import { loadFranchiseStaffData } from '@/lib/franchise/server-data';
import type { Sport } from '@/lib/franchise/types';

const VALID_SPORTS: Sport[] = ['nfl', 'nba', 'mlb'];

export async function GET(req: NextRequest) {
  const sport = req.nextUrl.searchParams.get('sport')?.toLowerCase() as Sport | undefined;
  const team = req.nextUrl.searchParams.get('team')?.toUpperCase();

  if (!sport || !VALID_SPORTS.includes(sport)) {
    return NextResponse.json({ error: 'Invalid sport. Use nfl, nba, or mlb.' }, { status: 400 });
  }

  if (!team) {
    return NextResponse.json({ error: 'team is required.' }, { status: 400 });
  }

  const teamMeta = getTeamByAbbr(sport, team);
  if (!teamMeta) {
    return NextResponse.json({ error: `Team ${team} not found for ${sport}.` }, { status: 404 });
  }

  const data = await loadFranchiseStaffData(sport, team);
  return NextResponse.json({
    team: teamMeta,
    org: data.org,
    pool: data.pool,
    source: data.source,
  });
}