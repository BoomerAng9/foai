/**
 * The Beast — Dane Brugler's 2026 NFL Draft Scouting Guide (The Athletic)
 * ========================================================================
 * 629 pages | 2,700+ players ranked | 402 detailed profiles | 45,000+ measurements
 * NFL-verified testing data | Nearly 300,000 words of scouting analysis
 *
 * SOURCE: The Athletic (subscription required). Data extracted from purchased copy.
 * Top 100 big board + all positional top-10 rankings verified from the actual document.
 */

export interface BeastProspect {
  rank: number;
  name: string;
  position: string;
  positionRank: number;
  school: string;
  summary?: string;
}

/** Brugler's Top 100 Big Board — verified from The Beast PDF (page 628) */
export const BEAST_TOP_100: BeastProspect[] = [
  { rank: 1, name: 'Arvell Reese', position: 'EDGE', positionRank: 1, school: 'Ohio State', summary: 'A versatile defender who has the physical traits to become a dominant pass rusher.' },
  { rank: 2, name: 'Jeremiyah Love', position: 'RB', positionRank: 1, school: 'Notre Dame', summary: 'One of the draft\'s top athletes: explosive, with a remarkable blend of balance and burst.' },
  { rank: 3, name: 'Fernando Mendoza', position: 'QB', positionRank: 1, school: 'Indiana', summary: 'The clear QB1: intuition, throwing accuracy and confidence are superpowers.' },
  { rank: 4, name: 'Sonny Styles', position: 'LB', positionRank: 1, school: 'Ohio State', summary: 'Freaky athlete on track to be an impact linebacker.' },
  { rank: 5, name: 'Caleb Downs', position: 'S', positionRank: 1, school: 'Ohio State', summary: 'An elite tackler who did not allow a touchdown for two years; a surefire NFL starter.' },
  { rank: 6, name: 'Mansoor Delane', position: 'CB', positionRank: 1, school: 'LSU', summary: 'An alpha competitor who projects as a starter despite his average size.' },
  { rank: 7, name: 'David Bailey', position: 'EDGE', positionRank: 2, school: 'Texas Tech', summary: 'Likely to be a versatile NFL starter: quick-twitch, disruptive, powerful and explosive.' },
  { rank: 8, name: 'Spencer Fano', position: 'OT', positionRank: 1, school: 'Utah', summary: 'When Utah needed a yard, it ran behind No. 55; he projects as an immediate starter.' },
  { rank: 9, name: 'Rueben Bain Jr.', position: 'EDGE', positionRank: 3, school: 'Miami', summary: 'Not a prototypical edge, but his power and play style will still disrupt NFL backfields.' },
  { rank: 10, name: 'Carnell Tate', position: 'WR', positionRank: 1, school: 'Ohio State', summary: 'A day-one NFL starter and potential Pro Bowler.' },
  { rank: 11, name: 'Francis Mauigoa', position: 'OT', positionRank: 2, school: 'Miami', summary: 'A durable blocker whose best NFL role may be as a guard rather than right tackle.' },
  { rank: 12, name: 'Olaivavega Ioane', position: 'G', positionRank: 1, school: 'Penn State', summary: 'A thick, nasty mauler on track to be a long-term NFL starter.' },
  { rank: 13, name: 'Makai Lemon', position: 'WR', positionRank: 2, school: 'USC', summary: 'Hints of Amon-Ra St. Brown. Not wildly athletic, but a likely starter at slot or Z.' },
  { rank: 14, name: 'Jermod McCoy', position: 'CB', positionRank: 2, school: 'Tennessee', summary: 'Missed 2025 with a torn ACL, but looked like an NFL starter pre-injury.' },
  { rank: 15, name: 'Keldric Faulk', position: 'EDGE', positionRank: 4, school: 'Auburn', summary: 'Has more "almost" plays than impact plays on tape, but a player worth betting on.' },
  { rank: 16, name: 'Kenyon Sadiq', position: 'TE', positionRank: 1, school: 'Oregon', summary: 'A freaky athlete who can both outrun and outmuscle NFL defenders.' },
  { rank: 17, name: 'Monroe Freeling', position: 'OT', positionRank: 3, school: 'Georgia', summary: 'A young, ascending prospect with real work to do, but the future looks bright.' },
  { rank: 18, name: 'Dillon Thieneman', position: 'S', positionRank: 2, school: 'Oregon', summary: 'A durable, versatile safety who could start in almost any coach\'s defensive scheme.' },
  { rank: 19, name: 'Kadyn Proctor', position: 'OT', positionRank: 4, school: 'Alabama', summary: 'Boasts an exciting foundation, but needs his discipline and technique to catch up.' },
  { rank: 20, name: 'Jordyn Tyson', position: 'WR', positionRank: 3, school: 'Arizona State', summary: 'An elite ball-catcher who evokes Stefon Diggs, and a likely NFL starter.' },
  { rank: 21, name: 'KC Concepcion', position: 'WR', positionRank: 4, school: 'Texas A&M', summary: 'Needs work at the edges, but has the versatility and talent to be a starting slot receiver.' },
  { rank: 22, name: 'Omar Cooper Jr.', position: 'WR', positionRank: 5, school: 'Indiana', summary: 'An inside-outside weapon with run-after-catch ability.' },
  { rank: 23, name: 'Emmanuel McNeil-Warren', position: 'S', positionRank: 3, school: 'Toledo', summary: 'A rangy, wiry safety with impressive speed who may see NFL reps as a rookie.' },
  { rank: 24, name: 'Chris Johnson', position: 'CB', positionRank: 3, school: 'San Diego State' },
  { rank: 25, name: 'Caleb Lomu', position: 'OT', positionRank: 5, school: 'Utah', summary: 'Needs more strength, technique and grit, but NFL teams are intrigued with his upside.' },
  { rank: 26, name: 'Denzel Boston', position: 'WR', positionRank: 6, school: 'Washington', summary: 'Makes up for lack of top-end speed with strong hands and large catch radius.' },
  { rank: 27, name: 'Avieon Terrell', position: 'CB', positionRank: 4, school: 'Clemson' },
  { rank: 28, name: 'Akheem Mesidor', position: 'EDGE', positionRank: 5, school: 'Miami', summary: 'A disruptive force and likely three-down starter, despite age and injury concerns.' },
  { rank: 29, name: 'Blake Miller', position: 'OT', positionRank: 6, school: 'Clemson', summary: 'Has the physical traits, football IQ and toughness that NFL teams will bet on every time.' },
  { rank: 30, name: 'Colton Hood', position: 'CB', positionRank: 5, school: 'Tennessee' },
  { rank: 31, name: 'T.J. Parker', position: 'EDGE', positionRank: 6, school: 'Clemson', summary: 'Still learning some moves, but offers playmaking potential against both run and pass.' },
  { rank: 32, name: 'Kayden McDonald', position: 'DT', positionRank: 1, school: 'Ohio State', summary: 'A dominant run defender who will be immediately useful on early downs — if not more.' },
  { rank: 33, name: 'Max Iheanachor', position: 'OT', positionRank: 7, school: 'Arizona State', summary: 'Fluid athlete for his size, but may need a year of development before being NFL-ready.' },
  { rank: 34, name: 'Chase Bisontis', position: 'G', positionRank: 2, school: 'Texas A&M', summary: 'A versatile, strong-as-an-ox blocker with upside in any NFL scheme.' },
  { rank: 35, name: 'Peter Woods', position: 'DT', positionRank: 2, school: 'Clemson', summary: 'An explosive tackle who must improve his consistency at the next level.' },
  { rank: 36, name: 'Malachi Lawrence', position: 'EDGE', positionRank: 7, school: 'UCF' },
  { rank: 37, name: 'Zion Young', position: 'EDGE', positionRank: 8, school: 'Missouri' },
  { rank: 38, name: "D'Angelo Ponds", position: 'CB', positionRank: 6, school: 'Indiana' },
  { rank: 39, name: 'Cashius Howell', position: 'EDGE', positionRank: 9, school: 'Texas A&M' },
  { rank: 40, name: 'Jacob Rodriguez', position: 'LB', positionRank: 2, school: 'Texas Tech', summary: "Texas Tech's 'quarterback of the defense' should compete for a starting role right away." },
  { rank: 41, name: 'Germie Bernard', position: 'WR', positionRank: 7, school: 'Alabama', summary: 'Just a good football player, with a well-rounded, pro-ready skill set.' },
  { rank: 42, name: 'Ty Simpson', position: 'QB', positionRank: 2, school: 'Alabama', summary: 'A Daniel Jones with fewer physical traits; mid-level starter at best, backup at worst.' },
  { rank: 43, name: 'Christen Miller', position: 'DT', positionRank: 3, school: 'Georgia' },
  { rank: 44, name: 'R Mason Thomas', position: 'EDGE', positionRank: 10, school: 'Oklahoma', summary: 'Undersized, but plays fast; should be able to find a meaningful NFL role.' },
  { rank: 45, name: 'Brandon Cisse', position: 'CB', positionRank: 7, school: 'South Carolina' },
  { rank: 46, name: 'CJ Allen', position: 'LB', positionRank: 3, school: 'Georgia', summary: "Coachable, high-IQ defender who's often a step ahead of his teammates; a likely starter." },
  { rank: 47, name: 'Chris Bell', position: 'WR', positionRank: 8, school: 'Louisville', summary: 'A rare NFL combination: big, strong and explosive. Should start when he\'s healthy.' },
  { rank: 48, name: 'Jake Golday', position: 'LB', positionRank: 4, school: 'Cincinnati' },
  { rank: 49, name: 'Gabe Jacas', position: 'EDGE', positionRank: 11, school: 'Illinois' },
  { rank: 50, name: 'Anthony Hill Jr.', position: 'LB', positionRank: 5, school: 'Texas' },
  { rank: 51, name: 'Jadarian Price', position: 'RB', positionRank: 2, school: 'Notre Dame' },
  { rank: 52, name: 'Caleb Banks', position: 'DT', positionRank: 4, school: 'Florida' },
  { rank: 53, name: 'Keionte Scott', position: 'S', positionRank: 4, school: 'Miami' },
  { rank: 54, name: 'Keyron Crawford', position: 'EDGE', positionRank: 12, school: 'Auburn' },
  { rank: 55, name: 'Lee Hunter', position: 'DT', positionRank: 5, school: 'Texas Tech' },
  { rank: 56, name: 'Treydan Stukes', position: 'CB', positionRank: 8, school: 'Arizona' },
  { rank: 57, name: 'Emmanuel Pregnon', position: 'G', positionRank: 3, school: 'Oregon' },
  { rank: 58, name: 'Malachi Fields', position: 'WR', positionRank: 9, school: 'Notre Dame', summary: 'Shades of Michael Pittman, but must work on expanding his route tree.' },
  { rank: 59, name: 'Antonio Williams', position: 'WR', positionRank: 10, school: 'Clemson', summary: 'A controlled, fluid athlete who projects best in the slot.' },
  { rank: 60, name: 'Dani Dennis-Sutton', position: 'EDGE', positionRank: 13, school: 'Penn State' },
  { rank: 61, name: 'Keith Abney II', position: 'CB', positionRank: 9, school: 'Arizona State' },
  { rank: 62, name: 'Keylan Rutledge', position: 'G', positionRank: 4, school: 'Georgia Tech' },
  { rank: 63, name: 'Eli Stowers', position: 'TE', positionRank: 2, school: 'Vanderbilt' },
  { rank: 64, name: 'Domonique Orange', position: 'DT', positionRank: 6, school: 'Iowa State' },
  { rank: 65, name: 'Caleb Tiernan', position: 'OT', positionRank: 8, school: 'Northwestern' },
  { rank: 66, name: 'Max Klare', position: 'TE', positionRank: 3, school: 'Ohio State' },
  { rank: 67, name: "De'Zhaun Stribling", position: 'WR', positionRank: 11, school: 'Ole Miss' },
  { rank: 68, name: 'Davison Igbinosun', position: 'CB', positionRank: 10, school: 'Ohio State' },
  { rank: 69, name: 'Elijah Sarratt', position: 'WR', positionRank: 12, school: 'Indiana' },
  { rank: 70, name: 'A.J. Haulcy', position: 'S', positionRank: 5, school: 'LSU' },
  { rank: 71, name: 'Gennings Dunker', position: 'G', positionRank: 5, school: 'Iowa' },
  { rank: 72, name: 'Ted Hurst', position: 'WR', positionRank: 13, school: 'Georgia State' },
  { rank: 73, name: 'Josiah Trotter', position: 'LB', positionRank: 6, school: 'Missouri' },
  { rank: 74, name: 'Tyler Onyedim', position: 'DT', positionRank: 7, school: 'Texas A&M' },
  { rank: 75, name: 'Kyle Louis', position: 'LB', positionRank: 7, school: 'Pittsburgh' },
  { rank: 76, name: 'Zachariah Branch', position: 'WR', positionRank: 14, school: 'Georgia' },
  { rank: 77, name: 'Derrick Moore', position: 'EDGE', positionRank: 14, school: 'Michigan' },
  { rank: 78, name: 'Zakee Wheatley', position: 'S', positionRank: 6, school: 'Penn State' },
  { rank: 79, name: 'Travis Burke', position: 'OT', positionRank: 9, school: 'Memphis' },
  { rank: 80, name: 'Romello Height', position: 'EDGE', positionRank: 15, school: 'Texas Tech' },
  { rank: 81, name: 'Garrett Nussmeier', position: 'QB', positionRank: 3, school: 'LSU' },
  { rank: 82, name: 'Brenen Thompson', position: 'WR', positionRank: 15, school: 'Mississippi State' },
  { rank: 83, name: 'Keyshaun Elliott', position: 'LB', positionRank: 8, school: 'Arizona State' },
  { rank: 84, name: 'Bud Clark', position: 'S', positionRank: 7, school: 'TCU' },
  { rank: 85, name: 'Mike Washington Jr.', position: 'RB', positionRank: 3, school: 'Arkansas' },
  { rank: 86, name: 'Oscar Delp', position: 'TE', positionRank: 4, school: 'Georgia' },
  { rank: 87, name: 'Malik Muhammad', position: 'CB', positionRank: 11, school: 'Texas' },
  { rank: 88, name: 'Jalon Kilgore', position: 'S', positionRank: 8, school: 'South Carolina' },
  { rank: 89, name: 'Jake Slaughter', position: 'C', positionRank: 1, school: 'Florida' },
  { rank: 90, name: 'Bryce Lance', position: 'WR', positionRank: 16, school: 'North Dakota State' },
  { rank: 91, name: 'Chandler Rivers', position: 'CB', positionRank: 12, school: 'Duke' },
  { rank: 92, name: 'Sam Hecht', position: 'C', positionRank: 2, school: 'Kansas State' },
  { rank: 93, name: 'Justin Joly', position: 'TE', positionRank: 5, school: 'NC State' },
  { rank: 94, name: 'Jalen Farmer', position: 'G', positionRank: 6, school: 'Kentucky' },
  { rank: 95, name: 'Logan Jones', position: 'C', positionRank: 3, school: 'Iowa' },
  { rank: 96, name: 'Chris Brazzell II', position: 'WR', positionRank: 17, school: 'Tennessee' },
  { rank: 97, name: 'Markel Bell', position: 'OT', positionRank: 10, school: 'Miami' },
  { rank: 98, name: 'Daylen Everette', position: 'CB', positionRank: 13, school: 'Georgia' },
  { rank: 99, name: 'Deion Burks', position: 'WR', positionRank: 18, school: 'Oklahoma' },
  { rank: 100, name: 'Jaishawn Barham', position: 'EDGE', positionRank: 16, school: 'Michigan' },
];

/** Position-by-position depth counts in top 100 */
export const BEAST_POSITION_COUNTS = {
  EDGE: 16,
  WR: 18,
  CB: 13,
  OT: 10,
  LB: 8,
  S: 8,
  G: 6,
  DT: 7,
  TE: 5,
  QB: 3,
  RB: 3,
  C: 3,
};

/** Total player counts per position in the full Beast (2700+ players) */
export const BEAST_TOTAL_PLAYERS = {
  QB: 99, RB: 213, WR: 380, TE: 156, OT: 146, G: 159, C: 78,
  EDGE: 270, DT: 249, LB: 243, CB: 318, S: 271,
};
