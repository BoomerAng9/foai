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
          const dbTeam = dbTeams[0];
          teamContext = {
            ...teamContext,
            owner: dbTeam.owner_name ? { name: dbTeam.owner_name, archetype: dbTeam.owner_archetype } : undefined,
            gm: dbTeam.gm_name ? { name: dbTeam.gm_name, philosophy: dbTeam.gm_philosophy } : undefined,
            headCoach: dbTeam.hc_name ? { name: dbTeam.hc_name, scheme: dbTeam.hc_scheme } : undefined,
            capSpace: dbTeam.cap_space,
            record: dbTeam.wins != null ? { wins: dbTeam.wins, losses: dbTeam.losses, ties: dbTeam.ties } : undefined,
          };
        }

        // Fetch roster
        const personnel = await sql`
          SELECT name, position, overall_rating
          FROM franchise.personnel_pool
          WHERE current_team = ${team.abbreviation.toUpperCase()}
            AND sport = ${sport}
            AND person_type = 'player'
          ORDER BY overall_rating DESC
        `;

        if (personnel.length > 0) {
          teamContext.roster = personnel.map((p: Record<string, unknown>) => ({
            name: p.name as string,
            position: p.position as string,
            overallRating: (p.overall_rating as number) || 0,
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
