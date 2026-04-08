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

import type { IntentCategory, IntentClassification, SpinnerAction } from './types.js';

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
  _opts: ClassifyOptions = {},
): Promise<IntentClassification> {
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
