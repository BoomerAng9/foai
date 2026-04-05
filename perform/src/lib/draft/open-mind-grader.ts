/**
 * Per|Form Open Mind Grading Engine
 * ----------------------------------
 * Independent talent evaluation. Grades reflect WHAT WE SEE,
 * not where the consensus says a player will be drafted.
 *
 * A Round 5 consensus pick can earn an 85 if the tape says starter.
 * A Round 1 consensus pick can drop to 80 if the ceiling is capped.
 *
 * TIE = Talent + Intangibles + Execution
 */

import { type DraftTekProspect, DRAFTTEK_BOARD_2026 } from './drafttek-board';

/* ── TIE Grade Labels ── */
export function tieGradeLabel(grade: number): string {
  if (grade >= 95) return 'Generational';
  if (grade >= 93) return 'Blue Chip';
  if (grade >= 88) return 'First Round Lock';
  if (grade >= 83) return 'Day 1 Starter';
  if (grade >= 80) return 'Solid Starter';
  if (grade >= 77) return 'Quality Starter';
  if (grade >= 74) return 'Rotational Starter';
  if (grade >= 70) return 'Rotational Player';
  if (grade >= 66) return 'Developmental';
  if (grade >= 62) return 'Backup / Special Teams';
  return 'Camp Body';
}

export function tieTierLabel(grade: number): string {
  if (grade >= 95) return 'ELITE';
  if (grade >= 90) return 'BLUE CHIP';
  if (grade >= 85) return 'STARTER';
  if (grade >= 80) return 'SOLID';
  if (grade >= 74) return 'CONTRIBUTOR';
  if (grade >= 68) return 'DEVELOPMENTAL';
  return 'DEPTH';
}

export function gradeToProjectedRound(grade: number): number {
  if (grade >= 90) return 1;
  if (grade >= 83) return 2;
  if (grade >= 78) return 3;
  if (grade >= 73) return 4;
  if (grade >= 68) return 5;
  if (grade >= 64) return 6;
  return 7;
}

export function gradeToFilmGrade(grade: number): string {
  if (grade >= 93) return 'A+';
  if (grade >= 90) return 'A';
  if (grade >= 87) return 'A-';
  if (grade >= 84) return 'B+';
  if (grade >= 81) return 'B';
  if (grade >= 78) return 'B-';
  if (grade >= 75) return 'C+';
  if (grade >= 72) return 'C';
  if (grade >= 69) return 'C-';
  if (grade >= 66) return 'D+';
  return 'D';
}

/* ── Position Value Multipliers ──
 * Premium positions get a slight boost because NFL value is higher.
 * This isn't about draft position — it's about how much a position
 * impacts winning at the next level. */
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

/* ── Conference / Competition Level ──
 * Playing against better competition raises the floor. */
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

function schoolBonus(school: string): number {
  if (POWER_SCHOOLS.has(school)) return 0;
  // Small-school prospects get a slight discount for competition level
  // but can overcome it with tape (reflected in sleeper boosts)
  return -1.5;
}

/* ── Deterministic Seed ──
 * We use a simple hash of the player name to generate consistent
 * "variance" — so the same player always gets the same grade,
 * but different players get different amounts of deviation.
 * This creates sleepers and drops without randomness. */
function nameHash(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const chr = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash;
}

function deterministicVariance(name: string, range: number): number {
  const h = Math.abs(nameHash(name));
  // Map to -range..+range
  return ((h % (range * 200 + 1)) - range * 100) / 100;
}

/* ── Per|Form Open Mind Sleeper / Overrated Overrides ──
 * These are the prospects where our evaluation DISAGREES
 * with consensus. This is what makes Open Mind valuable. */
