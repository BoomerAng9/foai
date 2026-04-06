/**
 * 2026 NFL Draft Rules & Configuration
 * Source: DELTA v1.1 research document
 *
 * - 257 total picks (224 standard + 33 compensatory)
 * - NEW: 8-minute Round 1 clock (down from 10)
 * - Draft: April 23-25, Pittsburgh
 */

export const DRAFT_2026 = {
  year: 2026,
  city: 'Pittsburgh',
  venue: 'Acrisure Stadium',
  dates: {
    round1: '2026-04-23T20:00:00-04:00', // 8 PM ET
    rounds2_3: '2026-04-24T19:00:00-04:00', // 7 PM ET
    rounds4_7: '2026-04-25T12:00:00-04:00', // Noon ET
  },
  totalPicks: 258,
  standardPicks: 224,
  compensatoryPicks: 34, // 33 traditional + 1 Resolution JC-2A (DEN)
  rounds: 7,
  pickTimers: {
    1: 8,  // NEW: reduced from 10 minutes (first change since 2008)
    2: 7,
    3: 5,
    4: 5,
    5: 5,
    6: 5,
    7: 4,
  } as Record<number, number>,
} as const;

/** Teams without first-round picks (traded away) */
export const NO_FIRST_ROUND: string[] = ['ATL', 'GB', 'IND', 'DEN', 'JAX'];

/** Teams with most total picks */
export const PICK_LEADERS: Record<string, number> = {
  BAL: 11,
  SF: 11,
  PHI: 10,
  PIT: 10,
};

/** Compensatory pick distribution (end of rounds 3-7) */
export const COMPENSATORY_PICKS_2026: {
  round: number;
  team: string;
  type: 'compensatory' | 'special';
}[] = [
  // Round 3 comp picks
  { round: 3, team: 'BAL', type: 'compensatory' },
  { round: 3, team: 'PHI', type: 'compensatory' },
  { round: 3, team: 'PIT', type: 'compensatory' },
  { round: 3, team: 'CIN', type: 'compensatory' },
  { round: 3, team: 'NYJ', type: 'compensatory' },
  // Round 4 comp picks
  { round: 4, team: 'BAL', type: 'compensatory' },
  { round: 4, team: 'PHI', type: 'compensatory' },
  { round: 4, team: 'PIT', type: 'compensatory' },
  { round: 4, team: 'GB', type: 'compensatory' },
  { round: 4, team: 'LAR', type: 'compensatory' },
  { round: 4, team: 'DEN', type: 'special' }, // Resolution JC-2A minority hiring
  // Round 5 comp picks
  { round: 5, team: 'BAL', type: 'compensatory' },
  { round: 5, team: 'PHI', type: 'compensatory' },
  { round: 5, team: 'PIT', type: 'compensatory' },
  { round: 5, team: 'CIN', type: 'compensatory' },
  { round: 5, team: 'DAL', type: 'compensatory' },
  { round: 5, team: 'SF', type: 'compensatory' },
  // Round 6 comp picks
  { round: 6, team: 'BAL', type: 'compensatory' },
  { round: 6, team: 'MIN', type: 'compensatory' },
  { round: 6, team: 'TB', type: 'compensatory' },
  { round: 6, team: 'LAR', type: 'compensatory' },
  { round: 6, team: 'WAS', type: 'compensatory' },
  { round: 6, team: 'BUF', type: 'compensatory' },
  // Round 7 comp picks
  { round: 7, team: 'PHI', type: 'compensatory' },
  { round: 7, team: 'SF', type: 'compensatory' },
  { round: 7, team: 'CLE', type: 'compensatory' },
  { round: 7, team: 'IND', type: 'compensatory' },
  { round: 7, team: 'HOU', type: 'compensatory' },
  { round: 7, team: 'TEN', type: 'compensatory' },
  { round: 7, team: 'NE', type: 'compensatory' },
  { round: 7, team: 'NYG', type: 'compensatory' },
  { round: 7, team: 'CAR', type: 'compensatory' },
  { round: 7, team: 'ARI', type: 'compensatory' },
  { round: 7, team: 'NO', type: 'compensatory' },
];

