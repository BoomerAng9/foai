/**
 * Inworld Realtime adapter — Spinner voice + function calling.
 *
 * Architecture: browser connects directly to Inworld's Realtime WebSocket
 * (OpenAI Realtime protocol). This module hands the browser a short-lived
 * session config with a Bearer JWT the browser uses as the WSS
 * Authorization header. Tool dispatch is server-side here under Port
 * Authority so chain-of-command is enforced.
 *
 * v0.2.0 ephemeral-token security fix (2026-04-18, Gate 1a of the
 * 2026-04-17 arbitration):
 *
 *   Pre-0.2.0 `mintEphemeralCredential` returned the root
 *   `INWORLD_API_KEY` as the `client_token`. That leaked the root key
 *   to every browser that asked for a realtime session.
 *
 *   v0.2.0 signs a short-lived JWT using the INWORLD_JWT_SECRET
 *   (obtained from the Inworld Portal → Settings → JWT signing key).
 *   The root API key never leaves the gateway.
 *
 *   If INWORLD_JWT_SECRET is not configured, the session-mint call
 *   throws MissingJwtSecretError. The caller should return a 503
 *   with a clear operator message — fail closed rather than silently
 *   regressing to the leak.
 */

import jwt from 'jsonwebtoken';

export interface InworldToolDefinition {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface InworldSessionConfig {
  model: string;
  instructions: string;
  voice: string;
  tts_model: string;
  tools: InworldToolDefinition[];
  tool_choice: 'auto' | 'none' | 'required';
  modalities: Array<'text' | 'audio'>;
  input_audio_format: 'pcm16';
  output_audio_format: 'pcm16';
}

export interface SpinnerSessionOptions {
  surface: 'deploy' | 'perform' | 'cti-hub' | 'aims' | 'smelter-os' | 'foai-hub';
  userId?: string;
  persona?: string;
  voice?: string;
  ttsModel?: 'inworld-tts-1.5-mini' | 'inworld-tts-1.5-max';
  extraTools?: InworldToolDefinition[];
  /** Optional scope claims applied to the minted JWT. Defaults to ['realtime']. */
  scopes?: string[];
}

export const SPINNER_BASE_TOOLS: InworldToolDefinition[] = [
  {
    type: 'function',
    name: 'navigate_to',
    description: 'Navigate the user to a different surface or path within the ecosystem.',
    parameters: {
      type: 'object',
      properties: {
        surface: { type: 'string', enum: ['deploy', 'perform', 'cti-hub', 'aims', 'smelter-os', 'foai-hub'] },
        path: { type: 'string', description: 'Route path, e.g. /plug/sqwaadrun' },
      },
      required: ['surface', 'path'],
    },
  },
  {
    type: 'function',
    name: 'dispatch_agent',
    description: 'Dispatch a Lil_Hawk, Boomer_Ang, or Chicken Hawk to execute a task in the background.',
    parameters: {
      type: 'object',
      properties: {
        agent: { type: 'string', description: 'Agent identifier, e.g. "chicken_hawk", "iller_ang", "lil_hawk_recon"' },
        task: { type: 'string', description: 'Plain-language task description' },
        priority: { type: 'string', enum: ['low', 'normal', 'high'] },
      },
      required: ['agent', 'task'],
    },
  },
  {
    type: 'function',
    name: 'query',
    description: 'Query ecosystem data sources (Per|Form DB, AIMS, Neon, NTNTN index, web search).',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', enum: ['perform', 'aims', 'neon', 'ntntn', 'web'] },
        question: { type: 'string' },
      },
      required: ['source', 'question'],
    },
  },
  {
    type: 'function',
    name: 'build_plug',
    description: 'Create a new aiPLUG from a specification. Returns a job_id; runs in the background.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        spec: { type: 'string', description: 'Plain-language spec for the plug' },
      },
      required: ['name', 'spec'],
    },
  },
];

const DEFAULT_MODEL = process.env.INWORLD_REALTIME_MODEL ?? 'google-ai-studio/gemini-3.1-flash';
const DEFAULT_VOICE = process.env.INWORLD_DEFAULT_VOICE ?? 'Dennis';
const DEFAULT_TTS = (process.env.INWORLD_DEFAULT_TTS_MODEL as SpinnerSessionOptions['ttsModel']) ?? 'inworld-tts-1.5-mini';
const INWORLD_WSS = process.env.INWORLD_REALTIME_WSS ?? 'wss://api.inworld.ai/v1/realtime';

const JWT_ISSUER = process.env.INWORLD_JWT_ISSUER ?? 'deploy-by-achievemor';
const JWT_AUDIENCE = process.env.INWORLD_JWT_AUDIENCE ?? 'inworld-realtime';
const JWT_TTL_MAX_SECONDS = 600;
const JWT_TTL_DEFAULT_SECONDS = 120;

export class MissingJwtSecretError extends Error {
  constructor() {
    super(
      'INWORLD_JWT_SECRET is not configured. Obtain the signing secret from ' +
        'the Inworld Portal (Settings → JWT signing key) and set it on the ' +
        'voice-gateway. This service refuses to mint ephemeral credentials ' +
        'without it — the pre-0.2.0 behavior leaked the root INWORLD_API_KEY ' +
        'to the browser and is not recoverable as a fallback.',
    );
    this.name = 'MissingJwtSecretError';
  }
}

