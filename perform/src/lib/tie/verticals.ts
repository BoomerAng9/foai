/**
 * TIE Verticals — Routing & Vocabulary Boundary
 * ===============================================
 * The TIE engine is cross-vertical. THIS FILE is the load-bearing
 * boundary that prevents data, labels, or rankings from one vertical
 * leaking into another.
 *
 * Rules (enforced by code, not convention):
 *   1. Every TIEResult MUST be stamped with a `vertical` field
 *   2. Every dataset (prospects, learners, contractors...) lives in
 *      ONE vertical and is tagged at the schema level
 *   3. Grade tiers (PRIME, A+, A...) are SHARED across verticals
 *      because they're just numeric bands. Labels and context
 *      strings are vertical-specific and routed through this file.
 *   4. The router physically refuses to merge results from different
 *      verticals into one ranking
 *   5. UI components must declare which vertical they render and
 *      assertVertical() before mounting
 */

import type { TIETier } from './types';

export type Vertical = 'SPORTS' | 'WORKFORCE' | 'STUDENT' | 'CONTRACTOR' | 'FOUNDER' | 'CREATIVE';

export const VERTICALS: Vertical[] = ['SPORTS', 'WORKFORCE', 'STUDENT', 'CONTRACTOR', 'FOUNDER', 'CREATIVE'];

export interface VerticalConfig {
  id: Vertical;
  displayName: string;
  /** What a "score" represents in this vertical */
  scoreNoun: string;
  /** What a "subject" of grading is called (player, learner, contractor...) */
  subjectNoun: string;
  /** Source dataset namespace — must match DB table prefix / collection name */
  datasetNamespace: string;
  /** Allowed source modules — anything outside this list is a routing bug */
  allowedSourceModules: string[];
}

export const VERTICAL_CONFIG: Record<Vertical, VerticalConfig> = {
  SPORTS: {
    id: 'SPORTS',
    displayName: 'Per|Form Sports',
    scoreNoun: 'TIE Grade',
    subjectNoun: 'Prospect',
    datasetNamespace: 'prospects',
    allowedSourceModules: [
      'src/lib/tie/engine.ts',
      'src/lib/draft/seed-data.ts',
      'src/lib/data-pipeline/scraper.ts',
    ],
  },
  WORKFORCE: {
    id: 'WORKFORCE',
    displayName: 'Workforce / OpenKlassAI',
    scoreNoun: 'Career Readiness',
    subjectNoun: 'Learner',
    datasetNamespace: 'learners',
    allowedSourceModules: [
      'src/lib/tie/workforce-engine.ts',
      'src/lib/tie/workforce-matrix.ts',
    ],
  },
  STUDENT: {
    id: 'STUDENT',
    displayName: 'Student-Athlete',
    scoreNoun: 'Recruit Index',
    subjectNoun: 'Student-Athlete',
    datasetNamespace: 'student_athletes',
    allowedSourceModules: ['src/lib/tie/workforce-engine.ts'],
  },
  CONTRACTOR: {
    id: 'CONTRACTOR',
    displayName: 'Contractor / ACHIEVEMOR',
    scoreNoun: 'Contract Readiness',
    subjectNoun: 'Contractor',
    datasetNamespace: 'contractors',
    allowedSourceModules: ['src/lib/tie/workforce-engine.ts'],
  },
  FOUNDER: {
    id: 'FOUNDER',
    displayName: 'Founder / Plug Builder',
    scoreNoun: 'Build Readiness',
    subjectNoun: 'Founder',
    datasetNamespace: 'founders',
    allowedSourceModules: ['src/lib/tie/workforce-engine.ts'],
  },
  CREATIVE: {
    id: 'CREATIVE',
    displayName: 'Creative / Broad|Cast',
    scoreNoun: 'Production Grade',
    subjectNoun: 'Creator',
    datasetNamespace: 'creators',
    allowedSourceModules: ['src/lib/tie/workforce-engine.ts'],
  },
};

/* ── Per-vertical labels for each grade tier ──
 * The numeric grade scale (PRIME → C) is shared. The HUMAN label and
 * CONTEXT string changes per vertical. This is the only place that
 * mapping is allowed to live — never inline a sports phrase in
 * workforce code or vice versa.
 */
export interface VerticalTierLabel {
  label: string;
  context: string;
}

const SPORTS_LABELS: Record<TIETier, VerticalTierLabel> = {
  PRIME:    { label: 'Generational Talent', context: 'Franchise Player' },
  A_PLUS:   { label: 'Elite Prospect',      context: 'Top 5 Pick' },
  A:        { label: 'First-Round Lock',    context: 'Pro Bowler potential' },
  A_MINUS:  { label: 'Late First Round',    context: 'High Upside Starter' },
  B_PLUS:   { label: 'Day 2 Pick',          context: 'High Ceiling' },
  B:        { label: 'Solid Contributor',   context: 'Day 2' },
  B_MINUS:  { label: 'Needs Development',   context: 'Mid-Round' },
  C_PLUS:   { label: 'Depth Player',        context: 'Late Round' },
  C:        { label: 'Practice Squad/UDFA', context: 'UDFA' },
};

