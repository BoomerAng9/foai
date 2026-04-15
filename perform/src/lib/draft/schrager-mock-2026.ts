/**
 * Schrager Hour Mega Mock Draft 2026 — Full 32 picks
 * ====================================================
 * Source: Peter Schrager Hour podcast (April 2026)
 * Panelists: Peter Schrager (ESPN), Ran Carthon (CBS/ex-Titans GM),
 *            Dane Brugler (The Athletic/Beast author), Field Yates (ESPN)
 *
 * KEY INSIGHT: Ran Carthon confirmed active GMs study mock drafts "1000%"
 * and the Titans built a "draft predictability model" using:
 *   - Scout grades + Coach grades + Mock draft consensus
 *   - Live-updating probability engine showing who'd be available at each pick
 */

export interface MockPick {
  pick: number;
  team: string;
  player: string;
  position: string;
  school: string;
  pickedBy: 'Schrager' | 'Carthon' | 'Brugler' | 'Yates';
  scoutingNotes: string;
  keyStats?: string;
  concerns?: string;
}

export const SCHRAGER_MOCK_2026: MockPick[] = [
  {
    pick: 1, team: 'Raiders', player: 'Fernando Mendoza', position: 'QB', school: 'Indiana',
    pickedBy: 'Carthon',
    scoutingNotes: 'Elite toughness and ball placement. Strong character — won\'t get distracted in Vegas. All the makings of a really good starting NFL QB.',
    concerns: 'Ceiling question — will he become elite or just good?',
  },
  {
    pick: 2, team: 'Jets', player: 'David Bailey', position: 'DE', school: 'Texas Tech',
    pickedBy: 'Schrager',
    scoutingNotes: 'Most polished pass rusher in draft. Near flawless college season.',
    keyStats: '98/100 NextGen production score. Led nation in sacks. Tied 1st in TFL.',
    concerns: 'Only 22 — still room to grow, not a finished product.',
  },
  {
    pick: 3, team: 'Cardinals', player: 'Arvell Reese', position: 'EDGE', school: 'Ohio State',
    pickedBy: 'Yates',
    scoutingNotes: 'Projection pick over polished product. Only rushed 97 total times last year — low volume. Versatile defender used many ways by Matt Patricia. Cardinals too far from competing to draft for need — drafting value.',
    concerns: 'Sack production tapered in last 6 games. Not a finished product as a rusher.',
  },
  {
    pick: 4, team: 'Titans', player: 'Sunny Styles', position: 'LB', school: 'Ohio State',
    pickedBy: 'Brugler',
    scoutingNotes: 'Freaky height-weight-speed athlete. Fluid change of direction. Green dot player day one. Jump from 2024 to 2025 tape was exceptional. Only 21 years old — still ascending. Ran Carthon drew Tremaine Edmunds comp from Robert Salah\'s time in SF.',
    keyStats: 'Only been playing LB for 2 years.',
    concerns: 'Want more playmaking clips in coverage (nitpick).',
  },
  {
    pick: 5, team: 'Giants', player: 'Jeremiah Love', position: 'RB', school: 'Notre Dame',
    pickedBy: 'Yates',
    scoutingNotes: 'Second highest rated player on Yates\' board. Kicks offense into another gear. Impacts running AND passing game. John Harbaugh hired as $20M/yr coach — time to take off.',
    concerns: 'Giants already have Singletary, Tracy, Scatterbo at RB.',
  },
  {
    pick: 6, team: 'Browns', player: 'Francis Mauigoa', position: 'OL', school: 'Miami',
    pickedBy: 'Carthon',
    scoutingNotes: 'Carthon had him as #1 guard all fall, then moved him to tackle after playoffs. "He\'ll be one of your best five." Can start at guard OR tackle. Plugs in at RG with Titus Howard at RT.',
    concerns: 'Position ambiguity — guard or tackle? He just wants to be one of top 5.',
  },
  {
    pick: 7, team: 'Commanders', player: 'Caleb Downs', position: 'S', school: 'Ohio State',
    pickedBy: 'Carthon',
    scoutingNotes: 'Culture pick for Dan Quinn. Probably the cleanest prospect in the draft. Smartest guy in this draft. Plays multiple positions. Carthon met him July 4th and told him "you\'re one of my favorite players."',
    concerns: 'Not seen mocked to Commanders in any other mock.',
  },
  {
    pick: 8, team: 'Saints', player: 'Carnell Tate', position: 'WR', school: 'Ohio State',
    pickedBy: 'Brugler',
    scoutingNotes: 'Three-level threat. Polished route runner. Can win vertically and short-to-intermediate. Pair with Olave and help Tyler Shuck develop.',
    keyStats: 'Brugler\'s WR1 in The Beast rankings.',
    concerns: 'Only seen as WR2/WR3 at Ohio State — never been "the guy" as a #1 receiver.',
  },
  {
    pick: 9, team: 'Chiefs', player: 'Mansour Delane', position: 'CB', school: 'LSU',
    pickedBy: 'Yates',
    scoutingNotes: 'Probably the best man corner technician in the class. Via Virginia Tech transfer.',
    keyStats: '4.37 40-yard dash.',
    concerns: 'Yates not totally sold the 4.37 is play speed, but time speed validates draft status.',
  },
  {
    pick: 10, team: 'Bengals', player: 'Ruben Bain Jr.', position: 'EDGE', school: 'Miami',
    pickedBy: 'Schrager',
    scoutingNotes: 'Lost Trey Hendrickson — need pass rush. Carthon was critical of Bain all fall but turned corner during playoffs. Ohio State game was the killer instinct moment. Real raw power. Speed-to-power rusher at worst.',
    keyStats: '9.5 sacks. 869 snaps (plays a TON).',
    concerns: 'Historically shortest arms of any top-10 pass rusher. May not be double-digit sack guy.',
  },
  {
    pick: 11, team: 'Dolphins', player: 'Makai Lemon', position: 'WR', school: 'USC',
    pickedBy: 'Schrager',
    scoutingNotes: 'Culture pick for new regime. Biletnikoff winner. Most productive WR in college football. Toughness and heart — "see the way he plays, that\'s what we build around."',
    keyStats: 'Biletnikoff Award winner.',
    concerns: '5\'11, 4.52 40. Ranked 37th of 46 WRs in athleticism. Aman-Ra St. Brown comp but used more as slot/third.',
  },
  {
    pick: 12, team: 'Cowboys', player: 'Dylan Theamman', position: 'S', school: 'Oregon',
    pickedBy: 'Brugler',
    scoutingNotes: 'Earliest mock for this player. Coverage + single high + post + downhill. Outstanding football character — would eat Japanese snapping beetles to be 1% better.',
    concerns: 'Cowboys wanted Styles, Downs, or Bain — this is plan B/C/D.',
  },
  {
    pick: 13, team: 'Rams', player: 'Omar Cooper Jr.', position: 'WR', school: 'Indiana',
    pickedBy: 'Yates',
    scoutingNotes: 'Mr. Clutch — the Penn State catch. Does the dirty work. Indiana asked a lot of their receivers.',
    keyStats: '13 receiving TDs. 4.42 40-yard dash.',
    concerns: 'Grades all over the place. Some GMs said 23 too low, others said more like 45.',
  },
  {
    pick: 14, team: 'Ravens', player: 'Jordan Tyson', position: 'WR', school: 'Arizona State',
    pickedBy: 'Yates',
    scoutingNotes: 'Most explosive of top WRs. Levels up against ranked teams. Played more snaps than Tate. Ran Carthon had him as WR1 coming into fall.',
    keyStats: '123 yards/game vs ranked teams over past 2 seasons. Brother Jaylen is NBA Cavs rotation player.',
    concerns: 'ACL (2022 Colorado), collarbone (ASU 2 years ago), hamstring this year. Yates says bad luck not structural.',
  },
  {
    pick: 15, team: 'Buccaneers', player: 'Jermichael McCoy', position: 'CB', school: 'Tennessee',
    pickedBy: 'Schrager',
    scoutingNotes: '"Elimination chamber" at corner. Big, fast, super confident man-to-man. Possessed human when he intercepts. Top 7-8 on anyone\'s board if healthy.',
    keyStats: 'Great Oregon State tape too.',
    concerns: 'Missed entire 2025 season (ACL Jan 2025). Still wasn\'t ready to perform at Combine after 12 months. Pro Day 80-85% in positional workout.',
  },
  {
    pick: 16, team: 'Jets', player: 'KC Concepcion', position: 'WR', school: 'Texas A&M',
    pickedBy: 'Brugler',
    scoutingNotes: 'Inside/outside/punt returner. Dynamic athleticism. Sets the table for future QB (likely drafting QB in 2027).',
    concerns: '5th WR off the board in top 16 — unprecedented run.',
  },
  {
    pick: 17, team: 'Lions', player: 'Kaden Proctor', position: 'OT', school: 'Alabama',
    pickedBy: 'Carthon',
    scoutingNotes: 'Earth theory player — how many guys on planet Earth can do what he does? You could hear him hitting the bag from 50 yards away at Pro Day. Dan Campbell would maximize everything in Proctor\'s body.',
    keyStats: 'Was 390 lbs, worked down to 358. Explosive at that weight is unheard of.',
    concerns: 'Inconsistency. Weight concerns. Highlights are elite but consistency is the question.',
  },
  {
    pick: 18, team: 'Vikings', player: 'Emanuel Wilson', position: 'S', school: 'Toledo',
    pickedBy: 'Schrager',
    scoutingNotes: 'Brian Flores defense fit. Only surefire first-round safety/corner left on board.',
    concerns: '3 safeties in first 18 picks — unusual draft pattern.',
  },
  {
    pick: 19, team: 'Panthers', player: 'Monroe Freeling', position: 'OT', school: 'Georgia',
    pickedBy: 'Carthon',
    scoutingNotes: 'Athletic specimen. Crucial for Bryce Young development. Could become Colton Miller level — not Joe Alt but really solid LT starter.',
    keyStats: '6\'7, 316 lbs, 34.5" arms, 84" wingspan.',
    concerns: 'Upside pick — year from now we might say why didn\'t he go higher.',
  },
  {
    pick: 20, team: 'Cowboys', player: 'Hakeem Mesador', position: 'EDGE', school: 'Miami',
    pickedBy: 'Schrager',
    scoutingNotes: 'Carthon thinks he\'ll make his money rushing inside from 4i technique. Force guard to take tackle set = two-way go. Some scouts say he was better than Bain at Miami.',
    concerns: 'Age 25 — historical outlier. Only one player in top 50 over 25 in last 10 years (Tyler Shuck).',
  },
  {
    pick: 21, team: 'Steelers', player: 'Spencer Fano', position: 'OL', school: 'Utah',
    pickedBy: 'Brugler',
    scoutingNotes: 'Best offensive lineman in the class per Brugler. RT in college but wingspan 3" longer than Will Campbell — comfortable at tackle. Can also dominate inside.',
    concerns: 'Falls to 21 in this sim despite being top OL — just how board fell.',
  },
  {
    pick: 22, team: 'Chargers', player: 'Vega Ion', position: 'G', school: 'Penn State',
    pickedBy: 'Carthon',
    scoutingNotes: '"Most Jim Harbaugh pick I can imagine." Jersey probably already printed. Harbaugh\'s first SF draft: tackle at 12, guard in 20s (Mike Iupati).',
  },
  {
    pick: 23, team: 'Eagles', player: 'Max Iheanachor', position: 'OT', school: 'Arizona State',
    pickedBy: 'Brugler',
    scoutingNotes: 'From Nigeria, basketball convert, only 5 years of football. Outstanding movement skills. Comfortably wears 325 lbs. Raw but plays his tail off. Lane Johnson succession plan at RT.',
    concerns: 'Still raw in areas.',
  },
  {
    pick: 24, team: 'Browns', player: 'Denzel Boston', position: 'WR', school: 'Washington',
    pickedBy: 'Schrager',
    scoutingNotes: 'The forgotten man. Ball winner. Didn\'t run during pre-draft process — if he stamped a 4.46, conversation would be different.',
    keyStats: '20 receiving TDs. Only 3 drops in 198 targets over 2 years. Excellent red zone threat.',
    concerns: 'Became overlooked as other WRs rose. No pre-draft workout numbers.',
  },
  {
    pick: 25, team: 'Bears', player: 'Armason Thomas', position: 'EDGE', school: 'Oklahoma',
    pickedBy: 'Yates',
    scoutingNotes: 'Heavy hands. Gave Kaden Proctor all he could handle. Full tilt player — not just pass rusher, holds up against the run. Play speed >> time speed.',
    keyStats: '246-250 lbs. 4.67 40.',
    concerns: 'Size (undersized). 4.67 40 considered slow in modern edge market. Limited to 9 games by injury.',
  },
  {
    pick: 26, team: 'Bills', player: 'Peter Woods', position: 'DT', school: 'Clemson',
    pickedBy: 'Carthon',
    scoutingNotes: 'Five-star recruit. Was a first-round pick all year long, now falling off mock drafts. Carthon says "I don\'t think he forgot how to play football — calling it a down year."',
    concerns: 'Down year production. First IDL off the board at pick 26.',
  },
  {
    pick: 27, team: '49ers', player: 'Kenyon Sadiq', position: 'TE', school: 'Oregon',
    pickedBy: 'Brugler',
    scoutingNotes: 'Mismatch weapon. True hybrid — inline, slot, seam threat, after-catch threat. Fell unexpectedly. George Kittle Achilles injury creates need. "If he\'s here I\'m running that card up."',
    concerns: 'Blocking limited by size. Schrager: never seen Sadiq at 27 in 1000+ mock sims.',
  },
  {
    pick: 28, team: 'Texans', player: 'Blake Miller', position: 'OT', school: 'Clemson',
    pickedBy: 'Yates',
    scoutingNotes: 'Iron man. Steady as they come. Athletic, experienced, battle tested.',
    keyStats: '57 games played. Missed ONE practice in 4 years (broken wrist).',
    concerns: 'Needs to be stronger at point of attack when defenders get hands into him.',
  },
  {
    pick: 29, team: 'Chiefs', player: 'Caleb Lomu', position: 'OT', school: 'Utah',
    pickedBy: 'Schrager',
    scoutingNotes: 'Spencer Fano\'s teammate. Less famous but also first-round talent. More OL help for KC.',
    concerns: 'Not sure on Josh Simmons (2025 pick). Need depth.',
  },
  {
    pick: 30, team: 'Dolphins', player: 'Keldric Faulk', position: 'DL', school: 'Auburn',
    pickedBy: 'Brugler',
    scoutingNotes: 'Packers-style pick for John Eric Sullivan. Played 4i/5-tech in 3-man front — limited opportunities to rush edge. 21 years old — not close to football ceiling. All panelists prefer Faulk over Mesador for rebuilding team.',
    keyStats: '6\'6, 275 lbs, ran 4.6s, 35" arms.',
    concerns: 'Lower production numbers due to Auburn scheme. Richard Seymour comp for ideal front.',
  },
  {
    pick: 31, team: 'Patriots', player: 'Jacob Rodriguez', position: 'LB', school: 'Texas',
    pickedBy: 'Carthon',
    scoutingNotes: 'Ball-hawking LB. Crushed Senior Bowl + Combine. Most Mike Vrabel player ever — mustache and all. Carson Swissinger went top of round 2 last year and won DROY; Rodriguez has MORE production.',
    concerns: 'One-year wonder at UCLA. Pick may go to Eagles (Howie Roseman) via trade.',
  },
  {
    pick: 32, team: 'Seahawks', player: 'TJ Parker', position: 'EDGE', school: 'Clemson',
    pickedBy: 'Yates',
    scoutingNotes: 'Derek Hall vibes — rugged, heavy hands, run defense dedication. High motor. Preston Smith comp from Carthon. Bad year for all of Clemson, not just him.',
    concerns: 'Underwhelming 2025 season. Not premier athlete — middle of pack.',
  },
];

