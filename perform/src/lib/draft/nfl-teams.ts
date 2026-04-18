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

/**
 * NFL team color palette for the card prompt engine.
 * `colorPhrase` is inserted directly into the helmet/jersey clause in card-styles.ts
 * (via athleteVisual() reveal state) — so it must read as a natural descriptor,
 * not a list. Hex codes retained for any future CSS use.
 * `helmet` describes the characteristic shell + stripe shape without using team
 * names or marks (which the AI must never render — see card-styles.ts rules).
 */
export interface NFLTeamColors {
  primary: string;       // hex
  secondary: string;     // hex
  tertiary?: string;     // hex (optional accent)
  colorPhrase: string;   // natural-language descriptor for prompts
  helmet: string;        // descriptor for helmet shell + stripe
}

export const NFL_TEAM_COLORS: Record<string, NFLTeamColors> = {
  BUF: { primary: '#00338D', secondary: '#C60C30', colorPhrase: 'royal blue and red', helmet: 'royal blue helmet with red stripe' },
  MIA: { primary: '#008E97', secondary: '#FC4C02', tertiary: '#005778', colorPhrase: 'aqua teal and coral orange', helmet: 'aqua teal helmet with orange stripe' },
  NE:  { primary: '#002244', secondary: '#C60C30', tertiary: '#B0B7BC', colorPhrase: 'navy blue, red, and silver', helmet: 'silver helmet with navy and red stripe' },
  NYJ: { primary: '#115740', secondary: '#FFFFFF', colorPhrase: 'hunter green and white', helmet: 'hunter green helmet with white stripe' },

  BAL: { primary: '#241773', secondary: '#000000', tertiary: '#9E7C0C', colorPhrase: 'deep purple and black with gold trim', helmet: 'black helmet with purple and gold stripe' },
  CIN: { primary: '#FB4F14', secondary: '#000000', colorPhrase: 'orange and black tiger-striped', helmet: 'black helmet with orange tiger stripes' },
  CLE: { primary: '#311D00', secondary: '#FF3C00', colorPhrase: 'seal brown and orange', helmet: 'solid orange helmet (no stripe)' },
  PIT: { primary: '#FFB612', secondary: '#101820', colorPhrase: 'black and yellow gold', helmet: 'black helmet with yellow stripe' },

  HOU: { primary: '#03202F', secondary: '#A71930', colorPhrase: 'deep navy and battle red', helmet: 'deep navy helmet with red accents' },
  IND: { primary: '#002C5F', secondary: '#A2AAAD', colorPhrase: 'royal blue and white', helmet: 'white helmet with royal blue stripe' },
  JAX: { primary: '#006778', secondary: '#D7A22A', tertiary: '#101820', colorPhrase: 'teal, black, and gold', helmet: 'black helmet with teal and gold accents' },
  TEN: { primary: '#0C2340', secondary: '#4B92DB', tertiary: '#C8102E', colorPhrase: 'navy, titan blue, and red', helmet: 'navy helmet with titan-blue and red flame' },

  DEN: { primary: '#FB4F14', secondary: '#002244', colorPhrase: 'burnt orange and navy blue', helmet: 'navy helmet with orange stripe' },
  KC:  { primary: '#E31837', secondary: '#FFB81C', colorPhrase: 'red and gold', helmet: 'red helmet with gold stripe and arrowhead shape' },
  LV:  { primary: '#000000', secondary: '#A5ACAF', colorPhrase: 'black and silver', helmet: 'silver helmet with black stripe' },
  LAC: { primary: '#0080C6', secondary: '#FFC20E', tertiary: '#FFFFFF', colorPhrase: 'powder blue, gold, and white', helmet: 'white helmet with powder-blue lightning bolt and gold trim' },

  DAL: { primary: '#041E42', secondary: '#869397', tertiary: '#FFFFFF', colorPhrase: 'navy blue and silver with white', helmet: 'silver helmet with blue stripe and star shape' },
  NYG: { primary: '#0B2265', secondary: '#A71930', tertiary: '#A5ACAF', colorPhrase: 'royal blue, red, and gray', helmet: 'royal blue helmet with red and white stripe' },
  PHI: { primary: '#004C54', secondary: '#A5ACAF', tertiary: '#000000', colorPhrase: 'midnight green and silver', helmet: 'midnight green helmet with silver wing motif' },
  WAS: { primary: '#5A1414', secondary: '#FFB612', colorPhrase: 'burgundy and gold', helmet: 'burgundy helmet with gold stripe and W mark' },

  CHI: { primary: '#0B162A', secondary: '#C83803', colorPhrase: 'navy blue and burnt orange', helmet: 'navy helmet with orange stripe' },
  DET: { primary: '#0076B6', secondary: '#B0B7BC', colorPhrase: 'Honolulu blue and silver', helmet: 'silver helmet with blue stripe and leaping motif' },
  GB:  { primary: '#203731', secondary: '#FFB612', colorPhrase: 'dark green and gold', helmet: 'gold helmet with green stripe' },
  MIN: { primary: '#4F2683', secondary: '#FFC62F', colorPhrase: 'purple and gold', helmet: 'purple helmet with gold horn motif and white stripe' },

  ATL: { primary: '#A71930', secondary: '#000000', tertiary: '#A5ACAF', colorPhrase: 'red, black, and silver', helmet: 'matte black helmet with red accents' },
  CAR: { primary: '#0085CA', secondary: '#101820', tertiary: '#BFC0BF', colorPhrase: 'carolina blue, black, and silver', helmet: 'black helmet with carolina-blue and silver trim' },
  NO:  { primary: '#D3BC8D', secondary: '#101820', colorPhrase: 'old gold and black', helmet: 'gold helmet with black fleur-de-lis motif' },
  TB:  { primary: '#D50A0A', secondary: '#34302B', tertiary: '#FF7900', colorPhrase: 'buccaneer red, pewter, and orange', helmet: 'red helmet with pewter and orange accents' },

  ARI: { primary: '#97233F', secondary: '#000000', tertiary: '#FFB612', colorPhrase: 'cardinal red, black, and yellow', helmet: 'white helmet with cardinal-red bird profile' },
  LAR: { primary: '#003594', secondary: '#FFA300', tertiary: '#FFFFFF', colorPhrase: 'royal blue, sol yellow, and white', helmet: 'royal blue helmet with sol-yellow horn motif' },
  SF:  { primary: '#AA0000', secondary: '#B3995D', colorPhrase: '49ers red and metallic gold', helmet: 'gold helmet with red stripe and SF motif' },
  SEA: { primary: '#002244', secondary: '#69BE28', tertiary: '#A5ACAF', colorPhrase: 'college navy, action green, and wolf gray', helmet: 'navy helmet with action-green and gray accents' },
};

export function getNflTeam(abbr: string | null | undefined): NFLTeam | null {
  if (!abbr) return null;
  return NFL_TEAMS.find((t) => t.abbreviation === abbr) ?? null;
}

export function getNflTeamColors(abbr: string | null | undefined): NFLTeamColors | null {
  if (!abbr) return null;
  return NFL_TEAM_COLORS[abbr] ?? null;
}
