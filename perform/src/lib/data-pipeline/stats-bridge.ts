/**
 * Stats Bridge — Converts raw CFBD stats into TIE engine inputs
 *
 * Takes college football statistics and maps them to the
 * PerformanceInput, AttributesInput, and IntangiblesInput
 * interfaces required by the TIE grading engine.
 */

import type { PerformanceInput, AttributesInput, IntangiblesInput } from '@/lib/tie/types';
import type { PlayerStatsSummary } from './cfbd';

/* ── Position-specific stat mapping ── */

export function mapToPerformance(
  position: string,
  stats: Record<string, number>,
): PerformanceInput {
  const pos = position.toUpperCase().replace(/[0-9T]/g, '');

  switch (pos) {
    case 'QB':
      return {
        tdIntRatio: (stats.passing_TD ?? 0) / Math.max(1, stats.passing_INT ?? 1),
        efficiency: stats.passing_QBR ?? stats.passing_RATING ?? undefined,
        epaPerPlay: stats.passing_EPA ?? undefined,
        successRate: stats.passing_COMPLETIONS
          ? (stats.passing_COMPLETIONS / Math.max(1, stats.passing_ATT ?? 1))
          : undefined,
      };

    case 'RB':
      return {
        efficiency: stats.rushing_YDS
          ? (stats.rushing_YDS / Math.max(1, stats.rushing_CAR ?? 1)) * 15 // YPC scaled
          : undefined,
        epaPerPlay: stats.rushing_EPA ?? undefined,
        successRate: stats.rushing_TD
          ? Math.min(100, (stats.rushing_TD / Math.max(1, stats.rushing_CAR ?? 1)) * 500)
          : undefined,
      };

    case 'WR':
    case 'WRS':
      return {
        efficiency: stats.receiving_YDS
          ? (stats.receiving_YDS / Math.max(1, stats.receiving_REC ?? 1)) * 5 // YPR scaled
          : undefined,
        epaPerPlay: stats.receiving_EPA ?? undefined,
        successRate: stats.receiving_REC
          ? Math.min(100, (stats.receiving_REC / Math.max(1, stats.receiving_TAR ?? stats.receiving_REC * 1.5)) * 100)
          : undefined,
      };

    case 'TE':
      return {
        efficiency: stats.receiving_YDS
          ? (stats.receiving_YDS / Math.max(1, stats.receiving_REC ?? 1)) * 5
          : undefined,
        successRate: stats.receiving_REC
          ? Math.min(100, (stats.receiving_REC / Math.max(1, stats.receiving_TAR ?? stats.receiving_REC * 1.5)) * 100)
          : undefined,
      };

    case 'EDGE':
    case 'DL':
      return {
        sacks: stats.defensive_SACKS ?? stats.defensive_TFL ?? undefined,
        tackles: stats.defensive_TOT ?? stats.defensive_SOLO ?? undefined,
      };

    case 'OLB':
    case 'ILB':
      return {
        tackles: stats.defensive_TOT ?? undefined,
        sacks: stats.defensive_SACKS ?? undefined,
        interceptions: stats.defensive_INT ?? undefined,
      };

    case 'CB':
    case 'CBN':
    case 'S':
      return {
        interceptions: stats.defensive_INT ?? undefined,
        tackles: stats.defensive_TOT ?? undefined,
      };

    case 'OT':
    case 'OG':
    case 'OC':
      // OL stats are limited — use pressures allowed, pancakes if available
      return {
        efficiency: stats.passing_SACKS_ALLOWED
          ? Math.max(0, 90 - (stats.passing_SACKS_ALLOWED * 5))
          : undefined,
      };

    default:
      return {};
  }
}

export function mapToAttributes(
  stats: Record<string, number>,
  dbRecord?: { height?: string; weight?: string; forty_time?: number; vertical_jump?: number; bench_reps?: number; broad_jump?: number; three_cone?: number; shuttle?: number },
): AttributesInput {
  return {
    fortyYard: dbRecord?.forty_time ?? undefined,
    threeCone: dbRecord?.three_cone ?? undefined,
    shuttle: dbRecord?.shuttle ?? undefined,
    benchPress: dbRecord?.bench_reps ?? undefined,
    verticalJump: dbRecord?.vertical_jump ?? undefined,
    broadJump: dbRecord?.broad_jump ?? undefined,
    height: dbRecord?.height ? parseHeight(dbRecord.height) : undefined,
    weight: dbRecord?.weight ? parseInt(dbRecord.weight) : undefined,
  };
}

function parseHeight(h: string): number {
  // "6-2" → 74 inches
  const parts = h.split('-');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 12 + parseInt(parts[1]);
  }
  return 72; // default 6-0
}

export function mapToIntangibles(
  recruiting?: { stars: number; rating: number; ranking: number },
  position?: string,
): IntangiblesInput {
  // Use recruiting star rating as a proxy for perceived talent/work ethic
  // 5-star = likely high football IQ and competitiveness to earn that rating
  const starBase = recruiting
    ? Math.min(95, 40 + recruiting.stars * 10 + (recruiting.rating - 0.8) * 50)
    : 50;

  // Position-based leadership proxy (QBs and LBs typically score higher)
  const leadershipBonus = ['QB', 'ILB', 'OLB', 'OC'].includes(position?.toUpperCase() ?? '') ? 5 : 0;

  return {
    footballIQ: Math.round(starBase + 2),
    workEthic: Math.round(starBase),
    competitiveness: Math.round(starBase + 3),
    leadership: Math.round(starBase + leadershipBonus),
    offFieldCharacter: 70, // Default to good unless flagged
  };
}

/* ── Full Pipeline: CFBD data → TIE inputs ── */

export function buildTIEInputs(
  summary: PlayerStatsSummary,
  dbRecord?: Record<string, unknown>,
): {
  performance: PerformanceInput;
  attributes: AttributesInput;
  intangibles: IntangiblesInput;
} {
  return {
    performance: mapToPerformance(summary.position, summary.stats),
    attributes: mapToAttributes(summary.stats, dbRecord as any),
    intangibles: mapToIntangibles(summary.recruiting, summary.position),
  };
}
