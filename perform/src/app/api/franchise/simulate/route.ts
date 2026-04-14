import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  createFranchiseSimulation,
  streamSimulationResults,
  streamFallbackSimulation,
  type SimulationProjection,
  type SimulationStreamEvent,
  type SimulationRequest,
  type SimulationMode,
  type TeamDigitalTwin,
} from '@/lib/franchise/simulation';
import {
  createSimulationSessionRecord,
  updateSimulationSessionRecord,
  type SimulationSource,
} from '@/lib/franchise/session-store';
import { loadFranchiseRosterPlayers } from '@/lib/franchise/server-data';
import { getTeamByAbbr } from '@/lib/franchise/teams';
import type { Sport } from '@/lib/franchise/types';

const VALID_SPORTS: Sport[] = ['nfl', 'nba', 'mlb'];
const VALID_MODES: SimulationMode[] = ['roster', 'staff', 'draft'];

function createMetaEvent(sessionId: string | null, source: SimulationSource): Uint8Array {
  const event: SimulationStreamEvent = {
    type: 'meta',
    content: '',
    metadata: {
      session_id: sessionId,
      source,
    },
  };
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

function withPersistence(
  stream: ReadableStream<Uint8Array>,
  options: {
    sessionId: string | null;
    source: SimulationSource;
    managedAgentSessionId?: string;
    request: SimulationRequest;
  },
): ReadableStream<Uint8Array> {
  const [clientStream, persistenceStream] = stream.tee();

  void (async () => {
    const reader = persistenceStream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let projection: SimulationProjection | null = null;
    let narrative = '';
    let errorMessage: string | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as SimulationStreamEvent;
            if (event.type === 'text') {
              narrative += event.content;
            } else if (event.type === 'projection' && event.data) {
              projection = event.data;
            } else if (event.type === 'complete') {
              if (event.data) projection = event.data;
              if (event.content) narrative = event.content;
            } else if (event.type === 'error') {
              errorMessage = event.content;
            }
          } catch {
            // Ignore malformed SSE lines while persisting.
          }
        }
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Persistence stream failure';
    } finally {
      await updateSimulationSessionRecord(options.sessionId, {
        status: errorMessage ? 'error' : 'complete',
        source: options.source,
        managed_agent_session_id: options.managedAgentSessionId ?? null,
        request: {
          sport: options.request.sport,
          mode: options.request.mode,
          team_abbr: options.request.teamAbbr,
          modifications_count: options.request.modifications.length,
        },
        narrative,
        projection,
        error: errorMessage,
        completed_at: new Date().toISOString(),
      });
      reader.releaseLock();
    }
  })();

  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(createMetaEvent(options.sessionId, options.source));
      const reader = clientStream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } catch (error) {
        const event: SimulationStreamEvent = {
          type: 'error',
          content: error instanceof Error ? error.message : 'Simulation stream error',
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
  });
}

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
            capSpace: roster.cap_space ? Number(roster.cap_space) || undefined : undefined,
            needs: needs.map(n => ({ position: String(n.position || ''), priority: Number(n.priority || 0), reason: String(n.reason || '') })),
            fullProfile: profile,
          };
        }

        const { players } = await loadFranchiseRosterPlayers(sport as Sport, team.abbreviation);
        if (players.length > 0) {
          teamContext.roster = players.map((player) => ({
            name: player.name,
            position: player.position,
            overallRating: player.overallRating,
          }));
        }

        // Fetch personnel (coaches/GMs for the digital twin)
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

    const sessionRecordId = await createSimulationSessionRecord(req, body as Record<string, unknown>);

    // Try Managed Agents first, fall back to direct Messages API
    let stream: ReadableStream<Uint8Array>;
    let source: SimulationSource = 'messages_fallback';
    let managedAgentSessionId: string | undefined;

    try {
      const session = await createFranchiseSimulation(simRequest);
      managedAgentSessionId = session.sessionId;
      const userMessage = `Analyze the ${team.city} ${team.name} with the provided modifications and generate your full projection.`;
      stream = await streamSimulationResults(session, userMessage);
      source = 'managed_agents';
    } catch (managedAgentError) {
      console.warn('Managed Agents unavailable, falling back to direct simulation stream.', managedAgentError);
      stream = await streamFallbackSimulation(simRequest);
    }

    const persistedStream = withPersistence(stream, {
      sessionId: sessionRecordId,
      source,
      managedAgentSessionId,
      request: simRequest,
    });

    return new Response(persistedStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'X-Simulation-Source': source,
        ...(sessionRecordId ? { 'X-Simulation-Session': sessionRecordId } : {}),
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
