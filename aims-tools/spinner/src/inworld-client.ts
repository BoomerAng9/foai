/**
 * Inworld LLM Router client
 * ==========================
 * OpenAI-compatible chat completions over https://api.inworld.ai/v1.
 *
 * Auth:
 *   Authorization: Basic <INWORLD_API_KEY>
 *   (Inworld uses "Basic" — not "Bearer". The key is passed raw, not
 *    base64(user:pass). See docs.inworld.ai/api-reference/routerAPI.)
 *
 * Model field accepts:
 *   - "auto"                          → Inworld picks the best provider
 *   - "openai/gpt-4o"                 → provider-prefixed route id
 *   - "anthropic/claude-3.5-sonnet"   → provider-prefixed route id
 *   - "inworld/<router-name>"         → named router with rules
 */

import type { ChatEngineId } from './types.js';

export const INWORLD_BASE_URL =
  process.env.INWORLD_BASE_URL || 'https://api.inworld.ai/v1';

export function readInworldKey(): string {
  return (
    process.env.INWORLD_API_KEY ||
    process.env.Inworld_API_Key ||
    process.env.INWORLD_KEY ||
    ''
  );
}

export interface InworldToolFunction {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface InworldTool {
  type: 'function';
  function: InworldToolFunction;
}

export interface InworldToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface InworldMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: InworldToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface InworldChatRequest {
  model: string;
  messages: InworldMessage[];
  tools?: InworldTool[];
  tool_choice?: 'auto' | 'none' | 'required' | {
    type: 'function';
    function: { name: string };
  };
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  stop?: string[];
  user?: string;
  extra_body?: Record<string, unknown>;
  web_search?: boolean;
}

export interface InworldChoice {
  index: number;
  message: InworldMessage;
  finish_reason: string;
}

export interface InworldUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface InworldChatResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: InworldChoice[];
  usage: InworldUsage;
  metadata?: {
    attempts?: unknown[];
    generation_id?: string;
    reasoning?: string;
    total_duration_ms?: number;
  };
}

export class InworldError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: string,
  ) {
    super(message);
    this.name = 'InworldError';
  }
}

export interface InworldClientOptions {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  appId?: string;
}

export class InworldClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly appId: string;

  constructor(opts: InworldClientOptions = {}) {
    this.apiKey = opts.apiKey ?? readInworldKey();
    this.baseUrl = opts.baseUrl ?? INWORLD_BASE_URL;
    this.timeoutMs = opts.timeoutMs ?? 60_000;
    this.appId = opts.appId ?? 'aims-spinner';
    if (!this.apiKey) {
      throw new InworldError(
        'No Inworld API key. Set INWORLD_API_KEY (or Inworld_API_Key per reference_openclaw_credentials.md).',
      );
    }
  }

  async chat(request: InworldChatRequest): Promise<InworldChatResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Basic ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-App-Id': this.appId,
        },
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new InworldError(
          `Inworld HTTP ${res.status}`,
          res.status,
          body.slice(0, 2000),
        );
      }
      return (await res.json()) as InworldChatResponse;
    } finally {
      clearTimeout(timer);
    }
  }
}

export function mapEngineToInworldModel(engineId: ChatEngineId): string {
  switch (engineId) {
    case 'glm-5.1':
      return 'zhipu/glm-5.1';
    case 'gemini-3.1-flash-live':
      return 'google/gemini-3.1-flash-live';
    case 'gemini-3-flash':
      return 'google/gemini-3-flash';
    case 'claude-haiku-4.5':
      return 'anthropic/claude-haiku-4.5';
  }
}

export function isInworldConfigured(): boolean {
  return readInworldKey().length > 0;
}