const WORKFORCE_LABELS: Record<TIETier, VerticalTierLabel> = {
  PRIME:    { label: 'Industry Leader',          context: 'Executive / C-Suite ready' },
  A_PLUS:   { label: 'Senior Specialist',        context: 'Director / VP track' },
  A:        { label: 'Lead Practitioner',        context: 'Senior IC / Team Lead' },
  A_MINUS:  { label: 'Mid-Senior Professional',  context: 'Senior IC' },
  B_PLUS:   { label: 'Established Contributor',  context: 'Mid-level role' },
  B:        { label: 'Working Professional',     context: 'Mid-level role' },
  B_MINUS:  { label: 'Building Skills',          context: 'Junior+ / upskill recommended' },
  C_PLUS:   { label: 'Foundational',             context: 'Entry-level / training track' },
  C:        { label: 'Pre-Career',               context: 'Foundational training required' },
};

const STUDENT_LABELS: Record<TIETier, VerticalTierLabel> = {
  PRIME:    { label: 'Five-Star Recruit',     context: 'Power 5 + NIL ready' },
  A_PLUS:   { label: 'Four-Star Recruit',     context: 'Power 5 target' },
  A:        { label: 'Three-Star+ Recruit',   context: 'FBS scholarship' },
  A_MINUS:  { label: 'Three-Star Recruit',    context: 'G5 / FCS top tier' },
  B_PLUS:   { label: 'Two-Star+ Recruit',     context: 'FCS / D2 starter' },
  B:        { label: 'Two-Star Recruit',      context: 'D2 / D3 starter' },
  B_MINUS:  { label: 'Developing Recruit',    context: 'JUCO / late bloomer' },
  C_PLUS:   { label: 'Walk-On Candidate',     context: 'Walk-on / preferred walk-on' },
  C:        { label: 'Camp Invite',           context: 'Showcase camps' },
};

const CONTRACTOR_LABELS: Record<TIETier, VerticalTierLabel> = {
  PRIME:    { label: 'Master Contractor',     context: 'Federal / Enterprise tier' },
  A_PLUS:   { label: 'Senior Contractor',     context: 'Multi-state / large fleet' },
  A:        { label: 'Established Contractor',context: 'Regional operator' },
  A_MINUS:  { label: 'Independent Operator',  context: 'Owner-operator' },
  B_PLUS:   { label: 'Growing Operator',      context: 'Owner-operator scaling up' },
  B:        { label: 'Active Driver',         context: 'Solo driver' },
  B_MINUS:  { label: 'New Operator',          context: 'First 12 months' },
  C_PLUS:   { label: 'Pre-Authority',         context: 'CDL only, no MC' },
  C:        { label: 'Pre-CDL',               context: 'Permit / training' },
};

const FOUNDER_LABELS: Record<TIETier, VerticalTierLabel> = {
  PRIME:    { label: 'Series A+ Ready',         context: 'Revenue + traction proven' },
  A_PLUS:   { label: 'Seed Ready',              context: 'PMF signals strong' },
  A:        { label: 'Pre-Seed Ready',          context: 'Early traction, tight thesis' },
  A_MINUS:  { label: 'Validation Stage',        context: 'Customer interviews + MVP' },
  B_PLUS:   { label: 'MVP Stage',               context: 'Building first ship' },
  B:        { label: 'Idea + Build',            context: 'Coding the prototype' },
  B_MINUS:  { label: 'Idea Stage',              context: 'Concept work' },
  C_PLUS:   { label: 'Pre-Idea',                context: 'Exploring problem space' },
  C:        { label: 'Curious',                 context: 'Learning the space' },
};

const CREATIVE_LABELS: Record<TIETier, VerticalTierLabel> = {
  PRIME:    { label: 'Marquee Creator',         context: 'Network-grade audience + craft' },
  A_PLUS:   { label: 'Featured Creator',        context: 'Established channel' },
  A:        { label: 'Pro Creator',             context: 'Monetized + consistent' },
  A_MINUS:  { label: 'Rising Creator',          context: 'Growing audience' },
  B_PLUS:   { label: 'Active Creator',          context: 'Posting consistently' },
  B:        { label: 'Building Creator',        context: 'Finding voice' },
  B_MINUS:  { label: 'New Creator',             context: 'Early publishing' },
  C_PLUS:   { label: 'Aspiring Creator',        context: 'Pre-launch' },
  C:        { label: 'Hobbyist',                context: 'Personal practice' },
};

const LABELS_BY_VERTICAL: Record<Vertical, Record<TIETier, VerticalTierLabel>> = {
  SPORTS: SPORTS_LABELS,
  WORKFORCE: WORKFORCE_LABELS,
  STUDENT: STUDENT_LABELS,
  CONTRACTOR: CONTRACTOR_LABELS,
  FOUNDER: FOUNDER_LABELS,
  CREATIVE: CREATIVE_LABELS,
};

/**
 * Get the human label and context string for a tier in a specific vertical.
 * THE ONLY public way to translate a tier into vertical-specific copy.
 */
export function getVerticalTierLabel(tier: TIETier, vertical: Vertical): VerticalTierLabel {
  return LABELS_BY_VERTICAL[vertical][tier];
}

/**
 * Throws if a result is being used in the wrong vertical context.
 * Call this at every routing boundary (API handler, page component,
 * ranking aggregator) to fail loud rather than silently mix data.
 */
export function assertVertical(
  result: { vertical?: Vertical },
  expected: Vertical,
  context = 'unspecified',
): void {
  if (!result.vertical) {
    throw new Error(`[TIE routing] result missing vertical stamp at ${context} (expected ${expected})`);
  }
  if (result.vertical !== expected) {
    throw new Error(
      `[TIE routing] vertical mismatch at ${context}: expected ${expected}, got ${result.vertical}. ` +
      `Sports rankings cannot appear in ${expected} surfaces and vice versa.`,
    );
  }
}
