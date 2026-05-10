/**
 * Chat engine selection
 * =====================
 * Per project_chat_engine_decision.md:
 *   - Gemma is OUT (Rish's experience: unreliable on OpenRouter even
 *     when account is funded)
 *   - GLM-5.1 is the default chat model (open-source, in our catalog,
 *     cost-controlled, $1/$3.20 per 1M, 202k context)
 *   - Gemini 3.1 Flash Live is the multimodal upgrade tier
 *   - Claude Haiku 4.5 is the fallback if Anthropic key arrives
 *
 * The engine config is centralized here so the chat layer never
 * hardcodes a model id. Changing the default is a one-line edit.
 */

import { getRowById, getRowByRouteId, type PricingRow } from '@aims/pricing-matrix';
import type { ChatEngineId, ComputerUseEngineId, EngineConfig } from './types.js';

// ─── Default config ─────────────────────────────────────────────────

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  // Foundation: GLM-5.1 default (per Rish's anti-Gemma directive)
  primary: 'glm-5.1',
  // Upgrade when user opts into multimodal/realtime
  multimodalUpgrade: 'gemini-3.1-flash-live',
  // Fallback if primary errors
  fallback: 'claude-haiku-4.5',
  // Computer Use chain
  computerUse: 'glm-turbo',
  computerUseFallback: 'claude-sonnet-4.5-computer-use',
};

// ─── Hard ban list ──────────────────────────────────────────────────

/**
 * Models that must NEVER be used as the default chat engine.
 * Source of truth for the "Gemma OUT" decision.
 */
export const BANNED_DEFAULTS: string[] = [
  'gemma',
  'gemma-2',
  'gemma-7b',
  'gemma-2b',
  'google/gemma',
];

export function assertNotBanned(modelId: string): void {
  const lc = modelId.toLowerCase();
  for (const banned of BANNED_DEFAULTS) {
    if (lc.includes(banned)) {
      throw new Error(
        `[spinner/chat-engine] Refusing to use banned default model "${modelId}". ` +
          `Per project_chat_engine_decision.md, Gemma is unreliable on OpenRouter ` +
          `and must not be the default chat engine.`,
      );
    }
  }
}

// ─── Engine resolution ──────────────────────────────────────────────

export interface ResolvedEngine {
  engineId: ChatEngineId;
  pricingRow: PricingRow | undefined;
  routeId: string | undefined;
  notes: string[];
}

/**
 * Resolve an engine id to its pricing matrix row + route id.
 * Returns the row + warnings if anything is misconfigured.
 */
export function resolveChatEngine(engineId: ChatEngineId): ResolvedEngine {
  assertNotBanned(engineId);

  const notes: string[] = [];

  // Map our short engine id to the canonical pricing matrix row id
  const rowId = mapEngineIdToRowId(engineId);
  const row = getRowById(rowId);

  if (!row) {
    notes.push(`No pricing matrix row found for engine '${engineId}' (lookup id '${rowId}')`);
  } else {
    if (!row.active) notes.push(`Pricing row for ${engineId} is marked inactive`);
    if (row.supersededBy) notes.push(`Pricing row for ${engineId} is superseded by '${row.supersededBy}'`);
  }

  return {
    engineId,
    pricingRow: row,
    routeId: row?.routeId,
    notes,
  };
}

/**
 * Resolve the entire engine config — primary + multimodal + fallback.
 * Returns the full chain so callers can build a fallback router.
 */
export function resolveEngineConfig(config: EngineConfig = DEFAULT_ENGINE_CONFIG): {
  primary: ResolvedEngine;
  multimodalUpgrade?: ResolvedEngine;
  fallback?: ResolvedEngine;
  computerUseRow?: PricingRow;
  computerUseFallbackRow?: PricingRow;
} {
  const primary = resolveChatEngine(config.primary);
  const multimodalUpgrade = config.multimodalUpgrade
    ? resolveChatEngine(config.multimodalUpgrade)
    : undefined;
  const fallback = config.fallback ? resolveChatEngine(config.fallback) : undefined;

  const computerUseRow = config.computerUse
    ? getRowById(mapComputerUseIdToRowId(config.computerUse))
    : undefined;
  const computerUseFallbackRow = config.computerUseFallback
    ? getRowById(mapComputerUseIdToRowId(config.computerUseFallback))
    : undefined;

  return { primary, multimodalUpgrade, fallback, computerUseRow, computerUseFallbackRow };
}

// ─── Engine id ↔ pricing matrix row id mapping ─────────────────────

function mapEngineIdToRowId(engineId: ChatEngineId): string {
  switch (engineId) {
    case 'glm-5.1':
      return 'glm-5.1';
    case 'gemini-3.1-flash-live':
      // Until the matrix has a 3.1-flash-live row, fall back to 3.0 flash
      return 'gemini-3-flash';
    case 'gemini-3-flash':
      return 'gemini-3-flash';
    case 'claude-haiku-4.5':
      return 'claude-haiku-4.5';
  }
}

function mapComputerUseIdToRowId(engineId: ComputerUseEngineId): string {
  switch (engineId) {
    case 'glm-turbo':
      // Pricing matrix may not have a separate glm-turbo row yet — fall back to glm-5.1
      return 'glm-5.1';
    case 'claude-sonnet-4.5-computer-use':
      return 'claude-sonnet-4.5';
    case 'gemini-3-pro-vision':
      return 'gemini-3-pro';
  }
}

// ─── Chat call interface (stub) ─────────────────────────────────────

