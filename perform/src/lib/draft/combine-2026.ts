/**
 * 2026 NFL Combine + Pro Day Results — Sqwaadrun Research (Lil_Dash_Hawk)
 * ========================================================================
 * NFL-verified testing data for top prospects. Feed into TIE Athleticism pillar.
 */

export interface CombineData {
  name: string;
  position: string;
  school: string;
  height?: string;
  weight?: number;
  fortyYard?: number;
  verticalJump?: number;
  broadJump?: string;
  benchPress?: number;
  threeCone?: number;
  shuttle?: number;
  armLength?: string;
  wingspan?: string;
  handSize?: string;
  source: 'combine' | 'pro_day' | 'both';
  notes?: string;
}

export const COMBINE_2026: CombineData[] = [
  {
    name: 'Arvell Reese', position: 'EDGE/LB', school: 'Ohio State',
    height: '6-4', weight: 241, fortyYard: 4.46, verticalJump: 43.5, broadJump: "11'2\"",
    threeCone: 7.09, armLength: '32.5"', wingspan: '79.5"', handSize: '9.5"',
    source: 'combine',
    notes: 'Matched Styles at 4.46/43.5/11\'2" — Ohio State LB/EDGE duo dominated Day 1.',
  },
  {
    name: 'Jeremiyah Love', position: 'RB', school: 'Notre Dame',
    height: '6-0', weight: 214, fortyYard: 4.36,
    armLength: '32.0"', handSize: '9 1/8"',
    source: 'combine',
    notes: '4.36 40 confirms elite speed. DNP on other drills.',
  },
  {
    name: 'Fernando Mendoza', position: 'QB', school: 'Indiana',
    height: '6-4 3/4', weight: 236,
    armLength: '31 7/8"', wingspan: '76 3/4"', handSize: '9.5"',
    source: 'both',
    notes: 'Did not throw at Combine. Pro Day: 53/56 completions. 10+ Raiders personnel attended. Weighed 236 (up 11 from Combine).',
  },
  {
    name: 'Sonny Styles', position: 'LB', school: 'Ohio State',
    height: '6-5', weight: 244, fortyYard: 4.46, verticalJump: 43.5, broadJump: "11'2\"",
    armLength: '32 7/8"', wingspan: '80 7/8"', handSize: '10.0"',
    source: 'combine',
    notes: 'Highest vertical (43.5") by any player 6-4+/240+ at Combine since 2003. Historic.',
  },
  {
    name: 'Caleb Downs', position: 'S', school: 'Ohio State',
    height: '6-0', weight: 206, fortyYard: 4.52,  verticalJump: 35.5,
    armLength: '30 1/4"', wingspan: '73 1/4"', handSize: '9.5"',
    source: 'combine',
    notes: 'Unofficial 4.52/35.5 vert. Skipped official workouts. Addressed knee at OSU Pro Day with position drills.',
  },
  {
    name: 'Mansoor Delane', position: 'CB', school: 'LSU',
    height: '6-0', weight: 187, fortyYard: 4.37,
    armLength: '30"', handSize: '8 7/8"',
    source: 'pro_day',
    notes: 'Skipped Combine workouts. Blazed 4.35-4.38 at LSU Pro Day. Consensus R1 CB.',
  },
  {
    name: 'David Bailey', position: 'EDGE', school: 'Texas Tech',
    height: '6-4', weight: 251, fortyYard: 4.50, verticalJump: 35.0, broadJump: "10'9\"",
    armLength: '33 3/4"', handSize: '10 1/4"',
    source: 'combine',
    notes: 'Fastest 40 among all EDGE/DL at Combine. Projected as high as No. 2 overall.',
  },
  {
    name: 'Spencer Fano', position: 'OT', school: 'Utah',
    height: '6-5 1/2', weight: 311, fortyYard: 4.91, verticalJump: 32.0, broadJump: "9'3\"",
    benchPress: 30, threeCone: 7.34, shuttle: 4.67,
    armLength: '32 1/8"',
    source: 'both',
    notes: 'Bench press (30 reps) at Pro Day. Full testing at both events.',
  },
  {
    name: 'Rueben Bain Jr.', position: 'EDGE', school: 'Miami',
    height: '6-2 2/8', weight: 263,
    armLength: '30 7/8"', wingspan: '77.5"', handSize: '9 1/8"',
    source: 'combine',
    notes: 'DID NOT work out. 30 7/8" arms = 1st percentile for EDGE/DL since 2010. Biggest pre-draft red flag for potential top-5 pick.',
  },
  {
    name: 'Carnell Tate', position: 'WR', school: 'Ohio State',
    height: '6-3', weight: 192, fortyYard: 4.53,
    armLength: '31 3/4"', handSize: '10 1/4"',
    source: 'combine',
    notes: '4.53 disputed — at least 2 NFL teams had ~4.45. Declined to re-run at OSU Pro Day, called 40 "overvalued."',
  },
  {
    name: 'Jordyn Tyson', position: 'WR', school: 'Arizona State',
    source: 'pro_day',
    notes: 'DNP at Combine AND ASU Pro Day (hamstring since Oct 2025). Private workout April 17 — 6 days before Draft.',
  },
  {
    name: 'Jermod McCoy', position: 'CB', school: 'Tennessee',
    fortyYard: 4.38, verticalJump: 38.0, broadJump: "10'7\"",
    source: 'pro_day',
    notes: 'Crushed UT Pro Day 3/31 after ACL recovery. Missed Combine + Senior Bowl. Solidified R1 status.',
  },
  {
    name: 'Kenyon Sadiq', position: 'TE', school: 'Oregon',
    height: '6-3 1/8', weight: 241, fortyYard: 4.39, verticalJump: 43.5, broadJump: "11'1\"",
    armLength: '31.5"', wingspan: '78 1/4"', handSize: '10.0"',
    source: 'combine',
    notes: 'Fastest TE 40 since at least 2003 (beat Vernon Davis 4.40 from 2006). Set TE vertical jump record.',
  },
];

/** Quick lookup by name */
export function getCombineData(name: string): CombineData | undefined {
  return COMBINE_2026.find(p => p.name.toLowerCase() === name.toLowerCase());
}
