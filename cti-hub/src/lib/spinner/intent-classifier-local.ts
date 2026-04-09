/**
 * RFP-BAMARAM intent classifier
 * ==============================
 * Per feedback_rfp_bamaram_always_active.md:
 *   "ACHEEVY must RECOGNIZE when a user wants to build something
 *    (intent detection). Automatically enter the RFP-BAMARAM cycle —
 *    no button required."
 *
 * This module is the recognition layer. It runs on EVERY user message
 * across every chat surface (Deploy, AIMS, CTI Hub, Per|Form, SmelterOS).
 *
 * Two-stage classification:
 *   1. Heuristic — fast keyword + pattern match (returns immediately)
 *   2. LLM verification — confirms heuristic, fills in scope hints
 *      (uses a free-tier model so user tokens are NEVER burned on this)
 *
 * The free-tier rule comes from project_lil_hawks_persona.md:
 *   "ALWAYS use FREE models for the stream to not cut into the user's
 *    tokens"
 */

import type { IntentCategory, IntentClassification, SpinnerAction } from './spinner-types';

// ─── Heuristic phase (fast, deterministic) ──────────────────────────

interface HeuristicSignal {
  pattern: RegExp;
  category: IntentCategory;
  weight: number;
  triggerWord: string;
}

const SIGNALS: HeuristicSignal[] = [
  // Build intent — explicit
  { pattern: /\bbuild\b/i,            category: 'build-intent',     weight: 0.7, triggerWord: 'build' },
  { pattern: /\bcreate\s+(?:a|an|my|the)\b/i, category: 'build-intent', weight: 0.7, triggerWord: 'create' },
  { pattern: /\bmake\s+(?:a|an|me|my)\b/i,    category: 'build-intent', weight: 0.6, triggerWord: 'make' },
  { pattern: /\blaunch\s+(?:a|an|my)\b/i,     category: 'build-intent', weight: 0.7, triggerWord: 'launch' },
  { pattern: /\bdeploy\s+(?:a|an|my)\b/i,     category: 'build-intent', weight: 0.7, triggerWord: 'deploy' },
  { pattern: /\bset\s*up\b/i,                 category: 'build-intent', weight: 0.5, triggerWord: 'set up' },
  { pattern: /\bbuild\s+me\b/i,               category: 'build-intent', weight: 0.8, triggerWord: 'build me' },
  { pattern: /\bI\s+(?:want|need)\s+(?:to\s+)?(?:build|create|make|launch|deploy)/i,
                                              category: 'build-intent', weight: 0.9, triggerWord: 'I want/need to build' },

  // Larger project — scale signals
  { pattern: /\bcompany\b/i,           category: 'larger-project',  weight: 0.4, triggerWord: 'company' },
  { pattern: /\bteam\s+of\b/i,         category: 'larger-project',  weight: 0.4, triggerWord: 'team' },
  { pattern: /\benterprise\b/i,        category: 'larger-project',  weight: 0.5, triggerWord: 'enterprise' },
  { pattern: /\bfully\s+autonomous\b/i,category: 'larger-project',  weight: 0.6, triggerWord: 'fully autonomous' },
  { pattern: /\baiPLUG\b/i,            category: 'larger-project',  weight: 0.4, triggerWord: 'aiPLUG' },
  { pattern: /\bwhitelabel\b/i,        category: 'larger-project',  weight: 0.5, triggerWord: 'whitelabel' },

  // Pricing
  { pattern: /\bhow\s+much\b/i,        category: 'pricing-question',weight: 0.7, triggerWord: 'how much' },
  { pattern: /\bcost\b/i,              category: 'pricing-question',weight: 0.5, triggerWord: 'cost' },
  { pattern: /\bpric(?:e|ing)\b/i,     category: 'pricing-question',weight: 0.6, triggerWord: 'price/pricing' },
  { pattern: /\bplan\b/i,              category: 'pricing-question',weight: 0.3, triggerWord: 'plan' },
  { pattern: /\bbudget\b/i,            category: 'pricing-question',weight: 0.4, triggerWord: 'budget' },

  // Status check
  { pattern: /\bstatus\b/i,            category: 'status-check',    weight: 0.6, triggerWord: 'status' },
  { pattern: /\bprogress\b/i,          category: 'status-check',    weight: 0.5, triggerWord: 'progress' },
  { pattern: /\bdone\?\b/i,            category: 'status-check',    weight: 0.6, triggerWord: 'done?' },

  // Question
  { pattern: /^(?:how|what|when|where|why|who)\b/i,
                                       category: 'question',        weight: 0.3, triggerWord: 'wh- question' },
  { pattern: /\?$/,                    category: 'question',        weight: 0.2, triggerWord: 'ends with ?' },

  // Simple task
  { pattern: /\bcan\s+you\s+(?:please\s+)?/i,
                                       category: 'simple-task',     weight: 0.3, triggerWord: 'can you please' },
];

