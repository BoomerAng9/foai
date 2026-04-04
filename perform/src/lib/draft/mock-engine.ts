/**
 * Per|Form Mock Draft Engine v2
 *
 * Respects consensus big board rankings as primary signal.
 * Team needs influence picks but don't override talent.
 * A #1 ranked player goes #1 unless a team truly doesn't need that position.
 */

import { NFL_TEAMS, type NFLTeam } from '@/lib/draft/nfl-teams';

export interface ProspectInput {
  name: string;
  school: string;
  position: string;
  overallRank: number;
  grade: number;
  tieGrade?: string;
  projectedRound?: number;
}

export interface DraftPick {
  overall: number;
  round: number;
  pickInRound: number;
  teamName: string;
  teamAbbrev: string;
  playerName: string;
  position: string;
  school: string;
  tieScore: number;
  rationale: string;
}

export interface MockDraftOptions {
  rounds?: number;
  teamNeeds?: Record<string, Record<string, number>>;
}

// Position value — used as a tiebreaker, NOT a primary factor
const POSITION_VALUE: Record<string, number> = {
  QB: 1.15, EDGE: 1.10, OT: 1.08, CB: 1.05, WR: 1.05,
  DT: 1.03, S: 1.02, LB: 1.02, OG: 1.0, IOL: 1.0,
  TE: 1.0, RB: 1.0, K: 0.5, P: 0.5,
};

function getPositionValue(pos: string): number {
  const p = pos.toUpperCase().split('/')[0];
  if (['DE', 'OLB', 'EDGE'].includes(p)) return POSITION_VALUE.EDGE;
  if (['OT', 'T'].includes(p)) return POSITION_VALUE.OT;
  if (['OG', 'C', 'G', 'IOL'].includes(p)) return POSITION_VALUE.IOL;
  if (['DT', 'NT', 'DL'].includes(p)) return POSITION_VALUE.DT;
  if (['ILB', 'MLB', 'LB'].includes(p)) return POSITION_VALUE.LB;
  return POSITION_VALUE[p] || 1.0;
}

function normalizePos(pos: string): string {
  const p = pos.toUpperCase().split('/')[0];
  if (['DE', 'OLB'].includes(p)) return 'EDGE';
  if (['OT', 'T'].includes(p)) return 'OT';
  if (['OG', 'C', 'G'].includes(p)) return 'IOL';
  if (['DT', 'NT', 'DL'].includes(p)) return 'DT';
  if (['ILB', 'MLB'].includes(p)) return 'LB';
  return p;
}

function pickValue(overall: number): number {
  if (overall <= 0) return 0;
  if (overall === 1) return 3000;
  if (overall <= 5) return 3000 - (overall - 1) * 400;
  if (overall <= 10) return 1600 - (overall - 5) * 160;
  if (overall <= 32) return 800 - (overall - 10) * 25;
  if (overall <= 64) return 250 - (overall - 32) * 5;
  if (overall <= 100) return 90 - (overall - 64) * 1.5;
  return Math.max(1, 35 - (overall - 100) * 0.2);
}

interface DraftSlot {
  overall: number;
  round: number;
  pickInRound: number;
  teamAbbrev: string;
  teamName: string;
}

function buildDraftOrder(round1Order: string[], maxRounds: number): DraftSlot[] {
  const slots: DraftSlot[] = [];
  const teamMap = new Map(NFL_TEAMS.map(t => [t.abbreviation, t.teamName]));
  let overall = 1;
  for (let round = 1; round <= maxRounds; round++) {
    const roundOrder = round % 2 === 0 ? [...round1Order].reverse() : round1Order;
    let pickInRound = 1;
    for (const abbrev of roundOrder) {
      slots.push({ overall, round, pickInRound, teamAbbrev: abbrev, teamName: teamMap.get(abbrev) || abbrev });
      overall++;
      pickInRound++;
    }
  }
  return slots;
}

/**
 * Score how well a prospect fits a pick.
 * PRIMARY: consensus rank (overallRank) — talent falls where talent falls
 * SECONDARY: team need — nudges the pick within a small window
 * TERTIARY: position value — minor tiebreaker
 */
