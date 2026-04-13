/**
 * Franchise Simulation Adapter — Bridge between franchise UI and Anthropic Managed Agents.
 * Creates agent sessions with full team digital-twin context, streams simulation results.
 */

import type { Sport } from './types';

// ---------- Types ----------

export type SimulationMode = 'roster' | 'staff' | 'draft';

export interface SimulationRequest {
  sport: Sport;
  teamAbbr: string;
  mode: SimulationMode;
  modifications: RosterModification[] | StaffModification[];
  teamContext?: TeamDigitalTwin;
}

export interface RosterModification {
  type: 'add' | 'remove' | 'swap';
  position: string;
  player?: { name: string; position: string; overallRating: number };
  previousPlayer?: { name: string; position: string; overallRating: number };
}

export interface StaffModification {
  type: 'hire' | 'fire' | 'replace';
  role: string;
  staff?: { name: string; title: string; scheme?: string; philosophy?: string };
  previousStaff?: { name: string; title: string };
}

export interface TeamDigitalTwin {
  sport: Sport;
  abbreviation: string;
  name: string;
  city: string;
  conference: string;
  division: string;
  owner?: { name: string; archetype?: string };
  gm?: { name: string; philosophy?: string };
  headCoach?: { name: string; scheme?: string };
  roster?: Array<{ name: string; position: string; overallRating: number }>;
  capSpace?: number;
  draftPicks?: Array<{ round: number; pick?: number }>;
  record?: { wins: number; losses: number; ties?: number };
  needs?: Array<{ position: string; priority: number; reason: string }>;
  staff?: Array<{ name: string; role: string; position: string }>;
  fullProfile?: Record<string, unknown>;
}

export interface SimulationSession {
  sessionId: string;
  agentId: string;
  environmentId: string;
  mode: SimulationMode;
}

export interface SimulationStreamEvent {
  type: 'thinking' | 'text' | 'projection' | 'complete' | 'error';
  content: string;
  data?: SimulationProjection;
}

export interface SimulationProjection {
  wins?: number;
  losses?: number;
  playoffProbability?: number;
  draftPosition?: number;
  keyMatchups?: Array<{ opponent: string; result: string; impact: string }>;
  schemeChanges?: string[];
  freeAgencyApproach?: string;
  draftStrategy?: string;
  narrative?: string;
}

// ---------- System Prompts ----------

const SYSTEM_PROMPTS: Record<SimulationMode, string> = {
  roster: `You are an elite NFL/NBA/MLB analytics engine. Given roster changes to a team's digital twin, project:
1. Win/loss record for the upcoming season
2. Playoff probability (percentage)
3. Key matchup impacts (3-5 specific opponents)
4. Projected draft position if they miss playoffs
5. Cap space impact

Respond with a JSON block wrapped in \`\`\`json ... \`\`\` containing:
{
  "wins": number,
  "losses": number,
  "playoffProbability": number (0-100),
  "draftPosition": number | null,
  "keyMatchups": [{"opponent": string, "result": "W" | "L", "impact": string}],
  "narrative": "2-3 paragraph analysis"
}

Then provide a detailed narrative analysis explaining your reasoning. Be specific about player impacts, scheme fits, and realistic comparisons.`,

  staff: `You are an elite front office analytics engine. Given coaching/GM staff changes, project how the team's operations would shift:
1. Scheme changes (offensive/defensive philosophy shifts)
2. Draft strategy changes (positional priorities, trade tendencies)
3. Free agency approach changes (spending patterns, player profiles targeted)
4. Win impact projection

Respond with a JSON block wrapped in \`\`\`json ... \`\`\` containing:
{
  "wins": number,
  "losses": number,
  "playoffProbability": number (0-100),
  "schemeChanges": [string],
  "draftStrategy": string,
  "freeAgencyApproach": string,
  "narrative": "2-3 paragraph analysis"
}

Then provide a detailed narrative. Be specific about how the new staff's track record and philosophy would transform the team.`,

  draft: `You are an elite draft strategist. Given a team's full context (roster needs, cap situation, draft capital, coaching scheme), simulate their optimal draft strategy:
1. Positional priorities by round
2. Trade up/down recommendations
3. Specific player archetype fits
4. Day 1/2/3 strategy breakdown

Respond with a JSON block wrapped in \`\`\`json ... \`\`\` containing:
{
  "draftStrategy": string,
  "positionalPriorities": [string],
  "tradeRecommendations": [string],
  "narrative": "2-3 paragraph analysis"
}

Then provide a detailed draft strategy narrative. Be specific about scheme fits and roster construction.`,
};

// ---------- Core Functions ----------

/**
 * Create a Managed Agent simulation session via the Anthropic API.
 * Returns session metadata for streaming.
 */
