/**
 * NIL contract rule catalog.
 *
 * Pure data + pure detectors. No DB, no LLM calls, no external services.
 * Each rule inspects a single parsed clause and returns a verdict. The
 * `reviewNilContract` function in `./review.ts` walks every clause ×
 * every rule and assembles the review.
 *
 * Rules are informed by common-concerning-pattern heuristics in
 * college-athlete NIL contracts. They are NOT legal advice; they flag
 * language for human review. The final word always belongs to the
 * athlete's lawyer.
 */

import type { Clause, ClauseReview } from '../types.js';

export interface NilRule {
  /** Unique rule id — used in review output + audit. */
  id: string;
  /** Human-readable short title. */
  title: string;
  /**
   * The clause classifications this rule applies to. If empty, the rule
   * considers every clause regardless of classification.
   */
  classifications: ReadonlyArray<NonNullable<Clause['classification']>>;
  /** Does this rule's concerning pattern appear in the clause text? */
  detect: (clause: Clause) => boolean;
  /** Severity when the rule fires. */
  flag: ClauseReview['flag'];
  /** Plain-English rationale written for the athlete, not a lawyer. */
  rationale: string;
  /** Optional redline the athlete can bring to the negotiation. */
  suggestedRevision?: string;
}

/** Regex helper — case-insensitive, single-line. */
function rx(pattern: string): RegExp {
  return new RegExp(pattern, 'i');
}

