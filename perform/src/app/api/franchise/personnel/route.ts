import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const VALID_SPORTS = ['nfl', 'nba', 'mlb'];
const VALID_TYPES = ['coach', 'gm', 'manager', 'coordinator'];

export async function GET(req: NextRequest) {
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const sport = req.nextUrl.searchParams.get('sport');
  const type = req.nextUrl.searchParams.get('type');
  const available = req.nextUrl.searchParams.get('available');

  if (sport && !VALID_SPORTS.includes(sport.toLowerCase())) {
    return NextResponse.json({ error: 'Invalid sport. Use nfl, nba, or mlb.' }, { status: 400 });
  }
  if (type && !VALID_TYPES.includes(type.toLowerCase())) {
    return NextResponse.json({ error: 'Invalid type. Use coach, gm, manager, or coordinator.' }, { status: 400 });
  }

  if (sport && type && available !== null) {
    const avail = available === 'true';
    const personnel = await sql`
      SELECT * FROM franchise.personnel_pool
      WHERE sport = ${sport.toLowerCase()}
        AND person_type = ${type.toLowerCase()}
        AND available = ${avail}
      ORDER BY name
    `;
    return NextResponse.json({ personnel, count: personnel.length });
  }

  if (sport && type) {
    const personnel = await sql`
      SELECT * FROM franchise.personnel_pool
      WHERE sport = ${sport.toLowerCase()}
        AND person_type = ${type.toLowerCase()}
      ORDER BY name
    `;
    return NextResponse.json({ personnel, count: personnel.length });
  }

  if (sport && available !== null) {
    const avail = available === 'true';
    const personnel = await sql`
      SELECT * FROM franchise.personnel_pool
      WHERE sport = ${sport.toLowerCase()}
        AND available = ${avail}
      ORDER BY person_type, name
    `;
    return NextResponse.json({ personnel, count: personnel.length });
  }

  if (sport) {
    const personnel = await sql`
      SELECT * FROM franchise.personnel_pool
      WHERE sport = ${sport.toLowerCase()}
      ORDER BY person_type, name
    `;
    return NextResponse.json({ personnel, count: personnel.length });
  }

  if (type) {
    const personnel = await sql`
      SELECT * FROM franchise.personnel_pool
      WHERE person_type = ${type.toLowerCase()}
      ORDER BY sport, name
    `;
    return NextResponse.json({ personnel, count: personnel.length });
  }

  if (available !== null) {
    const avail = available === 'true';
    const personnel = await sql`
      SELECT * FROM franchise.personnel_pool
      WHERE available = ${avail}
      ORDER BY sport, person_type, name
    `;
    return NextResponse.json({ personnel, count: personnel.length });
  }

  const personnel = await sql`
    SELECT * FROM franchise.personnel_pool
    ORDER BY sport, person_type, name
  `;
  return NextResponse.json({ personnel, count: personnel.length });
}
