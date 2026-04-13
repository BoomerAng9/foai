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
    const teamNeeds: Record<string, string[]> = {};
    if (config.team) {
      const t = getTeam(config.team);
      if (t.needs.length > 0) teamNeeds[config.team] = t.needs;
    }
    const res = await fetch(`${ML_SERVICE_URL}/ml/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chaos_factor: config.chaos_factor ?? 30,
        total_picks: (config.rounds ?? 7) * 32,
        num_rounds: config.rounds ?? 7,
        team_needs: Object.keys(teamNeeds).length > 0 ? teamNeeds : undefined,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const mlData = await res.json();
    return parseMLResponse(mlData, config);
  } catch { /* ML service not available — fall back to mock engine */ }
  return null;
}

function parseMLResponse(ml: Record<string, unknown>, config: SimulationConfig): SimulationState {
  const id = generateId();
  const mlPicks = (ml.picks as Record<string, unknown>[]) || [];
  const mlTrades = (ml.trades as Record<string, unknown>[]) || [];

  const picks: DraftPick[] = mlPicks.map((p) => ({
    pick_number: (p.pick_number as number) || 0,
    round: (p.round as number) || 1,
    pick_in_round: (((p.pick_number as number) - 1) % 32) + 1,
    team: (p.team as string) || '',
    team_abbr: (p.team as string) || '',
    player_name: (p.player_name as string) || '',
    position: (p.player_position as string) || (p.position as string) || '',
    school: (p.player_school as string) || '',
    tie_grade: gradeLetter((p.player_tie_score as number) || 50),
    is_trade: !!(p.is_trade),
    trade_details: p.trade_details as TradeDetails | undefined,
    analysis: `ML prediction (p=${((p.probability as number) || 0).toFixed(2)})`,
    surprise_score: Math.round(((p.surprise_score as number) || 0) * 100),
  }));

  const trades: TradeDetails[] = mlTrades.map((t, i) => ({
    trade_id: `ml_trade_${i}`,
    team_a: (t.trade_down_team as string) || '',
    team_a_abbr: (t.trade_down_team as string) || '',
    team_b: (t.trade_up_team as string) || '',
    team_b_abbr: (t.trade_up_team as string) || '',
    team_a_gives: [(t.pick_acquired as number) || 0],
    team_b_gives: (t.picks_given as (string | number)[]) || [],
    trade_value_diff: (t.value_delta as number) || 0,
    headline: `${t.trade_up_team} trades up to #${t.pick_acquired}`,
  }));

  const rounds = config.rounds ?? 7;
  return {
    id,
    mode: config.mode,
    user_team: config.team,
    chaos_factor: config.chaos_factor ?? 30,
    current_pick: picks.length,
    total_picks: rounds * 32,
    picks,
    trades,
    available_prospects: [],
    status: 'complete',
    current_round: rounds,
  };
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

/** Trade offer from an AI team to the user */
export interface TradeOffer {
  offer_id: string;
  offering_team: string;
  offering_team_abbr: string;
  target_pick: number;
  picks_offered: number[];
  picks_offered_values: number[];
  target_pick_value: number;
  value_surplus: number;
  reason: string;
  expires_at_pick: number;
}

export function generateTradeOffer(simId: string): TradeOffer | null {
  const sim = simulations.get(simId);
  if (!sim || sim.mode !== 'war-room' || !sim.user_team) return null;

  const userTeam = sim.user_team;
  const currentPick = sim.picks.length + 1;

  let userNextPick = -1;
  for (let p = currentPick; p <= sim.total_picks; p++) {
    const idx = (p - 1) % FIRST_ROUND_ORDER.length;
    if (FIRST_ROUND_ORDER[idx] === userTeam) { userNextPick = p; break; }
  }
  if (userNextPick < 0 || userNextPick > sim.total_picks) return null;

  const round = Math.ceil(userNextPick / 32);
  if (round > 3) return null;

  const recentPicks = sim.picks.slice(-5);
  const posCount: Record<string, number> = {};
  for (const p of recentPicks) {
    posCount[p.position] = (posCount[p.position] || 0) + 1;
  }
  const hotPosition = Object.entries(posCount).find(([, c]) => c >= 2)?.[0];

  const baseProbability = 0.12;
  const runBoost = hotPosition ? 0.15 : 0;
  const pickValueBoost = userNextPick <= 10 ? 0.10 : userNextPick <= 20 ? 0.05 : 0;
  const totalProb = Math.min(0.40, baseProbability + runBoost + pickValueBoost);

  if (Math.random() > totalProb) return null;

  const candidates = FIRST_ROUND_ORDER.filter(t => t !== userTeam);
  const offeringAbbr = candidates[Math.floor(Math.random() * candidates.length)];
  const offeringTeam = getTeam(offeringAbbr);

  const userPickValue = getTradeValue(userNextPick);
  const laterPick1 = userNextPick + 15 + Math.floor(Math.random() * 20);
  const laterPick2 = userNextPick + 40 + Math.floor(Math.random() * 30);
  const picksOffered = [laterPick1, laterPick2];
  const offeredValues = picksOffered.map(p => getTradeValue(p));
  const totalOffered = offeredValues.reduce((a, b) => a + b, 0);
  const surplus = totalOffered - userPickValue;

  const reason = hotPosition
    ? `${offeringTeam.name} fear a run on ${hotPosition} and want to jump ahead`
    : `${offeringTeam.name} covet a prospect falling to #${userNextPick}`;

  return {
    offer_id: `offer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    offering_team: offeringTeam.name,
    offering_team_abbr: offeringAbbr,
    target_pick: userNextPick,
    picks_offered: picksOffered,
    picks_offered_values: offeredValues,
    target_pick_value: userPickValue,
    value_surplus: surplus,
    reason,
    expires_at_pick: userNextPick,
  };
}

export function acceptTradeOffer(simId: string, offerId: string, offer: TradeOffer): SimulationState | null {
  const sim = simulations.get(simId);
  if (!sim) return null;

  const trade: TradeDetails = {
    trade_id: offerId,
    team_a: sim.user_team || 'User',
    team_a_abbr: sim.user_team || 'USR',
    team_b: offer.offering_team,
    team_b_abbr: offer.offering_team_abbr,
    team_a_gives: [offer.target_pick],
    team_b_gives: offer.picks_offered,
    trade_value_diff: offer.value_surplus,
    headline: `${offer.offering_team} trade up to #${offer.target_pick} from ${sim.user_team}`,
  };
  sim.trades.push(trade);
  return sim;
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
