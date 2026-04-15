/**
 * Per|Form Regrade Engine v3.0
 * ==============================
 * Calibrates TIE grades against Beast + consensus data using REAL measurements.
 *
 * INPUTS:
 *   - Beast measurements (2,396 players with testing data)
 *   - Beast Top 100 (authoritative ranking reference)
 *   - Consensus boards (DraftTek + Yahoo + Ringer + others)
 *   - Existing TIE grades (240 seeded prospects)
 *
 * OUTPUT:
 *   - Regraded prospect list with calibrated TIE scores
 *   - Beast comparison delta for each player
 *   - Athleticism pillar fed by REAL combine data, not rank-derived estimates
 *
 * FORMULA: Same 40/30/30 but with real data:
 *   Game Performance (40%) — weighted average of Beast rank + consensus rank
 *   Athleticism (30%) — computed from ACTUAL combine/pro day measurements
 *   Intangibles (30%) — Beast grade + power school + leadership + medical
 *   + Multi-Position Bonus (0-7)
 */

import * as fs from 'fs';
import * as path from 'path';
import { BEAST_TOP_100, type BeastProspect } from './beast-brugler-2026';
import { gradeToProjectedRound } from './open-mind-grader';
import {
  calculatePerFormGrade,
  getGradeBand,
} from './tie-scale';

/* ── Load Beast measurements ── */
interface BeastMeasurement {
  rank?: number;
  name: string;
  school: string;
  height?: string;
  weight?: number;
  forty?: number;
  ten?: number;
  twenty?: number;
  vertical?: number;
  broad?: string;
  shuttle?: number;
  threecone?: number;
  bench?: number;
  hand?: string;
  arm?: string;
  wingspan?: string;
  grade?: string;
  age?: number;
}

interface BeastData {
  positions: Record<string, BeastMeasurement[]>;
  top100?: BeastProspect[];
}

function loadBeastMeasurements(): BeastData {
  const jsonPath = path.join(process.cwd(), 'src', 'lib', 'draft', 'beast-measurements.json');
  if (!fs.existsSync(jsonPath)) {
    return { positions: {} };
  }
  return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
}

/* ── Athleticism from REAL combine data ──
 * Position-specific percentile scoring using actual testing results.
 * Each metric gets a 0-100 percentile score based on position averages.
 */

// Position-specific 50th percentile benchmarks (from historical combine data)
const POSITION_BENCHMARKS: Record<string, { forty: number; vertical: number; broad: number; bench: number; shuttle: number; threecone: number }> = {
  QB:   { forty: 4.80, vertical: 32, broad: 114, bench: 22, shuttle: 4.35, threecone: 7.10 },
  RB:   { forty: 4.52, vertical: 35, broad: 120, bench: 20, shuttle: 4.25, threecone: 7.00 },
  WR:   { forty: 4.48, vertical: 36, broad: 122, bench: 14, shuttle: 4.20, threecone: 6.90 },
  TE:   { forty: 4.65, vertical: 34, broad: 118, bench: 22, shuttle: 4.35, threecone: 7.10 },
  OT:   { forty: 5.10, vertical: 29, broad: 106, bench: 26, shuttle: 4.65, threecone: 7.55 },
  OG:   { forty: 5.20, vertical: 27, broad: 104, bench: 27, shuttle: 4.65, threecone: 7.60 },
  C:    { forty: 5.15, vertical: 28, broad: 105, bench: 26, shuttle: 4.60, threecone: 7.50 },
  EDGE: { forty: 4.70, vertical: 34, broad: 118, bench: 23, shuttle: 4.35, threecone: 7.10 },
  DT:   { forty: 5.05, vertical: 29, broad: 108, bench: 27, shuttle: 4.55, threecone: 7.50 },
  LB:   { forty: 4.65, vertical: 34, broad: 118, bench: 22, shuttle: 4.25, threecone: 7.00 },
  CB:   { forty: 4.45, vertical: 37, broad: 124, bench: 14, shuttle: 4.15, threecone: 6.85 },
  S:    { forty: 4.50, vertical: 36, broad: 122, bench: 16, shuttle: 4.20, threecone: 6.95 },
};

