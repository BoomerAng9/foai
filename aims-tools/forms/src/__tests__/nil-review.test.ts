/**
 * Gate 5 — NIL contract reviewer unit tests.
 *
 * Validates the pure pipeline end-to-end:
 *   - Rule detection fires on matching clause text + classification
 *   - Rule detection does NOT fire on neutral/benign text
 *   - Overall assessment collapse from clause flags is correct
 *   - Compensation vs market-rate stub produces expected flag + rationale
 *   - Summary + key takeaways are derived correctly
 *
 * Run: npm test  (inside aims-tools/forms)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  reviewNilContract,
  NIL_RULES,
  findApplicableRules,
  STUB_MARKET_RATE_LOOKUP,
} from '../nil/index.ts';
import type { ParsedForm, Clause } from '../types.ts';

const SUBMISSION_ID = '11111111-1111-4111-8111-111111111111';
const FIXED_NOW = () => new Date('2026-04-18T00:00:00Z');

function mkClause(overrides: Partial<Clause> & { text: string }): Clause {
  return {
    clauseId: `c-${Math.random().toString(36).slice(2, 8)}`,
    label: 'Test Clause',
    ordinal: 1,
    ...overrides,
  } as Clause;
}

function mkParsed(clauses: Clause[], extras: Partial<ParsedForm> = {}): ParsedForm {
  return {
    submissionId: SUBMISSION_ID,
    text: clauses.map((c) => c.text).join('\n\n'),
    clauses,
    parties: [
      { name: 'Demo Athlete', role: 'athlete', isUser: true },
      { name: 'Demo Brand Inc.', role: 'brand', isUser: false },
    ],
    language: 'en',
    parsedAt: '2026-04-18T00:00:00Z',
    ...extras,
  };
}

// ─── Rule catalog sanity ────────────────────────────────────────────
test('NIL_RULES catalog is non-empty and well-formed', () => {
  assert.ok(NIL_RULES.length >= 10, `expected ≥10 rules, got ${NIL_RULES.length}`);
  const ids = new Set<string>();
  for (const r of NIL_RULES) {
    assert.ok(r.id.startsWith('nil.'), `rule ${r.id} should be nil-namespaced`);
    assert.ok(!ids.has(r.id), `duplicate rule id ${r.id}`);
    ids.add(r.id);
    assert.ok(['green', 'amber', 'red'].includes(r.flag));
    assert.ok(r.rationale.length > 0);
  }
});

// ─── Term rules ─────────────────────────────────────────────────────
test('term >= 36 months fires red', () => {
  const clause = mkClause({
    classification: 'term',
    text: 'This Agreement shall commence on the Effective Date and continue for a period of 36 months.',
  });
  const matches = findApplicableRules(clause);
  assert.ok(matches.some((r) => r.id === 'nil.term.too-long' && r.flag === 'red'));
});

test('term of "five years" fires red', () => {
  const clause = mkClause({
    classification: 'term',
    text: 'The term of this Agreement shall be five years from the Effective Date.',
  });
  const matches = findApplicableRules(clause);
  assert.ok(matches.some((r) => r.id === 'nil.term.too-long'));
});

test('term of 12 months fires no term rule', () => {
  const clause = mkClause({
    classification: 'term',
    text: 'The term of this Agreement shall be 12 months from the Effective Date.',
  });
  const matches = findApplicableRules(clause);
  assert.equal(matches.filter((r) => r.id.startsWith('nil.term')).length, 0);
});

test('term of 24 months fires amber (not red)', () => {
  const clause = mkClause({
    classification: 'term',
    text: 'The term of this Agreement shall be 24 months from the Effective Date.',
  });
  const matches = findApplicableRules(clause);
  const termMatches = matches.filter((r) => r.id.startsWith('nil.term'));
  assert.equal(termMatches.length, 1);
  assert.equal(termMatches[0].flag, 'amber');
});

// ─── Exclusivity rules ──────────────────────────────────────────────
test('exclusivity covering all competitors with no carve-outs fires red', () => {
  const clause = mkClause({
    classification: 'exclusivity',
    text: 'Athlete shall not endorse any competing brand or any competitors of the Brand.',
  });
  const matches = findApplicableRules(clause);
  assert.ok(
    matches.some((r) => r.id === 'nil.exclusivity.all-competitors' && r.flag === 'red'),
  );
});

test('exclusivity with carve-outs does not fire all-competitors rule', () => {
  const clause = mkClause({
    classification: 'exclusivity',
    text: 'Athlete shall not endorse any competing brand, except for the carve-outs listed in Schedule A.',
  });
  const matches = findApplicableRules(clause);
  assert.ok(
    !matches.some((r) => r.id === 'nil.exclusivity.all-competitors'),
    'carve-out language should prevent the red fire',
  );
});

test('post-term exclusivity fires red', () => {
  const clause = mkClause({
    classification: 'exclusivity',
    text: 'Athlete shall not endorse any competing brand for 6 months following the expiration of this Agreement.',
  });
  const matches = findApplicableRules(clause);
  assert.ok(matches.some((r) => r.id === 'nil.exclusivity.post-term' && r.flag === 'red'));
});

// ─── Morals rules ───────────────────────────────────────────────────
test('subjective morals clause fires amber', () => {
  const clause = mkClause({
    classification: 'morals',
    text: 'Brand may terminate if Athlete engages in conduct that in Brand\'s opinion damages the Brand reputation.',
  });
  const matches = findApplicableRules(clause);
  assert.ok(matches.some((r) => r.id === 'nil.morals.subjective' && r.flag === 'amber'));
});

test('objective morals clause does not fire subjective rule', () => {
  const clause = mkClause({
    classification: 'morals',
    text: 'Brand may terminate upon Athlete\'s conviction of a felony, as determined by a court of competent jurisdiction.',
  });
  const matches = findApplicableRules(clause);
  assert.ok(!matches.some((r) => r.id === 'nil.morals.subjective'));
});

// ─── IP + publicity-rights rules ────────────────────────────────────
test('perpetual IP grant fires red', () => {
  const clause = mkClause({
    classification: 'ip-rights',
    text: 'Athlete hereby grants Brand a perpetual, irrevocable, worldwide license to use Athlete\'s likeness.',
  });
  const matches = findApplicableRules(clause);
  assert.ok(matches.some((r) => r.id === 'nil.ip-rights.perpetual' && r.flag === 'red'));
});

test('publicity rights surviving without sell-through fires amber', () => {
  const clause = mkClause({
    classification: 'publicity-rights',
    text: 'The license granted herein shall survive termination of this Agreement.',
  });
  const matches = findApplicableRules(clause);
  assert.ok(matches.some((r) => r.id === 'nil.publicity-rights.post-term'));
});

// ─── Assignment rule ────────────────────────────────────────────────
test('assignment without consent fires red', () => {
  const clause = mkClause({
    classification: 'assignment',
    text: 'Brand may assign this Agreement to any third party in its sole discretion.',
  });
  const matches = findApplicableRules(clause);
  assert.ok(matches.some((r) => r.id === 'nil.assignment.without-consent' && r.flag === 'red'));
});

test('assignment with written consent does not fire', () => {
  const clause = mkClause({
    classification: 'assignment',
    text: 'Neither party may assign this Agreement without the other party\'s prior written consent.',
  });
  const matches = findApplicableRules(clause);
  assert.ok(!matches.some((r) => r.id === 'nil.assignment.without-consent'));
});

// ─── Indemnity rule ─────────────────────────────────────────────────
test('one-way indemnity fires red', () => {
  const clause = mkClause({
    classification: 'indemnity',
    text: 'Athlete shall indemnify and hold harmless the Brand from and against all claims.',
  });
  const matches = findApplicableRules(clause);
  assert.ok(matches.some((r) => r.id === 'nil.indemnity.one-way' && r.flag === 'red'));
});

test('mutual indemnity does not fire one-way rule', () => {
  const clause = mkClause({
    classification: 'indemnity',
    text: 'Each party shall mutually indemnify the other for claims arising from its own acts.',
  });
  const matches = findApplicableRules(clause);
  assert.ok(!matches.some((r) => r.id === 'nil.indemnity.one-way'));
});

// ─── Overall assessment collapse ────────────────────────────────────
test('three red flags collapse to do-not-sign', () => {
  const parsed = mkParsed([
    mkClause({
      classification: 'term',
      text: 'The term shall be 60 months.',
    }),
    mkClause({
      classification: 'ip-rights',
      text: 'Athlete grants Brand a perpetual, irrevocable license.',
    }),
    mkClause({
      classification: 'assignment',
      text: 'Brand may assign this Agreement at any time in its sole discretion.',
    }),
  ]);
  const review = reviewNilContract(parsed, { now: FIXED_NOW });
  assert.equal(review.overallAssessment, 'do-not-sign');
  assert.ok(review.summary.includes('renegotiated or rejected'));
});

test('one red + zero amber collapse to needs-negotiation', () => {
  const parsed = mkParsed([
    mkClause({
      classification: 'assignment',
      text: 'Brand may assign this Agreement at any time in its sole discretion.',
    }),
  ]);
  const review = reviewNilContract(parsed, { now: FIXED_NOW });
  assert.equal(review.overallAssessment, 'needs-negotiation');
});

test('two amber + zero red collapse to acceptable-with-revisions', () => {
  const parsed = mkParsed([
    mkClause({
      classification: 'term',
      text: 'The term shall be 24 months.',
    }),
    mkClause({
      classification: 'morals',
      text: 'Brand may terminate if Athlete embarrasses the Brand reputation.',
    }),
  ]);
  const review = reviewNilContract(parsed, { now: FIXED_NOW });
  assert.equal(review.overallAssessment, 'acceptable-with-revisions');
});

test('zero flags collapse to market-competitive', () => {
  const parsed = mkParsed([
    mkClause({
      classification: 'term',
      text: 'The term shall be 12 months.',
    }),
    mkClause({
      classification: 'assignment',
      text: 'Neither party may assign this Agreement without prior written consent.',
    }),
  ]);
  const review = reviewNilContract(parsed, { now: FIXED_NOW });
  assert.equal(review.overallAssessment, 'market-competitive');
});

// ─── Reviewer output shape ──────────────────────────────────────────
test('review output is stamped by biz-ang and deterministic with injected now', () => {
  const parsed = mkParsed([
    mkClause({ classification: 'term', text: 'Term: 36 months.' }),
  ]);
  const review = reviewNilContract(parsed, { now: FIXED_NOW });
  assert.equal(review.reviewedBy, 'biz-ang');
  assert.equal(review.submissionId, SUBMISSION_ID);
  assert.equal(review.reviewedAt, '2026-04-18T00:00:00.000Z');
  assert.ok(review.clauseReviews.length > 0);
  assert.ok(review.keyTakeaways.length > 0);
});

test('key takeaways are capped at 5', () => {
  // Generate 7 red clauses
  const parsed = mkParsed([
    mkClause({ classification: 'term', text: 'Term: 60 months.' }),
    mkClause({ classification: 'ip-rights', text: 'Perpetual license granted forever.' }),
    mkClause({ classification: 'assignment', text: 'Brand may assign at any time in its sole discretion.' }),
    mkClause({ classification: 'exclusivity', text: 'Athlete shall not endorse any competitors, no exceptions.' }),
    mkClause({ classification: 'exclusivity', text: 'Non-compete lasts 12 months after termination.' }),
    mkClause({ classification: 'indemnity', text: 'Athlete shall indemnify Brand for all claims.' }),
  ]);
  const review = reviewNilContract(parsed, { now: FIXED_NOW });
  assert.ok(review.keyTakeaways.length <= 5, `got ${review.keyTakeaways.length}`);
});

// ─── Market-rate comparison ─────────────────────────────────────────
test('offer below p25 for elite QB fires red', () => {
  const parsed = mkParsed(
    [mkClause({ classification: 'other', text: 'Football player QB endorsement.' })],
    {
      compensation: {
        baseAmount: 20_000,           // elite QB p25 is $45k
        currency: 'USD',
        frequency: 'annual',
      },
    },
  );
  const review = reviewNilContract(parsed, {
    marketRate: STUB_MARKET_RATE_LOOKUP,
    playerTier: 'elite',
    now: FIXED_NOW,
  });
  const comp = review.clauseReviews.find((r) => r.clauseId === 'synthetic.compensation');
  assert.ok(comp, 'expected compensation review row');
  assert.equal(comp!.flag, 'red');
  assert.ok(comp!.marketComparison);
});

test('offer at median for starter WR fires green', () => {
  const parsed = mkParsed(
    [mkClause({ classification: 'other', text: 'Football player WR endorsement.' })],
    {
      compensation: {
        baseAmount: 9_500,            // starter WR median is exactly $9,500
        currency: 'USD',
        frequency: 'annual',
      },
    },
  );
  const review = reviewNilContract(parsed, {
    marketRate: STUB_MARKET_RATE_LOOKUP,
    playerTier: 'starter',
    now: FIXED_NOW,
  });
  const comp = review.clauseReviews.find((r) => r.clauseId === 'synthetic.compensation');
  assert.ok(comp);
  assert.equal(comp!.flag, 'green');
});

test('market comparison skipped when no lookup supplied', () => {
  const parsed = mkParsed(
    [mkClause({ classification: 'other', text: 'Football QB endorsement.' })],
    { compensation: { baseAmount: 100, currency: 'USD', frequency: 'annual' } },
  );
  const review = reviewNilContract(parsed, { now: FIXED_NOW });
  assert.ok(
    !review.clauseReviews.some((r) => r.clauseId === 'synthetic.compensation'),
    'no market lookup → no market comparison row',
  );
});

test('market comparison skipped when sport/position cannot be sniffed', () => {
  const parsed = mkParsed(
    // Clause mentions neither sport nor position
    [mkClause({ classification: 'other', text: 'General endorsement terms.' })],
    { compensation: { baseAmount: 5_000, currency: 'USD', frequency: 'annual' } },
  );
  const review = reviewNilContract(parsed, {
    marketRate: STUB_MARKET_RATE_LOOKUP,
    now: FIXED_NOW,
  });
  assert.ok(
    !review.clauseReviews.some((r) => r.clauseId === 'synthetic.compensation'),
  );
});
