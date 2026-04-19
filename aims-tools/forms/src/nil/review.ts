/**
 * NIL contract reviewer — pure function.
 *
 * Takes a ParsedForm, runs every NIL rule against every clause, plus
 * the compensation-vs-market comparison when a MarketRateLookup is
 * supplied. Returns a FormReview stamped as reviewed_by='biz-ang'.
 *
 * No DB, no LLM, no network. Reviewers run on the parser output;
 * upstream parsing (Gemini 3.1 Flash vision/text) is a separate phase.
 */

import type {
  ParsedForm,
  FormReview,
  ClauseReview,
} from '../types.js';
import { findApplicableRules } from './rules.js';
import type { MarketRateLookup, MarketRateQuery } from './market-rate.js';

export interface NilReviewOptions {
  /** Market-rate provider. Omit to skip market comparison. */
  marketRate?: MarketRateLookup;
  /** Override the default current-year timestamp for deterministic tests. */
  now?: () => Date;
  /**
   * Athlete tier signal. If supplied, the market-rate lookup uses it;
   * otherwise the reviewer defaults to 'starter' for a conservative
   * midpoint read.
   */
  playerTier?: 'elite' | 'starter' | 'role-player';
}

/**
 * Convert a rule-fire into a ClauseReview row.
 */
function ruleToClauseReview(
  clauseId: string,
  ruleTitle: string,
  flag: ClauseReview['flag'],
  rationale: string,
  suggestedRevision?: string,
): ClauseReview {
  return {
    clauseId,
    flag,
    rationale: `[${ruleTitle}] ${rationale}`,
    suggestedRevision,
  };
}

/**
 * Compensation-vs-market comparison. Only fires when a market-rate
 * lookup is provided AND returns a result for the athlete's context.
 */
function reviewCompensation(
  parsed: ParsedForm,
  opts: NilReviewOptions,
): ClauseReview | null {
  if (!opts.marketRate) return null;
  if (!parsed.compensation) return null;
  // ParsedForm has no explicit sport/position fields — the parser
  // embeds them in clause text. We sniff the first match; callers who
  // want deterministic market lookup should pass those explicitly once
  // the ParsedForm schema exposes a perContext slot.
  const dealSport = deriveSport(parsed) ?? 'football';
  const dealPosition = derivePosition(parsed);
  if (!dealPosition) return null;

  const query: MarketRateQuery = {
    sport: dealSport,
    position: dealPosition,
    playerTier: opts.playerTier ?? 'starter',
    dealType: 'nil-contract',
  };
  const market = opts.marketRate(query);
  if (!market) return null;

  const userAmount = parsed.compensation.baseAmount;
  if (userAmount === undefined) return null;

  const median = market.median;
  const p25 = market.percentile25;
  const ratio = userAmount / median;

  let flag: ClauseReview['flag'];
  let rationale: string;
  if (userAmount < p25) {
    flag = 'red';
    rationale =
      `Your offer of $${userAmount.toLocaleString()} is below the 25th ` +
      `percentile for ${dealPosition} ${dealSport} (market 25th pct = ` +
      `$${p25.toLocaleString()}, median = $${median.toLocaleString()} across ` +
      `${market.comparableCount} comparable deals). This is a low offer.`;
  } else if (ratio < 0.75) {
    flag = 'amber';
    rationale =
      `Your offer of $${userAmount.toLocaleString()} is below market median ` +
      `($${median.toLocaleString()} across ${market.comparableCount} comparable ` +
      `deals). You can likely negotiate up.`;
  } else {
    flag = 'green';
    rationale =
      `Your offer of $${userAmount.toLocaleString()} is at or above market ` +
      `median ($${median.toLocaleString()} across ${market.comparableCount} ` +
      `comparable deals).`;
  }

  return {
    clauseId: 'synthetic.compensation',
    flag,
    rationale,
    marketComparison: {
      comparableCount: market.comparableCount,
      userTermValue: userAmount,
      marketMedian: median,
      marketPercentile: percentileOf(userAmount, market),
      note: `Compared against ${dealPosition} ${dealSport} deals.`,
    },
  };
}

