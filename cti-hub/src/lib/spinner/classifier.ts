/**
 * Spinner intent classifier — local mirror for cti-hub
 * =====================================================
 * Mirror of the canonical RFP-BAMARAM heuristic at
 * `aims-tools/spinner/src/intent-classifier.ts`.
 *
 * Lives here as a local module because cti-hub is a standalone
 * Next.js app with no workspace package linking. When the foai
 * monorepo gets workspace setup, this can be deleted in favor of
 * `import { classifySync } from '@aims/spinner'`.
 *
 * Per project_spinner_feature.md and feedback_rfp_bamaram_always_active.md:
 * the chat surface runs this on every user message and emits a
 * transition_hint into the SSE stream when build intent is detected,
 * so ACHEEVY can offer Guide Me / Manage It without a manual button.
 */

export type IntentCategory =
  | 'conversation'
  | 'question'
  | 'simple-task'
  | 'build-intent'
  | 'pricing-question'
  | 'status-check'
  | 'larger-project';

export type SpinnerActionType =
  | 'continue-chat'
  | 'execute-simple'
  | 'transition-guide-me'
  | 'transition-manage-it'
  | 'handoff-tps-report-ang'
  | 'handoff-pmo'
  | 'spawn-three-consultant';

export interface SpinnerHint {
  category: IntentCategory;
  confidence: number;
  triggerWords: string[];
  action: SpinnerActionType;
  suggestedScope: string;
  reasoning: string;
}

interface HeuristicSignal {
  pattern: RegExp;
  category: IntentCategory;
  weight: number;
  triggerWord: string;
}

const SIGNALS: HeuristicSignal[] = [
  // Build intent — explicit
  { pattern: /\bbuild\b/i,                            category: 'build-intent',     weight: 0.7, triggerWord: 'build' },
  { pattern: /\bcreate\s+(?:a|an|my|the)\b/i,         category: 'build-intent',     weight: 0.7, triggerWord: 'create' },
  { pattern: /\bmake\s+(?:a|an|me|my)\b/i,            category: 'build-intent',     weight: 0.6, triggerWord: 'make' },
  { pattern: /\blaunch\s+(?:a|an|my)\b/i,             category: 'build-intent',     weight: 0.7, triggerWord: 'launch' },
  { pattern: /\bdeploy\s+(?:a|an|my)\b/i,             category: 'build-intent',     weight: 0.7, triggerWord: 'deploy' },
  { pattern: /\bset\s*up\b/i,                         category: 'build-intent',     weight: 0.5, triggerWord: 'set up' },
  { pattern: /\bbuild\s+me\b/i,                       category: 'build-intent',     weight: 0.8, triggerWord: 'build me' },
  { pattern: /\bI\s+(?:want|need)\s+(?:to\s+)?(?:build|create|make|launch|deploy)/i,
                                                      category: 'build-intent',     weight: 0.9, triggerWord: 'I want/need to build' },

  // Larger project — scale signals
  { pattern: /\bcompany\b/i,                          category: 'larger-project',   weight: 0.4, triggerWord: 'company' },
  { pattern: /\bteam\s+of\b/i,                        category: 'larger-project',   weight: 0.4, triggerWord: 'team of' },
  { pattern: /\benterprise\b/i,                       category: 'larger-project',   weight: 0.5, triggerWord: 'enterprise' },
  { pattern: /\bfully\s+autonomous\b/i,               category: 'larger-project',   weight: 0.6, triggerWord: 'fully autonomous' },
  { pattern: /\baiPLUG\b/i,                           category: 'larger-project',   weight: 0.4, triggerWord: 'aiPLUG' },
  { pattern: /\bwhitelabel\b/i,                       category: 'larger-project',   weight: 0.5, triggerWord: 'whitelabel' },

  // Pricing
  { pattern: /\bhow\s+much\b/i,                       category: 'pricing-question', weight: 0.7, triggerWord: 'how much' },
  { pattern: /\bcost\b/i,                             category: 'pricing-question', weight: 0.5, triggerWord: 'cost' },
  { pattern: /\bpric(?:e|ing)\b/i,                    category: 'pricing-question', weight: 0.6, triggerWord: 'price/pricing' },
  { pattern: /\bplan\b/i,                             category: 'pricing-question', weight: 0.3, triggerWord: 'plan' },
  { pattern: /\bbudget\b/i,                           category: 'pricing-question', weight: 0.4, triggerWord: 'budget' },

  // Status check
  { pattern: /\bstatus\b/i,                           category: 'status-check',     weight: 0.6, triggerWord: 'status' },
  { pattern: /\bprogress\b/i,                         category: 'status-check',     weight: 0.5, triggerWord: 'progress' },
  { pattern: /\bdone\?/i,                             category: 'status-check',     weight: 0.6, triggerWord: 'done?' },

  // Question
  { pattern: /^(?:how|what|when|where|why|who)\b/i,   category: 'question',         weight: 0.3, triggerWord: 'wh-question' },
  { pattern: /\?$/,                                   category: 'question',         weight: 0.2, triggerWord: 'ends with ?' },

  // Simple task
  { pattern: /\bcan\s+you\s+(?:please\s+)?/i,         category: 'simple-task',      weight: 0.3, triggerWord: 'can you please' },
];

function recommendAction(category: IntentCategory): SpinnerActionType {
  switch (category) {
    case 'conversation':
    case 'question':
      return 'continue-chat';
    case 'simple-task':
      return 'execute-simple';
    case 'build-intent':
      return 'transition-guide-me';
    case 'larger-project':
      return 'spawn-three-consultant';
    case 'pricing-question':
      return 'handoff-tps-report-ang';
    case 'status-check':
      return 'handoff-pmo';
  }
}

export function classifyMessage(message: string): SpinnerHint {
  const tally: Record<IntentCategory, { weight: number; words: string[] }> = {
    conversation:       { weight: 0.1, words: [] }, // baseline
    question:           { weight: 0,   words: [] },
    'simple-task':      { weight: 0,   words: [] },
    'build-intent':     { weight: 0,   words: [] },
    'pricing-question': { weight: 0,   words: [] },
    'status-check':     { weight: 0,   words: [] },
    'larger-project':   { weight: 0,   words: [] },
  };

  for (const signal of SIGNALS) {
    if (signal.pattern.test(message)) {
      tally[signal.category].weight += signal.weight;
      tally[signal.category].words.push(signal.triggerWord);
    }
  }

  // Pick highest-weight category
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
    action: recommendAction(best),
    suggestedScope: message.slice(0, 200),
    reasoning: `RFP-BAMARAM heuristic: ${tally[best].words.join(', ') || '(no signals — default conversation)'}`,
  };
}

/**
 * Returns true if the hint should trigger an automatic transition
 * suggestion in the chat. Only build-intent and larger-project should
 * surface a transition prompt; the rest are handled inline.
 */
export function shouldTransition(hint: SpinnerHint): boolean {
  return hint.category === 'build-intent' || hint.category === 'larger-project';
}
