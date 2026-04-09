/**
 * LLM-driven prompt-to-plan recommender for TPS_Report_Ang
 * =========================================================
 * Roadmap item #4. Replaces the heuristic recommender with a free-tier
 * LLM call (default GLM-5.1, Gemma banned). The heuristic version stays
 * as a deterministic fallback for when the LLM is unavailable or returns
 * an unparseable response.
 *
 * Per project_pricing_overseer_agent.md:
 *   "Backing LLM: Free-tier via OpenRouter (per pricing-page free-model
 *    policy: 'free LLMs for chat and brainstorming at no cost'). Runs
 *    on a zero-cost-to-user model so price discussions don't burn user
 *    tokens."
 *
 * Pricing context for the LLM is built from @aims/pricing-matrix so
 * the recommendations are always current with whatever's in the matrix.
 */

import {
  getMatrix,
  type PricingRow,
  type Frequency,
  type VibeGroup,
  type TaskType,
} from '@aims/pricing-matrix';
import { promptToPlan as heuristicPromptToPlan, type PromptToPlanInput, type PromptToPlanResult } from './pricing-overseer.js';

const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

// Default to GLM-5.1 (per project_chat_engine_decision.md). Gemma BANNED.
const DEFAULT_PROMPT_TO_PLAN_MODEL =
  process.env.TPS_REPORT_ANG_LLM_MODEL || 'z-ai/glm-5.1';

function readApiKey(): string {
  return (
    process.env.OPENROUTER_API_KEY ||
    process.env.Openrouter_API_Key ||
    process.env.OPENROUTER_KEY ||
    ''
  );
}

function isGemma(modelId: string): boolean {
  return /gemma/i.test(modelId);
}

// ─── Build the LLM context from the pricing matrix ──────────────────

interface PricingContext {
  plans: Array<{
    frequency: Frequency;
    groups: VibeGroup[];
    tagline: string;
    tokenAllocation: number;
    agentLimit: number;
  }>;
  topTools: Array<{
    id: string;
    name: string;
    sector: string;
    tier: string;
    capabilities: readonly string[];
    bestCase: string;
  }>;
}

function buildPricingContext(): PricingContext {
  const matrix = getMatrix();

  const plans = matrix.rows
    .filter((r): r is PricingRow & { frequency: Frequency; tokenAllocation: number; agentLimit: number; tagline?: string } =>
      r.rowType === 'plan' && 'frequency' in r,
    )
    .map((p) => ({
      frequency: p.frequency,
      groups: p.vibeGroups,
      tagline: p.tagline ?? '',
      tokenAllocation: p.tokenAllocation,
      agentLimit: p.agentLimit,
    }));

  // Pick the most-used / highest-priority tools per sector
  const topTools = matrix.rows
    .filter((r) => r.rowType === 'model' || r.rowType === 'service')
    .sort((a, b) => (a.routingPriority ?? 999) - (b.routingPriority ?? 999))
    .slice(0, 20)
    .map((r) => ({
      id: r.id,
      name: r.topic,
      sector: r.sector,
      tier: r.tier ?? 'standard',
      capabilities: r.capabilities,
      bestCase: r.notes ?? r.description ?? '',
    }));

  return { plans, topTools };
}

// ─── LLM call ───────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are TPS_Report_Ang, the A.I.M.S. Pricing Overseer. You help users pick the right plan and tools for what they want to build.

Output STRICT JSON only — no markdown, no preamble, no postamble. Schema:
{
  "recommendedFrequency": "3-month" | "6-month" | "9-month" | "ppu",
  "recommendedGroup": "individual" | "family" | "team" | "enterprise",
  "recommendedToolIds": string[],
  "estimatedMonthlyTokens": number,
  "reasoning": string[]
}

Rules:
- If user mentions trial/test → 3-month
- If user mentions long-term/year/commitment → 9-month (pay 9 get 12)
- Default → 6-month (axis of balance)
- 1 user → individual; family/spouse → family; 5-20 people → team; 21+ → enterprise
- Pick tools from the catalog. Prefer open-source for low budgets, premium for high stakes.
- Always include at least 2 tools.
- Reasoning should be 3-5 short bullet points explaining the decision.
- NEVER reveal model names to the end user — that's the Charter rule. The reasoning is internal-facing only.`;

