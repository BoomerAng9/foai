import type { TIETier } from './types';

interface GradeEntry {
  min: number;
  max: number;
  grade: string;
  tier: TIETier;
  label: string;
  draftContext: string;
  badgeColor: string;
}

export const GRADE_SCALE: GradeEntry[] = [
  { min: 101, max: 999, grade: 'PRIME', tier: 'PRIME', label: 'Generational Talent', draftContext: 'Franchise Player', badgeColor: '#D4A853' },
  { min: 90, max: 100, grade: 'A+', tier: 'A_PLUS', label: 'Elite Prospect', draftContext: 'Top 5 Pick', badgeColor: '#D4A853' },
  { min: 85, max: 89, grade: 'A', tier: 'A', label: 'First-Round Lock', draftContext: 'Pro Bowler potential', badgeColor: '#60A5FA' },
  { min: 80, max: 84, grade: 'A-', tier: 'A_MINUS', label: 'Late First Round', draftContext: 'High Upside Starter', badgeColor: '#60A5FA' },
  { min: 75, max: 79, grade: 'B+', tier: 'B_PLUS', label: 'Day 2 Pick', draftContext: 'High Ceiling', badgeColor: '#34D399' },
  { min: 70, max: 74, grade: 'B', tier: 'B', label: 'Solid Contributor', draftContext: 'Day 2', badgeColor: '#34D399' },
  { min: 65, max: 69, grade: 'B-', tier: 'B_MINUS', label: 'Needs Development', draftContext: 'Mid-Round', badgeColor: '#FBBF24' },
  { min: 60, max: 64, grade: 'C+', tier: 'C_PLUS', label: 'Depth Player', draftContext: 'Late Round', badgeColor: '#A1A1AA' },
  { min: 0, max: 59, grade: 'C', tier: 'C', label: 'Practice Squad/UDFA', draftContext: 'UDFA', badgeColor: '#71717A' },
];

export function getGradeForScore(score: number): GradeEntry {
  return GRADE_SCALE.find(g => score >= g.min && score <= g.max) || GRADE_SCALE[GRADE_SCALE.length - 1];
}

/** Shorthand — returns the badge color for a numeric grade */
export function getGradeColor(score: number): string {
  return getGradeForScore(score).badgeColor;
}
