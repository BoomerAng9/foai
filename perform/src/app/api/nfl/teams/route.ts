import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const conference = req.nextUrl.searchParams.get('conference');
  const division = req.nextUrl.searchParams.get('division');
  const conditions: string[] = [];
  const params: string[] = [];
  if (conference) { params.push(conference); conditions.push(`conference = $${params.length}`); }
  if (division) { params.push(division); conditions.push(`division = $${params.length}`); }
  const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
  const teams = await sql.unsafe(`SELECT * FROM nfl_teams${where} ORDER BY conference, division, name`, params);
  return NextResponse.json({ teams, count: teams.length });
}
