/**
 * Per|Form Mock Draft Engine
 *
 * Autonomous mock draft generation using:
 * - TIE grades (grade field = 0-100)
 * - NFL team needs matrix
 * - Best Player Available (BPA) vs Team Need balancing
 * - Pick value chart (Jimmy Johnson approximation)
 *
 * Ported from AIMS version — no Prisma, accepts prospects as parameter array.
 */

import { NFL_TEAMS, type NFLTeam } from '@/lib/draft/nfl-teams';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ProspectInput {
  name: string;
  school: string;
  position: string;
  overallRank: number;
  grade: number;          // 0-100 TIE score
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
  rounds?: number;        // 1-7, default 3
  teamNeeds?: Record<string, Record<string, number>>; // abbrev -> { position -> need 1-3 }
}

// ─────────────────────────────────────────────────────────────
// Position value tiers
// ─────────────────────────────────────────────────────────────

const POSITION_VALUE: Record<string, number> = {
  QB: 1.5,
  EDGE: 1.3,
  OT: 1.2,
  CB: 1.15,
  WR: 1.1,
  DT: 1.05,
  S: 1.0,
  LB: 1.0,
  IOL: 0.95,
  OG: 0.95,
  TE: 0.9,
  RB: 0.8,
  K: 0.5,
  P: 0.5,
};

function getPositionValue(pos: string): number {
  const normalized = pos.toUpperCase().split('/')[0];
  if (['DE', 'OLB', 'EDGE'].includes(normalized)) return POSITION_VALUE.EDGE;
  if (['OT', 'T'].includes(normalized)) return POSITION_VALUE.OT;
  if (['OG', 'C', 'G', 'IOL'].includes(normalized)) return POSITION_VALUE.IOL;
  if (['DT', 'NT', 'DL'].includes(normalized)) return POSITION_VALUE.DT;
  if (['ILB', 'MLB', 'LB'].includes(normalized)) return POSITION_VALUE.LB;
  return POSITION_VALUE[normalized] || 1.0;
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

// ─────────────────────────────────────────────────────────────
// Draft pick value chart (Jimmy Johnson approximation)
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// Draft order builder
// ─────────────────────────────────────────────────────────────

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
    const roundOrder = round % 2 === 0
      ? [...round1Order].reverse()
      : round1Order;

    let pickInRound = 1;
    for (const abbrev of roundOrder) {
      slots.push({
        overall,
        round,
        pickInRound,
        teamAbbrev: abbrev,
        teamName: teamMap.get(abbrev) || abbrev,
      });
      overall++;
      pickInRound++;
    }
  }

  return slots;
}

// ─────────────────────────────────────────────────────────────
// Fit scoring — balances BPA with team needs
// ─────────────────────────────────────────────────────────────

function scoreFit(
  prospect: { grade: number; position: string; overallRank: number },
  teamNeeds: Record<string, number>,
  pickNumber: number,
  round: number,
): { fitScore: number; rationale: string } {
  const posValue = getPositionValue(prospect.position);
  const posKey = normalizePos(prospect.position);
  const needLevel = teamNeeds[prospect.position.toUpperCase()] || teamNeeds[posKey] || 3;

  // BPA component (40%)
  const bpaScore = prospect.grade * posValue;

  // Need component (40%)
  const needMultiplier = needLevel === 1 ? 1.5 : needLevel === 2 ? 1.15 : 0.85;
  const needScore = prospect.grade * needMultiplier;

  // Value component (20%)
  const valueDiff = prospect.overallRank - pickNumber;
  const valueScore = valueDiff > 10 ? 95 : valueDiff > 0 ? 80 + valueDiff : 70 + valueDiff;

  const fitScore = Math.round(bpaScore * 0.4 + needScore * 0.4 + valueScore * 0.2);

  let rationale = '';
  if (needLevel === 1) {
    rationale = `Fills critical need at ${prospect.position}. `;
  } else if (needLevel === 2) {
    rationale = `Addresses moderate need at ${prospect.position}. `;
  } else {
    rationale = `Best player available — talent too good to pass on. `;
  }

  if (valueDiff > 10) {
    rationale += `Excellent value — ranked ${prospect.overallRank} overall, picked at ${pickNumber}.`;
  } else if (valueDiff > 0) {
    rationale += `Solid value at pick ${pickNumber}.`;
  } else if (round <= 2) {
    rationale += `Slight reach but positional value and need justify the selection.`;
  }

  return { fitScore: Math.min(100, Math.max(0, fitScore)), rationale };
}

// ─────────────────────────────────────────────────────────────
// Default draft order (2026 — worst to best record estimate)
// ─────────────────────────────────────────────────────────────

const DEFAULT_DRAFT_ORDER: string[] = [
  'TEN', 'CLE', 'NYG', 'NE', 'JAX', 'LV', 'CAR', 'NYJ',
  'NO', 'CHI', 'IND', 'CIN', 'DAL', 'MIA', 'ARI', 'ATL',
  'SEA', 'SF', 'LAC', 'DEN', 'TB', 'PIT', 'LAR', 'HOU',
  'MIN', 'GB', 'BAL', 'WAS', 'DET', 'BUF', 'PHI', 'KC',
];

