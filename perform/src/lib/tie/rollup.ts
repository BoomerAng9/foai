/**
 * Attribute → Pillar rollup for the expanded TIE matrix.
 *
 * Takes a Madden/2K-style attribute sheet (e.g. { SPD: 94, INJ: 99, ... })
 * and rolls it up into the three canonical TIE pillars (Performance,
 * Attributes, Intangibles) which feed into calculateTIE().
 *
 * Rollup rule: within each pillar, take the MEAN of all attributes the
 * player has been graded on that match their position. Pillar-specific
 * weightings are intentionally flat at this layer — the grand-weight
 * (40/30/30) lives in lib/tie/engine.ts. That keeps the matrix additive:
 * adding or removing an attribute doesn't rebalance pillars under you.
 *
 * Medical durability (INJ) is an Intangibles attribute. If the player's
 * INJ rating is 95+, we also apply a half-point bonus to the Intangibles
 * pillar — this surfaces "played through injury unbraced"-level stories
 * (Jeremiyah Love) as a differentiator even when peers have similar
 * awareness/motor/character profiles.
 */

import type { TIEResult } from './types';
import { buildTIEResult, versatilityBonusValue, type VersatilityFlex, type PrimeSubTag } from '@aims/tie-matrix';
import { getAttributesForPosition } from './attributes';
import { deriveBadges, type Badge } from './badges';

export interface RollupContext {
  versatility?: VersatilityFlex | null;
  primeSubTags?: PrimeSubTag[] | null;
}

function versatilityBonusFromFlex(flex: VersatilityFlex): number {
  return versatilityBonusValue(flex);
}

export interface AttributeRollupResult {
  tie: TIEResult;
  pillars: {
    performance: number;
    attributes: number;
    intangibles: number;
  };
  badges: Badge[];
  coverage: {
    total: number;                  // attributes applicable to this position
    graded: number;                 // how many have a rating
    performanceGraded: number;
    attributesGraded: number;
    intangiblesGraded: number;
  };
}

const DEFAULT_UNGRADED = 50; // middle-of-pack fallback when a player has no rating on a relevant attribute

function average(values: number[]): number {
  if (values.length === 0) return DEFAULT_UNGRADED;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function rollupAttributes(
  ratings: Record<string, number>,
  position: string,
  ctx: RollupContext = {},
): AttributeRollupResult {
  const set = getAttributesForPosition(position);

  const collect = (defs: typeof set.performance): { values: number[]; graded: number } => {
    const values: number[] = [];
    let graded = 0;
    for (const def of defs) {
      const r = ratings[def.code];
      if (typeof r === 'number' && Number.isFinite(r)) {
        values.push(r);
        graded++;
      }
    }
    return { values, graded };
  };

  const perf = collect(set.performance);
  const attr = collect(set.attributes);
  const intg = collect(set.intangibles);

  let performancePillar = average(perf.values);
  let attributesPillar  = average(attr.values);
  let intangiblesPillar = average(intg.values);

  // Medical durability differentiator — a 95+ INJ rating nudges the
  // intangibles pillar (Love-type story: played through injury unbraced).
  const injRating = ratings['INJ'];
  if (typeof injRating === 'number' && injRating >= 95) {
    intangiblesPillar = Math.min(100, intangiblesPillar + 0.5);
  }

  // Skip the raw-metric normalizers entirely and hand the pre-rolled pillar
  // values straight to the canonical matrix builder. The matrix owns the
  // 40/30/30 weighting + versatility bonus; we own pillar synthesis from
  // the attribute sheet + the versatility/prime-sub-tag plumbing.
  //
  // Versatility flex (none=0, situational=+3, two_way=+5, unicorn=+7) is
  // what pushes elite weighted-100 players into the PRIME 101+ tier.
  // Prime sub-tags surface on the card display once score >= 101.
  const versatility = ctx.versatility && ctx.versatility !== 'none' ? ctx.versatility : undefined;
  const primeSubTags = ctx.primeSubTags && ctx.primeSubTags.length > 0 ? ctx.primeSubTags : undefined;
  const tie = buildTIEResult({
    vertical: 'SPORTS',
    performance: Math.round(performancePillar * 10) / 10,
    attributes:  Math.round(attributesPillar  * 10) / 10,
    intangibles: Math.round(intangiblesPillar * 10) / 10,
    ...(versatility ? { bonus: versatilityBonusFromFlex(versatility) } : {}),
    ...(primeSubTags ? { primeSubTags } : {}),
  });

  const badges = deriveBadges(ratings);

  return {
    tie,
    pillars: {
      performance: performancePillar,
      attributes: attributesPillar,
      intangibles: intangiblesPillar,
    },
    badges,
    coverage: {
      total: set.performance.length + set.attributes.length + set.intangibles.length,
      graded: perf.graded + attr.graded + intg.graded,
      performanceGraded: perf.graded,
      attributesGraded: attr.graded,
      intangiblesGraded: intg.graded,
    },
  };
}

/* ── Public convenience: rate one player straight to {grade, pillars, badges} ── */
export function gradeFromAttributes(
  ratings: Record<string, number>,
  position: string,
): { grade: number; tier: string; pillars: AttributeRollupResult['pillars']; badges: Badge[] } {
  const res = rollupAttributes(ratings, position);
  return {
    grade: res.tie.score,
    tier: res.tie.tier,
    pillars: res.pillars,
    badges: res.badges,
  };
}
