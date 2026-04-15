import { NextResponse } from 'next/server';
import teamNeeds from '../../../../../data/nfl-teams/team-needs-2026.json';

export const revalidate = 3600; // 1h

/**
 * GET /api/draft/team-needs
 * Returns the current team needs board.
 * Source: Sqwaadrun Lil_Intel_Hawk (NFL.com, FantasyPros, ESPN, CBS)
 */
export async function GET() {
  return NextResponse.json({
    generatedAt: (teamNeeds as { generatedAt?: string }).generatedAt,
    source: (teamNeeds as { source?: string }).source,
    teams: (teamNeeds as { teams?: unknown[] }).teams || [],
  });
}
