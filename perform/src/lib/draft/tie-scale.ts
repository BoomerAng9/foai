/**
 * ACHIEVEMOR Grade Scale — CANONICAL
 * =====================================
 * From perform-talent-intelligence-skill-v2-final.md
 *
 * The formula (proprietary, never shown to users):
 *   Player Grade Score = (Game Performance × 0.40)
 *                      + (Athleticism × 0.30)
 *                      + (Intangibles × 0.30)
 *
 * Max grade: 100 base, +up to 7 from multi-position bonus = 107 ceiling
 * Scale goes to 101+ for Prime Player (the alien 🛸)
 */

export interface TieGradeBand {
  minScore: number;
  maxScore: number;
  grade: string;       // e.g. "A+", "Prime Player"
  icon: string;        // Emoji icon
  projection: string;  // Draft projection
  label: string;       // Display label
}

export const TIE_SCALE: TieGradeBand[] = [
  {
    minScore: 101,
    maxScore: 107,
    grade: 'Prime Player',
    icon: '🛸',
    projection: 'Generational Talent, Franchise Player',
    label: 'PRIME',
  },
  {
    minScore: 90,
    maxScore: 100,
    grade: 'A+',
    icon: '🚀',
    projection: 'Elite Prospect, Top 5 Pick',
    label: 'ELITE',
  },
  {
    minScore: 85,
    maxScore: 89.99,
    grade: 'A',
    icon: '🔥',
    projection: 'First-Round Lock, Potential Pro Bowler',
    label: 'FIRST ROUND LOCK',
  },
  {
    minScore: 80,
    maxScore: 84.99,
    grade: 'A-',
    icon: '⭐',
    projection: 'Late First-Round, High Upside Starter',
    label: 'LATE FIRST ROUND',
  },
  {
    minScore: 75,
    maxScore: 79.99,
    grade: 'B+',
    icon: '⏳',
    projection: 'Day 2 Pick, High Ceiling, Some Concerns',
    label: 'HIGH CEILING',
  },
  {
    minScore: 70,
    maxScore: 74.99,
    grade: 'B',
    icon: '🏈',
    projection: 'Day 2 Pick, Solid Contributor but Not a Star',
    label: 'SOLID CONTRIBUTOR',
  },
  {
    minScore: 65,
    maxScore: 69.99,
    grade: 'B-',
    icon: '⚡',
    projection: 'Mid-Round Pick, Needs Development',
    label: 'DEVELOPMENTAL',
  },
  {
    minScore: 60,
    maxScore: 64.99,
    grade: 'C+',
    icon: '🔧',
    projection: 'Depth Player, Role Player at Best',
    label: 'DEPTH',
  },
  {
    minScore: 0,
    maxScore: 59.99,
    grade: 'C or Below',
    icon: '❌',
    projection: 'Practice Squad / Undrafted',
    label: 'UDFA',
  },
];

/* ── Prime Player Sub-Tags (101+ only) ── */
export type PrimeSubTag =
  | 'franchise_cornerstone'
  | 'talent_character_concerns'
  | 'nil_ready'
  | 'quiet_but_elite'
  | 'ultra_competitive';

export const PRIME_SUB_TAGS: Record<PrimeSubTag, { icon: string; label: string; meaning: string }> = {
  franchise_cornerstone: {
    icon: '🏗️',
    label: 'Franchise Cornerstone',
    meaning: 'Cornerstone of a franchise build — you build the team around this player',
  },
  talent_character_concerns: {
    icon: '⚠️',
    label: 'Talent w/ Character Concerns',
    meaning: 'Elite ceiling, but off-field flags reduce certainty',
  },
  nil_ready: {
    icon: '🎤',
    label: 'NIL Ready',
    meaning: 'Brand value and market readiness exceed pure football projection',
  },
  quiet_but_elite: {
    icon: '🔒',
    label: 'Quiet but Elite',
    meaning: 'Under-the-radar generational talent — the hidden gem',
  },
  ultra_competitive: {
    icon: '🤯',
    label: 'Ultra-Competitive',
    meaning: 'Elite motor and drive that elevates everyone around them',
  },
};

/* ── Look up the grade band for a final score ── */
export function getGradeBand(score: number): TieGradeBand {
  for (const band of TIE_SCALE) {
    if (score >= band.minScore && score <= band.maxScore) return band;
  }
  return TIE_SCALE[TIE_SCALE.length - 1]; // Below 60 fallback
}

/* ── Format a grade for display: "A+ 🚀" or "Prime Player 🛸 🏗️ 🤯" ── */
export function formatGradeDisplay(score: number, subTags?: PrimeSubTag[]): string {
  const band = getGradeBand(score);
  let display = `${band.grade} ${band.icon}`;

  if (score >= 101 && subTags && subTags.length > 0) {
    const tagIcons = subTags.map(t => PRIME_SUB_TAGS[t].icon).join(' ');
    display += ` ${tagIcons}`;
  }

  return display;
}

/* ── Core Per|Form grade formula (proprietary weights) ── */
export interface GradeInputs {
  gamePerformance: number;  // 0-100
  athleticism: number;      // 0-100
  intangibles: number;      // 0-100
  multiPositionBonus?: number; // 0, 3, 5, or 7
}

export interface GradeResult {
  finalScore: number;       // 0-107
  band: TieGradeBand;
  display: string;
  breakdown: {
    gamePerformance: number;
    athleticism: number;
    intangibles: number;
    multiPositionBonus: number;
  };
}

export function calculatePerFormGrade(inputs: GradeInputs): GradeResult {
  // PROPRIETARY WEIGHTS — never exposed to users
  const GAME_PERFORMANCE_WEIGHT = 0.40;
  const ATHLETICISM_WEIGHT = 0.30;
  const INTANGIBLES_WEIGHT = 0.30;

  const base =
    (inputs.gamePerformance * GAME_PERFORMANCE_WEIGHT) +
    (inputs.athleticism * ATHLETICISM_WEIGHT) +
    (inputs.intangibles * INTANGIBLES_WEIGHT);

  const bonus = inputs.multiPositionBonus || 0;
  const finalScore = Math.round((base + bonus) * 10) / 10;

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

/* ── Multi-Position Bonus helper ── */
export function multiPositionBonus(
  flex: 'none' | 'situational' | 'two_way' | 'unicorn',
): number {
  switch (flex) {
    case 'situational': return 3;
    case 'two_way': return 5;
    case 'unicorn': return 7;
    default: return 0;
  }
}