// ─────────────────────────────────────────────────────────────
// Default team needs (simplified — 1=critical, 2=moderate, 3=depth)
// ─────────────────────────────────────────────────────────────

const DEFAULT_TEAM_NEEDS: Record<string, Record<string, number>> = {
  TEN: { QB: 1, EDGE: 2, OT: 1 },
  CLE: { QB: 1, WR: 1, OT: 2 },
  NYG: { QB: 1, EDGE: 2, CB: 2 },
  NE: { WR: 1, EDGE: 1, CB: 2 },
  JAX: { OT: 1, WR: 2, EDGE: 2 },
  LV: { QB: 1, CB: 1, DT: 2 },
  CAR: { QB: 2, OT: 1, WR: 1 },
  NYJ: { OT: 1, WR: 1, CB: 2 },
  NO: { QB: 1, EDGE: 2, CB: 2 },
  CHI: { OT: 1, CB: 1, WR: 2 },
  IND: { WR: 1, CB: 2, EDGE: 2 },
  CIN: { OT: 1, DT: 2, EDGE: 2 },
  DAL: { EDGE: 1, CB: 1, S: 2 },
  MIA: { OT: 1, EDGE: 1, LB: 2 },
  ARI: { EDGE: 1, CB: 2, IOL: 2 },
  ATL: { EDGE: 1, DT: 2, S: 2 },
  SEA: { CB: 1, EDGE: 2, OT: 2 },
  SF: { QB: 2, CB: 1, EDGE: 2 },
  LAC: { WR: 1, CB: 2, LB: 2 },
  DEN: { WR: 1, OT: 2, CB: 2 },
  TB: { EDGE: 1, S: 2, DT: 2 },
  PIT: { CB: 1, OT: 2, WR: 2 },
  LAR: { EDGE: 1, CB: 2, S: 2 },
  HOU: { OT: 1, CB: 2, WR: 2 },
  MIN: { IOL: 1, EDGE: 2, S: 2 },
  GB: { DT: 1, EDGE: 2, S: 2 },
  BAL: { WR: 1, OT: 2, CB: 2 },
  WAS: { DT: 1, S: 2, LB: 2 },
  DET: { CB: 1, EDGE: 2, LB: 2 },
  BUF: { WR: 1, DT: 2, CB: 2 },
  PHI: { LB: 1, S: 2, EDGE: 2 },
  KC: { WR: 1, EDGE: 2, CB: 2 },
};

// ─────────────────────────────────────────────────────────────
// Core: generateMockDraft
// ─────────────────────────────────────────────────────────────

export function generateMockDraft(
  prospects: ProspectInput[],
  options: MockDraftOptions = {},
): DraftPick[] {
  const rounds = Math.min(7, Math.max(1, options.rounds ?? 3));
  const teamNeeds = options.teamNeeds ?? DEFAULT_TEAM_NEEDS;

  // Build draft order
  const slots = buildDraftOrder(DEFAULT_DRAFT_ORDER, rounds);

  // Sort prospects by grade descending as a baseline
  const sorted = [...prospects].sort((a, b) => b.grade - a.grade);

  const picked = new Set<string>(); // track by "name|school"
  const picks: DraftPick[] = [];

  // Deep-clone needs so picks mutate a local copy
  const liveNeeds: Record<string, Record<string, number>> = {};
  for (const [abbrev, needs] of Object.entries(teamNeeds)) {
    liveNeeds[abbrev] = { ...needs };
  }

  for (const slot of slots) {
    const needs = liveNeeds[slot.teamAbbrev] || {};
    const available = sorted.filter(p => !picked.has(`${p.name}|${p.school}`));
    if (available.length === 0) break;

    // Score top 15 available candidates
    const candidates = available.slice(0, Math.min(15, available.length));
    let bestProspect = candidates[0];
    let bestFit = scoreFit(
      { grade: bestProspect.grade, position: bestProspect.position, overallRank: bestProspect.overallRank },
      needs,
      slot.overall,
      slot.round,
    );

    for (let i = 1; i < candidates.length; i++) {
      const candidate = candidates[i];
      const fit = scoreFit(
        { grade: candidate.grade, position: candidate.position, overallRank: candidate.overallRank },
        needs,
        slot.overall,
        slot.round,
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

    // Reduce team need at that position after picking
    const posKey = normalizePos(bestProspect.position);
    if (needs[posKey]) {
      needs[posKey] = Math.min(3, needs[posKey] + 1);
    }
    if (needs[bestProspect.position.toUpperCase()]) {
      needs[bestProspect.position.toUpperCase()] = Math.min(3, needs[bestProspect.position.toUpperCase()] + 1);
    }
  }

  return picks;
}

export { pickValue, NFL_TEAMS };
