/**
 * Franchise Simulator Types
 */

export type Sport = 'nfl' | 'nba' | 'mlb';

export interface FranchiseTeam {
  id: string;
  sport: Sport;
  name: string;
  abbreviation: string;
  city: string;
  conference: string;
  division: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
}

export interface Player {
  id: string;
  name: string;
  position: string;
  team?: string;
  age: number;
  overallRating: number;
  tieGrade?: number;
  school?: string;
  contract?: {
    years: number;
    perYear: number; // millions
    guaranteed: number;
  };
  stats?: Record<string, number | string>;
  available: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  title: string;
  role: StaffRole;
  team?: string;
  tenure?: number;
  scheme?: string;
  philosophy?: string;
  record?: { wins: number; losses: number; ties?: number };
  trackRecord?: string;
  available: boolean;
}

export type StaffRole =
  | 'owner'
  | 'gm'
  | 'head_coach'
  | 'offensive_coordinator'
  | 'defensive_coordinator'
  | 'special_teams_coordinator'
  | 'qb_coach'
  | 'rb_coach'
  | 'wr_coach'
  | 'ol_coach'
  | 'dl_coach'
  | 'lb_coach'
  | 'db_coach'
  | 'scouting_director';

export interface RosterSlot {
  position: string;
  label: string;
  group: 'offense' | 'defense' | 'special_teams' | 'starters' | 'bench' | 'rotation' | 'bullpen';
  player?: Player;
}

export interface OrgChartNode {
  role: StaffRole;
  label: string;
  level: number;
  parentRole?: StaffRole;
  staff?: StaffMember;
}

export interface SimulationResult {
  capImpact: number;
  fitScore: number;
  winImpact: number;
  narrative?: string;
}
