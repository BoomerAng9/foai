/**
 * @aims/forms/nil — NIL contract review pipeline.
 *
 * Public surface:
 *   - `reviewNilContract(parsed, opts)` — pure reviewer
 *   - `NIL_RULES` — clause-rule catalog (useful for UI rule explanations)
 *   - `findApplicableRules(clause)` — per-clause rule matcher
 *   - `STUB_MARKET_RATE_LOOKUP` — deterministic in-memory market-rate stub
 *   - Types: `NilRule`, `NilReviewOptions`, `MarketRateQuery`,
 *     `MarketRateResult`, `MarketRateLookup`
 *
 * All exports are dependency-light — the reviewer runs without DB or
 * network access. Production callers wire in a real MarketRateLookup
 * that queries Per-side performance + deal-tracking data.
 */

export { NIL_RULES, findApplicableRules } from './rules.js';
export type { NilRule } from './rules.js';

export { reviewNilContract } from './review.js';
export type { NilReviewOptions } from './review.js';

export { STUB_MARKET_RATE_LOOKUP } from './market-rate.js';
export type {
  MarketRateQuery,
  MarketRateResult,
  MarketRateLookup,
} from './market-rate.js';