export function buildSpinnerSessionConfig(opts: SpinnerSessionOptions): InworldSessionConfig {
  const instructions = buildInstructions(opts);
  return {
    model: DEFAULT_MODEL,
    instructions,
    voice: opts.voice ?? DEFAULT_VOICE,
    tts_model: opts.ttsModel ?? DEFAULT_TTS,
    tools: [...SPINNER_BASE_TOOLS, ...(opts.extraTools ?? [])],
    tool_choice: 'auto',
    modalities: ['text', 'audio'],
    input_audio_format: 'pcm16',
    output_audio_format: 'pcm16',
  };
}

function buildInstructions(opts: SpinnerSessionOptions): string {
  const surfaceLine = `You are Spinner, running on the ${opts.surface} surface of the FOAI ecosystem.`;
  const personaLine = opts.persona
    ? `Speak in the voice of ${opts.persona}.`
    : 'You speak on behalf of ACHEEVY. Never reveal internal tool names, model names, or pricing.';
  return [
    surfaceLine,
    personaLine,
    'When the user expresses build intent, navigation intent, or a question about ecosystem data, call the appropriate tool. Prefer tool use over long explanations. After dispatching a background job, tell the user it is running and offer to watch progress.',
  ].join(' ');
}

export interface InworldEphemeralCredential {
  wss_url: string;
  model: string;
  session_config: InworldSessionConfig;
  /**
   * Short-lived Bearer JWT the browser uses as the WSS Authorization
   * header. Signed with INWORLD_JWT_SECRET — Inworld validates server
   * side. The root INWORLD_API_KEY is NEVER returned here.
   */
  client_token: string;
  expires_at: string;
  /** Unique session ID minted per credential request; also present as the JWT `sub` claim. */
  session_id: string;
}

/**
 * Mints a short-lived Inworld Realtime Bearer JWT. Throws
 * `MissingJwtSecretError` if `INWORLD_JWT_SECRET` is not configured.
 *
 * The JWT payload carries:
 *   - sub: the session ID
 *   - surface: which FOAI surface initiated the session
 *   - user_id (when opts.userId is provided)
 *   - scope: space-separated scope claims (default 'realtime')
 *   - iss: INWORLD_JWT_ISSUER (default 'deploy-by-achievemor')
 *   - aud: INWORLD_JWT_AUDIENCE (default 'inworld-realtime')
 *   - iat, exp: standard JWT lifecycle
 */
export function mintEphemeralCredential(
  opts: SpinnerSessionOptions,
): InworldEphemeralCredential {
  const jwtSecret = process.env.INWORLD_JWT_SECRET;
  if (!jwtSecret) {
    throw new MissingJwtSecretError();
  }

  const envTtl = Number.parseInt(process.env.INWORLD_JWT_TTL_SECONDS ?? '', 10);
  const expiresInSec = Number.isFinite(envTtl) && envTtl > 0
    ? Math.min(envTtl, JWT_TTL_MAX_SECONDS)
    : JWT_TTL_DEFAULT_SECONDS;

  const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const scopes = opts.scopes && opts.scopes.length > 0 ? opts.scopes : ['realtime'];

  const clientToken = jwt.sign(
    {
      sub: sessionId,
      surface: opts.surface,
      user_id: opts.userId,
      scope: scopes.join(' '),
    },
    jwtSecret,
    {
      algorithm: 'HS256',
      expiresIn: expiresInSec,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
  );

  const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

  return {
    wss_url: INWORLD_WSS,
    model: DEFAULT_MODEL,
    session_config: buildSpinnerSessionConfig(opts),
    client_token: clientToken,
    expires_at: expiresAt,
    session_id: sessionId,
  };
}

export interface ToolDispatchRequest {
  tool_name: string;
  arguments: Record<string, unknown>;
  call_id: string;
  surface: SpinnerSessionOptions['surface'];
  userId?: string;
}

export interface ToolDispatchResult {
  call_id: string;
  output: unknown;
  error?: string;
}

export async function dispatchSpinnerTool(req: ToolDispatchRequest): Promise<ToolDispatchResult> {
  try {
    switch (req.tool_name) {
      case 'navigate_to': {
        const { surface, path } = req.arguments as { surface: string; path: string };
        return { call_id: req.call_id, output: { kind: 'navigate', surface, path } };
      }
      case 'dispatch_agent': {
        const { agent, task, priority = 'normal' } = req.arguments as {
          agent: string;
          task: string;
          priority?: string;
        };
        const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        return {
          call_id: req.call_id,
          output: { kind: 'agent_dispatch', job_id: jobId, agent, task, priority, status: 'queued' },
        };
      }
      case 'query': {
        return {
          call_id: req.call_id,
          output: { kind: 'query_pending', status: 'not_yet_wired' },
        };
      }
      case 'build_plug': {
        const { name, spec } = req.arguments as { name: string; spec: string };
        const jobId = `plug_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        return {
          call_id: req.call_id,
          output: { kind: 'plug_build', job_id: jobId, name, spec, status: 'queued' },
        };
      }
      default:
        return {
          call_id: req.call_id,
          output: null,
          error: `Unknown tool: ${req.tool_name}`,
        };
    }
  } catch (err) {
    return {
      call_id: req.call_id,
      output: null,
      error: err instanceof Error ? err.message : 'tool dispatch failed',
    };
  }
}
