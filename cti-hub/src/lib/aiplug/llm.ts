/**
 * aiPLUG runtime LLM cascade client
 * ====================================
 * Demo plug runtimes MUST use free models first and cascade
 * silently through other free tiers, only falling to the cheapest
 * current paid model as a last resort. No user-facing "upgrade"
 * prompts. Rule source: feedback_demo_plugs_free_llm_only memory.
 *
 * Order (silent, no user notification):
 *   1. Qwen 2.5 VL 72B free    — primary free multi-modal + tools
 *   2. NVIDIA Nemotron free    — fallback free multi-modal + tools
 *   3. Llama 3.2 vision free   — third free fallback
 *   4. DeepSeek chat free      — fourth free fallback
 *   5. Gemini Flash cheapest   — LAST RESORT paid (bounded cheapest tier)
 *
 * Routes through OpenRouter so all models share one auth path.
 * OPENROUTER_API_KEY is already in the container env.
 *
 * Never falls to premium tiers (Claude Opus, GPT-5, etc.) regardless
 * of task difficulty — the cap is the CHEAPEST current paid model.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/** Cascade tier — ordered from free primary → paid last resort */
export interface LlmTier {
  id: string;
  label: string;
  isFree: boolean;
}

export const DEMO_PLUG_CASCADE: LlmTier[] = [
  { id: 'qwen/qwen-2.5-vl-72b-instruct:free', label: 'qwen-2.5-vl free', isFree: true },
  { id: 'nvidia/llama-3.1-nemotron-70b-instruct:free', label: 'nemotron free', isFree: true },
  { id: 'meta-llama/llama-3.2-11b-vision-instruct:free', label: 'llama-3.2-vision free', isFree: true },
  { id: 'deepseek/deepseek-chat:free', label: 'deepseek free', isFree: true },
  // Last resort paid tier — cheapest current Gemini Flash via OpenRouter.
  // Review periodically as pricing/model availability changes.
  { id: 'google/gemini-2.0-flash-001', label: 'gemini-2.0-flash paid-last-resort', isFree: false },
];

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmRequest {
  system?: string;
  messages: LlmMessage[];
  maxTokens?: number;
  temperature?: number;
  /** Override cascade (e.g. for testing) */
  cascade?: LlmTier[];
}

export interface LlmResponse {
  text: string;
  modelUsed: string;
  tierIndex: number;
  isFreeTier: boolean;
  promptTokens: number;
  completionTokens: number;
  /** Tiers that failed before the successful one */
  failedTiers: Array<{ id: string; error: string }>;
}

function getKey(): string {
  return process.env.OPENROUTER_API_KEY || '';
}

/**
 * Call the OpenRouter chat completions endpoint with the supplied
 * model id. Throws on non-2xx or malformed response.
 */
async function callOpenRouter(
  modelId: string,
  req: LlmRequest,
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  const key = getKey();
  if (!key) {
    throw new Error('OPENROUTER_API_KEY not set');
  }

  const messages: LlmMessage[] = req.system
    ? [{ role: 'system', content: req.system }, ...req.messages]
    : req.messages;

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      // OpenRouter attribution — optional but recommended
      'HTTP-Referer': 'https://cti.foai.cloud',
      'X-Title': 'aiPLUG & Play Runtime',
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      temperature: req.temperature ?? 0.4,
      max_tokens: req.maxTokens ?? 1024,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${modelId} ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  const text: string = json?.choices?.[0]?.message?.content ?? '';
  if (!text) {
    throw new Error(`OpenRouter ${modelId} returned no content`);
  }

  return {
    text,
    promptTokens: json?.usage?.prompt_tokens ?? 0,
    completionTokens: json?.usage?.completion_tokens ?? 0,
  };
}

/**
 * Run the demo plug cascade: try each tier in order, return the
 * first successful response. If all tiers fail, throw with the
 * last error plus the full failure list.
 */
export async function chatWithCascade(req: LlmRequest): Promise<LlmResponse> {
  const cascade = req.cascade ?? DEMO_PLUG_CASCADE;
  const failed: Array<{ id: string; error: string }> = [];

  for (let i = 0; i < cascade.length; i++) {
    const tier = cascade[i];
    try {
      const result = await callOpenRouter(tier.id, req);
      return {
        text: result.text,
        modelUsed: tier.id,
        tierIndex: i,
        isFreeTier: tier.isFree,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        failedTiers: failed,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failed.push({ id: tier.id, error: msg });
      console.warn(`[aiplug-llm] ${tier.label} failed: ${msg.slice(0, 120)}`);
      // Continue to next tier
    }
  }

  throw new Error(
    `All ${cascade.length} tiers failed. Last error: ${failed[failed.length - 1]?.error ?? 'unknown'}`,
  );
}