/** Tai Simpson analysis — NOT drafted in round 1 by any panelist */
export const TAI_SIMPSON_INTEL = {
  player: 'Tai Simpson',
  position: 'QB',
  school: 'Alabama',
  consensus: 'Day 2 pick (early round 2)',
  concerns: [
    'Historically low numbers pushing ball downfield (Carthon)',
    'Brugler Beast grade: "A Daniel Jones with fewer physical traits" — floor is future NFL backup',
    'Got degree from Alabama before throwing first TD pass — unique but unusual timeline',
    'All 4 panelists agree he\'s not a first-round pick in this class',
  ],
  bestFits: ['Cardinals (Kyler Shanahan/McVey system)', 'Jets (2027 bridge)', 'Bears (trade back)'],
  likelyRange: 'Picks 33-40',
};

/** Chris Brazzell — sleeper WR Ran Carthon teased */
export const CHRIS_BRAZZELL_INTEL = {
  player: 'Chris Brazzell',
  position: 'WR',
  school: 'Tennessee',
  note: 'Ran Carthon teased as possibly "the most talented of all the receivers in this class" but acknowledged 19 was too high. Brugler has him 96th overall — 45 spots LOWER than consensus. Evaluators distrust Tennessee offensive system.',
};

/** Key draft trends from this simulation */
export const DRAFT_TRENDS_2026 = {
  receiverRun: '5 WRs in top 16 picks — unprecedented. Order: Tate(8), Lemon(11), Cooper(13), Tyson(14), Concepcion(16)',
  safetyRun: '3 safeties in first 18 picks — unusual. Downs(7), Theamman(12), Wilson(18)',
  noQBAfter1: 'Only 1 QB in round 1 (Mendoza at 1). Tai Simpson fell out entirely.',
  thinClass: 'Only 14 players carry pure 1st-round grade per Brugler\'s Beast',
  olDepth: '6 OL in round 1: Mauigoa(6), Proctor(17), Freeling(19), Fano(21), Ion(22), Iheanachor(23)',
  edgeDepth: '5 EDGE in round 1: Bailey(2), Reese(3), Bain(10), Mesador(20), Thomas(25)',
  cultureEmphasis: 'Multiple panelists emphasized "culture guys" — especially for Dolphins, Cowboys, Patriots rebuilds',
  gmsMockDrafts: 'Ran Carthon confirmed active GMs study mocks "1000%" and use them in predictability models',
};
