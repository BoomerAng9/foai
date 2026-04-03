export interface NFLTeam {
  teamName: string;
  abbreviation: string;
  city: string;
  conference: 'AFC' | 'NFC';
  division: 'East' | 'North' | 'South' | 'West';
}

export const NFL_TEAMS: NFLTeam[] = [
  // AFC East
  { teamName: 'Buffalo Bills', abbreviation: 'BUF', city: 'Buffalo', conference: 'AFC', division: 'East' },
  { teamName: 'Miami Dolphins', abbreviation: 'MIA', city: 'Miami', conference: 'AFC', division: 'East' },
  { teamName: 'New England Patriots', abbreviation: 'NE', city: 'Foxborough', conference: 'AFC', division: 'East' },
  { teamName: 'New York Jets', abbreviation: 'NYJ', city: 'East Rutherford', conference: 'AFC', division: 'East' },
  // AFC North
  { teamName: 'Baltimore Ravens', abbreviation: 'BAL', city: 'Baltimore', conference: 'AFC', division: 'North' },
  { teamName: 'Cincinnati Bengals', abbreviation: 'CIN', city: 'Cincinnati', conference: 'AFC', division: 'North' },
  { teamName: 'Cleveland Browns', abbreviation: 'CLE', city: 'Cleveland', conference: 'AFC', division: 'North' },
  { teamName: 'Pittsburgh Steelers', abbreviation: 'PIT', city: 'Pittsburgh', conference: 'AFC', division: 'North' },
  // AFC South
  { teamName: 'Houston Texans', abbreviation: 'HOU', city: 'Houston', conference: 'AFC', division: 'South' },
  { teamName: 'Indianapolis Colts', abbreviation: 'IND', city: 'Indianapolis', conference: 'AFC', division: 'South' },
  { teamName: 'Jacksonville Jaguars', abbreviation: 'JAX', city: 'Jacksonville', conference: 'AFC', division: 'South' },
  { teamName: 'Tennessee Titans', abbreviation: 'TEN', city: 'Nashville', conference: 'AFC', division: 'South' },
  // AFC West
  { teamName: 'Denver Broncos', abbreviation: 'DEN', city: 'Denver', conference: 'AFC', division: 'West' },
  { teamName: 'Kansas City Chiefs', abbreviation: 'KC', city: 'Kansas City', conference: 'AFC', division: 'West' },
  { teamName: 'Las Vegas Raiders', abbreviation: 'LV', city: 'Las Vegas', conference: 'AFC', division: 'West' },
  { teamName: 'Los Angeles Chargers', abbreviation: 'LAC', city: 'Los Angeles', conference: 'AFC', division: 'West' },
  // NFC East
  { teamName: 'Dallas Cowboys', abbreviation: 'DAL', city: 'Arlington', conference: 'NFC', division: 'East' },
  { teamName: 'New York Giants', abbreviation: 'NYG', city: 'East Rutherford', conference: 'NFC', division: 'East' },
  { teamName: 'Philadelphia Eagles', abbreviation: 'PHI', city: 'Philadelphia', conference: 'NFC', division: 'East' },
  { teamName: 'Washington Commanders', abbreviation: 'WAS', city: 'Landover', conference: 'NFC', division: 'East' },
  // NFC North
  { teamName: 'Chicago Bears', abbreviation: 'CHI', city: 'Chicago', conference: 'NFC', division: 'North' },
  { teamName: 'Detroit Lions', abbreviation: 'DET', city: 'Detroit', conference: 'NFC', division: 'North' },
  { teamName: 'Green Bay Packers', abbreviation: 'GB', city: 'Green Bay', conference: 'NFC', division: 'North' },
  { teamName: 'Minnesota Vikings', abbreviation: 'MIN', city: 'Minneapolis', conference: 'NFC', division: 'North' },
  // NFC South
  { teamName: 'Atlanta Falcons', abbreviation: 'ATL', city: 'Atlanta', conference: 'NFC', division: 'South' },
  { teamName: 'Carolina Panthers', abbreviation: 'CAR', city: 'Charlotte', conference: 'NFC', division: 'South' },
  { teamName: 'New Orleans Saints', abbreviation: 'NO', city: 'New Orleans', conference: 'NFC', division: 'South' },
  { teamName: 'Tampa Bay Buccaneers', abbreviation: 'TB', city: 'Tampa', conference: 'NFC', division: 'South' },
  // NFC West
  { teamName: 'Arizona Cardinals', abbreviation: 'ARI', city: 'Glendale', conference: 'NFC', division: 'West' },
  { teamName: 'Los Angeles Rams', abbreviation: 'LAR', city: 'Inglewood', conference: 'NFC', division: 'West' },
  { teamName: 'San Francisco 49ers', abbreviation: 'SF', city: 'Santa Clara', conference: 'NFC', division: 'West' },
  { teamName: 'Seattle Seahawks', abbreviation: 'SEA', city: 'Seattle', conference: 'NFC', division: 'West' },
];
