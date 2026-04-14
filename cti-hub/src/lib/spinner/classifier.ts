/**
 * Spinner intent classifier — re-export from canonical package
 * =============================================================
 * This file previously fronted a workspace-level Spinner package.
 * The current app keeps a local implementation so CTI Hub validation
 * and deployment can stay scoped to this service.
 *
 * This file remains as a thin re-export so the existing import
 * `@/lib/spinner/classifier` keeps working without touching the
 * existing call sites.
 */

import {
  classifySync,
  type IntentCategory,
  type IntentClassification,
  type SpinnerAction,
} from './intent-classifier-local';

// Re-export the canonical types under the names cti-hub callers
// already use, mapped onto the upstream Spinner types.
export type { IntentCategory } from './spinner-types';

export type SpinnerActionType = SpinnerAction['type'];

export interface SpinnerHint {
  category: IntentCategory;
  confidence: number;
  triggerWords: string[];
  action: SpinnerActionType;
  suggestedScope: string;
  reasoning: string;
}

/**
 * Local adapter that flattens the upstream IntentClassification into
 * the SpinnerHint shape cti-hub already consumes (via the chat route
 * and the chat UI). One source of truth for the heuristic, one shape
 * for the consumer.
 */
export function classifyMessage(message: string): SpinnerHint {
  const upstream: IntentClassification = classifySync(message);
  // The upstream action is a discriminated union; we surface just the
  // type plus the suggestedScope when present.
  let suggestedScope = '';
  if (
    upstream.recommendedAction.type === 'transition-guide-me' ||
    upstream.recommendedAction.type === 'transition-manage-it' ||
    upstream.recommendedAction.type === 'spawn-three-consultant'
  ) {
    suggestedScope = upstream.recommendedAction.suggestedScope;
  } else if (upstream.recommendedAction.type === 'execute-simple') {
    suggestedScope = upstream.recommendedAction.description;
  } else if (upstream.recommendedAction.type === 'handoff-tps-report-ang') {
    suggestedScope = upstream.recommendedAction.pricingQuery;
  }
  return {
    category: upstream.category,
    confidence: upstream.confidence,
    triggerWords: upstream.triggerWords,
    action: upstream.recommendedAction.type,
    suggestedScope: suggestedScope || message.slice(0, 200),
    reasoning: upstream.reasoning,
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