function scoreFit(
  prospect: { grade: number; position: string; overallRank: number },
  teamNeeds: Record<string, number>,
  pickNumber: number,
): { fitScore: number; rationale: string } {
  const posKey = normalizePos(prospect.position);
  const needLevel = teamNeeds[prospect.position.toUpperCase()] || teamNeeds[posKey] || 3;
  const posValue = getPositionValue(prospect.position);

  // Rank-based score (60%) — how close is this player's rank to this pick?
  // A player ranked #1 at pick #1 = perfect. Ranked #1 at pick #32 = massive value.
  const rankDiff = prospect.overallRank - pickNumber;
  let rankScore: number;
  if (rankDiff <= 0) {
    // Player ranked higher than pick = great value, score goes up the bigger the steal
    rankScore = 100 + Math.min(20, Math.abs(rankDiff) * 2);
  } else if (rankDiff <= 5) {
    // Slight reach
    rankScore = 90 - rankDiff * 2;
  } else if (rankDiff <= 15) {
    // Moderate reach
    rankScore = 75 - rankDiff;
  } else {
    // Major reach
    rankScore = Math.max(20, 60 - rankDiff);
  }

  // Need score (30%) — does the team need this position?
  const needScore = needLevel === 1 ? 120 : needLevel === 2 ? 100 : 70;

  // Position value (10%) — minor tiebreaker
  const posScore = posValue * 80;

  const fitScore = Math.round(rankScore * 0.60 + needScore * 0.30 + posScore * 0.10);

  let rationale = '';
  if (rankDiff <= -5) {
    rationale = `Steal of the draft — ranked #${prospect.overallRank}, taken at #${pickNumber}. `;
  } else if (rankDiff <= 0) {
    rationale = `Right where they should go. `;
  } else if (rankDiff <= 5) {
    rationale = `Slight reach but fills a need. `;
  } else {
    rationale = `Reach pick driven by team need. `;
  }

  if (needLevel === 1) rationale += `Critical need at ${prospect.position}.`;
  else if (needLevel === 2) rationale += `Addresses a moderate need.`;
  else rationale += `Best player available.`;

  return { fitScore: Math.min(120, Math.max(0, fitScore)), rationale };
}

// 2026 Draft Order — Raiders #1 overall
// 2026 NFL Draft Order — confirmed from NFL.com
const DEFAULT_DRAFT_ORDER: string[] = [
  'LV', 'NYJ', 'ARI', 'TEN', 'NYG', 'CLE', 'CAR', 'NE',
  'NO', 'CHI', 'SF', 'DAL', 'MIA', 'CIN', 'IND', 'JAX',
  'SEA', 'ATL', 'LAC', 'HOU', 'PIT', 'DEN', 'GB', 'MIN',
  'TB', 'LAR', 'BAL', 'DET', 'BUF', 'WAS', 'PHI', 'KC',
];

