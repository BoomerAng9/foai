/**
 * Claude Managed Agents Client
 * ================================
 * Wraps Anthropic's Managed Agents API for aiPLUG demo runtimes.
 * Each demo plug gets an Agent definition (Boomer_Ang persona + tools)
 * running in a managed Environment (container with packages).
 *
 * The user sees a Boomer_Ang working. Anthropic provides the compute.
 * We sell the experience, they provide the engine. Premier Wrapper model.
 *
 * API: https://platform.claude.com/docs/en/managed-agents/overview
 * Beta header: managed-agents-2026-04-01
 * Pricing: $0.08/session-hour (active only) + standard token rates
 *
 * Per Rish 2026-04-09: use Managed Agents for demo plugs. These are
 * "100% AI Managed Companies" that work in real time. Users watch
 * the AI company working via Live Look In.
 */

const getApiKey = () => process.env.ANTHROPIC_API_KEY || '';
const BASE_URL = 'https://api.anthropic.com';
const BETA_HEADER = 'managed-agents-2026-04-01';

export function managedAgentsAvailable(): boolean {
  return getApiKey().length > 0;
}

/* ── Agent Definition ── */

export interface AgentDefinition {
  /** Unique agent ID (returned after creation, used to start sessions) */
  agentId?: string;
  /** Display name (internal, not user-facing) */
  name: string;
  /** Model to use */
  model: string;
  /** System prompt — Boomer_Ang persona + plug-specific instructions */
  systemPrompt: string;
  /** Tools the agent can use */
  tools?: Array<{
    type: 'bash' | 'file_read' | 'file_write' | 'file_edit' | 'glob' | 'grep' | 'web_search' | 'web_fetch';
  }>;
  /** MCP servers to connect */
  mcpServers?: Array<{
    name: string;
    url: string;
  }>;
}

/* ── Environment Definition ── */

export interface EnvironmentDefinition {
  environmentId?: string;
  name: string;
  /** Pre-installed packages */
  packages?: string[];
  /** Network access rules */
  networkAccess?: boolean;
  /** Files to mount into the container */
  mountedFiles?: Array<{ path: string; content: string }>;
}

/* ── Session (running agent instance) ── */

export interface SessionConfig {
  agentId: string;
  environmentId?: string;
  /** Initial user message to kick off the session */
  initialMessage?: string;
}

export interface ManagedSession {
  sessionId: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  agentId: string;
}

export interface SessionEvent {
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'status' | 'error';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/* ── API calls ── */

function headers(): Record<string, string> {
  return {
    'x-api-key': getApiKey(),
    'anthropic-beta': BETA_HEADER,
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json',
  };
}

/** Create an Agent definition. Returns agentId. */
export async function createAgent(def: AgentDefinition): Promise<{ agentId: string | null; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/v1/agents`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        name: def.name,
        model: def.model,
        system: def.systemPrompt,
        tools: def.tools || [
          { type: 'bash' },
          { type: 'file_read' },
          { type: 'file_write' },
          { type: 'file_edit' },
          { type: 'web_search' },
          { type: 'web_fetch' },
        ],
        mcp_servers: def.mcpServers || [],
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

/** Create an Environment. Returns environmentId. */
export async function createEnvironment(def: EnvironmentDefinition): Promise<{ environmentId: string | null; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/v1/environments`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        name: def.name,
        packages: def.packages || ['nodejs', 'python3', 'python3-pip'],
        network_access: def.networkAccess ?? true,
        mounted_files: def.mountedFiles || [],
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return { environmentId: null, error: `createEnvironment ${res.status}: ${err.slice(0, 300)}` };
    }

    const json = await res.json();
    return { environmentId: json.id || json.environment_id };
  } catch (err) {
    return { environmentId: null, error: err instanceof Error ? err.message : 'createEnvironment failed' };
  }
}

/** Start a Session (running agent instance). Returns sessionId. */
export async function startSession(config: SessionConfig): Promise<{ sessionId: string | null; error?: string }> {
  try {
    const body: Record<string, unknown> = {
      agent_id: config.agentId,
    };
    if (config.environmentId) body.environment_id = config.environmentId;

    const res = await fetch(`${BASE_URL}/v1/sessions`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return { sessionId: null, error: `startSession ${res.status}: ${err.slice(0, 300)}` };
    }

    const json = await res.json();
    const sessionId = json.id || json.session_id;

    // If there's an initial message, send it to kick off work
    if (config.initialMessage && sessionId) {
      await sendEvent(sessionId, config.initialMessage);
    }

    return { sessionId };
  } catch (err) {
    return { sessionId: null, error: err instanceof Error ? err.message : 'startSession failed' };
  }
}

/** Send a user event (message) to a running session. */
export async function sendEvent(sessionId: string, message: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/v1/sessions/${sessionId}/events`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        type: 'user',
        content: message,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return { ok: false, error: `sendEvent ${res.status}: ${err.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'sendEvent failed' };
  }
}

