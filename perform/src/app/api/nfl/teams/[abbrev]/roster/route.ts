import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ abbrev: string }> }) {
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const { abbrev } = await params;
  const position = req.nextUrl.searchParams.get('position');
  let roster;
  if (position) {
    roster = await sql`SELECT * FROM nfl_rosters WHERE team_abbrev = ${abbrev.toUpperCase()} AND position = ${position.toUpperCase()} ORDER BY depth_chart_rank, player_name`;
  } else {
    roster = await sql`SELECT * FROM nfl_rosters WHERE team_abbrev = ${abbrev.toUpperCase()} ORDER BY position, depth_chart_rank, player_name`;
  }
  return NextResponse.json({ roster, count: roster.length, team: abbrev.toUpperCase() });
}