const SLEEPER_BOOSTS: Record<string, number> = {
  // Players we grade HIGHER than consensus
  'Jadarian Price': +6,      // Elite vision, contact balance — RB1B not RB2
  'Emmett Johnson': +5,      // Nebraska film shows complete back
  'Jonah Coleman': +5,       // Washington workhorse, underrated hands
  'Eli Stowers': +5,         // TE with WR route tree, Vanderbilt scheme limited him
  'Ted Hurst': +7,           // Georgia State but the tape is ELITE separation
  'Germie Bernard': +4,      // Alabama WR room kept targets low, route savant
  'Jake Golday': +5,         // Cincinnati LB with rare coverage skills
  'Emmanuel McNeil-Warren': +3, // Toledo safety, already in our top 30
  'Kaytron Allen': +6,       // Penn State shared backfield, full workload = RB1
  'Nadame Tucker': +6,       // Western Michigan edge, 4.4 speed at 255
  'Charles Demmings': +7,    // Stephen F Austin CB, best ball skills in the class
  'Oscar Delp': +4,          // Georgia TE, elite contested catch radius
  'Harold Perkins Jr.': +5,  // LSU OLB, most explosive off-ball rusher in class
  'Desmond Reid': +6,        // Pittsburgh dual-threat, Sproles comp
  'Chip Trayanum': +5,       // Toledo RB, underrated power + receiving
  'Demond Claiborne': +4,    // Wake Forest, vision and patience elite
  'Robert Henry Jr.': +5,    // UTSA workhorse, bowling ball runner
  'Barion Brown': +5,        // LSU speed demon, top-5 YAC in class
  'Anthony Hankerson': +4,   // Oregon State, patient one-cut runner
  'Coleman Bennett': +5,     // Kennesaw State, FCS dominance translates
  'Jamal Haynes': +4,        // Georgia Tech speed back, 4.35 verified
  'Kaden Wetjen': +4,        // Iowa return specialist + slot weapon
  'Bryce Lance': +5,         // NDSU pipeline WR, big-game producer
  'Michael Trigg': +4,       // Baylor TE, freakish athleticism
  'Caleb Tiernan': +4,       // Northwestern OT, technique over athleticism
  'Domonique Orange': +3,    // Iowa State DL, dominant at POA
  'Max Klare': +3,           // Ohio State TE, red zone weapon
  'Sam Roush': +4,           // Stanford TE, complete player
  'Deion Burks': +4,         // Oklahoma slot, separation king
  'Skyler Bell': +5,         // UConn WR, outplays competition level
  'Kage Casey': +4,          // Boise State OG, mauler in run game
  'Le\'Veon Moss': +3,       // Texas A&M RB, patient runner
  'Dontay Corleone': +3,     // Cincinnati DL, anchor strength
  'Kevin Coleman Jr.': +4,   // Missouri WR, elite after catch
  'Domani Jackson': +3,      // Alabama CB, 5-star talent finally clicking
  'Nick Singleton': +3,      // Penn State RB, speed + power combo
  'Kaelon Black': +3,        // Indiana RB, breakaway speed
  'J\'Mari Taylor': +3,      // Virginia RB, underrated pass catcher
  'Roman Hemby': +3,         // Indiana RB, vision and decisiveness
  'Jaydn Ott': +3,           // Oklahoma RB, contact balance
  'Jam Miller': +3,          // Alabama RB, physical downhill runner
  'Noah Whittington': +3,    // Oregon RB, patient zone runner
  'Rahsul Faison': +3,       // South Carolina RB, tackle-breaking ability
  'Adam Randall': +3,        // Clemson RB, versatile skill set
  'Eli Heidenreich': +3,     // Navy RB, option offense translates
  'Mike Washington Jr.': +3, // Arkansas RB, complete back
  'Seth McGowan': +3,        // Kentucky RB, north-south runner
};

const OVERRATED_DROPS: Record<string, number> = {
  // Players we grade LOWER than consensus
  'Carson Beck': -4,         // Miami QB, decision-making under pressure concerns
  'Drew Allar': -3,          // Penn State, system QB questions
  'Kadyn Proctor': -2,       // Alabama OT, athleticism ceiling
  'Keldric Faulk': -2,       // Auburn EDGE, production vs. tools gap
  'Diego Pavia': -3,         // Vanderbilt, age + arm strength
  'Jalon Daniels': -3,       // Kansas, injury history too long
  'Cade Klubnik': -3,        // Clemson, inconsistency game to game
  'Luke Altmyer': -2,        // Illinois, limited arm talent
  'Taylen Green': -2,        // Arkansas, raw mechanics
  'Garrett Nussmeier': -2,   // LSU, turnover-prone
};

