/**
 * Per|Form Draft Simulation via Claude Managed Agents
 * ====================================================
 * Replaces the mock engine entirely. Claude runs the draft as a
 * persistent interactive session — users can make picks, propose
 * trades, ask questions, and get analyst reactions in real time.
 *
 * The user is IN the draft room. Claude is the commissioner.
 *
 * API: https://platform.claude.com/docs/en/managed-agents/overview
 * Beta header: managed-agents-2026-04-01
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const BASE_URL = 'https://api.anthropic.com';
const BETA_HEADER = 'managed-agents-2026-04-01';

export function managedAgentsAvailable(): boolean {
  return ANTHROPIC_API_KEY.length > 0;
}

function headers(): Record<string, string> {
  return {
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-beta': BETA_HEADER,
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json',
  };
}

/* ── Types ── */

export interface DraftSession {
  sessionId: string;
  agentId: string;
  environmentId?: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  mode: 'auto' | 'pick-team' | 'war-room';
  userTeam?: string;
  chaosFactor: number;
}

export interface DraftEvent {
  type: 'pick' | 'trade' | 'commentary' | 'question' | 'user_turn' | 'status' | 'error';
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

/* ── Agent Definition ── */

function buildDraftSystemPrompt(mode: string, userTeam?: string, chaosFactor = 30): string {
  const teamContext = userTeam
    ? `The user controls the ${userTeam}. When it is ${userTeam}'s turn to pick, STOP and ask the user who they want to draft. Present the top 5 available prospects with TIE grades and your recommendation. Wait for the user's response before continuing.`
    : 'Run the entire draft autonomously.';

  return `You are the NFL Draft Commissioner for Per|Form's 2026 NFL Draft Simulation.

YOUR ROLE: Run a realistic 7-round NFL draft simulation. You make picks for AI teams based on team needs, prospect grades, and historical patterns. You generate realistic trades. You provide analyst commentary after key picks.

CHAOS FACTOR: ${chaosFactor}/100 (0 = chalk/consensus picks only, 100 = wild surprises). At ${chaosFactor}, ${chaosFactor < 30 ? 'stick mostly to consensus big board order' : chaosFactor < 60 ? 'allow moderate surprises and 2-3 trades per round' : 'generate significant surprises, reaches, and frequent trades'}.

MODE: ${mode}
${teamContext}

DRAFT RULES:
- 7 rounds, 32 picks per round (224 total, plus compensatory)
- Pick clock: 10 min (R1), 7 min (R2), 5 min (R3-6), 4 min (R7)
- Teams can trade picks for picks, picks for players, or future picks
- No team trades up more than 3 times total or 2 times per round
- Trade values follow the Jimmy Johnson chart
- Compensatory picks cannot be traded

TIE GRADING (Per|Form proprietary):
- 40% Talent (athleticism, physical tools, measurables)
- 30% Intangibles (leadership, character, work ethic, football IQ)
- 30% Execution (production, consistency, clutch performance)
- Tiers: Prime Player (101+), Elite (90-100), Starter (75-89), Contributor (60-74), Project (<60)

FOR EACH PICK, output in this format:
[PICK] #<number> (Round <r>, Pick <p>) — <TEAM>
Player: <Name>, <Position>, <School>
TIE Grade: <grade> (<tier>)
Analysis: <1-2 sentences on why this pick makes sense>

FOR TRADES:
[TRADE] <Team A> sends <picks/players> to <Team B> for <picks/players>
Value: <Team A gets X points, Team B gets Y points> (<winner> wins by <diff>)

FOR COMMENTARY (every 5-8 picks, rotate analysts):
[THE COLONEL] "<hot take in Jersey accent>"
[BUN-E] "<cosmic insight, sometimes rhymes>"
[VOID-CASTER] "<data-driven, broadcast gravitas>"

WHEN USER'S TEAM IS ON THE CLOCK (war-room/pick-team mode):
[YOUR PICK] The <Team> are on the clock at #<number>.
Top 5 available:
1. <Name> <Pos> <School> — TIE: <grade> — <why they fit>
2. ...
My recommendation: <Name> because <reason>
Trade offers: <any incoming offers>

Who do you want to pick? (Type a name, "trade", or ask me anything)

IMPORTANT RULES:
- Never reveal internal model names, API providers, or infrastructure
- Produce picks one at a time or in small batches for real-time feel
- QBs drive the board — when a QB gets picked, explain the domino effect
- Position runs happen naturally (2+ of same position in 5 picks)
- Surprise picks should be justified ("Team X has a private workout connection")
- After Round 1, summarize grades and biggest surprises before continuing`;
}

/* ── API Calls ── */

export async function createDraftAgent(mode: string, userTeam?: string, chaosFactor = 30): Promise<{ agentId: string | null; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/v1/agents`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        name: `Per|Form Draft ${mode} ${Date.now()}`,
        model: 'claude-sonnet-4-6',
        system: buildDraftSystemPrompt(mode, userTeam, chaosFactor),
        tools: [{ type: 'agent_toolset_20260401' }],
      }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return { agentId: null, error: `createAgent ${res.status}: ${err.slice(0, 300)}` };
    }
    const json = await res.json();
    return { agentId: json.id || json.agent_id };
  } catch (err) {
    return { agentId: null, error: err instanceof Error ? err.message : 'createAgent failed' };
  }
}

export async function createDraftEnvironment(): Promise<{ environmentId: string | null; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/v1/environments`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        name: `draft-env-${Date.now()}`,
        config: {
          type: 'cloud',
          networking: { type: 'restricted' },
        },
      }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return { environmentId: null, error: `createEnv ${res.status}: ${err.slice(0, 300)}` };
    }
    const json = await res.json();
    return { environmentId: json.id || json.environment_id };
  } catch (err) {
    return { environmentId: null, error: err instanceof Error ? err.message : 'createEnv failed' };
  }
}