interface HeuristicResult {
  category: IntentCategory;
  confidence: number;
  triggerWords: string[];
}

function runHeuristic(message: string): HeuristicResult {
  const tally: Record<IntentCategory, { weight: number; words: string[] }> = {
    conversation: { weight: 0.1, words: [] },
    question: { weight: 0, words: [] },
    'simple-task': { weight: 0, words: [] },
    'build-intent': { weight: 0, words: [] },
    'pricing-question': { weight: 0, words: [] },
    'status-check': { weight: 0, words: [] },
    'larger-project': { weight: 0, words: [] },
  };

  for (const signal of SIGNALS) {
    if (signal.pattern.test(message)) {
      tally[signal.category].weight += signal.weight;
      tally[signal.category].words.push(signal.triggerWord);
    }
  }

  // Pick the highest-weight category
  let best: IntentCategory = 'conversation';
  let bestScore = tally.conversation.weight;
  for (const [cat, data] of Object.entries(tally) as [IntentCategory, { weight: number; words: string[] }][]) {
    if (data.weight > bestScore) {
      bestScore = data.weight;
      best = cat;
    }
  }

  // larger-project beats build-intent if both fired (escalation)
  if (tally['larger-project'].weight > 0 && tally['build-intent'].weight > 0) {
    best = 'larger-project';
    bestScore = tally['larger-project'].weight + tally['build-intent'].weight;
  }

  return {
    category: best,
    confidence: Math.min(1, bestScore),
    triggerWords: tally[best].words,
  };
}

// ─── Action recommender ─────────────────────────────────────────────

function recommendAction(category: IntentCategory, message: string): SpinnerAction {
  switch (category) {
    case 'conversation':
      return { type: 'continue-chat' };
    case 'question':
      return { type: 'continue-chat' };
    case 'simple-task':
      return { type: 'execute-simple', description: message.slice(0, 200) };
    case 'build-intent':
      return { type: 'transition-guide-me', suggestedScope: message.slice(0, 200) };
    case 'larger-project':
      return { type: 'spawn-three-consultant', suggestedScope: message.slice(0, 200) };
    case 'pricing-question':
      return { type: 'handoff-tps-report-ang', pricingQuery: message };
    case 'status-check':
      return { type: 'handoff-pmo' };
  }
}

// ─── Public API ─────────────────────────────────────────────────────

export interface ClassifyOptions {
  /**
   * If true, also runs an LLM verification pass against a free-tier
   * model. Currently a stub — TODO: wire to GLM-5.1 via free-tier
   * route once the chat-engine module is wired.
   */
  llmVerify?: boolean;
}

export async function classify(
  message: string,
  opts: ClassifyOptions = {},
): Promise<IntentClassification> {
  const heuristic = runHeuristic(message);
  const action = recommendAction(heuristic.category, message);
  const heuristicResult: IntentClassification = {
    category: heuristic.category,
    confidence: heuristic.confidence,
    triggerWords: heuristic.triggerWords,
    recommendedAction: action,
    reasoning: `Heuristic match: ${heuristic.triggerWords.join(', ') || '(none — defaulted to conversation)'}`,
  };

  // LLM verification only runs when:
  //   1. Caller explicitly opts in via { llmVerify: true }
  //   2. AND the heuristic confidence is in the borderline range
  //      (low enough to be uncertain, not so low it's clearly chat)
  // High-confidence calls skip the LLM (free heuristic wins) and
  // very-low-confidence calls also skip (default to conversation,
  // no point burning a free LLM call to confirm chitchat).
  if (!opts.llmVerify) return heuristicResult;
  if (heuristic.confidence < 0.2 || heuristic.confidence >= 0.8) {
    return heuristicResult;
  }

  // Borderline — run the verification pass
  try {
    const verified = await verifyWithLlm(message, heuristicResult);
    return verified;
  } catch (e) {
    // LLM verification is best-effort; never fail the caller. Return
    // the heuristic result + a note in reasoning so audit logs can
    // surface unreliability over time.
    // eslint-disable-next-line no-console
    console.warn(
      '[spinner/intent-classifier] LLM verification failed, using heuristic:',
      e instanceof Error ? e.message : e,
    );
    return {
      ...heuristicResult,
      reasoning: heuristicResult.reasoning + ' (LLM verification skipped: error)',
    };
  }
}