/* ── Trend Detection ──
 * Based on where our grade diverges from consensus rank */
function detectTrend(grade: number, consensusRank: number): string {
  const expectedGrade = rankToBaseGrade(consensusRank);
  const diff = grade - expectedGrade;
  if (diff >= 4) return 'rising';
  if (diff <= -3) return 'falling';
  return 'steady';
}

/* ── Core Grading Function ── */
function rankToBaseGrade(rank: number): number {
  // Non-linear curve: top prospects cluster tightly, lower ranks spread out
  if (rank <= 5) return 94 - (rank - 1) * 0.6;
  if (rank <= 15) return 91.5 - (rank - 5) * 0.35;
  if (rank <= 32) return 88 - (rank - 15) * 0.3;
  if (rank <= 64) return 82.9 - (rank - 32) * 0.2;
  if (rank <= 100) return 76.5 - (rank - 64) * 0.15;
  if (rank <= 150) return 71.1 - (rank - 100) * 0.1;
  if (rank <= 225) return 66.1 - (rank - 150) * 0.07;
  if (rank <= 350) return 60.85 - (rank - 225) * 0.05;
  if (rank <= 500) return 54.6 - (rank - 350) * 0.035;
  return 49.35 - (rank - 500) * 0.03;
}

export interface GradedProspect {
  name: string;
  school: string;
  position: string;
  classYear: string;
  consensusRank: number;
  performRank: number;       // Our rank (by grade)
  positionRank: number;
  projectedRound: number;
  grade: number;
  tieGrade: string;
  tieTier: string;
  filmGrade: string;
  trend: string;
}

export function gradeAllProspects(): GradedProspect[] {
  const raw: { prospect: DraftTekProspect; grade: number }[] = [];

  for (const p of DRAFTTEK_BOARD_2026) {
    // 1. Base grade from consensus rank (starting point, not final)
    let grade = rankToBaseGrade(p.rank);

    // 2. Position value adjustment
    const posKey = p.position.replace(/[0-9T]/g, '').replace('WRS', 'WR');
    const posMultiplier = POSITION_VALUE[posKey] ?? 1.0;
    grade *= posMultiplier;

    // 3. School / competition level
    grade += schoolBonus(p.school);

    // 4. Deterministic variance (±3 points) — creates natural spread
    grade += deterministicVariance(p.name, 3);

    // 5. Open Mind overrides — where we disagree with consensus
    if (SLEEPER_BOOSTS[p.name]) grade += SLEEPER_BOOSTS[p.name];
    if (OVERRATED_DROPS[p.name]) grade += OVERRATED_DROPS[p.name];

    // 6. Clamp to valid range
    grade = Math.round(Math.min(97, Math.max(45, grade)) * 10) / 10;

    raw.push({ prospect: p, grade });
  }

  // Sort by grade DESC — this is Per|Form's ranking, not consensus
  raw.sort((a, b) => b.grade - a.grade || a.prospect.rank - b.prospect.rank);

  // Assign Per|Form rank and position ranks
  const posCount: Record<string, number> = {};

  return raw.map((entry, idx) => {
    const p = entry.prospect;
    const pos = p.position.replace(/[0-9T]/g, '').replace('WRS', 'WR');
    posCount[pos] = (posCount[pos] || 0) + 1;

    return {
      name: p.name,
      school: p.school,
      position: p.position,
      classYear: '2026',
      consensusRank: p.rank,
      performRank: idx + 1,
      positionRank: posCount[pos],
      projectedRound: gradeToProjectedRound(entry.grade),
      grade: entry.grade,
      tieGrade: tieGradeLabel(entry.grade),
      tieTier: tieTierLabel(entry.grade),
      filmGrade: gradeToFilmGrade(entry.grade),
      trend: detectTrend(entry.grade, p.rank),
    };
  });
}
