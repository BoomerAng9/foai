/**
 * Seed — Verticals & Tier Labels
 * ================================
 * Every vertical:
 *   1. Declares its config (scoreNoun, subjectNoun, dataset namespace, allowed source modules)
 *   2. Provides a full TIETier → VerticalTierLabel mapping (label + context + optional projection)
 *
 * Grade cutoffs are shared across all verticals (seed-grades.ts). What differs
 * is the vocabulary: a PRIME score means "Generational Talent / Franchise Player"
 * in SPORTS but "Industry Leader / Executive / C-Suite ready" in WORKFORCE.
 *
 * The router physically refuses to merge results across verticals. See
 * queries.ts::assertVertical.
 */

import type { TIETier, Vertical, VerticalConfig, VerticalTierLabel } from './types.js';

export const SEED_VERTICALS: Record<Vertical, VerticalConfig> = {
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

const SPORTS_LABELS: Record<TIETier, VerticalTierLabel> = {
  PRIME:   { label: 'Generational Talent', context: 'Franchise Player',      projection: 'Generational Talent, Franchise Player' },
  A_PLUS:  { label: 'Elite Prospect',      context: 'Top 5 Pick',             projection: 'Elite Prospect, Top 5 Pick' },
  A:       { label: 'First-Round Lock',    context: 'Pro Bowler potential',   projection: 'First-Round Lock, Potential Pro Bowler' },
  A_MINUS: { label: 'Late First Round',    context: 'High Upside Starter',    projection: 'Late First-Round, High Upside Starter' },
  B_PLUS:  { label: 'Day 2 Pick',          context: 'High Ceiling',           projection: 'Day 2 Pick, High Ceiling, Some Concerns' },
  B:       { label: 'Solid Contributor',   context: 'Day 2',                  projection: 'Day 2 Pick, Solid Contributor but Not a Star' },
  B_MINUS: { label: 'Needs Development',   context: 'Mid-Round',              projection: 'Mid-Round Pick, Needs Development' },
  C_PLUS:  { label: 'Depth Player',        context: 'Late Round',             projection: 'Depth Player, Role Player at Best' },
  C:       { label: 'Practice Squad/UDFA', context: 'UDFA',                   projection: 'Practice Squad / Undrafted' },
};

const WORKFORCE_LABELS: Record<TIETier, VerticalTierLabel> = {
  PRIME:   { label: 'Industry Leader',         context: 'Executive / C-Suite ready' },
  A_PLUS:  { label: 'Senior Specialist',       context: 'Director / VP track' },
  A:       { label: 'Lead Practitioner',       context: 'Senior IC / Team Lead' },
  A_MINUS: { label: 'Mid-Senior Professional', context: 'Senior IC' },
  B_PLUS:  { label: 'Established Contributor', context: 'Mid-level role' },
  B:       { label: 'Working Professional',    context: 'Mid-level role' },
  B_MINUS: { label: 'Building Skills',         context: 'Junior+ / upskill recommended' },
  C_PLUS:  { label: 'Foundational',            context: 'Entry-level / training track' },
  C:       { label: 'Pre-Career',              context: 'Foundational training required' },
};

const STUDENT_LABELS: Record<TIETier, VerticalTierLabel> = {
  PRIME:   { label: 'Five-Star Recruit',   context: 'Power 5 + NIL ready' },
  A_PLUS:  { label: 'Four-Star Recruit',   context: 'Power 5 target' },
  A:       { label: 'Three-Star+ Recruit', context: 'FBS scholarship' },
  A_MINUS: { label: 'Three-Star Recruit',  context: 'G5 / FCS top tier' },
  B_PLUS:  { label: 'Two-Star+ Recruit',   context: 'FCS / D2 starter' },
  B:       { label: 'Two-Star Recruit',    context: 'D2 / D3 starter' },
  B_MINUS: { label: 'Developing Recruit',  context: 'JUCO / late bloomer' },
  C_PLUS:  { label: 'Walk-On Candidate',   context: 'Walk-on / preferred walk-on' },
  C:       { label: 'Camp Invite',         context: 'Showcase camps' },
};

const CONTRACTOR_LABELS: Record<TIETier, VerticalTierLabel> = {
  PRIME:   { label: 'Master Contractor',      context: 'Federal / Enterprise tier' },
  A_PLUS:  { label: 'Senior Contractor',      context: 'Multi-state / large fleet' },
  A:       { label: 'Established Contractor', context: 'Regional operator' },
  A_MINUS: { label: 'Independent Operator',   context: 'Owner-operator' },
  B_PLUS:  { label: 'Growing Operator',       context: 'Owner-operator scaling up' },
  B:       { label: 'Active Driver',          context: 'Solo driver' },
  B_MINUS: { label: 'New Operator',           context: 'First 12 months' },
  C_PLUS:  { label: 'Pre-Authority',          context: 'CDL only, no MC' },
  C:       { label: 'Pre-CDL',                context: 'Permit / training' },
};

const FOUNDER_LABELS: Record<TIETier, VerticalTierLabel> = {
  PRIME:   { label: 'Series A+ Ready',   context: 'Revenue + traction proven' },
  A_PLUS:  { label: 'Seed Ready',        context: 'PMF signals strong' },
  A:       { label: 'Pre-Seed Ready',    context: 'Early traction, tight thesis' },
  A_MINUS: { label: 'Validation Stage',  context: 'Customer interviews + MVP' },
  B_PLUS:  { label: 'MVP Stage',         context: 'Building first ship' },
  B:       { label: 'Idea + Build',      context: 'Coding the prototype' },
  B_MINUS: { label: 'Idea Stage',        context: 'Concept work' },
  C_PLUS:  { label: 'Pre-Idea',          context: 'Exploring problem space' },
  C:       { label: 'Curious',           context: 'Learning the space' },
};

const CREATIVE_LABELS: Record<TIETier, VerticalTierLabel> = {
  PRIME:   { label: 'Marquee Creator',   context: 'Network-grade audience + craft' },
  A_PLUS:  { label: 'Featured Creator',  context: 'Established channel' },
  A:       { label: 'Pro Creator',       context: 'Monetized + consistent' },
  A_MINUS: { label: 'Rising Creator',    context: 'Growing audience' },
  B_PLUS:  { label: 'Active Creator',    context: 'Posting consistently' },
  B:       { label: 'Building Creator',  context: 'Finding voice' },
  B_MINUS: { label: 'New Creator',       context: 'Early publishing' },
  C_PLUS:  { label: 'Aspiring Creator',  context: 'Pre-launch' },
  C:       { label: 'Hobbyist',          context: 'Personal practice' },
};

export const SEED_LABELS_BY_VERTICAL: Record<Vertical, Record<TIETier, VerticalTierLabel>> = {
  SPORTS: SPORTS_LABELS,
  WORKFORCE: WORKFORCE_LABELS,
  STUDENT: STUDENT_LABELS,
  CONTRACTOR: CONTRACTOR_LABELS,
  FOUNDER: FOUNDER_LABELS,
  CREATIVE: CREATIVE_LABELS,
};
