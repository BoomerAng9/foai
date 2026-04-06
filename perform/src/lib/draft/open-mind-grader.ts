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
import {
  forecastLongevity,
  type InjuryType,
  type CurrentStatus,
  type LongevityForecast,
} from './longevity-model';

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

/* ── Medical flag registry ──
 * Durability is a pillar of Intangibles. A known medical history
 * must dock Intangibles — BUT only the *risk-forward* component.
 * If a player had an injury and has since verifiably recovered
 * (current status 'clean'), the hit is reduced because the risk
 * is long-term/actuarial, not near-term performance.
 *
 * Severity scale (base values — modified by currentStatus below):
 *   'minor'    — soft tissue, recovered                       (int -2)
 *   'moderate' — significant surgery, full recovery expected  (int -6,  ath -3)
 *   'major'    — structural injury w/ lingering concern       (int -10, ath -5)
 *   'severe'   — multiple injuries or career-threatening      (int -14, ath -8)
 *
 * Current status modifies the actual-vs-clean grade delta:
 *   'clean'           — verified recovery, hit reduced by 50%
 *   'recovering'      — mid-rehab, full hit applied
 *   'active_injury'   — currently limited, full hit + athleticism cap
 */
export interface MedicalFlag {
  severity: 'minor' | 'moderate' | 'major' | 'severe';
  currentStatus: CurrentStatus;
  injuryTypes: InjuryType[];
  year: number;                   // Year of the original incident
  notes: string;
  historicalComps?: string[];     // e.g. ["Todd Gurley", "Gale Sayers"]
}

export const MEDICAL_FLAGS: Record<string, MedicalFlag> = {
  'Jeremiyah Love': {
    severity: 'major',
    currentStatus: 'clean',
    injuryTypes: ['knee_meniscus'],
    year: 2025,
    notes:
      'Knee/meniscus concern from 2025 Notre Dame playoff run. Played full 2025 season, ran a 4.36 forty at his pro day WITHOUT a brace — no current limitation. Historical risk profile only: meniscus/cartilage damage on a RB is the canonical Todd Gurley pattern (degenerative knee ended his prime by 25), with Gale Sayers as the worst-case cautionary tale. Teams will model this as actuarial risk, not near-term performance.',
    historicalComps: ['Todd Gurley', 'Adrian Peterson', 'Gale Sayers'],
  },
  'Harold Perkins Jr.': {
    severity: 'major',
    currentStatus: 'clean',
    injuryTypes: ['knee_acl'],
    year: 2024,
    notes: 'ACL tear in 2024. Full 2025 season to prove recovery, durability flag remains.',
    historicalComps: ['Jaylon Smith', 'Patrick Willis'],
  },
  'Carson Beck': {
    severity: 'moderate',
    currentStatus: 'clean',
    injuryTypes: ['elbow_ucl'],
    year: 2024,
    notes: 'Elbow/UCL injury 2024 SEC Championship, transfer year 2025. Throwing arm concern for a QB.',
    historicalComps: ['Drew Brees', 'Jameis Winston'],
  },
  'Caleb Downs': {
    severity: 'minor',
    currentStatus: 'clean',
    injuryTypes: ['clean'],
    year: 2025,
    notes: 'Clean record, minor maintenance items only — listed for tracking.',
  },
  'Drew Allar': {
    severity: 'minor',
    currentStatus: 'clean',
    injuryTypes: ['ankle'],
    year: 2024,
    notes: 'Ankle tweaks across 2024 season, no structural issues.',
  },
  'Nicholas Singleton': {
    severity: 'minor',
    currentStatus: 'clean',
    injuryTypes: ['clean'],
    year: 2025,
    notes: 'Hamstring maintenance, monitored.',
  },
  'Kaytron Allen': {
    severity: 'minor',
    currentStatus: 'clean',
    injuryTypes: ['clean'],
    year: 2025,
    notes: 'Routine RB wear — monitor only.',
  },
  'Rueben Bain Jr.': {
    severity: 'moderate',
    currentStatus: 'clean',
    injuryTypes: ['shoulder', 'ankle'],
    year: 2024,
    notes: 'Shoulder/ankle issues across 2024, missed games. Durability question at EDGE.',
    historicalComps: ['Jadeveon Clowney', 'Myles Garrett'],
  },
};

