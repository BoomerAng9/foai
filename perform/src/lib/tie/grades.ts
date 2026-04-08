/**
 * Grade Bands — VERTICAL-NEUTRAL numeric → tier mapping
 * ======================================================
 * This file is intentionally vocabulary-free. It only converts a
 * numeric score into a grade letter, tier, and badge color. Any
 * label or context string ("First-Round Lock", "Senior Specialist",
 * "Five-Star Recruit") MUST come from `verticals.ts` via
 * `getVerticalTierLabel(tier, vertical)`.
 *
 * RULE: never put sport-specific or workforce-specific copy in this
 * file. If you find yourself reaching for a noun, you're in the
 * wrong file — go to verticals.ts.
 */

import type { TIETier } from './types';

interface GradeBand {
  min: number;
  max: number;
  grade: string;
  tier: TIETier;
  badgeColor: string;
}

export const GRADE_SCALE: GradeBand[] = [
  { min: 101, max: 999, grade: 'PRIME', tier: 'PRIME',    badgeColor: '#D4A853' },
  { min: 90,  max: 100, grade: 'A+',    tier: 'A_PLUS',   badgeColor: '#D4A853' },
  { min: 85,  max: 89,  grade: 'A',     tier: 'A',        badgeColor: '#60A5FA' },
  { min: 80,  max: 84,  grade: 'A-',    tier: 'A_MINUS',  badgeColor: '#60A5FA' },
  { min: 75,  max: 79,  grade: 'B+',    tier: 'B_PLUS',   badgeColor: '#34D399' },
  { min: 70,  max: 74,  grade: 'B',     tier: 'B',        badgeColor: '#34D399' },
  { min: 65,  max: 69,  grade: 'B-',    tier: 'B_MINUS',  badgeColor: '#FBBF24' },
  { min: 60,  max: 64,  grade: 'C+',    tier: 'C_PLUS',   badgeColor: '#A1A1AA' },
  { min: 0,   max: 59,  grade: 'C',     tier: 'C',        badgeColor: '#71717A' },
];

export function getGradeForScore(score: number): GradeBand {
  return GRADE_SCALE.find(g => score >= g.min && score <= g.max) || GRADE_SCALE[GRADE_SCALE.length - 1];
}

/** Shorthand — returns the badge color for a numeric score */
export function getGradeColor(score: number): string {
  return getGradeForScore(score).badgeColor;
}
