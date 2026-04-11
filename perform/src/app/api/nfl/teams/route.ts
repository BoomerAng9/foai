import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const VALID_CONFERENCES = ['AFC', 'NFC'];
const VALID_DIVISIONS = ['East', 'North', 'South', 'West'];

export async function GET(req: NextRequest) {
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const conference = req.nextUrl.searchParams.get('conference');
  const division = req.nextUrl.searchParams.get('division');

  // Whitelist validation — no raw user input in queries
  if (conference && !VALID_CONFERENCES.includes(conference)) {
    return NextResponse.json({ error: 'Invalid conference. Use AFC or NFC.' }, { status: 400 });
  }
  if (division && !VALID_DIVISIONS.includes(division)) {
    return NextResponse.json({ error: 'Invalid division. Use East, North, South, or West.' }, { status: 400 });
  }

  if (conference && division) {
    const teams = await sql`SELECT * FROM nfl_teams WHERE conference = ${conference} AND division = ${division} ORDER BY name`;
    return NextResponse.json({ teams, count: teams.length });
  }
  if (conference) {
    const teams = await sql`SELECT * FROM nfl_teams WHERE conference = ${conference} ORDER BY division, name`;
    return NextResponse.json({ teams, count: teams.length });
  }
  if (division) {
    const teams = await sql`SELECT * FROM nfl_teams WHERE division = ${division} ORDER BY conference, name`;
    return NextResponse.json({ teams, count: teams.length });
  }

  const teams = await sql`SELECT * FROM nfl_teams ORDER BY conference, division, name`;
  return NextResponse.json({ teams, count: teams.length });
}
