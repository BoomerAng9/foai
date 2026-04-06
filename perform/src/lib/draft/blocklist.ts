/**
 * SINGLE SOURCE OF TRUTH — Already-drafted NFL players
 * Used by: expand, cleanup, validate routes
 * DO NOT duplicate this list in other files.
 */

export const ALREADY_DRAFTED: string[] = [
  // RBs (2022-2025)
  'Devon Achane', 'Bijan Robinson', 'Jahmyr Gibbs', 'Zach Charbonnet',
  'Roschon Johnson', 'Chase Brown', 'Tank Bigsby', 'Sean Tucker',
  'Eric Gray', 'Israel Abanikanda', 'Kenny McIntosh', 'DeWayne McBride',
  'Isiah Pacheco', 'Hassan Haskins', 'Chris Rodriguez Jr.', 'Chris Rodriguez',
  'Zach Evans', 'SaRodorick Thompson', 'Kendre Miller', 'Tyjae Spears',
  'Braelon Allen', 'Ray Davis', 'Audric Estime', 'Marshawn Lloyd',
  'Frank Gore Jr.', 'Kimani Vidal', 'Carson Steele', 'Cody Schrader',
  'Bucky Irving', 'Trey Benson', 'Blake Corum', 'Jonathon Brooks',
  'Rasheen Ali', 'Cam Davis', 'Tyrone Tracy Jr.', 'Nate Noel',
  'Justice Ellison', 'Jase McClellan', 'Jaylen Wright', 'Deuce Vaughn',
  'Will Shipley', 'Jordan Waters', 'Montrell Johnson', 'Jaydon Blue',
  'CJ Baxter', 'Bhayshul Tuten', 'Phil Mafah', 'Tahj Brooks',
  'Ollie Gordon II', 'Jarquez Hunter', 'RJ Harvey', 'DJ Giddens',
  'Omarion Hampton', 'Devin Neal', 'Donovan Edwards', 'Treveyon Henderson',
  'Quinshon Judkins', 'Dylan Sampson', 'Ashton Jeanty', 'Cam Skattebo',
  'Kaleb Johnson', 'Damien Martinez', 'Chance Luper',
  // QBs (2022-2025)
  'Bryce Young', 'CJ Stroud', 'Anthony Richardson', 'Will Levis',
  'Caleb Williams', 'Jayden Daniels', 'Drake Maye', 'Bo Nix',
  'Michael Penix Jr.', 'JJ McCarthy', 'Spencer Rattler',
  'Cam Ward', 'Shedeur Sanders', 'Jalen Milroe',
  'Max Duggan', 'Jack Plummer', 'Dequan Finn', 'Will Altmyer',
  // WRs (2022-2025)
  'Jaxon Smith-Njigba', 'Quentin Johnston', 'Zay Flowers',
  'Marvin Harrison Jr.', 'Malik Nabers', 'Rome Odunze',
  'Ladd McConkey', 'Keon Coleman', 'Xavier Worthy', 'Brian Thomas Jr.',
  'Troy Franklin', 'Adonai Mitchell', 'Luther Burden III',
  'Tetairoa McMillan', 'Travis Hunter', 'Xavier Legette', 'Ricky Pearsall',
  'Rashod Bateman', 'Trey Palmer', 'Theo Wease', 'Parker Washington',
  'Jalen Cropper', 'Jalen Moreno-Cropper', 'Marcus Burke',
  // TEs (2022-2025)
  'Brock Bowers', 'Dalton Kincaid', 'Sam LaPorta',
  // OL (2022-2025)
  'Paris Johnson Jr.', 'Peter Skoronski', 'Joe Alt', 'Olu Fashanu',
  // EDGE/DL (2022-2025)
  'Will Anderson Jr.', 'Tyree Wilson', 'Jalen Carter',
  'Nolan Smith', 'Lukas Van Ness',
  // DBs (2022-2025)
  'Devon Witherspoon', 'Christian Gonzalez', 'Quinyon Mitchell',
];

/** Lowercase Set for fast lookup */
export const ALREADY_DRAFTED_SET = new Set(
  ALREADY_DRAFTED.map(n => n.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim()),
);

/** Junk single-word names from bad LLM extractions */
export const JUNK_NAMES = new Set([
  'lemon', 'orange', 'love', 'tyson', 'washington', 'zvada',
  'hemby', 'coleman', 'unknown',
]);

export function isAlreadyDrafted(name: string): boolean {
  const normalized = name.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
  return ALREADY_DRAFTED_SET.has(normalized);
}