export async function startDraftSession(
  agentId: string,
  environmentId: string | undefined,
  config: { mode: string; userTeam?: string; chaosFactor?: number; rounds?: number },
): Promise<DraftSession | { error: string }> {
  try {
    const body: Record<string, unknown> = { agent: agentId };
    if (environmentId) body.environment_id = environmentId;
    body.title = `2026 NFL Draft — ${config.mode} mode`;

    const res = await fetch(`${BASE_URL}/v1/sessions`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return { error: `startSession ${res.status}: ${err.slice(0, 300)}` };
    }
    const json = await res.json();
    const sessionId = json.id || json.session_id;

    // Kick off the draft
    const rounds = config.rounds ?? 7;
    const kickoff = config.mode === 'war-room'
      ? `Start the 2026 NFL Draft simulation. I'm the GM of the ${config.userTeam}. Run ${rounds} rounds. When it's my team's turn, stop and ask me. For all other teams, make picks autonomously. Chaos factor: ${config.chaosFactor ?? 30}/100. Begin with Pick #1.`
      : `Run the complete 2026 NFL Draft simulation, all ${rounds} rounds, ${rounds * 32} picks. Chaos factor: ${config.chaosFactor ?? 30}/100. Show every pick with analysis. Begin.`;

    await sendMessage(sessionId, kickoff);

    return {
      sessionId,
      agentId,
      environmentId,
      status: 'running',
      mode: config.mode as DraftSession['mode'],
      userTeam: config.userTeam,
      chaosFactor: config.chaosFactor ?? 30,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'startSession failed' };
  }
}

export async function sendMessage(sessionId: string, message: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/v1/sessions/${sessionId}/events`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        events: [{
          type: 'user.message',
          content: [{ type: 'text', text: message }],
        }],
      }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return { ok: false, error: `sendMessage ${res.status}: ${err.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'sendMessage failed' };
  }
}

/**
 * Stream draft events via SSE. Yields parsed events as they arrive.
 * The frontend connects to this and renders picks in real-time.
 */
export async function* streamDraftEvents(sessionId: string): AsyncGenerator<DraftEvent, void, unknown> {
  const res = await fetch(`${BASE_URL}/v1/sessions/${sessionId}/stream`, {
    method: 'GET',
    headers: {
      ...headers(),
      Accept: 'text/event-stream',
    },
  });

  if (!res.ok || !res.body) {
    yield {
      type: 'error',
      content: `Stream failed: ${res.status}`,
      timestamp: new Date().toISOString(),
    };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));

        if (data.type === 'agent.message') {
          const text = (data.content || [])
            .filter((b: { type: string }) => b.type === 'text')
            .map((b: { text: string }) => b.text)
            .join('');

          // Parse the structured output into events
          for (const event of parseDraftOutput(text)) {
            yield event;
          }
        }

        if (data.type === 'session.status_idle') {
          yield {
            type: 'status',
            content: 'Draft session idle — waiting for input or complete.',
            timestamp: new Date().toISOString(),
          };
        }
      } catch {
        // Skip unparseable SSE lines
      }
    }
  }
}

/**
 * Parse Claude's structured draft output into typed events.
 */
function parseDraftOutput(text: string): DraftEvent[] {
  const events: DraftEvent[] = [];
  const now = new Date().toISOString();

  // Split on markers
  const pickMatches = text.matchAll(/\[PICK\]\s*#(\d+).*?\n([\s\S]*?)(?=\[PICK\]|\[TRADE\]|\[THE COLONEL\]|\[BUN-E\]|\[VOID-CASTER\]|\[YOUR PICK\]|$)/g);
  for (const m of pickMatches) {
    events.push({ type: 'pick', content: m[0].trim(), timestamp: now, metadata: { pick_number: parseInt(m[1]) } });
  }

  const tradeMatches = text.matchAll(/\[TRADE\]\s*([\s\S]*?)(?=\[PICK\]|\[TRADE\]|\[THE COLONEL\]|\[BUN-E\]|\[VOID-CASTER\]|\[YOUR PICK\]|$)/g);
  for (const m of tradeMatches) {
    events.push({ type: 'trade', content: m[0].trim(), timestamp: now });
  }

  const commentaryMatches = text.matchAll(/\[(THE COLONEL|BUN-E|VOID-CASTER)\]\s*([\s\S]*?)(?=\[PICK\]|\[TRADE\]|\[THE COLONEL\]|\[BUN-E\]|\[VOID-CASTER\]|\[YOUR PICK\]|$)/g);
  for (const m of commentaryMatches) {
    events.push({ type: 'commentary', content: m[0].trim(), timestamp: now, metadata: { analyst: m[1] } });
  }

  const userTurnMatches = text.matchAll(/\[YOUR PICK\]\s*([\s\S]*?)(?=\[PICK\]|\[TRADE\]|\[THE COLONEL\]|\[BUN-E\]|\[VOID-CASTER\]|$)/g);
  for (const m of userTurnMatches) {
    events.push({ type: 'user_turn', content: m[0].trim(), timestamp: now });
  }

  // If nothing matched, return the raw text as commentary
  if (events.length === 0 && text.trim().length > 0) {
    events.push({ type: 'commentary', content: text.trim(), timestamp: now });
  }

  return events;
}

export async function getSessionStatus(sessionId: string): Promise<{ status: string } | null> {
  try {
    const res = await fetch(`${BASE_URL}/v1/sessions/${sessionId}`, { headers: headers() });
    if (!res.ok) return null;
    const json = await res.json();
    return { status: json.status || 'unknown' };
  } catch {
    return null;
  }
}
