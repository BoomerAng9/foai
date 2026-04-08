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
 * Stub for the actual chat call. Real implementation will:
 *   1. Look up the engine via resolveChatEngine()
 *   2. Hit the route via OpenRouter or Vertex AI (per design routing)
 *   3. Compute cost from the pricing matrix row
 *   4. On error → automatic fallback to config.fallback
 *
 * Wired in a follow-up PR once Step 1 (verify GLM-5.1 chat works on
 * funded OpenRouter account) is complete.
 */
export async function chat(_request: ChatRequest): Promise<ChatResponse> {
  throw new Error(
    '[spinner/chat-engine] chat() is a stub. Step 1 of the Spinner build ' +
      'requires verifying GLM-5.1 chat works on funded OpenRouter before this ' +
      'is wired. See project_chat_engine_decision.md.',
  );
}