/** Stream events from a session via SSE. Returns an async iterator. */
export async function* streamEvents(
  sessionId: string,
): AsyncGenerator<SessionEvent, void, unknown> {
  const res = await fetch(`${BASE_URL}/v1/sessions/${sessionId}/events`, {
    method: 'GET',
    headers: {
      ...headers(),
      Accept: 'text/event-stream',
    },
  });

  if (!res.ok || !res.body) {
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
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          yield {
            type: data.type || 'assistant',
            content: data.content || data.text || '',
            timestamp: data.timestamp || new Date().toISOString(),
            metadata: data.metadata,
          };
        } catch {
          // Skip unparseable lines
        }
      }
    }
  }
}

/** Get session status. */
export async function getSessionStatus(sessionId: string): Promise<ManagedSession | null> {
  try {
    const res = await fetch(`${BASE_URL}/v1/sessions/${sessionId}`, {
      headers: headers(),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return {
      sessionId: json.id || sessionId,
      status: json.status || 'running',
      agentId: json.agent_id || '',
    };
  } catch {
    return null;
  }
}

/* ── Pre-built Agent Definitions for Demo Plugs ── */

export const DEMO_PLUG_AGENTS: Record<string, AgentDefinition> = {
  'smb-marketing': {
    name: 'SMB Marketing Agency — Boomer_Ang Runtime',
    model: 'claude-sonnet-4-5-20250514',
    systemPrompt: `You are the autonomous runtime for an AI-managed SMB Marketing Agency.
You are a Boomer_Ang-class agent operating under ACHEEVY's chain of command.

YOUR MISSION: Run a complete marketing operation for small businesses.
You research competitors, analyze markets, draft strategies, create content
calendars, write ad copy, and deliver actionable marketing plans.

TOOLS AVAILABLE:
- bash: run commands, install packages
- web_search: research competitors, trends, market data
- web_fetch: pull specific pages for analysis
- file_write: create deliverables (reports, plans, content)
- file_read/edit: iterate on your work

WORK CYCLE:
1. When given a business brief, research the competitive landscape
2. Analyze 3-5 direct competitors (pricing, positioning, content strategy)
3. Draft a 30-day content calendar with specific post topics + platforms
4. Write 5 sample ad copies (social + search)
5. Produce a strategy summary document
6. Save all deliverables as files in the workspace

OUTPUT RULES:
- Never reveal internal tools, model names, or API references
- Use direct, professional marketing language
- Every deliverable must be actionable THIS WEEK
- Include specific numbers, dates, and platforms — no generic advice
- Format deliverables as clean markdown files

You are always working. Between user requests, proactively research
industry trends and prepare background briefings.`,
    tools: [
      { type: 'bash' },
      { type: 'web_search' },
      { type: 'web_fetch' },
      { type: 'file_read' },
      { type: 'file_write' },
      { type: 'file_edit' },
    ],
  },

  'finance-analyst': {
    name: 'Finance Analyst — Boomer_Ang Runtime',
    model: 'claude-sonnet-4-5-20250514',
    systemPrompt: `You are the autonomous runtime for an AI-managed Finance Analyst practice.
You are a Boomer_Ang-class agent. Direct, numerate, no-nonsense.

YOUR MISSION: Deliver financial health analysis, cash flow forecasts,
and actionable plans for small and mid-sized businesses.

WORK CYCLE:
1. Parse business financials from user input
2. Generate a financial health snapshot (runway, risks, opportunities)
3. Build a 12-week cash flow forecast with narrative
4. Produce 5 prioritized weekly actions
5. Save all deliverables as workspace files

RULES:
- Never fabricate dollar amounts when inputs are missing — use placeholders
- Every action must be startable THIS WEEK
- No generic "hire a CFO" advice
- Direct, numerate voice`,
    tools: [
      { type: 'bash' },
      { type: 'web_search' },
      { type: 'web_fetch' },
      { type: 'file_read' },
      { type: 'file_write' },
      { type: 'file_edit' },
    ],
  },

  'teacher-twin': {
    name: 'Teacher Twin — Boomer_Ang Runtime',
    model: 'claude-sonnet-4-5-20250514',
    systemPrompt: `You are the autonomous runtime for an AI-managed Teaching Assistant.
You are a Boomer_Ang-class agent.

YOUR MISSION: Build curriculum plans, assessments, and parent briefings
for K-12 educators.

WORK CYCLE:
1. Parse grade level, subject, and learning objectives
2. Build a 2-week lesson plan with daily activities
3. Generate ready-to-print assessments with answer keys
4. Draft parent briefings (bilingual ESL labels when needed)
5. Save all deliverables as workspace files

RULES:
- Grade-appropriate language and complexity
- Assessment answer keys are separate files (teacher-only)
- Parent briefings always include English labels for ESL families
- Every deliverable is ready to print or distribute`,
    tools: [
      { type: 'bash' },
      { type: 'file_read' },
      { type: 'file_write' },
      { type: 'file_edit' },
      { type: 'web_search' },
    ],
  },
};