/* ── Medical impact calculator ──
 * Position-weighted: mobility positions (RB/WR/CB/S) take the full hit,
 * pocket positions (QB/OL/K) take a reduced mobility penalty.
 */
function medicalImpact(name: string, posKey: string): { int: number; ath: number } {
  const flag = MEDICAL_FLAGS[name];
  if (!flag) return { int: 0, ath: 0 };

  const baseImpact = {
    minor:    { int: -2,  ath: 0 },
    moderate: { int: -6,  ath: -3 },
    major:    { int: -10, ath: -5 },
    severe:   { int: -14, ath: -8 },
  }[flag.severity];

  // Current status modifier — a verified recovery (clean) is mostly
  // actuarial/long-term risk, NOT a near-term performance dent.
  // The grade should reflect what the player can do RIGHT NOW, with
  // the long-term risk surfaced separately through longevity forecast.
  const statusMultiplier =
    flag.currentStatus === 'active_injury' ? 1.2
    : flag.currentStatus === 'recovering' ? 1.0
    : 0.5; // 'clean' — recovered, risk is long-term

  const scaledInt = baseImpact.int * statusMultiplier;
  const scaledAth = baseImpact.ath * statusMultiplier;

  // Position-weighted mobility impact
  const KNEE_CRITICAL = ['RB', 'CB', 'WR'];
  const MOBILITY_POSITIONS = ['S', 'EDGE', 'OLB'];
  const LOW_MOBILITY_POSITIONS = ['QB', 'OT', 'OG', 'OC', 'PK', 'P'];

  const hasKneeInjury = flag.injuryTypes.some(t => t.startsWith('knee'));

  if (KNEE_CRITICAL.includes(posKey) && hasKneeInjury) {
    return {
      int: Math.round(scaledInt - 2),
      ath: Math.round(scaledAth * 1.8),
    };
  }
  if (MOBILITY_POSITIONS.includes(posKey)) {
    return { int: Math.round(scaledInt), ath: Math.round(scaledAth * 1.4) };
  }
  if (LOW_MOBILITY_POSITIONS.includes(posKey)) {
    return { int: Math.round(scaledInt), ath: Math.round(scaledAth * 0.5) };
  }
  return { int: Math.round(scaledInt), ath: Math.round(scaledAth) };
}

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

  // The three pillars (shown to users — these are the ACTUAL values with medical impact)
  gamePerformance: number;
  athleticism: number;
  intangibles: number;
  multiPositionBonus: number;

  // Clean pillars — hypothetical "if medical history did not exist"
  gamePerformanceClean: number;
  athleticismClean: number;
  intangiblesClean: number;

  // ── DUAL GRADE ──
  // Teams draft on both grades: the clean grade tells them the ceiling
  // of the talent, the actual grade tells them what they're actually
  // buying today.
  grade: number;           // ACTUAL — what the player is right now
  gradeClean: number;      // CLEAN — what the player would be with no medical history
  medicalDelta: number;    // gradeClean - grade (always >= 0)

  gradeLetter: string;
  gradeIcon: string;
  gradeLabel: string;
  gradeProjection: string;
  gradeLetterClean: string;  // Letter for the clean grade
  gradeIconClean: string;

  primeSubTags: PrimeSubTag[];
  primeSubTagIcons: string[];

  trend: 'rising' | 'falling' | 'steady';

  // Medical/durability flag (undefined if clean)
  medicalFlag?: MedicalFlag;

  // Longevity forecast — populated for all prospects, uses comps
  longevity: LongevityForecast;
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

  // ── Medical impact (durability feeds Intangibles, mobility feeds Athleticism) ──
  const medical = medicalImpact(p.name, posKey);

  // ── Pillar 2: Athleticism (30%) — compute CLEAN first, then ACTUAL ──
  let athleticismClean = rankToAthleticism(p.rank);
  if (['QB', 'P', 'PK', 'LS'].includes(posKey)) athleticismClean -= 3;
  if (['WR', 'CB', 'S', 'RB'].includes(posKey)) athleticismClean += 2;
  athleticismClean += variance(p.name, 5, 2);
  athleticismClean = Math.round(Math.max(20, Math.min(99, athleticismClean)) * 10) / 10;
  const athleticism = Math.round(
    Math.max(20, Math.min(99, athleticismClean + medical.ath)) * 10,
  ) / 10;

  // ── Pillar 3: Intangibles (30%) — clean then actual ──
  let intangiblesClean = rankToIntangibles(p.rank);
  if (isPower) intangiblesClean += 2;
  if (['QB', 'OC', 'ILB'].includes(posKey)) intangiblesClean += 2;
  intangiblesClean += variance(p.name, 5, 3);
  if (OVERRATED_DROPS[p.name]) intangiblesClean -= 2;
  intangiblesClean = Math.round(Math.max(20, Math.min(99, intangiblesClean)) * 10) / 10;
  const intangibles = Math.round(
    Math.max(20, Math.min(99, intangiblesClean + medical.int)) * 10,
  ) / 10;

  // ── Multi-position bonus ──
  const multiBonus = MULTI_POSITION_BONUS[p.name] || 0;

  // ── Apply canonical formula — BOTH clean and actual ──
  const resultClean: GradeResult = calculatePerFormGrade({
    gamePerformance: gamePerf,
    athleticism: athleticismClean,
    intangibles: intangiblesClean,
    multiPositionBonus: multiBonus,
  });
  const result: GradeResult = calculatePerFormGrade({
    gamePerformance: gamePerf,
    athleticism,
    intangibles,
    multiPositionBonus: multiBonus,
  });

  const band = result.band;
  const bandClean = resultClean.band;
  const projectedRound = gradeToProjectedRound(result.finalScore);

  // ── Prime Player sub-tags (based on actual grade) ──
  const primeSubTags = result.finalScore >= 101
    ? assignPrimeSubTags(p.name, gamePerf, intangibles)
    : [];
  const primeSubTagIcons = primeSubTags.map(t => PRIME_SUB_TAGS[t].icon);

  // ── Trend vs consensus ──
  const expectedScore = rankToGamePerformance(p.rank) * 0.4
    + rankToAthleticism(p.rank) * 0.3
    + rankToIntangibles(p.rank) * 0.3;
  const diff = result.finalScore - expectedScore;
  const trend: 'rising' | 'falling' | 'steady' =
    diff >= 3.5 ? 'rising' : diff <= -3 ? 'falling' : 'steady';

  // ── Longevity forecast — always computed ──
  const flag = MEDICAL_FLAGS[p.name];
  const injuries: InjuryType[] = flag?.injuryTypes ?? ['clean'];
  const currentStatus: CurrentStatus = flag?.currentStatus ?? 'clean';
  const longevity = forecastLongevity({
    position: posKey,
    injuries,
    currentStatus,
    baseAthleticism: athleticismClean,
    baseIntangibles: intangiblesClean,
  });

  return {
    name: p.name,
    school: p.school,
    position: p.position,
    classYear: '2026',
    consensusRank: p.rank,
    performRank: 0,
    positionRank: 0,
    projectedRound,

    gamePerformance: gamePerf,
    athleticism,
    intangibles,
    multiPositionBonus: multiBonus,

    gamePerformanceClean: gamePerf,
    athleticismClean,
    intangiblesClean,

    grade: result.finalScore,
    gradeClean: resultClean.finalScore,
    medicalDelta: Math.round((resultClean.finalScore - result.finalScore) * 10) / 10,

    gradeLetter: band.grade,
    gradeIcon: band.icon,
    gradeLabel: band.label,
    gradeProjection: band.projection,
    gradeLetterClean: bandClean.grade,
    gradeIconClean: bandClean.icon,

    primeSubTags,
    primeSubTagIcons,

    trend,

    medicalFlag: flag,
    longevity,
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
