/**
 * Per|Form Open Mind Grading Engine v2
 * =======================================
 * CANONICAL FORMULA (from perform-talent-intelligence-skill-v2-final.md):
 *
 *   Player Grade Score = (Game Performance × 0.40)
 *                      + (Athleticism × 0.30)
 *                      + (Intangibles × 0.30)
 *                      + Multi-Position Bonus (0-7)
 *
 * Grade Scale (max 107):
 *   101+   Prime Player 🛸  Generational Talent
 *   90-100 A+           🚀  Elite Prospect
 *   85-89  A            🔥  First Round Lock
 *   80-84  A-           ⭐  Late First Round
 *   75-79  B+           ⏳  High Ceiling Day 2
 *   70-74  B            🏈  Solid Contributor
 *   65-69  B-           ⚡  Developmental
 *   60-64  C+           🔧  Depth Player
 *   <60    C or Below   ❌  UDFA
 *
 * The three-pillar sub-scores come from:
 *   1. Consensus rank → base athleticism (size/speed/combine expectations)
 *   2. School/conference → game performance context
 *   3. Position value + sleeper overrides → intangibles (IQ/work ethic/leadership)
 *
 * Weights NEVER exposed to end users.
 */

import { type DraftTekProspect, DRAFTTEK_BOARD_2026 } from './drafttek-board';
import {
  calculatePerFormGrade,
  getGradeBand,
  type GradeResult,
  type PrimeSubTag,
  PRIME_SUB_TAGS,
} from './tie-scale';

/* ── Projected round from final score ── */
export function gradeToProjectedRound(score: number): number {
  if (score >= 95) return 1;       // Top 5
  if (score >= 88) return 1;       // First round lock
  if (score >= 83) return 2;
  if (score >= 78) return 3;
  if (score >= 73) return 4;
  if (score >= 68) return 5;
  if (score >= 63) return 6;
  if (score >= 58) return 7;
  return 8; // UDFA
}

/* ── Position value multipliers ──
 * Applied to the GAME PERFORMANCE pillar only — reflects how much a
 * position impacts winning at the next level. */
const POSITION_VALUE: Record<string, number> = {
  QB: 1.08,
  EDGE: 1.06,
  OT: 1.05,
  CB: 1.04,
  WR: 1.03,
  S: 1.02,
  DL: 1.02,
  TE: 1.01,
  RB: 1.00,
  OG: 1.00,
  OC: 0.99,
  ILB: 1.01,
  OLB: 1.02,
  FB: 0.95,
  PK: 0.92,
  P: 0.91,
  LS: 0.88,
};

/* ── Power conference schools ── */
const POWER_SCHOOLS = new Set([
  'Ohio State', 'Georgia', 'Alabama', 'Michigan', 'Texas', 'USC', 'Oregon',
  'Penn State', 'Notre Dame', 'Clemson', 'LSU', 'Tennessee', 'Oklahoma',
  'Miami (FL)', 'Florida', 'Texas A&M', 'Auburn', 'Wisconsin', 'Iowa',
  'Missouri', 'Ole Miss', 'South Carolina', 'Arkansas', 'Kentucky',
  'Indiana', 'Arizona State', 'Washington', 'Utah', 'Stanford',
  'North Carolina', 'Pittsburgh', 'Louisville', 'Virginia Tech',
  'NC State', 'Duke', 'Boston College', 'TCU', 'Baylor', 'Kansas State',
  'Kansas', 'West Virginia', 'BYU', 'UCF', 'Houston', 'Cincinnati',
  'Colorado', 'Arizona', 'Cal', 'UCLA', 'Northwestern', 'Minnesota',
  'Nebraska', 'Illinois', 'Purdue', 'Michigan State', 'Maryland',
  'Rutgers', 'Iowa State', 'Texas Tech', 'Oklahoma State', 'Florida State',
  'Georgia Tech', 'SMU', 'Vanderbilt', 'Mississippi State', 'Memphis',
]);