// ─── LLM verification pass ──────────────────────────────────────────

const VERIFICATION_BASE_URL =
  process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

// Free-tier model — we never burn user tokens on classification.
// Default GLM-5.1 per project_chat_engine_decision.md. Gemma BANNED.
const VERIFICATION_MODEL =
  process.env.SPINNER_VERIFY_MODEL || 'z-ai/glm-5.1';

function readVerificationKey(): string {
  return (
    process.env.OPENROUTER_API_KEY ||
    process.env.Openrouter_API_Key ||
    process.env.OPENROUTER_KEY ||
    ''
  );
}

const VERIFICATION_SYSTEM_PROMPT = `You are a strict intent classifier for an A.I.M.S. chat. You receive a user message and a heuristic guess. Your job is to either CONFIRM the guess or CORRECT it.

Output STRICT JSON only — no markdown, no preamble, no explanation. Schema:
{
  "category": "conversation" | "question" | "simple-task" | "build-intent" | "pricing-question" | "status-check" | "larger-project",
  "confidence": number between 0 and 1,
  "reasoning": "one short sentence"
}

Rules:
- "build-intent" means the user wants to BUILD or CREATE something (an app, agent, workflow, etc.)
- "larger-project" means build-intent at scale (enterprise, team of N, fully autonomous, whitelabel)
- "pricing-question" means cost/price/plan/budget questions
- "status-check" means asking about progress, status, or completion of an existing job
- "simple-task" means a single-step action like "summarize this", "translate this"
- "question" means an info request, no action needed
- "conversation" means chitchat with no actionable intent
- If unsure, return the heuristic's guess to avoid flapping
- Confidence < 0.6 means "I disagree but weakly", 0.6-0.85 "moderately confident", > 0.85 "strongly confident"`;

async function verifyWithLlm(
  message: string,
  heuristicResult: IntentClassification,
): Promise<IntentClassification> {
  const apiKey = readVerificationKey();
  if (!apiKey) {
    throw new Error('No OpenRouter API key for LLM verification');
  }
  if (/gemma/i.test(VERIFICATION_MODEL)) {
    throw new Error('Refusing to use banned Gemma model for verification');
  }

  const userPrompt =
    `User message:\n${message}\n\n` +
    `Heuristic guess: ${heuristicResult.category} (confidence ${heuristicResult.confidence.toFixed(2)})\n` +
    `Heuristic trigger words: ${heuristicResult.triggerWords.join(', ') || '(none)'}\n\n` +
    `Confirm or correct the guess. Return STRICT JSON.`;

  const res = await fetch(`${VERIFICATION_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://aimanagedsolutions.cloud',
      'X-Title': 'A.I.M.S. Spinner classifier',
    },
    body: JSON.stringify({
      model: VERIFICATION_MODEL,
      messages: [
        { role: 'system', content: VERIFICATION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Verification HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = data.choices?.[0]?.message?.content?.trim() ?? '';
  if (!raw) throw new Error('Empty verification response');

  // Strip accidental markdown fences
  let cleaned = raw;
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  const parsed = JSON.parse(cleaned) as {
    category?: IntentCategory;
    confidence?: number;
    reasoning?: string;
  };

  if (!parsed.category) {
    throw new Error('LLM verification missing category field');
  }

  // Use the verified category to recompute the action
  const verifiedAction = recommendAction(parsed.category, message);

  return {
    category: parsed.category,
    confidence: parsed.confidence ?? heuristicResult.confidence,
    triggerWords: heuristicResult.triggerWords,
    recommendedAction: verifiedAction,
    reasoning:
      `(LLM-verified) ${parsed.reasoning || 'no reasoning provided'}` +
      (parsed.category !== heuristicResult.category
        ? ` — corrected from heuristic '${heuristicResult.category}'`
        : ' — confirmed heuristic'),
  };
}

/**
 * Synchronous version of classify() for hot-path callers that can't
 * await. Skips any LLM verification by definition.
 */
export function classifySync(message: string): IntentClassification {
  const heuristic = runHeuristic(message);
  const action = recommendAction(heuristic.category, message);
  return {
    category: heuristic.category,
    confidence: heuristic.confidence,
    triggerWords: heuristic.triggerWords,
    recommendedAction: action,
    reasoning: `Heuristic match: ${heuristic.triggerWords.join(', ') || '(none — defaulted to conversation)'}`,
  };
}