function percentileOf(
  value: number,
  market: { percentile25: number; median: number; percentile75: number },
): number {
  if (value < market.percentile25) return 12;                 // rough proxy
  if (value < market.median) return 37;
  if (value < market.percentile75) return 62;
  return 87;
}

function deriveSport(parsed: ParsedForm): string | null {
  // Gemini-parsed contracts frequently mention sport in the first clauses.
  for (const c of parsed.clauses) {
    const m = c.text.match(/(football|basketball|baseball|soccer|hockey)/i);
    if (m) return m[1].toLowerCase();
  }
  return null;
}

function derivePosition(parsed: ParsedForm): string | null {
  for (const c of parsed.clauses) {
    const m = c.text.match(
      /\b(QB|WR|RB|TE|OL|DL|LB|DB|CB|S|K|P|PG|SG|SF|PF|C|RHP|LHP|OF|SS|2B|3B|1B)\b/,
    );
    if (m) return m[1].toUpperCase();
  }
  return null;
}

/** Collapse clause flags into an overall assessment. */
function computeOverallAssessment(
  reviews: ClauseReview[],
): FormReview['overallAssessment'] {
  const reds = reviews.filter((r) => r.flag === 'red').length;
  const ambers = reviews.filter((r) => r.flag === 'amber').length;
  if (reds >= 3) return 'do-not-sign';
  if (reds >= 1) return 'needs-negotiation';
  if (ambers >= 2) return 'acceptable-with-revisions';
  return 'market-competitive';
}

/** Extract the top 3–5 things the athlete should know. */
function deriveKeyTakeaways(reviews: ClauseReview[]): string[] {
  const redItems = reviews
    .filter((r) => r.flag === 'red')
    .map((r) => r.rationale);
  const amberItems = reviews
    .filter((r) => r.flag === 'amber')
    .map((r) => r.rationale);
  return [...redItems, ...amberItems].slice(0, 5);
}

function buildSummary(reviews: ClauseReview[], parsed: ParsedForm): string {
  const reds = reviews.filter((r) => r.flag === 'red').length;
  const ambers = reviews.filter((r) => r.flag === 'amber').length;
  const greens = reviews.filter((r) => r.flag === 'green').length;
  const parties = parsed.parties
    .filter((p) => p.role !== 'witness')
    .map((p) => p.name)
    .slice(0, 3)
    .join(' / ');

  if (reds >= 3) {
    return (
      `This contract between ${parties} has ${reds} significant issues. ` +
      `Several clauses are materially unfavorable and should be renegotiated ` +
      `or rejected. Full review attached — bring a lawyer before signing.`
    );
  }
  if (reds >= 1) {
    return (
      `This contract between ${parties} has ${reds} clause(s) that need ` +
      `renegotiation and ${ambers} that warrant attention. With fixes, the ` +
      `deal is workable. Flagged items are detailed below.`
    );
  }
  if (ambers >= 2) {
    return (
      `This contract between ${parties} is largely acceptable but has ` +
      `${ambers} clauses worth revising. No deal-breakers — ` +
      `${greens} items cleared review.`
    );
  }
  return (
    `This contract between ${parties} looks market-competitive. ` +
    `${greens} item(s) cleared review and ${ambers} warrant a glance.`
  );
}

/**
 * Run the NIL-specific review over a parsed contract.
 */
export function reviewNilContract(
  parsed: ParsedForm,
  opts: NilReviewOptions = {},
): FormReview {
  const now = (opts.now ?? (() => new Date()))();
  const clauseReviews: ClauseReview[] = [];

  for (const clause of parsed.clauses) {
    for (const rule of findApplicableRules(clause)) {
      clauseReviews.push(
        ruleToClauseReview(
          clause.clauseId,
          rule.title,
          rule.flag,
          rule.rationale,
          rule.suggestedRevision,
        ),
      );
    }
  }

  const compReview = reviewCompensation(parsed, opts);
  if (compReview) clauseReviews.push(compReview);

  return {
    submissionId: parsed.submissionId,
    reviewedBy: 'biz-ang',
    clauseReviews,
    summary: buildSummary(clauseReviews, parsed),
    keyTakeaways: deriveKeyTakeaways(clauseReviews),
    overallAssessment: computeOverallAssessment(clauseReviews),
    reviewedAt: now.toISOString(),
  };
}