/* ── Deterministic variance by name hash ── */
function nameHash(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function variance(name: string, range: number, seed: number = 0): number {
  const h = Math.abs(nameHash(name) + seed);
  return ((h % (range * 200 + 1)) - range * 100) / 100;
}

/* ── Rank → Game Performance base ──
 * Maps consensus rank to an expected performance level (0-100 scale).
 * Top prospects had elite college production.
 */
function rankToGamePerformance(rank: number): number {
  if (rank <= 3) return 95 - (rank - 1) * 1;      // 95-93
  if (rank <= 10) return 93 - (rank - 3) * 0.7;    // 93-88.1
  if (rank <= 25) return 88 - (rank - 10) * 0.45;  // 88-81.25
  if (rank <= 50) return 81 - (rank - 25) * 0.35;  // 81-72.25
  if (rank <= 100) return 72 - (rank - 50) * 0.2;  // 72-62
  if (rank <= 200) return 62 - (rank - 100) * 0.12; // 62-50
  if (rank <= 400) return 50 - (rank - 200) * 0.07; // 50-36
  return Math.max(20, 36 - (rank - 400) * 0.05);
}

/* ── Rank → Athleticism base ──
 * High-ranked prospects typically have better combine numbers. */
function rankToAthleticism(rank: number): number {
  if (rank <= 5) return 92 - (rank - 1) * 0.5;
  if (rank <= 20) return 90 - (rank - 5) * 0.4;
  if (rank <= 50) return 84 - (rank - 20) * 0.3;
  if (rank <= 100) return 75 - (rank - 50) * 0.2;
  if (rank <= 200) return 65 - (rank - 100) * 0.1;
  if (rank <= 400) return 55 - (rank - 200) * 0.07;
  return Math.max(30, 41 - (rank - 400) * 0.05);
}

/* ── Rank → Intangibles base ──
 * Leadership/IQ/work ethic reputation — rough correlation to rank
 * but with more variance since it's the least visible pillar. */
function rankToIntangibles(rank: number): number {
  if (rank <= 10) return 88 - (rank - 1) * 0.3;
  if (rank <= 50) return 85 - (rank - 10) * 0.25;
  if (rank <= 100) return 75 - (rank - 50) * 0.2;
  if (rank <= 200) return 65 - (rank - 100) * 0.12;
  if (rank <= 400) return 53 - (rank - 200) * 0.08;
  return Math.max(30, 37 - (rank - 400) * 0.05);
}

/* ── Sleeper / Overrated Overrides ──
 * Applied to Game Performance pillar only (that's where consensus disagrees). */
const SLEEPER_BOOSTS: Record<string, number> = {
  'Jadarian Price': +8,
  'Emmett Johnson': +7,
  'Jonah Coleman': +7,
  'Eli Stowers': +7,
  'Ted Hurst': +9,
  'Germie Bernard': +6,
  'Jake Golday': +7,
  'Emmanuel McNeil-Warren': +5,
  'Kaytron Allen': +8,
  'Nadame Tucker': +8,
  'Charles Demmings': +9,
  'Oscar Delp': +6,
  'Harold Perkins Jr.': +7,
  'Desmond Reid': +8,
  'Chip Trayanum': +7,
  'Demond Claiborne': +6,
  'Robert Henry Jr.': +7,
  'Barion Brown': +7,
  'Anthony Hankerson': +6,
  'Coleman Bennett': +7,
  'Jamal Haynes': +6,
  'Kaden Wetjen': +6,
  'Bryce Lance': +7,
  'Michael Trigg': +6,
  'Caleb Tiernan': +6,
  'Domonique Orange': +5,
  'Max Klare': +5,
  'Sam Roush': +6,
  'Deion Burks': +6,
  'Skyler Bell': +7,
  'Kage Casey': +6,
  "Le'Veon Moss": +5,
  'Dontay Corleone': +5,
  'Kevin Coleman Jr.': +6,
  'Domani Jackson': +5,
  'Nick Singleton': +5,
  'Kaelon Black': +5,
  "J'Mari Taylor": +5,
  'Roman Hemby': +5,
  'Jaydn Ott': +5,
  'Jam Miller': +5,
  'Noah Whittington': +5,
  'Rahsul Faison': +5,
  'Adam Randall': +5,
  'Eli Heidenreich': +5,
  'Mike Washington Jr.': +5,
  'Seth McGowan': +5,
};

const OVERRATED_DROPS: Record<string, number> = {
  'Carson Beck': -6,
  'Drew Allar': -4,
  'Kadyn Proctor': -3,
  'Keldric Faulk': -3,
  'Diego Pavia': -5,
  'Jalon Daniels': -5,
  'Cade Klubnik': -4,
  'Luke Altmyer': -3,
  'Taylen Green': -3,
  'Garrett Nussmeier': -3,
};

/* ── Multi-position bonus overrides ──
 * A small set of prospects are known two-way or flex threats. */
const MULTI_POSITION_BONUS: Record<string, number> = {
  // No two-way players in current 2026 class identified as unicorn
  // Situational flex +3 for proven specialists
};

/* ── Prime Player sub-tag assignment (101+ only) ── */
function assignPrimeSubTags(name: string, gamePerf: number, intangibles: number): PrimeSubTag[] {
  const tags: PrimeSubTag[] = [];
  if (gamePerf >= 95 && intangibles >= 92) tags.push('franchise_cornerstone');
  if (intangibles >= 95) tags.push('ultra_competitive');
  return tags;
}

/* ── Full Graded Prospect ── */
export interface GradedProspect {
  name: string;
  school: string;
  position: string;
  classYear: string;
  consensusRank: number;
  performRank: number;
  positionRank: number;
  projectedRound: number;

  // The three pillars (shown to users in breakdown)
  gamePerformance: number;
  athleticism: number;
  intangibles: number;
  multiPositionBonus: number;

  // Final grade
  grade: number;       // 0-107
  gradeLetter: string; // "A+", "Prime Player", etc.
  gradeIcon: string;   // Emoji
  gradeLabel: string;  // "ELITE", "FIRST ROUND LOCK", etc.
  gradeProjection: string;
  primeSubTags: PrimeSubTag[];
  primeSubTagIcons: string[];

  trend: 'rising' | 'falling' | 'steady';
}

/* ── Grade one prospect using the canonical 40/30/30 formula ── */
function gradeProspect(p: DraftTekProspect): GradedProspect {
  const posKey = p.position.replace(/[0-9T]/g, '').replace('WRS', 'WR');
  const positionMultiplier = POSITION_VALUE[posKey] ?? 1.0;
  const isPower = POWER_SCHOOLS.has(p.school);

  // ── Pillar 1: Game Performance (40%) ──
  let gamePerf = rankToGamePerformance(p.rank);
  gamePerf *= positionMultiplier;
  if (!isPower) gamePerf -= 2.5;
  gamePerf += variance(p.name, 4, 1);
  if (SLEEPER_BOOSTS[p.name]) gamePerf += SLEEPER_BOOSTS[p.name];
  if (OVERRATED_DROPS[p.name]) gamePerf += OVERRATED_DROPS[p.name];
  gamePerf = Math.round(Math.max(20, Math.min(99, gamePerf)) * 10) / 10;

  // ── Pillar 2: Athleticism (30%) ──
  let athleticism = rankToAthleticism(p.rank);
  if (['QB', 'P', 'PK', 'LS'].includes(posKey)) athleticism -= 3; // Pocket/specialist penalty
  if (['WR', 'CB', 'S', 'RB'].includes(posKey)) athleticism += 2;  // Speed positions
  athleticism += variance(p.name, 5, 2);
  athleticism = Math.round(Math.max(20, Math.min(99, athleticism)) * 10) / 10;

  // ── Pillar 3: Intangibles (30%) ──
  let intangibles = rankToIntangibles(p.rank);
  if (isPower) intangibles += 2; // Power conference = more battle-tested
  if (['QB', 'OC', 'ILB'].includes(posKey)) intangibles += 2; // Leadership positions
  intangibles += variance(p.name, 5, 3);
  if (OVERRATED_DROPS[p.name]) intangibles -= 2; // Character/consistency concerns
  intangibles = Math.round(Math.max(20, Math.min(99, intangibles)) * 10) / 10;

  // ── Multi-position bonus ──
  const multiBonus = MULTI_POSITION_BONUS[p.name] || 0;

  // ── Apply canonical formula ──
  const result: GradeResult = calculatePerFormGrade({
    gamePerformance: gamePerf,
    athleticism,
    intangibles,
    multiPositionBonus: multiBonus,
  });

  const band = result.band;
  const projectedRound = gradeToProjectedRound(result.finalScore);

  // ── Prime Player sub-tags ──
  const primeSubTags = result.finalScore >= 101
    ? assignPrimeSubTags(p.name, gamePerf, intangibles)
    : [];
  const primeSubTagIcons = primeSubTags.map(t => PRIME_SUB_TAGS[t].icon);

  // ── Trend detection vs consensus ──
  const expectedScore = rankToGamePerformance(p.rank) * 0.4
    + rankToAthleticism(p.rank) * 0.3
    + rankToIntangibles(p.rank) * 0.3;
  const diff = result.finalScore - expectedScore;
  const trend: 'rising' | 'falling' | 'steady' =
    diff >= 3.5 ? 'rising' : diff <= -3 ? 'falling' : 'steady';

  return {
    name: p.name,
    school: p.school,
    position: p.position,
    classYear: '2026',
    consensusRank: p.rank,
    performRank: 0, // assigned after sort
    positionRank: 0, // assigned after sort
    projectedRound,

    gamePerformance: gamePerf,
    athleticism,
    intangibles,
    multiPositionBonus: multiBonus,

    grade: result.finalScore,
    gradeLetter: band.grade,
    gradeIcon: band.icon,
    gradeLabel: band.label,
    gradeProjection: band.projection,
    primeSubTags,
    primeSubTagIcons,

    trend,
  };
}

/* ── Grade all 600 prospects + assign ranks ── */
export function gradeAllProspects(): GradedProspect[] {
  const graded = DRAFTTEK_BOARD_2026.map(gradeProspect);

  // Sort by final grade descending (Per|Form rank)
  graded.sort((a, b) => b.grade - a.grade || a.consensusRank - b.consensusRank);

  // Assign Per|Form rank + position rank
  const posCount: Record<string, number> = {};
  return graded.map((g, idx) => {
    const posKey = g.position.replace(/[0-9T]/g, '').replace('WRS', 'WR');
    posCount[posKey] = (posCount[posKey] || 0) + 1;
    return {
      ...g,
      performRank: idx + 1,
      positionRank: posCount[posKey],
    };
  });
}

/* ── Legacy label helpers for backward compatibility ── */
export function tieGradeLabel(grade: number): string {
  return getGradeBand(grade).label;
}

export function tieTierLabel(grade: number): string {
  return getGradeBand(grade).label;
}

export function gradeToFilmGrade(grade: number): string {
  const band = getGradeBand(grade);
  return band.grade;
}