export interface ChatRequest {
  engineId: ChatEngineId;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  engineId: ChatEngineId;
  content: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  costUsd: number;
}

/**
 * Live chat call via OpenRouter.
 *
 * Behavior:
 *   1. Look up the engine via resolveChatEngine()
 *   2. Verify the row is active and has a routeId
 *   3. POST to OPENROUTER_BASE_URL/chat/completions with the route id
 *   4. Compute cost from the pricing matrix row's per-1M rates
 *   5. On HTTP / network error → automatic fallback to the next engine
 *      in the chain (multimodalUpgrade or fallback)
 *   6. Refuse to use any banned engine (Gemma) — assertNotBanned()
 *
 * Auth: OPENROUTER_API_KEY env var (also accepts the openclaw mixed-case
 * 'Openrouter_API_Key' per reference_openclaw_credentials.md).
 *
 * The chat() function is the foundation per Rish 2026-04-08:
 *   "We have to figure out what's gonna work. ... we first establish the
 *    working model, and then we can scaffold on top of that."
 */

const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

function readOpenRouterKey(): string {
  // Support both standard and openclaw mixed-case env names per
  // reference_openclaw_credentials.md
  return (
    process.env.OPENROUTER_API_KEY ||
    process.env.Openrouter_API_Key ||
    process.env.OPENROUTER_KEY ||
    ''
  );
}

interface OpenRouterChoice {
  message: { role: string; content: string };
  finish_reason?: string;
}

interface OpenRouterCompletion {
  id?: string;
  choices: OpenRouterChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

async function callOpenRouter(
  routeId: string,
  request: ChatRequest,
  apiKey: string,
): Promise<OpenRouterCompletion> {
  const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://aimanagedsolutions.cloud',
      'X-Title': 'A.I.M.S. Spinner',
    },
    body: JSON.stringify({
      model: routeId,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4096,
      stream: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => 'unknown error body');
    throw new Error(`OpenRouter HTTP ${res.status}: ${body.slice(0, 500)}`);
  }

  return (await res.json()) as OpenRouterCompletion;
}

function computeCostUsd(
  row: PricingRow | undefined,
  promptTokens: number,
  completionTokens: number,
): number {
  if (!row) return 0;
  const inRate = row.inputPer1M ?? 0;
  const outRate = row.outputPer1M ?? 0;
  const inCost = (promptTokens / 1_000_000) * inRate;
  const outCost = (completionTokens / 1_000_000) * outRate;
  return Math.round((inCost + outCost) * 1_000_000) / 1_000_000;
}

/**
 * Build the fallback chain from the engine config in priority order.
 * The chain is tried in order; if all fail, the last error is thrown.
 */
function buildFallbackChain(
  engineId: ChatEngineId,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG,
): ChatEngineId[] {
  const chain: ChatEngineId[] = [engineId];
  if (config.multimodalUpgrade && config.multimodalUpgrade !== engineId) {
    chain.push(config.multimodalUpgrade);
  }
  if (config.fallback && !chain.includes(config.fallback)) {
    chain.push(config.fallback);
  }
  return chain;
}

export async function chat(request: ChatRequest): Promise<ChatResponse> {
  assertNotBanned(request.engineId);

  const apiKey = readOpenRouterKey();
  if (!apiKey) {
    throw new Error(
      '[spinner/chat-engine] No OpenRouter API key in env. Set OPENROUTER_API_KEY ' +
        '(or Openrouter_API_Key per reference_openclaw_credentials.md).',
    );
  }

  const chain = buildFallbackChain(request.engineId);
  const errors: Array<{ engineId: ChatEngineId; error: string }> = [];

  for (const engineId of chain) {
    try {
      const resolved = resolveChatEngine(engineId);
      if (!resolved.pricingRow || !resolved.routeId) {
        errors.push({
          engineId,
          error: `No pricing row or routeId for ${engineId}: ${resolved.notes.join('; ')}`,
        });
        continue;
      }

      const completion = await callOpenRouter(resolved.routeId, request, apiKey);
      const choice = completion.choices?.[0];
      if (!choice) {
        errors.push({ engineId, error: 'no choices in completion' });
        continue;
      }

      const promptTokens = completion.usage?.prompt_tokens ?? 0;
      const completionTokens = completion.usage?.completion_tokens ?? 0;
      const totalTokens =
        completion.usage?.total_tokens ?? promptTokens + completionTokens;

      return {
        engineId,
        content: choice.message?.content ?? '',
        usage: { promptTokens, completionTokens, totalTokens },
        costUsd: computeCostUsd(resolved.pricingRow, promptTokens, completionTokens),
      };
    } catch (e) {
      errors.push({
        engineId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // All engines in the chain failed
  throw new Error(
    `[spinner/chat-engine] All engines in fallback chain failed:\n` +
      errors.map((e) => `  - ${e.engineId}: ${e.error}`).join('\n'),
  );
}

/**
 * Convenience helper for one-off prompts. Skips the messages array
 * boilerplate. Returns just the content string.
 */
export async function prompt(
  text: string,
  opts: {
    engineId?: ChatEngineId;
    system?: string;
    maxTokens?: number;
    temperature?: number;
  } = {},
): Promise<string> {
  const messages: ChatRequest['messages'] = [];
  if (opts.system) messages.push({ role: 'system', content: opts.system });
  messages.push({ role: 'user', content: text });

  const response = await chat({
    engineId: opts.engineId ?? DEFAULT_ENGINE_CONFIG.primary,
    messages,
    temperature: opts.temperature,
    maxTokens: opts.maxTokens,
  });
  return response.content;
}
