/**
 * Cross-System Consensus Normalization
 *
 * Maps PFF, ESPN, and NFL.com grades to a common scale
 * so Per|Form can show how our evaluation compares to
 * the three major grading systems.
 *
 * PFF = production (what they DID)
 * ESPN = projection (what they COULD be)
 * NFL.com = career arc (how they'll DEVELOP)
 * Per|Form = TIE (Talent + Intangibles + Execution)
 */

export interface ConsensusGrade {
  system: 'PFF' | 'ESPN' | 'NFL.com' | 'Per|Form';
  rawGrade: number | string;
  normalizedTier: string;
  projectedRound: string;
  methodology: string;
}

export interface ConsensusComparison {
  playerName: string;
  position: string;
  perform: ConsensusGrade;
  pff?: ConsensusGrade;
  espn?: ConsensusGrade;
  nflcom?: ConsensusGrade;
  agreement: 'UNANIMOUS' | 'MAJORITY' | 'SPLIT' | 'CONTRARIAN';
  narrativeAngle: string;
}

/* ── Normalization Tables ── */

export function normalizePFF(grade: number): ConsensusGrade {
  let tier: string;
  let round: string;
  if (grade >= 90) { tier = 'Elite'; round = 'Top 5'; }
  else if (grade >= 85) { tier = 'Pro Bowler'; round = 'Picks 5-15'; }
  else if (grade >= 80) { tier = 'Above Average Starter'; round = 'Picks 15-32'; }
  else if (grade >= 70) { tier = 'Starter'; round = 'Rounds 2-3'; }
  else if (grade >= 65) { tier = 'Backup'; round = 'Rounds 4-5'; }
  else if (grade >= 60) { tier = 'Rotational'; round = 'Rounds 5-7'; }
  else { tier = 'Below Average'; round = 'UDFA'; }

  return {
    system: 'PFF',
    rawGrade: grade,
    normalizedTier: tier,
    projectedRound: round,
    methodology: 'Play-by-play production grading (-2 to +2 per play, scaled to 0-100)',
  };
}

export function normalizeESPN(grade: number): ConsensusGrade {
  let tier: string;
  let round: string;
  if (grade >= 93) { tier = 'Rare Prospect'; round = 'Top 5'; }
  else if (grade >= 90) { tier = 'Outstanding'; round = 'Picks 5-15'; }
  else if (grade >= 87) { tier = 'First Round'; round = 'Picks 15-32'; }
  else if (grade >= 80) { tier = 'Second Round'; round = 'Rounds 2-3'; }
  else if (grade >= 70) { tier = 'Mid-Round'; round = 'Rounds 4-5'; }
  else if (grade >= 60) { tier = 'Late Round'; round = 'Rounds 5-7'; }
  else { tier = 'Priority Free Agent'; round = 'UDFA'; }

  return {
    system: 'ESPN',
    rawGrade: grade,
    normalizedTier: tier,
    projectedRound: round,
    methodology: 'Projected NFL value on 0-100 scale (Scouts Inc. / Mel Kiper)',
  };
}

export function normalizeNFLcom(grade: number): ConsensusGrade {
  // NFL.com uses 6.0-8.0 scale
  let tier: string;
  let round: string;
  if (grade >= 7.0) { tier = 'Pro Bowl Talent'; round = 'Top 5'; }
  else if (grade >= 6.7) { tier = 'Year 1 Quality Starter'; round = 'Picks 5-15'; }
  else if (grade >= 6.5) { tier = 'First Round'; round = 'Picks 15-32'; }
  else if (grade >= 6.3) { tier = 'Day 2 Starter'; round = 'Rounds 2-3'; }
  else if (grade >= 6.1) { tier = 'Good Backup'; round = 'Rounds 4-5'; }
  else if (grade >= 6.0) { tier = 'Backup/ST'; round = 'Rounds 5-7'; }
  else { tier = 'Priority Free Agent'; round = 'UDFA'; }

  return {
    system: 'NFL.com',
    rawGrade: grade,
    normalizedTier: tier,
    projectedRound: round,
    methodology: 'Career-arc projection on 6.0-8.0 scale (Lance Zierlein)',
  };
}

export function normalizePerForm(grade: number): ConsensusGrade {
  let tier: string;
  let round: string;
  if (grade >= 95) { tier = 'Generational'; round = 'Top 3'; }
  else if (grade >= 90) { tier = 'Blue Chip'; round = 'Top 10'; }
  else if (grade >= 85) { tier = 'First Round Lock'; round = 'Picks 10-32'; }
  else if (grade >= 80) { tier = 'Day 1 Starter'; round = 'Rounds 2-3'; }
  else if (grade >= 74) { tier = 'Quality Starter'; round = 'Rounds 3-4'; }
  else if (grade >= 68) { tier = 'Developmental'; round = 'Rounds 5-6'; }
  else if (grade >= 62) { tier = 'Depth'; round = 'Round 7'; }
  else { tier = 'Camp Body'; round = 'UDFA'; }

  return {
    system: 'Per|Form',
    rawGrade: grade,
    normalizedTier: tier,
    projectedRound: round,
    methodology: 'TIE = Talent (40%) + Intangibles (30%) + Execution (30%)',
  };
}

/* ── Agreement Detection ── */

function roundToNumber(round: string): number {
  if (round.includes('Top 3')) return 1;
  if (round.includes('Top 5')) return 1;
  if (round.includes('Top 10')) return 1;
  if (round.includes('5-15')) return 1;
  if (round.includes('15-32')) return 1;
  if (round.includes('2-3') || round.includes('2')) return 2;
  if (round.includes('3-4') || round.includes('3')) return 3;
  if (round.includes('4-5') || round.includes('4')) return 4;
  if (round.includes('5-7') || round.includes('5') || round.includes('6')) return 5;
  if (round.includes('7')) return 7;
  return 8;
}

export function detectAgreement(
  grades: ConsensusGrade[],
): 'UNANIMOUS' | 'MAJORITY' | 'SPLIT' | 'CONTRARIAN' {
  const rounds = grades.map(g => roundToNumber(g.projectedRound));
  const maxDiff = Math.max(...rounds) - Math.min(...rounds);

  if (maxDiff <= 1) return 'UNANIMOUS';
  if (maxDiff <= 2) return 'MAJORITY';
  if (maxDiff <= 3) return 'SPLIT';
  return 'CONTRARIAN';
}

export function generateNarrativeAngle(
  playerName: string,
  agreement: string,
  performGrade: ConsensusGrade,
  otherGrades: ConsensusGrade[],
): string {
  const performRound = roundToNumber(performGrade.projectedRound);
  const otherRounds = otherGrades.map(g => roundToNumber(g.projectedRound));
  const avgOther = otherRounds.reduce((a, b) => a + b, 0) / otherRounds.length;

  if (agreement === 'UNANIMOUS') {
    return `${playerName} is a consensus pick — all systems agree on ${performGrade.projectedRound} value.`;
  }

  if (performRound < avgOther - 1) {
    return `Per|Form sees ${playerName} as a sleeper. Industry says ${performGrade.projectedRound}, consensus says later.`;
  }

  if (performRound > avgOther + 1) {
    return `Per|Form is lower on ${playerName} than consensus. We see ${performGrade.normalizedTier} value, not higher.`;
  }

  return `${playerName} has mixed reviews across systems — a true evaluation test for scouts.`;
}
