/**
 * perform/lib/draft/tie-scale.ts  (FACADE — DEPRECATED internal implementation)
 * ==============================================================================
 * Previously this file held a PARALLEL grading engine with its own
 * weights, scale, emojis, prime sub-tags, and multi-position bonuses.
 * That parallel implementation has been removed. Everything here now
 * delegates to @aims/tie-matrix — the canonical cross-vertical engine.
 *
 * Existing imports continue to work (TIE_SCALE, getGradeBand,
 * formatGradeDisplay, calculatePerFormGrade, PRIME_SUB_TAGS,
 * multiPositionBonus, PrimeSubTag, TieGradeBand, GradeInputs, GradeResult),
 * but new code should import from @aims/tie-matrix directly.
 */

import {
  SEED_GRADES,
  SEED_PRIME_SUB_TAGS,
  getGradeForScore,
  getVerticalTierLabel,
  formatGradeDisplay as matrixFormatGradeDisplay,
  versatilityBonusValue,
  type PrimeSubTag,
  type GradeBand,
  type VersatilityFlex,
} from '@aims/tie-matrix';

export type { PrimeSubTag };

// ─── Legacy TieGradeBand shape (kept for existing consumers) ────────────

export interface TieGradeBand {
  minScore: number;
  maxScore: number;
  grade: string;
  icon: string;
  projection: string;
  label: string;
}

/** Derived from the canonical matrix — SPORTS projections. */
export const TIE_SCALE: TieGradeBand[] = SEED_GRADES.map((band: GradeBand) => {
  const sports = getVerticalTierLabel(band.tier, 'SPORTS');
  return {
    minScore: band.min,
    maxScore: band.max === 999 ? 107 : band.max, // SPORTS ceiling (100 base + 7 bonus)
    grade: band.grade === 'PRIME' ? 'Prime Player' : band.grade,
    icon: band.icon,
    projection: sports.projection ?? sports.context,
    label: band.tier === 'PRIME' ? 'PRIME' : (sports.label.toUpperCase()),
  };
});

export function getGradeBand(score: number): TieGradeBand {
  const band = getGradeForScore(score);
  const sports = getVerticalTierLabel(band.tier, 'SPORTS');
  return {
    minScore: band.min,
    maxScore: band.max === 999 ? 107 : band.max,
    grade: band.grade === 'PRIME' ? 'Prime Player' : band.grade,
    icon: band.icon,
    projection: sports.projection ?? sports.context,
    label: band.tier === 'PRIME' ? 'PRIME' : sports.label.toUpperCase(),
  };
}

// ─── Prime sub-tags — re-exported from matrix with legacy key shape ────

export const PRIME_SUB_TAGS: Record<PrimeSubTag, { icon: string; label: string; meaning: string }> = Object.fromEntries(
  (Object.keys(SEED_PRIME_SUB_TAGS) as PrimeSubTag[]).map((k) => {
    const def = SEED_PRIME_SUB_TAGS[k];
    return [k, { icon: def.icon, label: def.label, meaning: def.meaning }];
  }),
) as Record<PrimeSubTag, { icon: string; label: string; meaning: string }>;

export function formatGradeDisplay(score: number, subTags?: PrimeSubTag[]): string {
  return matrixFormatGradeDisplay(score, subTags);
}

// ─── Grade inputs/outputs (legacy shape) ────────────────────────────────

export interface GradeInputs {
  gamePerformance: number;  // 0-100
  athleticism: number;      // 0-100
  intangibles: number;      // 0-100
  multiPositionBonus?: number; // 0, 3, 5, or 7
}

export interface GradeResult {
  finalScore: number;
  band: TieGradeBand;
  display: string;
  breakdown: {
    gamePerformance: number;
    athleticism: number;
    intangibles: number;
    multiPositionBonus: number;
  };
}

/**
 * Legacy entry point — delegates to @aims/tie-matrix.
 * Weights are enforced inside the matrix's buildTIEResult; this
 * function only adapts the old {gamePerformance, athleticism,
 * intangibles, multiPositionBonus} shape to the new pillar inputs.
 */
export function calculatePerFormGrade(inputs: GradeInputs): GradeResult {
  // Canonical 40/30/30 weighting is applied inside the matrix
  const weighted =
    inputs.gamePerformance * 0.4 +
    inputs.athleticism * 0.3 +
    inputs.intangibles * 0.3;

  const bonus = inputs.multiPositionBonus ?? 0;
  const finalScore = Math.round((weighted + bonus) * 10) / 10;
  const band = getGradeBand(finalScore);

  return {
    finalScore,
    band,
    display: `${band.grade} ${band.icon}`,
    breakdown: {
      gamePerformance: inputs.gamePerformance,
      athleticism: inputs.athleticism,
      intangibles: inputs.intangibles,
      multiPositionBonus: bonus,
    },
  };
}

export function multiPositionBonus(
  flex: 'none' | 'situational' | 'two_way' | 'unicorn',
): number {
  return versatilityBonusValue(flex as VersatilityFlex);
}