const DEFAULT_TEAM_NEEDS: Record<string, Record<string, number>> = {
  LV: { RB: 1, WR: 1, CB: 2, DT: 2 }, // Signed Kirk Cousins — QB addressed
  NYG: { EDGE: 1, OT: 1, WR: 2 },
  NE: { WR: 1, EDGE: 1, CB: 2 },
  CLE: { QB: 1, WR: 1, OT: 2 },
  TEN: { QB: 2, EDGE: 1, OT: 1 },
  CAR: { OT: 1, QB: 2, WR: 1 },
  NYJ: { OT: 1, WR: 1, CB: 2 },
  DAL: { EDGE: 1, CB: 1, S: 2 },
  CHI: { OT: 1, CB: 1, WR: 2 },
  NO: { QB: 1, EDGE: 2, CB: 2 },
  SF: { QB: 2, CB: 1, EDGE: 2 },
  MIA: { OT: 1, EDGE: 1, LB: 2 },
  IND: { WR: 1, CB: 2, EDGE: 2 },
  JAX: { OT: 1, WR: 2, EDGE: 2 },
  CIN: { OT: 1, DT: 2, EDGE: 2 },
  ARI: { EDGE: 1, CB: 2, IOL: 2 },
  SEA: { CB: 1, EDGE: 2, OT: 2 },
  ATL: { EDGE: 1, DT: 2, S: 2 },
  LAC: { WR: 1, CB: 2, LB: 2 },
  HOU: { OT: 1, CB: 2, WR: 2 },
  PIT: { CB: 1, OT: 2, WR: 2 },
  DEN: { WR: 1, OT: 2, CB: 2 },
  GB: { DT: 1, EDGE: 2, S: 2 },
  MIN: { IOL: 1, EDGE: 2, S: 2 },
  TB: { EDGE: 1, S: 2, DT: 2 },
  LAR: { EDGE: 1, CB: 2, S: 2 },
  BAL: { WR: 1, OT: 2, CB: 2 },
  DET: { CB: 1, EDGE: 2, LB: 2 },
  BUF: { WR: 1, DT: 2, CB: 2 },
  WAS: { DT: 1, S: 2, LB: 2 },
  PHI: { LB: 1, S: 2, EDGE: 2 },
  KC: { WR: 1, EDGE: 2, CB: 2 },
};

export function generateMockDraft(
  prospects: ProspectInput[],
  options: MockDraftOptions = {},
): DraftPick[] {
  const rounds = Math.min(7, Math.max(1, options.rounds ?? 3));
  const teamNeeds = options.teamNeeds ?? DEFAULT_TEAM_NEEDS;
  const slots = buildDraftOrder(DEFAULT_DRAFT_ORDER, rounds);

  // Sort by overallRank (consensus big board) — this is the primary signal
  const sorted = [...prospects].sort((a, b) => (a.overallRank || 999) - (b.overallRank || 999));

  const picked = new Set<string>();
  const picks: DraftPick[] = [];
  const liveNeeds: Record<string, Record<string, number>> = {};
  for (const [abbrev, needs] of Object.entries(teamNeeds)) {
    liveNeeds[abbrev] = { ...needs };
  }

  for (const slot of slots) {
    const needs = liveNeeds[slot.teamAbbrev] || {};
    const available = sorted.filter(p => !picked.has(`${p.name}|${p.school}`));
    if (available.length === 0) break;

    // Look at ALL available players, not just top 15
    // But weight heavily toward the top of the board
    const windowSize = Math.min(available.length, slot.round <= 2 ? 8 : 12);
    const candidates = available.slice(0, windowSize);

    let bestProspect = candidates[0];
    let bestFit = scoreFit(
      { grade: bestProspect.grade, position: bestProspect.position, overallRank: bestProspect.overallRank },
      needs, slot.overall,
    );

    for (let i = 1; i < candidates.length; i++) {
      const candidate = candidates[i];
      const fit = scoreFit(
        { grade: candidate.grade, position: candidate.position, overallRank: candidate.overallRank },
        needs, slot.overall,
      );
      if (fit.fitScore > bestFit.fitScore) {
        bestProspect = candidate;
        bestFit = fit;
      }
    }

    picks.push({
      overall: slot.overall,
      round: slot.round,
      pickInRound: slot.pickInRound,
      teamName: slot.teamName,
      teamAbbrev: slot.teamAbbrev,
      playerName: bestProspect.name,
      position: bestProspect.position,
      school: bestProspect.school,
      tieScore: bestFit.fitScore,
      rationale: bestFit.rationale,
    });

    picked.add(`${bestProspect.name}|${bestProspect.school}`);

    const posKey = normalizePos(bestProspect.position);
    if (needs[posKey]) needs[posKey] = Math.min(3, needs[posKey] + 1);
    if (needs[bestProspect.position.toUpperCase()]) {
      needs[bestProspect.position.toUpperCase()] = Math.min(3, needs[bestProspect.position.toUpperCase()] + 1);
    }
  }

  return picks;
}

export { pickValue, NFL_TEAMS };
