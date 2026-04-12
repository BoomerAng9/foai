/**
 * Per|Form Draft Simulation Engine
 * Orchestrates draft simulations. Calls ML service when available,
 * falls back to the existing mock-engine for v1.
 */

import { generateMockDraft, type ProspectInput, type DraftPick as MockPick } from './mock-engine';
import { getTradeValue } from './draft-rules-2026';
import { FIRST_ROUND_ORDER, getTeam } from './teams';
import type {
  DraftPick, TradeDetails, SimulationState, Prospect, SimulationConfig,
} from './types';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8100';
const simulations = new Map<string, SimulationState>();

function generateId(): string {
  return `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateTradeId(): string {
  return `trade_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function gradeLetter(score: number): string {
  if (score >= 101) return 'PRIME';
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 65) return 'B-';
  if (score >= 60) return 'C+';
  return 'C';
}

function convertPicks(
  mockPicks: MockPick[],
  chaosFactor: number,
): { picks: DraftPick[]; trades: TradeDetails[] } {
  const picks: DraftPick[] = [];
  const trades: TradeDetails[] = [];
  const tradeFrequency = 0.08 + (chaosFactor / 100) * 0.15;

  for (const mp of mockPicks) {
    const isTrade = Math.random() < tradeFrequency && mp.round <= 4;
    let tradeDetails: TradeDetails | undefined;

    if (isTrade) {
      const otherTeamIdx = Math.floor(Math.random() * FIRST_ROUND_ORDER.length);
      const otherAbbr = FIRST_ROUND_ORDER[otherTeamIdx];
      if (otherAbbr !== mp.teamAbbrev) {
        const otherTeam = getTeam(otherAbbr);
        const currentTeam = getTeam(mp.teamAbbrev);
        const futurePick = mp.overall + Math.floor(Math.random() * 30) + 10;
        const valueDiff = getTradeValue(mp.overall) - getTradeValue(futurePick);
        tradeDetails = {
          trade_id: generateTradeId(),
          team_a: currentTeam.name, team_a_abbr: mp.teamAbbrev,
          team_b: otherTeam.name, team_b_abbr: otherAbbr,
          team_a_gives: [futurePick, mp.overall + 64],
          team_b_gives: [mp.overall],
          trade_value_diff: valueDiff,
          headline: `${otherTeam.name} trade up to #${mp.overall} to select ${mp.playerName}`,
        };
        trades.push(tradeDetails);
      }
    }

    const rankDiff = Math.abs((mp.tieScore || 0) - mp.overall);
    const surpriseScore = Math.min(100, Math.floor(rankDiff * 3 + (chaosFactor * 0.3)));

    picks.push({
      pick_number: mp.overall, round: mp.round, pick_in_round: mp.pickInRound,
      team: mp.teamName, team_abbr: mp.teamAbbrev,
      player_name: mp.playerName, position: mp.position, school: mp.school,
      tie_grade: gradeLetter(mp.tieScore),
      is_trade: !!tradeDetails, trade_details: tradeDetails,
      analysis: mp.rationale, surprise_score: Math.min(100, surpriseScore),
    });
  }
  return { picks, trades };
}

async function tryMLService(config: SimulationConfig): Promise<SimulationState | null> {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/ml/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: config.mode, team: config.team,
        chaos_factor: config.chaos_factor ?? 30, rounds: config.rounds ?? 7,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return await res.json();
  } catch { /* ML service not available */ }
  return null;
}

export async function createSimulation(config: SimulationConfig): Promise<SimulationState> {
  const id = generateId();
  const chaosFactor = config.chaos_factor ?? 30;
  const rounds = config.rounds ?? 7;

  const mlResult = await tryMLService(config);
  if (mlResult) { mlResult.id = id; simulations.set(id, mlResult); return mlResult; }

  let prospects: ProspectInput[] = [];
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/players?sort=overall_rank:asc&limit=300`);
    if (res.ok) {
      const data = await res.json();
      prospects = (data.players || []).map((p: Record<string, unknown>) => ({
        name: p.name as string, school: p.school as string, position: p.position as string,
        overallRank: (p.overall_rank as number) || 999, grade: (p.grade as number) || 50,
        tieGrade: p.tie_grade as string | undefined, projectedRound: p.projected_round as number | undefined,
      }));
    }
  } catch { /* use empty if API unavailable */ }

  const mockPicks = generateMockDraft(prospects, { rounds, mode: 'perform' });
  const { picks, trades } = convertPicks(mockPicks, chaosFactor);

  const pickedNames = new Set(picks.map(p => p.player_name));
  const availableProspects: Prospect[] = prospects
    .filter(p => !pickedNames.has(p.name))
    .map((p, idx) => ({
      id: idx + 1, name: p.name, position: p.position, school: p.school,
      tie_grade: p.tieGrade || gradeLetter(p.grade), tie_tier: p.tieGrade || 'B',
      overall_rank: p.overallRank, position_rank: idx + 1, grade: p.grade,
    }));

  const state: SimulationState = {
    id, mode: config.mode, user_team: config.team, chaos_factor: chaosFactor,
    current_pick: config.mode === 'auto' ? picks.length : 1,
    total_picks: rounds * 32, picks: config.mode === 'auto' ? picks : [],
    trades, available_prospects: availableProspects,
    status: config.mode === 'auto' ? 'complete' : 'running',
    current_round: config.mode === 'auto' ? rounds : 1,
  };
  simulations.set(id, state);
  return state;
}

export function getSimulation(id: string): SimulationState | null {
  return simulations.get(id) || null;
}

export function makeUserPick(simId: string, playerId: number): SimulationState | null {
  const sim = simulations.get(simId);
  if (!sim || sim.status === 'complete') return null;
  const prospect = sim.available_prospects.find(p => p.id === playerId);
  if (!prospect) return null;

  const pickNum = sim.picks.length + 1;
  const round = Math.ceil(pickNum / 32);
  const pickInRound = ((pickNum - 1) % 32) + 1;

  sim.picks.push({
    pick_number: pickNum, round, pick_in_round: pickInRound,
    team: sim.user_team || 'User', team_abbr: sim.user_team || 'USR',
    player_name: prospect.name, position: prospect.position, school: prospect.school,
    tie_grade: prospect.tie_grade, is_trade: false,
    analysis: `User selection: ${prospect.name} (${prospect.position}) from ${prospect.school}`,
    surprise_score: 0,
  });

  sim.available_prospects = sim.available_prospects.filter(p => p.id !== playerId);
  sim.current_pick = pickNum + 1;
  sim.current_round = round;
  if (sim.picks.length >= sim.total_picks) sim.status = 'complete';
  return sim;
}