function parseBroadJump(broad: string | undefined): number | null {
  if (!broad) return null;
  // formats: "11'2\"", "10'9\"", "131" (inches)
  const feetInches = broad.match(/(\d+)'(\d+)/);
  if (feetInches) return parseInt(feetInches[1]) * 12 + parseInt(feetInches[2]);
  const inches = parseInt(broad);
  if (!isNaN(inches) && inches > 50) return inches;
  return null;
}

function metricPercentile(value: number, benchmark: number, higherIsBetter: boolean): number {
  if (higherIsBetter) {
    // e.g., vertical jump, broad jump, bench
    const ratio = value / benchmark;
    return Math.min(100, Math.max(0, 50 + (ratio - 1) * 200));
  } else {
    // e.g., 40-yard, shuttle, 3-cone (lower is better)
    const ratio = benchmark / value;
    return Math.min(100, Math.max(0, 50 + (ratio - 1) * 200));
  }
}

function computeAthleticism(player: BeastMeasurement, position: string): number {
  const benchmarks = POSITION_BENCHMARKS[position] || POSITION_BENCHMARKS.EDGE;
  const scores: number[] = [];

  if (player.forty && player.forty > 0) {
    scores.push(metricPercentile(player.forty, benchmarks.forty, false) * 1.5); // 40 is weighted heavier
  }
  if (player.vertical && player.vertical > 0) {
    scores.push(metricPercentile(player.vertical, benchmarks.vertical, true));
  }
  const broad = parseBroadJump(player.broad);
  if (broad) {
    scores.push(metricPercentile(broad, benchmarks.broad, true));
  }
  if (player.bench && player.bench > 0) {
    scores.push(metricPercentile(player.bench, benchmarks.bench, true) * 0.5); // bench weighted less
  }
  if (player.shuttle && player.shuttle > 0) {
    scores.push(metricPercentile(player.shuttle, benchmarks.shuttle, false));
  }
  if (player.threecone && player.threecone > 0) {
    scores.push(metricPercentile(player.threecone, benchmarks.threecone, false));
  }

  if (scores.length === 0) {
    // No combine data — fall back to rank-derived estimate
    return -1; // signal to use rank-based fallback
  }

  const totalWeight = scores.reduce((a, b) => a + b, 0);
  const weightedCount = scores.length + 0.5; // extra 0.5 for the 40-yard weight
  const raw = totalWeight / weightedCount;

  // Clamp to 30-100 range
  return Math.min(100, Math.max(30, raw));
}

/* ── Game Performance from Beast rank + consensus rank ── */
function computeGamePerformance(beastRank: number | null, consensusRank: number | null, position: string): number {
  // Use weighted average: Beast 60%, consensus 40%
  let rank: number;
  if (beastRank && consensusRank) {
    rank = beastRank * 0.6 + consensusRank * 0.4;
  } else if (beastRank) {
    rank = beastRank;
  } else if (consensusRank) {
    rank = consensusRank;
  } else {
    return 40; // unranked = depth/UDFA level
  }

  // Rank to score (same curve as open-mind-grader but using calibrated rank)
  if (rank <= 3) return 95 - (rank - 1) * 1;
  if (rank <= 10) return 93 - (rank - 3) * 0.7;
  if (rank <= 25) return 88 - (rank - 10) * 0.45;
  if (rank <= 50) return 81 - (rank - 25) * 0.35;
  if (rank <= 100) return 72 - (rank - 50) * 0.2;
  if (rank <= 200) return 62 - (rank - 100) * 0.12;
  if (rank <= 400) return 50 - (rank - 200) * 0.07;
  return Math.max(20, 36 - (rank - 400) * 0.05);
}

/* ── Intangibles from Beast grade + school + age ──
 * TUNED v3.1: Raised floor for draftable players.
 * Beast "5th" = late-round pick, not UDFA. Floor must reflect that.
 * Beast "FA" = true UDFA. Only they get the bottom tier.
 */
const BEAST_GRADE_MAP: Record<string, number> = {
  '1st': 95, '1st-2nd': 90, '2nd': 84, '2nd-3rd': 79, '3rd': 74,
  '3rd-4th': 70, '4th': 66, '4th-5th': 63, '5th': 60, '5th-6th': 57,
  '6th': 54, '6th-7th': 50, '7th': 46, '7th-FA': 40, 'FA': 32,
};

const POWER_SCHOOLS = new Set([
  'Ohio State', 'Georgia', 'Alabama', 'Michigan', 'Texas', 'USC', 'Oregon',
  'Penn State', 'Notre Dame', 'Clemson', 'LSU', 'Tennessee', 'Oklahoma',
  'Miami', 'Florida', 'Texas A&M', 'Auburn', 'Wisconsin', 'Iowa',
  'Missouri', 'Ole Miss', 'South Carolina', 'Arkansas', 'Kentucky',
  'Indiana', 'Arizona State', 'Washington', 'Utah', 'Stanford',
  'North Carolina', 'Pittsburgh', 'Louisville', 'Virginia Tech',
  'NC State', 'Duke', 'Boston College', 'TCU', 'Baylor', 'Kansas State',
  'BYU', 'UCF', 'Houston', 'Cincinnati', 'Colorado', 'Arizona',
  'Northwestern', 'Minnesota', 'Nebraska', 'Illinois', 'Michigan State',
  'Iowa State', 'Texas Tech', 'Oklahoma State', 'Florida State',
  'Georgia Tech', 'SMU', 'Vanderbilt', 'Mississippi State', 'Memphis',
]);

function computeIntangibles(beastGrade: string | undefined, school: string, age?: number): number {
  let base = BEAST_GRADE_MAP[beastGrade || 'FA'] || 25;

  // Power school boost
  if (POWER_SCHOOLS.has(school)) base += 2;

  // Age penalty (younger is better for development ceiling)
  if (age && age > 24) base -= 3;
  if (age && age < 22) base += 2;

  return Math.min(100, Math.max(20, base));
}

/* ── Position value multiplier (same as open-mind-grader) ── */
const POSITION_VALUE: Record<string, number> = {
  QB: 1.08, EDGE: 1.06, OT: 1.05, CB: 1.04, WR: 1.03, S: 1.02,
  DT: 1.02, DL: 1.02, TE: 1.01, LB: 1.01, RB: 1.00, OG: 1.00,
  C: 0.99, K: 0.92, P: 0.91, LS: 0.88,
};

/* ── Multi-position bonus ──
 * Players who can play multiple positions at the NFL level get a bonus.
 * Identified from Beast profiles + scouting reports.
 */
const MULTI_POSITION_BONUS: Record<string, number> = {
  'ARVELL REESE': 5,       // EDGE/LB hybrid — historic versatility
  'SONNY STYLES': 5,       // LB/S hybrid — former safety with LB size
  'CALEB DOWNS': 3,        // S/slot CB — multi-position safety
  'KENYON SADIQ': 3,       // TE/slot WR — hybrid mismatch weapon
  'FRANCIS MAUIGOA': 3,    // OT/OG — can start at either
  'SPENCER FANO': 3,       // OT/OG/C — tested at center at combine
  'KELDRIC FAULK': 3,      // EDGE/DT — 4i/5-tech versatility
  'DILLON THIENEMAN': 3,   // S/slot CB — coverage versatility
  'AKHEEM MESIDOR': 3,     // EDGE/DT — dominant inside rusher
  'R MASON THOMAS': 3,     // EDGE/LB — undersized but versatile
};

/* ── Manual athleticism overrides for combine skippers ──
 * Players who didn't test but have known/unofficial numbers.
 */
const ATHLETICISM_OVERRIDES: Record<string, number> = {
  'CALEB DOWNS': 82,       // Unofficial 4.52, 35.5" vert. Elite IQ compensates.
  'RUEBEN BAIN JR.': 78,   // Didn't test. Short arms but real power. Film shows NFL-level burst.
  'FERNANDO MENDOZA': 75,  // QB — threw 53/56 at Pro Day. Mobility adequate, not a runner.
  'JORDYN TYSON': 88,      // Hamstring kept him out. When healthy, most explosive WR in class.
  'MANSOOR DELANE': 90,    // 4.35-4.38 at Pro Day. Elite speed confirmed.
  'CARNELL TATE': 78,      // 4.53 disputed (teams clocked 4.45). 10.25" hands, 6-3 frame.
};

/* ── Fallback: rank-derived athleticism (when no combine data) ── */
function rankToAthleticismFallback(rank: number): number {
  if (rank <= 5) return 92 - (rank - 1) * 0.5;
  if (rank <= 20) return 90 - (rank - 5) * 0.4;
  if (rank <= 50) return 84 - (rank - 20) * 0.3;
  if (rank <= 100) return 75 - (rank - 50) * 0.2;
  if (rank <= 200) return 65 - (rank - 100) * 0.1;
  if (rank <= 400) return 55 - (rank - 200) * 0.07;
  return Math.max(30, 41 - (rank - 400) * 0.05);
}

/* ── Main regrade function ── */
export interface RegradedProspect {
  name: string;
  position: string;
  school: string;
  beastRank: number | null;
  beastPositionRank: number | null;
  consensusRank: number | null;
  tieGrade: number;
  tieLabel: string;
  projectedRound: number;
  pillars: {
    gamePerformance: number;
    athleticism: number;
    intangibles: number;
    multiPositionBonus: number;
  };
  athleticismSource: 'combine' | 'rank_fallback' | 'manual_override';
  beastGrade: string | null;
  measurements: {
    height?: string;
    weight?: number;
    forty?: number;
    vertical?: number;
    broad?: string;
    arm?: string;
    wingspan?: string;
  };
}

export function regradeAllPlayers(): RegradedProspect[] {
  const beast = loadBeastMeasurements();
  const results: RegradedProspect[] = [];

  // Build Beast top 100 lookup
  const beastTop100Map = new Map<string, BeastProspect>();
  for (const p of BEAST_TOP_100) {
    beastTop100Map.set(p.name.toLowerCase(), p);
  }

  // Process all positions
  for (const [posKey, players] of Object.entries(beast.positions)) {
    if (posKey === 'K/P/LS') continue; // skip specialists for now

    const position = posKey;

    for (const player of players) {
      const nameLower = player.name.toLowerCase();
      const beastEntry = beastTop100Map.get(nameLower);

      // Get Beast rank (from top 100 if available, otherwise from position table rank)
      const beastRank = beastEntry?.rank ?? null;
      const beastPositionRank = beastEntry?.positionRank ?? player.rank ?? null;

      // Consensus rank: use Beast rank as primary (it IS the most authoritative single source)
      // In production, this would also pull from DraftTek + Yahoo + Ringer
      const consensusRank = beastRank ?? (player.rank ? player.rank * 3 : null); // rough: position rank * 3 for overall estimate

      // Compute pillars
      const gamePerf = computeGamePerformance(beastRank, consensusRank, position);
      const posMultiplier = POSITION_VALUE[position] || 1.0;
      const adjustedGamePerf = Math.min(100, gamePerf * posMultiplier);

      let athleticism = computeAthleticism(player, position);
      let athleticismSource: 'combine' | 'rank_fallback' | 'manual_override' = athleticism >= 0 ? 'combine' : 'rank_fallback';

      // Check manual override first (for combine skippers with known ability)
      const nameUpper = player.name.toUpperCase();
      if (ATHLETICISM_OVERRIDES[nameUpper] !== undefined) {
        athleticism = ATHLETICISM_OVERRIDES[nameUpper];
        athleticismSource = 'manual_override';
      } else if (athleticism < 0) {
        athleticism = rankToAthleticismFallback(beastRank || consensusRank || 300);
      }

      const intangibles = computeIntangibles(player.grade, player.school, player.age);

      // Multi-position bonus
      const multiPosBonus = MULTI_POSITION_BONUS[nameUpper] || 0;

      // 40/30/30 formula + multi-position bonus
      const rawScore = (adjustedGamePerf * 0.40) + (athleticism * 0.30) + (intangibles * 0.30) + multiPosBonus;
      const finalScore = Math.round(Math.min(107, Math.max(20, rawScore)) * 10) / 10;

      // Grade label
      let tieLabel: string;
      if (finalScore >= 101) tieLabel = 'Prime Player 🛸';
      else if (finalScore >= 90) tieLabel = 'A+ 🚀';
      else if (finalScore >= 85) tieLabel = 'A 🔥';
      else if (finalScore >= 80) tieLabel = 'A- ⭐';
      else if (finalScore >= 75) tieLabel = 'B+ ⏳';
      else if (finalScore >= 70) tieLabel = 'B 🏈';
      else if (finalScore >= 65) tieLabel = 'B- ⚡';
      else if (finalScore >= 60) tieLabel = 'C+ 🔧';
      else tieLabel = 'C ❌';

      results.push({
        name: player.name,
        position,
        school: player.school,
        beastRank,
        beastPositionRank,
        consensusRank,
        tieGrade: finalScore,
        tieLabel,
        projectedRound: gradeToProjectedRound(finalScore),
        pillars: {
          gamePerformance: Math.round(adjustedGamePerf * 10) / 10,
          athleticism: Math.round(athleticism * 10) / 10,
          intangibles: Math.round(intangibles * 10) / 10,
          multiPositionBonus: multiPosBonus,
        },
        athleticismSource,
        beastGrade: player.grade || null,
        measurements: {
          height: player.height,
          weight: player.weight,
          forty: player.forty,
          vertical: player.vertical,
          broad: player.broad,
          arm: player.arm,
          wingspan: player.wingspan,
        },
      });
    }
  }

  // Sort by TIE grade descending
  results.sort((a, b) => b.tieGrade - a.tieGrade);

  // Assign overall rank
  results.forEach((p, i) => {
    // We can use the index as the Per|Form rank
    (p as any).performRank = i + 1;
  });

  return results;
}

/** Run regrade and save to JSON */
export function regradeAndSave(): { total: number; outputPath: string } {
  const results = regradeAllPlayers();
  const outputPath = path.join(process.cwd(), 'src', 'lib', 'draft', 'regraded-prospects.json');

  const output = {
    generatedAt: new Date().toISOString(),
    source: 'Per|Form TIE Engine v3.0 + Beast 2026 calibration',
    totalPlayers: results.length,
    gradeDistribution: {
      prime: results.filter(p => p.tieGrade >= 101).length,
      aPlus: results.filter(p => p.tieGrade >= 90 && p.tieGrade < 101).length,
      a: results.filter(p => p.tieGrade >= 85 && p.tieGrade < 90).length,
      aMinus: results.filter(p => p.tieGrade >= 80 && p.tieGrade < 85).length,
      bPlus: results.filter(p => p.tieGrade >= 75 && p.tieGrade < 80).length,
      b: results.filter(p => p.tieGrade >= 70 && p.tieGrade < 75).length,
      bMinus: results.filter(p => p.tieGrade >= 65 && p.tieGrade < 70).length,
      cPlus: results.filter(p => p.tieGrade >= 60 && p.tieGrade < 65).length,
      cOrBelow: results.filter(p => p.tieGrade < 60).length,
    },
    combineDataCoverage: {
      withRealData: results.filter(p => p.athleticismSource === 'combine').length,
      withFallback: results.filter(p => p.athleticismSource === 'rank_fallback').length,
    },
    prospects: results,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  return { total: results.length, outputPath };
}