export async function createFranchiseSimulation(
  request: SimulationRequest
): Promise<SimulationSession> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured. Simulation requires an Anthropic API key.');
  }

  const { sport, teamAbbr, mode, modifications, teamContext } = request;

  // Build context prompt with full team digital twin
  const contextPrompt = buildContextPrompt(sport, teamAbbr, mode, modifications, teamContext);

  // Step 1: Create an Agent
  const agentRes = await fetch('https://api.anthropic.com/v1/agents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'managed-agents-2026-04-01',
    },
    body: JSON.stringify({
      name: `franchise-sim-${sport}-${teamAbbr}-${mode}`,
      description: `Franchise simulation agent for ${teamAbbr} (${mode} mode)`,
      model: 'claude-sonnet-4-6',
      system: SYSTEM_PROMPTS[mode],
      max_tokens: 4096,
    }),
  });

  if (!agentRes.ok) {
    const err = await agentRes.text();
    throw new Error(`Failed to create agent: ${agentRes.status} ${err}`);
  }

  const agent = await agentRes.json();

  // Step 2: Create an Environment with team context
  const envRes = await fetch('https://api.anthropic.com/v1/environments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'managed-agents-2026-04-01',
    },
    body: JSON.stringify({
      name: `env-${teamAbbr}-${Date.now()}`,
      agent_id: agent.id,
      instructions: contextPrompt,
    }),
  });

  if (!envRes.ok) {
    const err = await envRes.text();
    throw new Error(`Failed to create environment: ${envRes.status} ${err}`);
  }

  const env = await envRes.json();

  // Step 3: Create a Session
  const sessionRes = await fetch('https://api.anthropic.com/v1/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'agent-api-2026-03-01',
    },
    body: JSON.stringify({
      agent_id: agent.id,
      environment_id: env.id,
    }),
  });

  if (!sessionRes.ok) {
    const err = await sessionRes.text();
    throw new Error(`Failed to create session: ${sessionRes.status} ${err}`);
  }

  const session = await sessionRes.json();

  return {
    sessionId: session.id,
    agentId: agent.id,
    environmentId: env.id,
    mode,
  };
}

/**
 * Stream simulation results from a Managed Agent session via SSE.
 * Returns a ReadableStream for the Next.js route handler.
 */
export async function streamSimulationResults(
  session: SimulationSession,
  userMessage: string
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured.');
  }

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        // Send the user message to the session and stream the response
        const res = await fetch(`https://api.anthropic.com/v1/sessions/${session.sessionId}/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-beta': 'agent-api-2026-03-01',
            'Accept': 'text/event-stream',
          },
          body: JSON.stringify({
            message: userMessage,
            stream: true,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          const errorEvent: SimulationStreamEvent = {
            type: 'error',
            content: `API error: ${res.status} — ${errorText}`,
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
          controller.close();
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', content: 'No response body' })}\n\n`));
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;

              try {
                const event = JSON.parse(data);
                // Map Anthropic SSE events to our format
                if (event.type === 'content_block_delta' && event.delta?.text) {
                  fullText += event.delta.text;
                  const streamEvent: SimulationStreamEvent = {
                    type: 'text',
                    content: event.delta.text,
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(streamEvent)}\n\n`));
                } else if (event.type === 'message_stop') {
                  // Parse projection from accumulated text
                  const projection = parseProjection(fullText);
                  if (projection) {
                    const projEvent: SimulationStreamEvent = {
                      type: 'projection',
                      content: '',
                      data: projection,
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(projEvent)}\n\n`));
                  }

                  const completeEvent: SimulationStreamEvent = {
                    type: 'complete',
                    content: fullText,
                    data: projection || undefined,
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(completeEvent)}\n\n`));
                }
              } catch {
                // Skip non-JSON lines
              }
            }
          }
        }

        controller.close();
      } catch (err) {
        const errorEvent: SimulationStreamEvent = {
          type: 'error',
          content: err instanceof Error ? err.message : 'Unknown streaming error',
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
        controller.close();
      }
    },
  });
}

// ---------- Fallback: Direct Messages API (no Managed Agents) ----------

/**
 * Fallback simulation using direct Messages API when Managed Agents beta is unavailable.
 * Returns a ReadableStream of SSE events.
 */
export async function streamFallbackSimulation(
  request: SimulationRequest
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured.');
  }

  const { sport, teamAbbr, mode, modifications, teamContext } = request;
  const contextPrompt = buildContextPrompt(sport, teamAbbr, mode, modifications, teamContext);
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system: SYSTEM_PROMPTS[mode],
            messages: [
              {
                role: 'user',
                content: contextPrompt,
              },
            ],
            stream: true,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', content: `API error: ${res.status}` })}\n\n`));
          controller.close();
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', content: 'No response body' })}\n\n`));
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;

              try {
                const event = JSON.parse(data);
                if (event.type === 'content_block_delta' && event.delta?.text) {
                  fullText += event.delta.text;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: event.delta.text })}\n\n`));
                } else if (event.type === 'message_stop') {
                  const projection = parseProjection(fullText);
                  if (projection) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'projection', content: '', data: projection })}\n\n`));
                  }
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', content: fullText, data: projection || undefined })}\n\n`));
                }
              } catch {
                // Skip
              }
            }
          }
        }

        controller.close();
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', content: err instanceof Error ? err.message : 'Simulation error' })}\n\n`));
        controller.close();
      }
    },
  });
}

// ---------- Helpers ----------