async function callLlm(prompt: string, context: PricingContext): Promise<string> {
  const apiKey = readApiKey();
  if (!apiKey) {
    throw new Error('[tps-report-ang/llm] No OpenRouter API key in env');
  }

  if (isGemma(DEFAULT_PROMPT_TO_PLAN_MODEL)) {
    throw new Error('[tps-report-ang/llm] Refusing to use banned Gemma model');
  }

  const userPrompt =
    `User intent:\n${prompt}\n\n` +
    `Available plans:\n${JSON.stringify(context.plans, null, 2)}\n\n` +
    `Top 20 tools (sorted by routing priority):\n${JSON.stringify(context.topTools, null, 2)}\n\n` +
    `Return STRICT JSON matching the schema. No markdown.`;

  const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://aimanagedsolutions.cloud',
      'X-Title': 'A.I.M.S. TPS_Report_Ang',
    },
    body: JSON.stringify({
      model: DEFAULT_PROMPT_TO_PLAN_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`[tps-report-ang/llm] OpenRouter HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim() ?? '';
  if (!content) {
    throw new Error('[tps-report-ang/llm] Empty completion');
  }
  return content;
}

interface LlmPlanResponse {
  recommendedFrequency: Frequency;
  recommendedGroup: VibeGroup;
  recommendedToolIds: string[];
  estimatedMonthlyTokens: number;
  reasoning: string[];
}

function parseLlmResponse(raw: string): LlmPlanResponse {
  // Strip markdown fences if the model included them despite instructions
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }
  const parsed = JSON.parse(cleaned) as Partial<LlmPlanResponse>;

  if (!parsed.recommendedFrequency || !parsed.recommendedGroup || !Array.isArray(parsed.recommendedToolIds)) {
    throw new Error('[tps-report-ang/llm] Response missing required fields');
  }
  return {
    recommendedFrequency: parsed.recommendedFrequency,
    recommendedGroup: parsed.recommendedGroup,
    recommendedToolIds: parsed.recommendedToolIds,
    estimatedMonthlyTokens: parsed.estimatedMonthlyTokens ?? 100_000,
    reasoning: parsed.reasoning ?? [],
  };
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * LLM-driven prompt-to-plan recommender. Uses the free-tier model
 * (default GLM-5.1) with the pricing matrix as context. Falls back
 * to the heuristic recommender if the LLM call fails or the response
 * is unparseable.
 */
export async function promptToPlanWithLlm(input: PromptToPlanInput): Promise<PromptToPlanResult> {
  const matrix = getMatrix();

  try {
    const context = buildPricingContext();
    const raw = await callLlm(input.prompt, context);
    const llmResponse = parseLlmResponse(raw);

    // Resolve tool ids to actual PricingRow objects
    const recommendedTools: PricingRow[] = [];
    for (const id of llmResponse.recommendedToolIds) {
      const row = matrix.rows.find((r) => r.id === id);
      if (row) recommendedTools.push(row);
    }

    // If LLM returned ids we can't resolve, fall through to heuristic to
    // ensure the user always gets at least one usable recommendation
    if (recommendedTools.length === 0) {
      throw new Error('[tps-report-ang/llm] No resolvable tools in LLM response — falling back to heuristic');
    }

    return {
      recommendedFrequency: llmResponse.recommendedFrequency,
      recommendedGroup: llmResponse.recommendedGroup,
      recommendedTools,
      effectiveMultiplier: 1.23, // weighted-average default until task mix is known
      estimatedMonthlyTokens: llmResponse.estimatedMonthlyTokens,
      reasoning: ['(LLM-driven recommendation)', ...llmResponse.reasoning],
    };
  } catch (e) {
    // Graceful fallback to deterministic heuristic
    // eslint-disable-next-line no-console
    console.warn(
      `[tps-report-ang/llm] Falling back to heuristic recommender:`,
      e instanceof Error ? e.message : e,
    );
    const fallback = heuristicPromptToPlan(input);
    return {
      ...fallback,
      reasoning: ['(Heuristic fallback — LLM unavailable)', ...fallback.reasoning],
    };
  }
}
