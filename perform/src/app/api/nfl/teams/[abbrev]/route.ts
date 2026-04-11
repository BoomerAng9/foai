import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ abbrev: string }> }) {
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const { abbrev } = await params;
  const teams = await sql`SELECT * FROM nfl_teams WHERE abbrev = ${abbrev.toUpperCase()}`;
  if (!teams.length) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  const rosterCount = await sql`SELECT COUNT(*) as count FROM nfl_rosters WHERE team_abbrev = ${abbrev.toUpperCase()}`;
  return NextResponse.json({ ...teams[0], roster_count: Number(rosterCount[0].count) });
}
