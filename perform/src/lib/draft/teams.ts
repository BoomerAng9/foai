/**
 * NFL Teams — Full Draft Data
 * All 32 NFL teams with colors, draft order, and positional needs for 2026.
 */

export interface NFLTeamFull {
  name: string;
  abbreviation: string;
  city: string;
  conference: 'AFC' | 'NFC';
  division: 'East' | 'North' | 'South' | 'West';
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  needs: string[];
}

export const NFL_TEAMS_FULL: NFLTeamFull[] = [
  { name: 'Buffalo Bills', abbreviation: 'BUF', city: 'Buffalo', conference: 'AFC', division: 'East', primaryColor: '#00338D', secondaryColor: '#C60C30', textColor: '#FFFFFF', needs: ['WR', 'DT', 'CB'] },
  { name: 'Miami Dolphins', abbreviation: 'MIA', city: 'Miami', conference: 'AFC', division: 'East', primaryColor: '#008E97', secondaryColor: '#FC4C02', textColor: '#FFFFFF', needs: ['OT', 'EDGE', 'LB'] },
  { name: 'New England Patriots', abbreviation: 'NE', city: 'Foxborough', conference: 'AFC', division: 'East', primaryColor: '#002244', secondaryColor: '#C60C30', textColor: '#FFFFFF', needs: ['WR', 'EDGE', 'CB'] },
  { name: 'New York Jets', abbreviation: 'NYJ', city: 'East Rutherford', conference: 'AFC', division: 'East', primaryColor: '#125740', secondaryColor: '#FFFFFF', textColor: '#FFFFFF', needs: ['OT', 'WR', 'CB'] },
  { name: 'Baltimore Ravens', abbreviation: 'BAL', city: 'Baltimore', conference: 'AFC', division: 'North', primaryColor: '#241773', secondaryColor: '#9E7C0C', textColor: '#FFFFFF', needs: ['WR', 'OT', 'CB'] },
  { name: 'Cincinnati Bengals', abbreviation: 'CIN', city: 'Cincinnati', conference: 'AFC', division: 'North', primaryColor: '#FB4F14', secondaryColor: '#000000', textColor: '#FFFFFF', needs: ['OT', 'DT', 'EDGE'] },
  { name: 'Cleveland Browns', abbreviation: 'CLE', city: 'Cleveland', conference: 'AFC', division: 'North', primaryColor: '#FF3C00', secondaryColor: '#311D00', textColor: '#FFFFFF', needs: ['QB', 'WR', 'OT'] },
  { name: 'Pittsburgh Steelers', abbreviation: 'PIT', city: 'Pittsburgh', conference: 'AFC', division: 'North', primaryColor: '#FFB612', secondaryColor: '#101820', textColor: '#101820', needs: ['CB', 'OT', 'WR'] },
  { name: 'Houston Texans', abbreviation: 'HOU', city: 'Houston', conference: 'AFC', division: 'South', primaryColor: '#03202F', secondaryColor: '#A71930', textColor: '#FFFFFF', needs: ['OT', 'CB', 'WR'] },
  { name: 'Indianapolis Colts', abbreviation: 'IND', city: 'Indianapolis', conference: 'AFC', division: 'South', primaryColor: '#002C5F', secondaryColor: '#A2AAAD', textColor: '#FFFFFF', needs: ['WR', 'CB', 'EDGE'] },
  { name: 'Jacksonville Jaguars', abbreviation: 'JAX', city: 'Jacksonville', conference: 'AFC', division: 'South', primaryColor: '#006778', secondaryColor: '#D7A22A', textColor: '#FFFFFF', needs: ['OT', 'WR', 'EDGE'] },
  { name: 'Tennessee Titans', abbreviation: 'TEN', city: 'Nashville', conference: 'AFC', division: 'South', primaryColor: '#4B92DB', secondaryColor: '#0C2340', textColor: '#FFFFFF', needs: ['QB', 'EDGE', 'OT'] },
  { name: 'Denver Broncos', abbreviation: 'DEN', city: 'Denver', conference: 'AFC', division: 'West', primaryColor: '#FB4F14', secondaryColor: '#002244', textColor: '#FFFFFF', needs: ['WR', 'OT', 'CB'] },
  { name: 'Kansas City Chiefs', abbreviation: 'KC', city: 'Kansas City', conference: 'AFC', division: 'West', primaryColor: '#E31837', secondaryColor: '#FFB81C', textColor: '#FFFFFF', needs: ['WR', 'EDGE', 'CB'] },
  { name: 'Las Vegas Raiders', abbreviation: 'LV', city: 'Las Vegas', conference: 'AFC', division: 'West', primaryColor: '#A5ACAF', secondaryColor: '#000000', textColor: '#000000', needs: ['RB', 'WR', 'CB'] },
  { name: 'Los Angeles Chargers', abbreviation: 'LAC', city: 'Los Angeles', conference: 'AFC', division: 'West', primaryColor: '#0080C6', secondaryColor: '#FFC20E', textColor: '#FFFFFF', needs: ['WR', 'CB', 'LB'] },
  { name: 'Dallas Cowboys', abbreviation: 'DAL', city: 'Arlington', conference: 'NFC', division: 'East', primaryColor: '#003594', secondaryColor: '#869397', textColor: '#FFFFFF', needs: ['EDGE', 'CB', 'S'] },
  { name: 'New York Giants', abbreviation: 'NYG', city: 'East Rutherford', conference: 'NFC', division: 'East', primaryColor: '#0B2265', secondaryColor: '#A71930', textColor: '#FFFFFF', needs: ['EDGE', 'OT', 'WR'] },
  { name: 'Philadelphia Eagles', abbreviation: 'PHI', city: 'Philadelphia', conference: 'NFC', division: 'East', primaryColor: '#004C54', secondaryColor: '#ACC0C6', textColor: '#FFFFFF', needs: ['LB', 'S', 'EDGE'] },
  { name: 'Washington Commanders', abbreviation: 'WAS', city: 'Landover', conference: 'NFC', division: 'East', primaryColor: '#5A1414', secondaryColor: '#FFB612', textColor: '#FFFFFF', needs: ['DT', 'S', 'LB'] },
  { name: 'Chicago Bears', abbreviation: 'CHI', city: 'Chicago', conference: 'NFC', division: 'North', primaryColor: '#0B162A', secondaryColor: '#C83803', textColor: '#FFFFFF', needs: ['OT', 'CB', 'WR'] },
  { name: 'Detroit Lions', abbreviation: 'DET', city: 'Detroit', conference: 'NFC', division: 'North', primaryColor: '#0076B6', secondaryColor: '#B0B7BC', textColor: '#FFFFFF', needs: ['CB', 'EDGE', 'LB'] },
  { name: 'Green Bay Packers', abbreviation: 'GB', city: 'Green Bay', conference: 'NFC', division: 'North', primaryColor: '#203731', secondaryColor: '#FFB612', textColor: '#FFFFFF', needs: ['DT', 'EDGE', 'S'] },
  { name: 'Minnesota Vikings', abbreviation: 'MIN', city: 'Minneapolis', conference: 'NFC', division: 'North', primaryColor: '#4F2683', secondaryColor: '#FFC62F', textColor: '#FFFFFF', needs: ['IOL', 'EDGE', 'S'] },
  { name: 'Atlanta Falcons', abbreviation: 'ATL', city: 'Atlanta', conference: 'NFC', division: 'South', primaryColor: '#A71930', secondaryColor: '#000000', textColor: '#FFFFFF', needs: ['EDGE', 'DT', 'S'] },
  { name: 'Carolina Panthers', abbreviation: 'CAR', city: 'Charlotte', conference: 'NFC', division: 'South', primaryColor: '#0085CA', secondaryColor: '#101820', textColor: '#FFFFFF', needs: ['OT', 'QB', 'WR'] },
  { name: 'New Orleans Saints', abbreviation: 'NO', city: 'New Orleans', conference: 'NFC', division: 'South', primaryColor: '#D3BC8D', secondaryColor: '#101820', textColor: '#101820', needs: ['QB', 'EDGE', 'CB'] },
  { name: 'Tampa Bay Buccaneers', abbreviation: 'TB', city: 'Tampa', conference: 'NFC', division: 'South', primaryColor: '#D50A0A', secondaryColor: '#34302B', textColor: '#FFFFFF', needs: ['EDGE', 'S', 'DT'] },
  { name: 'Arizona Cardinals', abbreviation: 'ARI', city: 'Glendale', conference: 'NFC', division: 'West', primaryColor: '#97233F', secondaryColor: '#000000', textColor: '#FFFFFF', needs: ['EDGE', 'CB', 'IOL'] },
  { name: 'Los Angeles Rams', abbreviation: 'LAR', city: 'Inglewood', conference: 'NFC', division: 'West', primaryColor: '#003594', secondaryColor: '#FFA300', textColor: '#FFFFFF', needs: ['EDGE', 'CB', 'S'] },
  { name: 'San Francisco 49ers', abbreviation: 'SF', city: 'Santa Clara', conference: 'NFC', division: 'West', primaryColor: '#AA0000', secondaryColor: '#B3995D', textColor: '#FFFFFF', needs: ['QB', 'CB', 'EDGE'] },
  { name: 'Seattle Seahawks', abbreviation: 'SEA', city: 'Seattle', conference: 'NFC', division: 'West', primaryColor: '#002244', secondaryColor: '#69BE28', textColor: '#FFFFFF', needs: ['CB', 'EDGE', 'OT'] },
];

export const TEAM_MAP = new Map(NFL_TEAMS_FULL.map(t => [t.abbreviation, t]));

export function getTeam(abbr: string): NFLTeamFull {
  return TEAM_MAP.get(abbr) || {
    name: abbr, abbreviation: abbr, city: '', conference: 'AFC', division: 'East',
    primaryColor: '#6B7280', secondaryColor: '#374151', textColor: '#FFFFFF', needs: [],
  };
}

export const FIRST_ROUND_ORDER: string[] = [
  'LV', 'NYJ', 'ARI', 'TEN', 'NYG', 'CLE', 'CAR', 'NE',
  'NO', 'CHI', 'SF', 'DAL', 'MIA', 'CIN', 'IND', 'JAX',
  'SEA', 'ATL', 'LAC', 'HOU', 'PIT', 'DEN', 'GB', 'MIN',
  'TB', 'LAR', 'BAL', 'DET', 'BUF', 'WAS', 'PHI', 'KC',
];
