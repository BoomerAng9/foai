/**
 * lib/draft/fantasy-scoring.ts
 * ==============================
 * Fantasy-style scoring for the gamified Draft Night experience.
 *
 * NO GAMBLING. NO MONEY. This is league-style points only — your roster
 * earns points based on how well your picks ALIGN WITH PER|FORM TIE
 * GRADES, slot value, position scarcity, and surprise upside.
 *
 * Five-bucket scoring per pick:
 *   1. Tier match     — Did you draft a tier appropriate to the slot?
 *   2. Tier overshoot — Did you reach (negative) or steal (positive)?
 *   3. Need fit       — Does the player fill a positional need?
 *   4. Surprise bonus — Did you take a Prime sub-tag (NIL ready, quiet but elite)?
 *   5. Discipline     — Did you avoid blowing all picks on one position?
 */

import { getGradeBandByTier, type TIETier } from '@aims/tie-matrix';

export interface RosterPick {
  /** Overall pick number (1-based). */
  overallPick: number;
  /** Player's canonical TIE tier. */
  tier: TIETier;
  /** Player's numeric grade (preferred — used for tier overshoot calc). */
  grade?: number;
  /** Player position group (QB, WR, EDGE, …). */
  position: string;
  /** Did the player carry any prime sub-tags? */
  primeSubTags?: string[];
  /** Did this position fill a declared team need? */
  filledNeed?: boolean;
}

export interface ScoreLine {
  bucket: 'tier_match' | 'tier_overshoot' | 'need_fit' | 'surprise' | 'discipline';
  points: number;
  reason: string;
}

export interface PickScore {
  overallPick: number;
  position: string;
  total: number;
  lines: ScoreLine[];
}

export interface RosterScore {
  totalPoints: number;
  perPick: PickScore[];
  breakdown: Record<ScoreLine['bucket'], number>;
  positionExposure: Record<string, number>;
}

// Slot-tier expectations for the first 7 rounds of an NFL draft (32 picks/round).
// Pick at slot N "should" land approximately on this tier — overshoot = steal.
function expectedTierForSlot(overallPick: number): TIETier {
  if (overallPick <= 5)   return 'PRIME';
  if (overallPick <= 15)  return 'A_PLUS';
  if (overallPick <= 32)  return 'A';
  if (overallPick <= 64)  return 'A_MINUS';
  if (overallPick <= 96)  return 'B_PLUS';
  if (overallPick <= 128) return 'B';
  if (overallPick <= 160) return 'B_MINUS';
  if (overallPick <= 192) return 'C_PLUS';
  return 'C';
}

const TIER_RANK: Record<TIETier, number> = {
  PRIME: 9, A_PLUS: 8, A: 7, A_MINUS: 6,
  B_PLUS: 5, B: 4, B_MINUS: 3, C_PLUS: 2, C: 1,
};

function scorePick(pick: RosterPick, exposure: Record<string, number>): PickScore {
  const lines: ScoreLine[] = [];
  const expected = expectedTierForSlot(pick.overallPick);

  // 1. Tier match (slot-appropriate pick)
  if (pick.tier === expected) {
    lines.push({ bucket: 'tier_match', points: 10, reason: `Slot-appropriate ${pick.tier} at #${pick.overallPick}` });
  }

  // 2. Tier overshoot — steal vs reach
  const delta = TIER_RANK[pick.tier] - TIER_RANK[expected];
  if (delta > 0) {
    const stealPoints = delta * 8;
    lines.push({ bucket: 'tier_overshoot', points: stealPoints, reason: `Steal: ${pick.tier} ${delta} tier(s) above expected` });
  } else if (delta < 0) {
    const reachPenalty = delta * 5; // negative
    lines.push({ bucket: 'tier_overshoot', points: reachPenalty, reason: `Reach: ${pick.tier} ${Math.abs(delta)} tier(s) below expected` });
  }

  // 3. Need fit
  if (pick.filledNeed) {
    lines.push({ bucket: 'need_fit', points: 6, reason: `Filled team need at ${pick.position}` });
  }

  // 4. Surprise — Prime sub-tags
  if (pick.primeSubTags && pick.primeSubTags.length > 0) {
    const surprise = pick.primeSubTags.length * 4;
    lines.push({ bucket: 'surprise', points: surprise, reason: `Prime sub-tag(s): ${pick.primeSubTags.join(', ')}` });
  }

  // 5. Discipline — penalty for >2 of same position group
  const positionCount = exposure[pick.position] ?? 0;
  if (positionCount > 2) {
    const overload = (positionCount - 2) * -3;
    lines.push({ bucket: 'discipline', points: overload, reason: `Position overload: ${positionCount + 1} ${pick.position} picks` });
  }

  const total = lines.reduce((sum, l) => sum + l.points, 0);
  return { overallPick: pick.overallPick, position: pick.position, total, lines };
}

export function scoreRoster(picks: RosterPick[]): RosterScore {
  const exposure: Record<string, number> = {};
  const perPick: PickScore[] = [];
  const breakdown: Record<ScoreLine['bucket'], number> = {
    tier_match: 0, tier_overshoot: 0, need_fit: 0, surprise: 0, discipline: 0,
  };

  for (const p of picks) {
    const ps = scorePick(p, exposure);
    perPick.push(ps);
    exposure[p.position] = (exposure[p.position] ?? 0) + 1;
    for (const line of ps.lines) {
      breakdown[line.bucket] += line.points;
    }
  }

  const totalPoints = perPick.reduce((sum, p) => sum + p.total, 0);
  return { totalPoints, perPick, breakdown, positionExposure: exposure };
}

/** Convenience — returns roster score for picks where you only have grades. */
export function scoreRosterByGrade(
  picks: Array<{ overallPick: number; grade: number; position: string; filledNeed?: boolean; primeSubTags?: string[] }>,
): RosterScore {
  const enriched: RosterPick[] = picks.map((p) => {
    // Cheap inverse lookup — find the canonical band for this score.
    // We can't import getGradeForScore here without a circular alarm
    // bell, but getGradeBandByTier(tier) is the canonical anchor and
    // we derive tier by comparing thresholds.
    let tier: TIETier = 'C';
    const tiers: TIETier[] = ['PRIME', 'A_PLUS', 'A', 'A_MINUS', 'B_PLUS', 'B', 'B_MINUS', 'C_PLUS'];
    for (const t of tiers) {
      const band = getGradeBandByTier(t);
      if (p.grade >= band.min) { tier = t; break; }
    }
    return { ...p, tier };
  });
  return scoreRoster(enriched);
}