export const NIL_RULES: ReadonlyArray<NilRule> = [
  // ── TERM ────────────────────────────────────────────────────────────
  {
    id: 'nil.term.too-long',
    title: 'Term exceeds NCAA eligibility window',
    classifications: ['term'],
    detect: (c) =>
      rx('\\b(36|48|60|72)\\s*months?\\b').test(c.text) ||
      rx('\\b(three|four|five|six|3|4|5|6)\\s*years?\\b').test(c.text),
    flag: 'red',
    rationale:
      'Term is long enough to trap you past graduation. A deal that outlives ' +
      'your college career constrains your professional freedom.',
    suggestedRevision:
      'Propose a 12-month initial term with a mutual option to renew at ' +
      'then-current market rates.',
  },
  {
    id: 'nil.term.longer-than-year',
    title: 'Term longer than 24 months',
    classifications: ['term'],
    detect: (c) =>
      rx('\\b(24|30)\\s*months?\\b').test(c.text) ||
      rx('\\btwo\\s*years?\\b').test(c.text),
    flag: 'amber',
    rationale:
      'Two-year commitment locks in today\'s rate for tomorrow\'s audience. ' +
      'Your market value can grow faster than the contract does.',
    suggestedRevision:
      'Shorten to 12 months, with performance-based escalator for year 2.',
  },

  // ── EXCLUSIVITY ─────────────────────────────────────────────────────
  {
    id: 'nil.exclusivity.all-competitors',
    title: 'Exclusivity covers all competitors with no carve-outs',
    classifications: ['exclusivity'],
    detect: (c) =>
      (rx('all\\s+competitors?').test(c.text) ||
        rx('any\\s+competing').test(c.text) ||
        rx('entire\\s+category').test(c.text)) &&
      !rx('(carve-?outs?|exceptions?|except\\s+for)').test(c.text),
    flag: 'red',
    rationale:
      'Blocking every competitor with no carve-outs kills your ability to ' +
      'stack deals. Most athletes need 3–5 deals to make NIL worthwhile.',
    suggestedRevision:
      'Narrow exclusivity to the brand\'s top 3 named competitors. Leave ' +
      'adjacent categories open.',
  },
  {
    id: 'nil.exclusivity.post-term',
    title: 'Exclusivity extends past contract end',
    classifications: ['exclusivity'],
    detect: (c) =>
      rx('(after|following|upon)\\s+(the\\s+)?(term|expiration|termination)').test(
        c.text,
      ) ||
      rx('for\\s+\\d+\\s+(months?|years?)\\s+(following|after)').test(c.text),
    flag: 'red',
    rationale:
      'Exclusivity that survives the contract prevents you from taking new ' +
      'deals even after this one ends.',
    suggestedRevision:
      'Remove post-term exclusivity entirely, or cap it at 30 days for a ' +
      'final campaign wind-down.',
  },

  // ── MORALS ──────────────────────────────────────────────────────────
  {
    id: 'nil.morals.subjective',
    title: 'Morals clause uses subjective language',
    classifications: ['morals'],
    detect: (c) =>
      (rx('embarrass').test(c.text) ||
        rx('reputation').test(c.text) ||
        rx('brand\\s+value').test(c.text) ||
        rx('conduct\\s+unbecoming').test(c.text)) &&
      !rx('(mutual|objective|as\\s+determined\\s+by)').test(c.text),
    flag: 'amber',
    rationale:
      'Subjective morals language ("embarrassing," "reputation damage") ' +
      'lets the brand terminate for anything they decide they don\'t like.',
    suggestedRevision:
      'Require a conviction or publicly-available proof of specific ' +
      'conduct, not just the brand\'s opinion.',
  },

  // ── IP RIGHTS ───────────────────────────────────────────────────────
  {
    id: 'nil.ip-rights.perpetual',
    title: 'IP rights assigned forever',
    classifications: ['ip-rights', 'publicity-rights'],
    detect: (c) =>
      rx('perpetu').test(c.text) ||
      rx('in\\s+perpetuity').test(c.text) ||
      rx('forever').test(c.text) ||
      rx('irrevocable').test(c.text),
    flag: 'red',
    rationale:
      'Your likeness belongs to you. A perpetual/irrevocable grant means ' +
      'the brand can keep using you in ads long after the deal ends.',
    suggestedRevision:
      'Limit the license to the contract term, plus a 60-day sell-through ' +
      'window for existing inventory.',
  },
  {
    id: 'nil.publicity-rights.post-term',
    title: 'Publicity rights survive the deal',
    classifications: ['publicity-rights'],
    detect: (c) =>
      rx('(survive|continue\\s+beyond|post-term|after\\s+termination)').test(
        c.text,
      ) && !rx('(sell-?through|wind-?down|\\d+-?day)').test(c.text),
    flag: 'amber',
    rationale:
      'Publicity rights that survive the contract without a fixed ' +
      'sell-through window let the brand use your image indefinitely.',
    suggestedRevision:
      'Cap any post-term use at 60–90 days for wind-down of live inventory.',
  },

  // ── SOCIAL MEDIA ────────────────────────────────────────────────────
  {
    id: 'nil.social.content-control',
    title: 'Brand can delete or edit your posts',
    classifications: ['social-media'],
    detect: (c) =>
      rx('(delete|remove|take\\s*down|edit|modify)').test(c.text) &&
      rx('(posts?|content|accounts?|social|feed)').test(c.text) &&
      !rx('only\\s+with.*consent').test(c.text),
    flag: 'amber',
    rationale:
      'Brand control over your social feed is editorial overreach. You ' +
      'should decide what goes on your channels.',
    suggestedRevision:
      'Limit brand approval to posts that explicitly mention the brand. ' +
      'Your non-sponsored content stays your own.',
  },

  // ── ASSIGNMENT ──────────────────────────────────────────────────────
  {
    id: 'nil.assignment.without-consent',
    title: 'Brand can transfer the deal without asking',
    classifications: ['assignment'],
    detect: (c) =>
      (rx('(without\\s+consent|sole\\s+discretion|at\\s+any\\s+time|freely)').test(
        c.text,
      ) ||
        rx('assign.*to\\s+any').test(c.text)) &&
      !rx('(with\\s+(written|prior)\\s+consent|mutual\\s+consent)').test(c.text),
    flag: 'red',
    rationale:
      'If the brand sells to a competitor or controversial buyer, you ' +
      'shouldn\'t be dragged along.',
    suggestedRevision:
      'Require your prior written consent for any assignment, not to be ' +
      'unreasonably withheld.',
  },

  // ── INDEMNITY ───────────────────────────────────────────────────────
  {
    id: 'nil.indemnity.one-way',
    title: 'Indemnity runs only from you to the brand',
    classifications: ['indemnity'],
    detect: (c) =>
      rx('(indemnify|hold\\s+harmless)').test(c.text) &&
      !rx('(mutual|reciprocal|both\\s+parties|each\\s+party)').test(c.text),
    flag: 'red',
    rationale:
      'One-way indemnity makes you responsible for the brand\'s legal ' +
      'costs but not the reverse. This should be mutual.',
    suggestedRevision:
      'Make the indemnity mutual — each party indemnifies the other for ' +
      'claims caused by that party\'s own acts.',
  },

  // ── DISPUTE RESOLUTION ──────────────────────────────────────────────
  {
    id: 'nil.jurisdiction.no-arbitration',
    title: 'No arbitration or neutral forum',
    classifications: ['jurisdiction', 'dispute-resolution'],
    detect: (c) =>
      rx('(courts?|jurisdiction|venue)').test(c.text) &&
      !rx('arbitrat').test(c.text) &&
      !rx('(neutral|mutually\\s+agreed)').test(c.text),
    flag: 'amber',
    rationale:
      'Without arbitration, a dispute means court — usually in the ' +
      'brand\'s home state. That\'s expensive for you and favorable for them.',
    suggestedRevision:
      'Add binding arbitration with a neutral arbiter (AAA or JAMS), ' +
      'or at minimum specify a mutually agreed venue.',
  },

  // ── TERMINATION ─────────────────────────────────────────────────────
  {
    id: 'nil.termination.one-sided',
    title: 'Brand can terminate for convenience; you cannot',
    classifications: ['termination'],
    detect: (c) =>
      rx('(terminate|end).*(any\\s+time|convenience|sole\\s+discretion)').test(
        c.text,
      ) && !rx('(mutual|either\\s+party|both)').test(c.text),
    flag: 'amber',
    rationale:
      'If the brand can walk away whenever, you should have the same ' +
      'option. Otherwise you carry all the risk.',
    suggestedRevision:
      'Make termination rights reciprocal — both parties with 30 days notice.',
  },
];

/**
 * Returns every rule that fires for a given clause. Callers typically
 * flatten these into ClauseReview entries.
 */
export function findApplicableRules(clause: Clause): NilRule[] {
  const matched: NilRule[] = [];
  for (const rule of NIL_RULES) {
    const classFilterOk =
      rule.classifications.length === 0 ||
      (clause.classification !== undefined &&
        rule.classifications.includes(clause.classification));
    if (!classFilterOk) continue;
    if (rule.detect(clause)) matched.push(rule);
  }
  return matched;
}
