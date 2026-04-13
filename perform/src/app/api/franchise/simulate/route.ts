import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  createFranchiseSimulation,
  streamSimulationResults,
  streamFallbackSimulation,
  type SimulationRequest,
  type SimulationMode,
  type TeamDigitalTwin,
} from '@/lib/franchise/simulation';
import { getTeamByAbbr } from '@/lib/franchise/teams';
import type { Sport } from '@/lib/franchise/types';

const VALID_SPORTS: Sport[] = ['nfl', 'nba', 'mlb'];
const VALID_MODES: SimulationMode[] = ['roster', 'staff', 'draft'];

export async function POST(req: NextRequest) {
  try {
    // Check for API key early
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Simulation service not configured. ANTHROPIC_API_KEY is required.' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { sport, team_abbr, mode, modifications } = body;

    // Validate inputs
    if (!sport || !VALID_SPORTS.includes(sport)) {
      return NextResponse.json({ error: 'Invalid sport. Use nfl, nba, or mlb.' }, { status: 400 });
    }
    if (!team_abbr || typeof team_abbr !== 'string') {
      return NextResponse.json({ error: 'team_abbr is required.' }, { status: 400 });
    }
    if (!mode || !VALID_MODES.includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode. Use roster, staff, or draft.' }, { status: 400 });
    }

    // Verify team exists in our data
    const team = getTeamByAbbr(sport as Sport, team_abbr.toUpperCase());
    if (!team) {
      return NextResponse.json({ error: `Team ${team_abbr} not found for ${sport}.` }, { status: 404 });
    }

    // Build team digital twin from Neon if available, else from static data
    let teamContext: TeamDigitalTwin = {
      sport: sport as Sport,
      abbreviation: team.abbreviation,
      name: team.name,
      city: team.city,
      conference: team.conference,
      division: team.division,
    };

    if (sql) {
      try {
        const dbTeams = await sql`
          SELECT * FROM franchise.team_profiles
          WHERE abbreviation = ${team.abbreviation.toUpperCase()}
            AND sport = ${sport}
          LIMIT 1
        `;

        if (dbTeams.length > 0) {
          const profile = dbTeams[0].profile as Record<string, unknown> || {};
          const ownership = profile.ownership as Record<string, unknown> || {};
          const gm = profile.gm as Record<string, unknown> || {};
          const hc = profile.head_coach as Record<string, unknown> || {};
          const roster = profile.roster_2026 as Record<string, unknown> || {};
          const needs = (profile.needs as Array<Record<string, unknown>>) || [];

          teamContext = {
            ...teamContext,
            owner: ownership.name ? { name: String(ownership.name), archetype: String(ownership.style || '') } : undefined,
            gm: gm.name ? { name: String(gm.name), philosophy: String(gm.philosophy || '') } : undefined,
            headCoach: hc.name ? { name: String(hc.name), scheme: String(hc.scheme_offense || hc.style || '') } : undefined,
            capSpace: roster.cap_space ? String(roster.cap_space) : undefined,
            needs: needs.map(n => ({ position: String(n.position || ''), priority: Number(n.priority || 0), reason: String(n.reason || '') })),
            fullProfile: profile,
          };
        }

        // Fetch personnel (coaches/GMs, not players — players come from perform_players)
        const personnel = await sql`
          SELECT name, person_type, position, profile
          FROM franchise.personnel_pool
          WHERE current_team = ${team.abbreviation.toUpperCase()}
            AND sport = ${sport}
          ORDER BY person_type
        `;

        if (personnel.length > 0) {
          teamContext.staff = personnel.map((p: Record<string, unknown>) => ({
            name: p.name as string,
            role: p.person_type as string,
            position: p.position as string,
          }));
        }
      } catch {
        // DB unavailable — continue with static data
      }
    }

    const simRequest: SimulationRequest = {
      sport: sport as Sport,
      teamAbbr: team.abbreviation,
      mode: mode as SimulationMode,
      modifications: modifications || [],
      teamContext,
    };

    // Try Managed Agents first, fall back to direct Messages API
    let stream: ReadableStream<Uint8Array>;

    try {
      const session = await createFranchiseSimulation(simRequest);
      const userMessage = `Analyze the ${team.city} ${team.name} with the provided modifications and generate your full projection.`;
      stream = await streamSimulationResults(session, userMessage);
    } catch {
      // Managed Agents beta may not be available — fall back to direct streaming
      stream = await streamFallbackSimulation(simRequest);
    }

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    console.error('Franchise simulation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Simulation failed' },
      { status: 500 }
    );
  }
}
