/**
 * Multi-sport team data for Franchise Simulator.
 * NFL data imported from existing draft/teams module.
 * NBA and MLB data defined here.
 */

import type { FranchiseTeam, Sport } from './types';
import { NFL_TEAMS_FULL } from '@/lib/draft/teams';

// Convert existing NFL teams to FranchiseTeam format
const NFL_TEAMS: FranchiseTeam[] = NFL_TEAMS_FULL.map(t => ({
  id: `nfl-${t.abbreviation.toLowerCase()}`,
  sport: 'nfl' as Sport,
  name: t.name,
  abbreviation: t.abbreviation,
  city: t.city,
  conference: t.conference,
  division: t.division,
  primaryColor: t.primaryColor,
  secondaryColor: t.secondaryColor,
  textColor: t.textColor,
}));

const NBA_TEAMS: FranchiseTeam[] = [
  // Eastern Conference - Atlantic
  { id: 'nba-bos', sport: 'nba', name: 'Boston Celtics', abbreviation: 'BOS', city: 'Boston', conference: 'Eastern', division: 'Atlantic', primaryColor: '#007A33', secondaryColor: '#BA9653', textColor: '#FFFFFF' },
  { id: 'nba-bkn', sport: 'nba', name: 'Brooklyn Nets', abbreviation: 'BKN', city: 'Brooklyn', conference: 'Eastern', division: 'Atlantic', primaryColor: '#000000', secondaryColor: '#FFFFFF', textColor: '#FFFFFF' },
  { id: 'nba-nyk', sport: 'nba', name: 'New York Knicks', abbreviation: 'NYK', city: 'New York', conference: 'Eastern', division: 'Atlantic', primaryColor: '#006BB6', secondaryColor: '#F58426', textColor: '#FFFFFF' },
  { id: 'nba-phi', sport: 'nba', name: 'Philadelphia 76ers', abbreviation: 'PHI', city: 'Philadelphia', conference: 'Eastern', division: 'Atlantic', primaryColor: '#006BB6', secondaryColor: '#ED174C', textColor: '#FFFFFF' },
  { id: 'nba-tor', sport: 'nba', name: 'Toronto Raptors', abbreviation: 'TOR', city: 'Toronto', conference: 'Eastern', division: 'Atlantic', primaryColor: '#CE1141', secondaryColor: '#000000', textColor: '#FFFFFF' },
  // Eastern - Central
  { id: 'nba-chi', sport: 'nba', name: 'Chicago Bulls', abbreviation: 'CHI', city: 'Chicago', conference: 'Eastern', division: 'Central', primaryColor: '#CE1141', secondaryColor: '#000000', textColor: '#FFFFFF' },
  { id: 'nba-cle', sport: 'nba', name: 'Cleveland Cavaliers', abbreviation: 'CLE', city: 'Cleveland', conference: 'Eastern', division: 'Central', primaryColor: '#860038', secondaryColor: '#041E42', textColor: '#FFFFFF' },
  { id: 'nba-det', sport: 'nba', name: 'Detroit Pistons', abbreviation: 'DET', city: 'Detroit', conference: 'Eastern', division: 'Central', primaryColor: '#C8102E', secondaryColor: '#1D42BA', textColor: '#FFFFFF' },
  { id: 'nba-ind', sport: 'nba', name: 'Indiana Pacers', abbreviation: 'IND', city: 'Indianapolis', conference: 'Eastern', division: 'Central', primaryColor: '#002D62', secondaryColor: '#FDBB30', textColor: '#FFFFFF' },
  { id: 'nba-mil', sport: 'nba', name: 'Milwaukee Bucks', abbreviation: 'MIL', city: 'Milwaukee', conference: 'Eastern', division: 'Central', primaryColor: '#00471B', secondaryColor: '#EEE1C6', textColor: '#FFFFFF' },
  // Eastern - Southeast
  { id: 'nba-atl', sport: 'nba', name: 'Atlanta Hawks', abbreviation: 'ATL', city: 'Atlanta', conference: 'Eastern', division: 'Southeast', primaryColor: '#E03A3E', secondaryColor: '#C1D32F', textColor: '#FFFFFF' },
  { id: 'nba-cha', sport: 'nba', name: 'Charlotte Hornets', abbreviation: 'CHA', city: 'Charlotte', conference: 'Eastern', division: 'Southeast', primaryColor: '#1D1160', secondaryColor: '#00788C', textColor: '#FFFFFF' },
  { id: 'nba-mia', sport: 'nba', name: 'Miami Heat', abbreviation: 'MIA', city: 'Miami', conference: 'Eastern', division: 'Southeast', primaryColor: '#98002E', secondaryColor: '#F9A01B', textColor: '#FFFFFF' },
  { id: 'nba-orl', sport: 'nba', name: 'Orlando Magic', abbreviation: 'ORL', city: 'Orlando', conference: 'Eastern', division: 'Southeast', primaryColor: '#0077C0', secondaryColor: '#C4CED4', textColor: '#FFFFFF' },
  { id: 'nba-was', sport: 'nba', name: 'Washington Wizards', abbreviation: 'WAS', city: 'Washington', conference: 'Eastern', division: 'Southeast', primaryColor: '#002B5C', secondaryColor: '#E31837', textColor: '#FFFFFF' },
  // Western Conference - Northwest
  { id: 'nba-den', sport: 'nba', name: 'Denver Nuggets', abbreviation: 'DEN', city: 'Denver', conference: 'Western', division: 'Northwest', primaryColor: '#0E2240', secondaryColor: '#FEC524', textColor: '#FFFFFF' },
  { id: 'nba-min', sport: 'nba', name: 'Minnesota Timberwolves', abbreviation: 'MIN', city: 'Minneapolis', conference: 'Western', division: 'Northwest', primaryColor: '#0C2340', secondaryColor: '#236192', textColor: '#FFFFFF' },
  { id: 'nba-okc', sport: 'nba', name: 'Oklahoma City Thunder', abbreviation: 'OKC', city: 'Oklahoma City', conference: 'Western', division: 'Northwest', primaryColor: '#007AC1', secondaryColor: '#EF6100', textColor: '#FFFFFF' },
  { id: 'nba-por', sport: 'nba', name: 'Portland Trail Blazers', abbreviation: 'POR', city: 'Portland', conference: 'Western', division: 'Northwest', primaryColor: '#E03A3E', secondaryColor: '#000000', textColor: '#FFFFFF' },
  { id: 'nba-uta', sport: 'nba', name: 'Utah Jazz', abbreviation: 'UTA', city: 'Salt Lake City', conference: 'Western', division: 'Northwest', primaryColor: '#002B5C', secondaryColor: '#00471B', textColor: '#FFFFFF' },
  // Western - Pacific
  { id: 'nba-gsw', sport: 'nba', name: 'Golden State Warriors', abbreviation: 'GSW', city: 'San Francisco', conference: 'Western', division: 'Pacific', primaryColor: '#1D428A', secondaryColor: '#FFC72C', textColor: '#FFFFFF' },
  { id: 'nba-lac', sport: 'nba', name: 'Los Angeles Clippers', abbreviation: 'LAC', city: 'Los Angeles', conference: 'Western', division: 'Pacific', primaryColor: '#C8102E', secondaryColor: '#1D428A', textColor: '#FFFFFF' },
  { id: 'nba-lal', sport: 'nba', name: 'Los Angeles Lakers', abbreviation: 'LAL', city: 'Los Angeles', conference: 'Western', division: 'Pacific', primaryColor: '#552583', secondaryColor: '#FDB927', textColor: '#FFFFFF' },
  { id: 'nba-phx', sport: 'nba', name: 'Phoenix Suns', abbreviation: 'PHX', city: 'Phoenix', conference: 'Western', division: 'Pacific', primaryColor: '#1D1160', secondaryColor: '#E56020', textColor: '#FFFFFF' },
  { id: 'nba-sac', sport: 'nba', name: 'Sacramento Kings', abbreviation: 'SAC', city: 'Sacramento', conference: 'Western', division: 'Pacific', primaryColor: '#5A2D81', secondaryColor: '#63727A', textColor: '#FFFFFF' },
  // Western - Southwest
  { id: 'nba-dal', sport: 'nba', name: 'Dallas Mavericks', abbreviation: 'DAL', city: 'Dallas', conference: 'Western', division: 'Southwest', primaryColor: '#00538C', secondaryColor: '#002B5E', textColor: '#FFFFFF' },
  { id: 'nba-hou', sport: 'nba', name: 'Houston Rockets', abbreviation: 'HOU', city: 'Houston', conference: 'Western', division: 'Southwest', primaryColor: '#CE1141', secondaryColor: '#000000', textColor: '#FFFFFF' },
  { id: 'nba-mem', sport: 'nba', name: 'Memphis Grizzlies', abbreviation: 'MEM', city: 'Memphis', conference: 'Western', division: 'Southwest', primaryColor: '#5D76A9', secondaryColor: '#12173F', textColor: '#FFFFFF' },
  { id: 'nba-nop', sport: 'nba', name: 'New Orleans Pelicans', abbreviation: 'NOP', city: 'New Orleans', conference: 'Western', division: 'Southwest', primaryColor: '#0C2340', secondaryColor: '#C8102E', textColor: '#FFFFFF' },
  { id: 'nba-sas', sport: 'nba', name: 'San Antonio Spurs', abbreviation: 'SAS', city: 'San Antonio', conference: 'Western', division: 'Southwest', primaryColor: '#C4CED4', secondaryColor: '#000000', textColor: '#000000' },
];