function buildContextPrompt(
  sport: Sport,
  teamAbbr: string,
  mode: SimulationMode,
  modifications: RosterModification[] | StaffModification[],
  teamContext?: TeamDigitalTwin
): string {
  const parts: string[] = [];

  parts.push(`## Team: ${teamContext?.city || ''} ${teamContext?.name || teamAbbr}`);
  parts.push(`Sport: ${sport.toUpperCase()}`);
  parts.push(`Conference: ${teamContext?.conference || 'N/A'} | Division: ${teamContext?.division || 'N/A'}`);

  if (teamContext?.record) {
    parts.push(`Current Record: ${teamContext.record.wins}-${teamContext.record.losses}${teamContext.record.ties ? `-${teamContext.record.ties}` : ''}`);
  }

  if (teamContext?.owner) {
    parts.push(`\n### Owner: ${teamContext.owner.name}${teamContext.owner.archetype ? ` (${teamContext.owner.archetype})` : ''}`);
  }

  if (teamContext?.gm) {
    parts.push(`### GM: ${teamContext.gm.name}${teamContext.gm.philosophy ? ` — Philosophy: ${teamContext.gm.philosophy}` : ''}`);
  }

  if (teamContext?.headCoach) {
    parts.push(`### Head Coach: ${teamContext.headCoach.name}${teamContext.headCoach.scheme ? ` — Scheme: ${teamContext.headCoach.scheme}` : ''}`);
  }

  if (teamContext?.capSpace !== undefined) {
    parts.push(`\nCap Space: $${teamContext.capSpace}M`);
  }

  if (teamContext?.draftPicks?.length) {
    parts.push(`Draft Capital: ${teamContext.draftPicks.map(p => `Round ${p.round}${p.pick ? ` (#${p.pick})` : ''}`).join(', ')}`);
  }

  if (teamContext?.roster?.length) {
    parts.push(`\n### Current Roster (${teamContext.roster.length} players):`);
    const byPos: Record<string, typeof teamContext.roster> = {};
    for (const p of teamContext.roster) {
      if (!byPos[p.position]) byPos[p.position] = [];
      byPos[p.position].push(p);
    }
    for (const [pos, players] of Object.entries(byPos)) {
      parts.push(`**${pos}**: ${players.map(p => `${p.name} (${p.overallRating})`).join(', ')}`);
    }
  }

  // Modifications
  parts.push(`\n## ${mode === 'roster' ? 'Roster' : mode === 'staff' ? 'Staff' : 'Draft'} Modifications:`);

  if (mode === 'roster') {
    const mods = modifications as RosterModification[];
    if (mods.length === 0) {
      parts.push('No changes — simulate with current roster.');
    } else {
      for (const mod of mods) {
        if (mod.type === 'add' && mod.player) {
          parts.push(`- ADDED ${mod.player.name} (${mod.player.position}, ${mod.player.overallRating} OVR) to ${mod.position}`);
        } else if (mod.type === 'remove' && mod.previousPlayer) {
          parts.push(`- REMOVED ${mod.previousPlayer.name} from ${mod.position}`);
        } else if (mod.type === 'swap' && mod.player && mod.previousPlayer) {
          parts.push(`- SWAPPED ${mod.previousPlayer.name} for ${mod.player.name} (${mod.player.position}, ${mod.player.overallRating} OVR) at ${mod.position}`);
        }
      }
    }
  } else if (mode === 'staff') {
    const mods = modifications as StaffModification[];
    if (mods.length === 0) {
      parts.push('No changes — simulate with current staff.');
    } else {
      for (const mod of mods) {
        if (mod.type === 'hire' && mod.staff) {
          parts.push(`- HIRED ${mod.staff.name} as ${mod.staff.title}${mod.staff.scheme ? ` (scheme: ${mod.staff.scheme})` : ''}`);
        } else if (mod.type === 'fire' && mod.previousStaff) {
          parts.push(`- FIRED ${mod.previousStaff.name} (${mod.previousStaff.title})`);
        } else if (mod.type === 'replace' && mod.staff && mod.previousStaff) {
          parts.push(`- REPLACED ${mod.previousStaff.name} with ${mod.staff.name} as ${mod.staff.title}${mod.staff.scheme ? ` (${mod.staff.scheme})` : ''}`);
        }
      }
    }
  } else {
    parts.push('Simulate optimal draft strategy for this team based on their full context.');
  }

  parts.push('\nProvide your full analysis now.');

  return parts.join('\n');
}

function parseProjection(text: string): SimulationProjection | null {
  try {
    // Extract JSON block from markdown code fence
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1].trim());
      return {
        wins: parsed.wins,
        losses: parsed.losses,
        playoffProbability: parsed.playoffProbability,
        draftPosition: parsed.draftPosition,
        keyMatchups: parsed.keyMatchups,
        schemeChanges: parsed.schemeChanges,
        freeAgencyApproach: parsed.freeAgencyApproach,
        draftStrategy: parsed.draftStrategy,
        narrative: parsed.narrative,
      };
    }

    // Fallback: try parsing the whole text as JSON
    const parsed = JSON.parse(text);
    return parsed;
  } catch {
    return null;
  }
}
