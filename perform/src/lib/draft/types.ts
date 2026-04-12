/**
 * Per|Form NFL Draft Simulation — Type Definitions
 */

export interface DraftPick {
  pick_number: number;
  round: number;
  pick_in_round: number;
  team: string;
  team_abbr: string;
  player_name: string;
  position: string;
  school: string;
  tie_grade: string;
  is_trade: boolean;
  trade_details?: TradeDetails;
  analysis?: string;
  surprise_score?: number;
}

export interface TradeDetails {
  trade_id: string;
  team_a: string;
  team_a_abbr: string;
  team_b: string;
  team_b_abbr: string;
  team_a_gives: (string | number)[];
  team_b_gives: (string | number)[];
  trade_value_diff: number;
  headline: string;
}

export type SimulationMode = 'auto' | 'pick-team' | 'war-room';
export type SimulationStatus = 'running' | 'paused' | 'complete' | 'waiting-for-user';
export type SimulationSpeed = 'realtime' | 'fast' | 'instant';

export interface SimulationState {
  id: string;
  mode: SimulationMode;
  user_team?: string;
  chaos_factor: number;
  current_pick: number;
  total_picks: number;
  picks: DraftPick[];
  trades: TradeDetails[];
  available_prospects: Prospect[];
  status: SimulationStatus;
  current_round: number;
  clock_seconds?: number;
}

export interface Prospect {
  id: number;
  name: string;
  position: string;
  school: string;
  tie_grade: string;
  tie_tier: string;
  overall_rank: number;
  position_rank: number;
  grade: number;
}

export interface TeamDraftGrade {
  team: string;
  team_abbr: string;
  grade: string;
  score: number;
  picks: DraftPick[];
  best_pick?: DraftPick;
  biggest_reach?: DraftPick;
  summary: string;
}

export interface SimulationConfig {
  mode: SimulationMode;
  team?: string;
  chaos_factor?: number;
  speed?: SimulationSpeed;
  rounds?: number;
}
