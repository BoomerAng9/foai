import { NextRequest, NextResponse } from 'next/server';
import { listSimulationSessions } from '@/lib/franchise/session-store';
import type { SimulationMode } from '@/lib/franchise/simulation';
import type { Sport } from '@/lib/franchise/types';

const VALID_SPORTS: Sport[] = ['nfl', 'nba', 'mlb'];
const VALID_MODES: SimulationMode[] = ['roster', 'staff', 'draft'];

export async function GET(req: NextRequest) {
  const sport = req.nextUrl.searchParams.get('sport')?.toLowerCase() as Sport | undefined;
  const mode = req.nextUrl.searchParams.get('mode')?.toLowerCase() as SimulationMode | undefined;
  const teamAbbr = req.nextUrl.searchParams.get('team')?.toUpperCase();
  const limitParam = Number(req.nextUrl.searchParams.get('limit') || '5');

  if (sport && !VALID_SPORTS.includes(sport)) {
    return NextResponse.json({ error: 'Invalid sport. Use nfl, nba, or mlb.' }, { status: 400 });
  }

  if (mode && !VALID_MODES.includes(mode)) {
    return NextResponse.json({ error: 'Invalid mode. Use roster, staff, or draft.' }, { status: 400 });
  }

  const sessions = await listSimulationSessions(req, {
    sport,
    mode,
    teamAbbr,
    limit: Number.isFinite(limitParam) ? limitParam : 5,
  });

  return NextResponse.json({ sessions });
}