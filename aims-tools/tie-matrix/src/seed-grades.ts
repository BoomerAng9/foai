/**
 * Seed — Grade Bands
 * ===================
 * Numeric → tier mapping. This is the ONLY place grade cutoffs live.
 * Vertical-neutral by design. Labels/context strings live in seed-verticals.ts.
 *
 * The 101+ ceiling comes from the SPORTS multi-position bonus (up to +7).
 * Any vertical can score >100 if it adds its own bonuses.
 */

import type { GradeBand } from './types.js';

export const SEED_GRADES: GradeBand[] = [
  { tier: 'PRIME',    grade: 'PRIME', badgeColor: '#D4A853', icon: '🛸', min: 101, max: 999 },
  { tier: 'A_PLUS',   grade: 'A+',    badgeColor: '#D4A853', icon: '🚀', min: 90,  max: 100 },
  { tier: 'A',        grade: 'A',     badgeColor: '#60A5FA', icon: '🔥', min: 85,  max: 89  },
  { tier: 'A_MINUS',  grade: 'A-',    badgeColor: '#60A5FA', icon: '⭐', min: 80,  max: 84  },
  { tier: 'B_PLUS',   grade: 'B+',    badgeColor: '#34D399', icon: '⏳', min: 75,  max: 79  },
  { tier: 'B',        grade: 'B',     badgeColor: '#34D399', icon: '🏈', min: 70,  max: 74  },
  { tier: 'B_MINUS',  grade: 'B-',    badgeColor: '#FBBF24', icon: '⚡', min: 65,  max: 69  },
  { tier: 'C_PLUS',   grade: 'C+',    badgeColor: '#A1A1AA', icon: '🔧', min: 60,  max: 64  },
  { tier: 'C',        grade: 'C',     badgeColor: '#71717A', icon: '❌', min: 0,   max: 59  },
];