const MLB_TEAMS: FranchiseTeam[] = [
  // American League - East
  { id: 'mlb-bal', sport: 'mlb', name: 'Baltimore Orioles', abbreviation: 'BAL', city: 'Baltimore', conference: 'American', division: 'East', primaryColor: '#DF4601', secondaryColor: '#000000', textColor: '#FFFFFF' },
  { id: 'mlb-bos', sport: 'mlb', name: 'Boston Red Sox', abbreviation: 'BOS', city: 'Boston', conference: 'American', division: 'East', primaryColor: '#BD3039', secondaryColor: '#0C2340', textColor: '#FFFFFF' },
  { id: 'mlb-nyy', sport: 'mlb', name: 'New York Yankees', abbreviation: 'NYY', city: 'New York', conference: 'American', division: 'East', primaryColor: '#003087', secondaryColor: '#E4002C', textColor: '#FFFFFF' },
  { id: 'mlb-tb', sport: 'mlb', name: 'Tampa Bay Rays', abbreviation: 'TB', city: 'St. Petersburg', conference: 'American', division: 'East', primaryColor: '#092C5C', secondaryColor: '#8FBCE6', textColor: '#FFFFFF' },
  { id: 'mlb-tor', sport: 'mlb', name: 'Toronto Blue Jays', abbreviation: 'TOR', city: 'Toronto', conference: 'American', division: 'East', primaryColor: '#134A8E', secondaryColor: '#1D2D5C', textColor: '#FFFFFF' },
  // American League - Central
  { id: 'mlb-cws', sport: 'mlb', name: 'Chicago White Sox', abbreviation: 'CWS', city: 'Chicago', conference: 'American', division: 'Central', primaryColor: '#27251F', secondaryColor: '#C4CED4', textColor: '#FFFFFF' },
  { id: 'mlb-cle', sport: 'mlb', name: 'Cleveland Guardians', abbreviation: 'CLE', city: 'Cleveland', conference: 'American', division: 'Central', primaryColor: '#00385D', secondaryColor: '#E50022', textColor: '#FFFFFF' },
  { id: 'mlb-det', sport: 'mlb', name: 'Detroit Tigers', abbreviation: 'DET', city: 'Detroit', conference: 'American', division: 'Central', primaryColor: '#0C2340', secondaryColor: '#FA4616', textColor: '#FFFFFF' },
  { id: 'mlb-kc', sport: 'mlb', name: 'Kansas City Royals', abbreviation: 'KC', city: 'Kansas City', conference: 'American', division: 'Central', primaryColor: '#004687', secondaryColor: '#BD9B60', textColor: '#FFFFFF' },
  { id: 'mlb-min', sport: 'mlb', name: 'Minnesota Twins', abbreviation: 'MIN', city: 'Minneapolis', conference: 'American', division: 'Central', primaryColor: '#002B5C', secondaryColor: '#D31145', textColor: '#FFFFFF' },
  // American League - West
  { id: 'mlb-hou', sport: 'mlb', name: 'Houston Astros', abbreviation: 'HOU', city: 'Houston', conference: 'American', division: 'West', primaryColor: '#002D62', secondaryColor: '#EB6E1F', textColor: '#FFFFFF' },
  { id: 'mlb-laa', sport: 'mlb', name: 'Los Angeles Angels', abbreviation: 'LAA', city: 'Anaheim', conference: 'American', division: 'West', primaryColor: '#BA0021', secondaryColor: '#003263', textColor: '#FFFFFF' },
  { id: 'mlb-oak', sport: 'mlb', name: 'Oakland Athletics', abbreviation: 'OAK', city: 'Oakland', conference: 'American', division: 'West', primaryColor: '#003831', secondaryColor: '#EFB21E', textColor: '#FFFFFF' },
  { id: 'mlb-sea', sport: 'mlb', name: 'Seattle Mariners', abbreviation: 'SEA', city: 'Seattle', conference: 'American', division: 'West', primaryColor: '#0C2C56', secondaryColor: '#005C5C', textColor: '#FFFFFF' },
  { id: 'mlb-tex', sport: 'mlb', name: 'Texas Rangers', abbreviation: 'TEX', city: 'Arlington', conference: 'American', division: 'West', primaryColor: '#003278', secondaryColor: '#C0111F', textColor: '#FFFFFF' },
  // National League - East
  { id: 'mlb-atl', sport: 'mlb', name: 'Atlanta Braves', abbreviation: 'ATL', city: 'Atlanta', conference: 'National', division: 'East', primaryColor: '#CE1141', secondaryColor: '#13274F', textColor: '#FFFFFF' },
  { id: 'mlb-mia', sport: 'mlb', name: 'Miami Marlins', abbreviation: 'MIA', city: 'Miami', conference: 'National', division: 'East', primaryColor: '#00A3E0', secondaryColor: '#EF3340', textColor: '#FFFFFF' },
  { id: 'mlb-nym', sport: 'mlb', name: 'New York Mets', abbreviation: 'NYM', city: 'New York', conference: 'National', division: 'East', primaryColor: '#002D72', secondaryColor: '#FF5910', textColor: '#FFFFFF' },
  { id: 'mlb-phi', sport: 'mlb', name: 'Philadelphia Phillies', abbreviation: 'PHI', city: 'Philadelphia', conference: 'National', division: 'East', primaryColor: '#E81828', secondaryColor: '#002D72', textColor: '#FFFFFF' },
  { id: 'mlb-was', sport: 'mlb', name: 'Washington Nationals', abbreviation: 'WAS', city: 'Washington', conference: 'National', division: 'East', primaryColor: '#AB0003', secondaryColor: '#14225A', textColor: '#FFFFFF' },
  // National League - Central
  { id: 'mlb-chc', sport: 'mlb', name: 'Chicago Cubs', abbreviation: 'CHC', city: 'Chicago', conference: 'National', division: 'Central', primaryColor: '#0E3386', secondaryColor: '#CC3433', textColor: '#FFFFFF' },
  { id: 'mlb-cin', sport: 'mlb', name: 'Cincinnati Reds', abbreviation: 'CIN', city: 'Cincinnati', conference: 'National', division: 'Central', primaryColor: '#C6011F', secondaryColor: '#000000', textColor: '#FFFFFF' },
  { id: 'mlb-mil', sport: 'mlb', name: 'Milwaukee Brewers', abbreviation: 'MIL', city: 'Milwaukee', conference: 'National', division: 'Central', primaryColor: '#FFC52F', secondaryColor: '#12284B', textColor: '#12284B' },
  { id: 'mlb-pit', sport: 'mlb', name: 'Pittsburgh Pirates', abbreviation: 'PIT', city: 'Pittsburgh', conference: 'National', division: 'Central', primaryColor: '#27251F', secondaryColor: '#FDB827', textColor: '#FFFFFF' },
  { id: 'mlb-stl', sport: 'mlb', name: 'St. Louis Cardinals', abbreviation: 'STL', city: 'St. Louis', conference: 'National', division: 'Central', primaryColor: '#C41E3A', secondaryColor: '#0C2340', textColor: '#FFFFFF' },
  // National League - West
  { id: 'mlb-ari', sport: 'mlb', name: 'Arizona Diamondbacks', abbreviation: 'ARI', city: 'Phoenix', conference: 'National', division: 'West', primaryColor: '#A71930', secondaryColor: '#E3D4AD', textColor: '#FFFFFF' },
  { id: 'mlb-col', sport: 'mlb', name: 'Colorado Rockies', abbreviation: 'COL', city: 'Denver', conference: 'National', division: 'West', primaryColor: '#33006F', secondaryColor: '#C4CED4', textColor: '#FFFFFF' },
  { id: 'mlb-lad', sport: 'mlb', name: 'Los Angeles Dodgers', abbreviation: 'LAD', city: 'Los Angeles', conference: 'National', division: 'West', primaryColor: '#005A9C', secondaryColor: '#EF3E42', textColor: '#FFFFFF' },
  { id: 'mlb-sd', sport: 'mlb', name: 'San Diego Padres', abbreviation: 'SD', city: 'San Diego', conference: 'National', division: 'West', primaryColor: '#2F241D', secondaryColor: '#FFC425', textColor: '#FFFFFF' },
  { id: 'mlb-sf', sport: 'mlb', name: 'San Francisco Giants', abbreviation: 'SF', city: 'San Francisco', conference: 'National', division: 'West', primaryColor: '#FD5A1E', secondaryColor: '#27251F', textColor: '#FFFFFF' },
];

export const ALL_TEAMS: Record<Sport, FranchiseTeam[]> = {
  nfl: NFL_TEAMS,
  nba: NBA_TEAMS,
  mlb: MLB_TEAMS,
};

export function getTeamsBySport(sport: Sport): FranchiseTeam[] {
  return ALL_TEAMS[sport] ?? [];
}

export function getTeamByAbbr(sport: Sport, abbr: string): FranchiseTeam | undefined {
  return ALL_TEAMS[sport]?.find(t => t.abbreviation === abbr);
}

/** Group teams by conference then division */
export function groupTeams(sport: Sport): Record<string, Record<string, FranchiseTeam[]>> {
  const teams = getTeamsBySport(sport);
  const grouped: Record<string, Record<string, FranchiseTeam[]>> = {};
  for (const t of teams) {
    if (!grouped[t.conference]) grouped[t.conference] = {};
    if (!grouped[t.conference][t.division]) grouped[t.conference][t.division] = [];
    grouped[t.conference][t.division].push(t);
  }
  return grouped;
}
