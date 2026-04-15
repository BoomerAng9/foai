/**
 * lib/tie/resolve-player-grade.ts
 * =================================
 * Turn a player row (from /api/players or the DB) into canonical grade
 * display data. Every page that renders a grade should run the row
 * through this function — so the same player_id always resolves to the
 * same band, label, color, and projection.
 *
 * Input permissiveness:
 *   - `grade` may be number, numeric string, or null
 *   - `tie_tier` may be the canonical TIETier (PRIME/A_PLUS/...) or a
 *     legacy label ('ELITE'/'BLUE CHIP') — we prefer numeric `grade`
 *     when present because Wave 2 writes canonical tiers; legacy rows
 *     without a regrade still fall through via `grade` → band.
 */

import {
  getGradeForScore,
  getGradeBandByTier,
  getVerticalTierLabel,
  type GradeBand,
  type TIETier,
  type Vertical,
  type VerticalTierLabel,
} from '@aims/tie-matrix';

export interface GradeResolvable {
  grade?: number | string | null;
  tie_tier?: string | null;
  vertical?: string | null;
  prime_sub_tags?: string[] | null;
}

export interface ResolvedGrade {
  /** The canonical GradeBand (tier, icon, badgeColor, cutoff). */
  band: GradeBand;
  /** Vertical-specific label + context. */
  label: VerticalTierLabel;
  /** Numeric score if one was resolvable; null otherwise. */
  score: number | null;
  /** Vertical — defaults to SPORTS. */
  vertical: Vertical;
  /** Whether a score was available (false → label-only). */
  hasScore: boolean;
}

const CANONICAL_TIERS = new Set<TIETier>([
  'PRIME', 'A_PLUS', 'A', 'A_MINUS',
  'B_PLUS', 'B', 'B_MINUS', 'C_PLUS', 'C',
]);

function parseNumericScore(raw: unknown): number | null {
  if (raw == null) return null;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
  return Number.isFinite(n) ? n : null;
}

function coerceVertical(v: string | null | undefined): Vertical {
  switch (v) {
    case 'SPORTS':
    case 'WORKFORCE':
    case 'STUDENT':
    case 'CONTRACTOR':
    case 'FOUNDER':
    case 'CREATIVE':
      return v;
    default:
      return 'SPORTS';
  }
}

export function resolvePlayerGrade(row: GradeResolvable): ResolvedGrade {
  const vertical = coerceVertical(row.vertical ?? null);
  const score = parseNumericScore(row.grade);

  // Preferred path: numeric grade → canonical band.
  if (score !== null) {
    const band = getGradeForScore(score);
    return {
      band,
      label: getVerticalTierLabel(band.tier, vertical),
      score,
      vertical,
      hasScore: true,
    };
  }

  // Fallback: canonical tie_tier (Wave 2+ writes these). Legacy labels
  // like 'ELITE' / 'BLUE CHIP' drop through to the final C fallback —
  // those rows need a regrade (tracked as a data-quality follow-up,
  // NOT something the renderer should try to guess its way around).
  const tier = row.tie_tier as TIETier | undefined;
  if (tier && CANONICAL_TIERS.has(tier)) {
    const band = getGradeBandByTier(tier);
    return {
      band,
      label: getVerticalTierLabel(tier, vertical),
      score: null,
      vertical,
      hasScore: false,
    };
  }

  // Final fallback — lowest tier. Still returns a valid render shape.
  const fallback = getGradeBandByTier('C');
  return {
    band: fallback,
    label: getVerticalTierLabel('C', vertical),
    score: null,
    vertical,
    hasScore: false,
  };
}
