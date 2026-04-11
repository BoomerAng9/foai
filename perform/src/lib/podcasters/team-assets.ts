/**
 * NFL Team Assets — Static data for instant client-side rendering.
 * DB has the full data; this is for UI theming, team selectors, and color overlays.
 */

export interface NFLTeam {
  name: string;
  city: string;
  abbrev: string;
  conference: 'AFC' | 'NFC';
  division: 'East' | 'North' | 'South' | 'West';
  primaryColor: string;
  secondaryColor: string;
}

export const NFL_TEAMS: NFLTeam[] = [
  // AFC East
  { name: 'Bills', city: 'Buffalo', abbrev: 'BUF', conference: 'AFC', division: 'East', primaryColor: '#00338D', secondaryColor: '#C60C30' },
  { name: 'Dolphins', city: 'Miami', abbrev: 'MIA', conference: 'AFC', division: 'East', primaryColor: '#008E97', secondaryColor: '#FC4C02' },
  { name: 'Patriots', city: 'New England', abbrev: 'NE', conference: 'AFC', division: 'East', primaryColor: '#002244', secondaryColor: '#C60C30' },
  { name: 'Jets', city: 'New York', abbrev: 'NYJ', conference: 'AFC', division: 'East', primaryColor: '#125740', secondaryColor: '#FFFFFF' },
  // AFC North
  { name: 'Ravens', city: 'Baltimore', abbrev: 'BAL', conference: 'AFC', division: 'North', primaryColor: '#241773', secondaryColor: '#9E7C0C' },
  { name: 'Bengals', city: 'Cincinnati', abbrev: 'CIN', conference: 'AFC', division: 'North', primaryColor: '#FB4F14', secondaryColor: '#000000' },
  { name: 'Browns', city: 'Cleveland', abbrev: 'CLE', conference: 'AFC', division: 'North', primaryColor: '#311D00', secondaryColor: '#FF3C00' },
  { name: 'Steelers', city: 'Pittsburgh', abbrev: 'PIT', conference: 'AFC', division: 'North', primaryColor: '#FFB612', secondaryColor: '#101820' },
  // AFC South
  { name: 'Texans', city: 'Houston', abbrev: 'HOU', conference: 'AFC', division: 'South', primaryColor: '#03202F', secondaryColor: '#A71930' },
  { name: 'Colts', city: 'Indianapolis', abbrev: 'IND', conference: 'AFC', division: 'South', primaryColor: '#002C5F', secondaryColor: '#A2AAAD' },
  { name: 'Jaguars', city: 'Jacksonville', abbrev: 'JAX', conference: 'AFC', division: 'South', primaryColor: '#006778', secondaryColor: '#9F792C' },
  { name: 'Titans', city: 'Tennessee', abbrev: 'TEN', conference: 'AFC', division: 'South', primaryColor: '#0C2340', secondaryColor: '#4B92DB' },
  // AFC West
  { name: 'Broncos', city: 'Denver', abbrev: 'DEN', conference: 'AFC', division: 'West', primaryColor: '#FB4F14', secondaryColor: '#002244' },
  { name: 'Chiefs', city: 'Kansas City', abbrev: 'KC', conference: 'AFC', division: 'West', primaryColor: '#E31837', secondaryColor: '#FFB81C' },
  { name: 'Raiders', city: 'Las Vegas', abbrev: 'LV', conference: 'AFC', division: 'West', primaryColor: '#000000', secondaryColor: '#A5ACAF' },
  { name: 'Chargers', city: 'Los Angeles', abbrev: 'LAC', conference: 'AFC', division: 'West', primaryColor: '#0080C6', secondaryColor: '#FFC20E' },
  // NFC East
  { name: 'Cowboys', city: 'Dallas', abbrev: 'DAL', conference: 'NFC', division: 'East', primaryColor: '#003594', secondaryColor: '#869397' },
  { name: 'Giants', city: 'New York', abbrev: 'NYG', conference: 'NFC', division: 'East', primaryColor: '#0B2265', secondaryColor: '#A71930' },
  { name: 'Eagles', city: 'Philadelphia', abbrev: 'PHI', conference: 'NFC', division: 'East', primaryColor: '#004C54', secondaryColor: '#A5ACAF' },
  { name: 'Commanders', city: 'Washington', abbrev: 'WAS', conference: 'NFC', division: 'East', primaryColor: '#5A1414', secondaryColor: '#FFB612' },
  // NFC North
  { name: 'Bears', city: 'Chicago', abbrev: 'CHI', conference: 'NFC', division: 'North', primaryColor: '#0B162A', secondaryColor: '#C83803' },
  { name: 'Lions', city: 'Detroit', abbrev: 'DET', conference: 'NFC', division: 'North', primaryColor: '#0076B6', secondaryColor: '#B0B7BC' },
  { name: 'Packers', city: 'Green Bay', abbrev: 'GB', conference: 'NFC', division: 'North', primaryColor: '#203731', secondaryColor: '#FFB612' },
  { name: 'Vikings', city: 'Minnesota', abbrev: 'MIN', conference: 'NFC', division: 'North', primaryColor: '#4F2683', secondaryColor: '#FFC62F' },
  // NFC South
  { name: 'Falcons', city: 'Atlanta', abbrev: 'ATL', conference: 'NFC', division: 'South', primaryColor: '#A71930', secondaryColor: '#000000' },
  { name: 'Panthers', city: 'Carolina', abbrev: 'CAR', conference: 'NFC', division: 'South', primaryColor: '#0085CA', secondaryColor: '#101820' },
  { name: 'Saints', city: 'New Orleans', abbrev: 'NO', conference: 'NFC', division: 'South', primaryColor: '#D3BC8D', secondaryColor: '#101820' },
  { name: 'Buccaneers', city: 'Tampa Bay', abbrev: 'TB', conference: 'NFC', division: 'South', primaryColor: '#D50A0A', secondaryColor: '#34302B' },
  // NFC West
  { name: '49ers', city: 'San Francisco', abbrev: 'SF', conference: 'NFC', division: 'West', primaryColor: '#AA0000', secondaryColor: '#B3995D' },
  { name: 'Cardinals', city: 'Arizona', abbrev: 'ARI', conference: 'NFC', division: 'West', primaryColor: '#97233F', secondaryColor: '#000000' },
  { name: 'Rams', city: 'Los Angeles', abbrev: 'LAR', conference: 'NFC', division: 'West', primaryColor: '#003594', secondaryColor: '#FFA300' },
  { name: 'Seahawks', city: 'Seattle', abbrev: 'SEA', conference: 'NFC', division: 'West', primaryColor: '#002244', secondaryColor: '#69BE28' },
];

export function getTeam(abbrev: string): NFLTeam | undefined {
  return NFL_TEAMS.find(t => t.abbrev === abbrev);
}

export function getTeamsByDivision(conference: string, division: string): NFLTeam[] {
  return NFL_TEAMS.filter(t => t.conference === conference && t.division === division);
}

export function getTeamsByConference(conference: string): NFLTeam[] {
  return NFL_TEAMS.filter(t => t.conference === conference);
}