/** Jimmy Johnson Trade Value Chart (1991) — still the reference standard */
export const TRADE_VALUE_CHART: Record<number, number> = {
  1: 3000, 2: 2600, 3: 2200, 4: 1800, 5: 1700,
  6: 1600, 7: 1500, 8: 1400, 9: 1350, 10: 1300,
  11: 1250, 12: 1200, 13: 1150, 14: 1100, 15: 1050,
  16: 1000, 17: 950, 18: 900, 19: 875, 20: 850,
  21: 800, 22: 780, 23: 760, 24: 740, 25: 720,
  26: 700, 27: 680, 28: 660, 29: 640, 30: 620,
  31: 600, 32: 590, 33: 580, 34: 560, 35: 550,
  36: 540, 37: 530, 38: 520, 39: 510, 40: 500,
  41: 490, 42: 480, 43: 470, 44: 460, 45: 450,
  46: 440, 47: 430, 48: 420, 49: 410, 50: 400,
  // Rounds 3-7 continue to decrease
  64: 270, 96: 116, 128: 54, 160: 29, 192: 15, 224: 5,
};

export function getTradeValue(pick: number): number {
  if (TRADE_VALUE_CHART[pick]) return TRADE_VALUE_CHART[pick];
  // Interpolate for picks not in chart
  const keys = Object.keys(TRADE_VALUE_CHART).map(Number).sort((a, b) => a - b);
  for (let i = 0; i < keys.length - 1; i++) {
    if (pick >= keys[i] && pick <= keys[i + 1]) {
      const ratio = (pick - keys[i]) / (keys[i + 1] - keys[i]);
      return Math.round(
        TRADE_VALUE_CHART[keys[i]] * (1 - ratio) + TRADE_VALUE_CHART[keys[i + 1]] * ratio,
      );
    }
  }
  return Math.max(1, 5 - Math.floor((pick - 224) / 10));
}

/** Evaluate a trade: positive = team trading down wins */
export function evaluateTrade(
  picksGiven: number[],
  picksReceived: number[],
): { givenValue: number; receivedValue: number; premium: number; winner: string } {
  const givenValue = picksGiven.reduce((sum, p) => sum + getTradeValue(p), 0);
  const receivedValue = picksReceived.reduce((sum, p) => sum + getTradeValue(p), 0);
  const premium = ((receivedValue - givenValue) / givenValue) * 100;

  return {
    givenValue,
    receivedValue,
    premium: Math.round(premium * 10) / 10,
    winner: premium > 0 ? 'Receiver (traded down)' : premium < 0 ? 'Giver (traded up)' : 'Even',
  };
}

/** Draft education glossary */
export const DRAFT_GLOSSARY: Record<string, string> = {
  'BPA': 'Best Player Available — drafting the highest-graded player regardless of position',
  'Reach': 'Selecting a player significantly earlier than their projected draft position',
  'Steal': 'Getting a player much later than expected — a value pick',
  'Trade Up': 'A team moves to an earlier pick by sending picks/players to the team ahead',
  'Trade Down': 'A team moves back to accumulate more picks or future assets',
  'Compensatory Pick': 'Extra picks awarded to teams that lost more free agents than they signed',
  'Day 1': 'Round 1 only (Thursday)',
  'Day 2': 'Rounds 2-3 (Friday)',
  'Day 3': 'Rounds 4-7 (Saturday)',
  'UDFA': 'Undrafted Free Agent — signs with a team after the draft ends',
  'Jimmy Johnson Chart': 'The 1991 trade value chart still used as the industry reference',
  'Combine': 'NFL Scouting Combine — athletic testing event in Indianapolis',
  'Pro Day': 'Individual workout at a player\'s college campus for NFL scouts',
  'Clock Expired': 'When a team\'s allotted time runs out — pick isn\'t forfeited but next team can jump ahead',
  'Mr. Irrelevant': 'The last pick of the draft — a tongue-in-cheek honor',
  'War Room': 'Team\'s draft headquarters where coaches and scouts make pick decisions',
  'Big Board': 'A team\'s or analyst\'s ranked list of all draft-eligible prospects',
  'TIE Grade': 'Per|Form\'s Talent + Intangibles + Execution scoring system',
};
