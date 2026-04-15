/**
 * perform/lib/tie/types.ts
 * =========================
 * FACADE over @aims/tie-matrix for cross-vertical TIE types, plus
 * SPORTS-specific input shapes that only Per|Form cares about.
 *
 * Cross-vertical types (TIETier, TIEResult, Vertical, GradeBand, ...)
 * live in the canonical matrix and are re-exported here so existing
 * `from './types'` imports keep working.
 */

export type {
  TIETier,
  TIEResult,
  TIEComponents,
  Vertical,
  GradeBand,
  VerticalConfig,
  VerticalTierLabel,
  PrimeSubTag,
  PrimeSubTagDef,
  VersatilityFlex,
  VersatilityBonus,
} from '@aims/tie-matrix';

import type { Vertical } from '@aims/tie-matrix';

// ─── SPORTS-only — stays local to Per|Form ─────────────────────────────

export type Pool = 'NFL_PROSPECT' | 'COLLEGE' | 'HIGH_SCHOOL';
export type Trend = 'UP' | 'DOWN' | 'STEADY' | 'NEW';

export interface PerformanceInput {
  offenseYards?: number;
  tdIntRatio?: number;
  efficiency?: number;
  epaPerPlay?: number;
  successRate?: number;
  tackles?: number;
  sacks?: number;
  interceptions?: number;
  pffGrade?: number;
  specialTeamsGrade?: number;
}

export interface AttributesInput {
  fortyYard?: number;
  threeCone?: number;
  shuttle?: number;
  benchPress?: number;
  height?: number;
  weight?: number;
  wingspan?: number;
  verticalJump?: number;
  broadJump?: number;
}

export interface IntangiblesInput {
  footballIQ?: number;
  workEthic?: number;
  competitiveness?: number;
  leadership?: number;
  offFieldCharacter?: number;
}

export interface Prospect {
  /** Always SPORTS — included so a prospect can never be silently
   *  shoved into a workforce/student/contractor query result */
  vertical?: Vertical;
  id: string;
  name: string;
  position: string;
  school: string;
  classYear: string;
  pool: Pool;
  height?: string;
  weight?: number;
  state?: string;
  conference?: string;
  tieScore?: number;
  tieGrade?: string;
  tieTier?: string;
  trend?: Trend;
  overallRank?: number;
  positionRank?: number;
  projectedRound?: number;
  scoutingSummary?: string;
  strengths?: string;
  weaknesses?: string;
  nflComparison?: string;
  analystNotes?: string;
  stats?: Record<string, string | number>;
}
