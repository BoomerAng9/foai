/**
 * Typed lookups for the TIE Matrix.
 * ==================================
 * THE ONLY place callers should translate numeric scores, tiers, or
 * verticals into display copy. Every cross-vertical boundary should
 * call assertVertical() to fail loud rather than silently mix data.
 */

import type {
  GradeBand,
  PrimeSubTag,
  PrimeSubTagDef,
  TIEResult,
  TIETier,
  Vertical,
  VerticalConfig,
  VerticalTierLabel,
  VersatilityBonus,
  VersatilityFlex,
} from './types.js';
import { getMatrix } from './loader.js';

// ─── Grade lookups ──────────────────────────────────────────────────────

export function getGradeForScore(score: number): GradeBand {
  const grades = getMatrix().grades;
  const hit = grades.find((g) => score >= g.min && score <= g.max);
  if (hit) return hit;
  // Fallback: last band (lowest tier)
  return grades[grades.length - 1]!;
}

export function getGradeColor(score: number): string {
  return getGradeForScore(score).badgeColor;
}

export function getGradeBandByTier(tier: TIETier): GradeBand {
  const hit = getMatrix().grades.find((g) => g.tier === tier);
  if (!hit) throw new Error(`[tie-matrix] unknown tier: ${tier}`);
  return hit;
}

// ─── Vertical config lookups ────────────────────────────────────────────

export function getVerticalConfig(vertical: Vertical): VerticalConfig {
  const cfg = getMatrix().verticals[vertical];
  if (!cfg) throw new Error(`[tie-matrix] unknown vertical: ${vertical}`);
  return cfg;
}

export function getVerticalTierLabel(
  tier: TIETier,
  vertical: Vertical,
): VerticalTierLabel {
  const labels = getMatrix().labelsByVertical[vertical];
  if (!labels) throw new Error(`[tie-matrix] no labels for vertical: ${vertical}`);
  const hit = labels[tier];
  if (!hit) throw new Error(`[tie-matrix] no label for tier ${tier} in ${vertical}`);
  return hit;
}

// ─── Prime sub-tags ─────────────────────────────────────────────────────

export function getPrimeSubTag(tag: PrimeSubTag): PrimeSubTagDef {
  return getMatrix().primeSubTags[tag];
}

// ─── Versatility / multi-position bonuses ───────────────────────────────

export function getVersatilityBonus(flex: VersatilityFlex): VersatilityBonus {
  return getMatrix().versatilityBonuses[flex];
}

/** Shorthand — numeric bonus for a flex level. */
export function versatilityBonusValue(flex: VersatilityFlex): number {
  return getVersatilityBonus(flex).bonus;
}

// ─── Display formatters ─────────────────────────────────────────────────

/**
 * Full display string — "A+ 🚀" or "PRIME 🛸 🏗️ 🤯" when sub-tags present.
 */
export function formatGradeDisplay(score: number, subTags?: PrimeSubTag[]): string {
  const band = getGradeForScore(score);
  let display = `${band.grade} ${band.icon}`;

  if (score >= 101 && subTags && subTags.length > 0) {
    const tagIcons = subTags.map((t) => getPrimeSubTag(t).icon).join(' ');
    display += ` ${tagIcons}`;
  }

  return display;
}

// ─── Routing boundary enforcement ───────────────────────────────────────

/**
 * Throws if a result is being used in the wrong vertical context.
 * Call at every routing boundary (API handler, page component,
 * ranking aggregator) to fail loud rather than silently mix data.
 */
export function assertVertical(
  result: { vertical?: Vertical },
  expected: Vertical,
  context = 'unspecified',
): void {
  if (!result.vertical) {
    throw new Error(
      `[TIE routing] result missing vertical stamp at ${context} (expected ${expected})`,
    );
  }
  if (result.vertical !== expected) {
    throw new Error(
      `[TIE routing] vertical mismatch at ${context}: expected ${expected}, ` +
        `got ${result.vertical}. Cross-vertical data leak prevented.`,
    );
  }
}

// ─── Result builder — used by every engine (sports, workforce, ...) ────

/**
 * Compose a TIEResult from raw pillar components + vertical.
 * The canonical 40/30/30 weighting is applied here. Engines provide
 * pillar scores (already normalized 0-100); this function produces
 * the final graded result with vertical-correct labels.
 *
 * Optional `bonus` is added to the raw weighted score before grading —
 * use for multi-position bonuses (SPORTS) or vertical-specific uplift.
 */
export function buildTIEResult(args: {
  vertical: Vertical;
  performance: number; // 0–100
  attributes: number;  // 0–100
  intangibles: number; // 0–100
  bonus?: number;
  primeSubTags?: PrimeSubTag[];
}): TIEResult {
  const PILLAR_1 = 0.4;
  const PILLAR_2 = 0.3;
  const PILLAR_3 = 0.3;

  const weighted =
    args.performance * PILLAR_1 +
    args.attributes * PILLAR_2 +
    args.intangibles * PILLAR_3;

  const score = Math.round((weighted + (args.bonus ?? 0)) * 10) / 10;
  const band = getGradeForScore(score);
  const vLabel = getVerticalTierLabel(band.tier, args.vertical);

  return {
    vertical: args.vertical,
    score,
    grade: band.grade,
    tier: band.tier,
    label: vLabel.label,
    context: vLabel.context,
    projection: vLabel.projection,
    badgeColor: band.badgeColor,
    icon: band.icon,
    components: {
      performance: args.performance,
      attributes: args.attributes,
      intangibles: args.intangibles,
    },
    primeSubTags: score >= 101 ? args.primeSubTags : undefined,
  };
}
