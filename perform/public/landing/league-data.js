// Per-league content for the Per|Form landing hi-fi.
// Each league is authored from the POV of that vertical's CMO.
window.SEASON_PULSE = [
  { league:'nfl',  rank:1, ev:'2026 NFL Draft · Round 1',   status:'TONIGHT · 8:00 PM ET', phase:'LIVE', live:true },
  { league:'nba',  rank:2, ev:'Playoffs · Round 1 Game 3s', status:'Tonight · 3 games',    phase:'PLAYOFFS' },
  { league:'mlb',  rank:3, ev:'Reg Season · Week 4',        status:'Pipeline Top 100 refresh', phase:'IN-SEASON' },
  { league:'nhl',  rank:4, ev:'Stanley Cup Playoffs · R1',  status:'Draft Combine · 44 days', phase:'PLAYOFFS' },
  { league:'ncaa', rank:0, ev:'Spring Portal · Day 8',      status:'412 entries · always-on', phase:'PLATFORM', primary:true },
];

window.LEAGUE_DATA = {
  nfl: {
    nav: ['NFL DRAFT','COLLEGE FOOTBALL','NIL','TRANSFER PORTAL','RANKINGS & GRADES','TEAMS','MEDIA','ABOUT'],
    navActive: 'NFL DRAFT',
    cta: 'Sign Up / War Room',
    hero: {
      eyebrow: '● THE 2026 NFL DRAFT · APRIL 23–25 · PITTSBURGH',
      h1: ['THE DRAFT', 'STARTS HERE'],
      sub: 'The most advanced talent intelligence engine in sports. One grade. Every player. Every angle that matters.',
      cta1: 'View 2026 NFL Draft Board',
      countdownH: 'ROUND 1 BEGINS TONIGHT',
      countdown: { DAYS: 0, HRS: 6, MIN: 12, SEC: 44 },
      ticker: ['Round 1 · 8:00 PM ET','Final Mock Draft Locked','Top 10 War Room Picks','Live Board Tracker'],
      event: { shield:'NFL', title:'DRAFT', year:'2026', dates:'APRIL 23–25, 2026', where:'PITTSBURGH, PA' }
    },
    rail: [
      { h:'Top Risers', rows:[['1','L. Sellers','QB',1],['2','K. Smigiel','QB',1],['3','D. Frazier','OT',1]] },
      { h:'Top Fallers', accent:'red', rows:[['1','R. Simpson','QB',-1],['2','A. Williams','EDGE',-1],['3','T. Moton','CB',-1]] },
      { h:'Team Needs (Top 5)', rows:[['1','TEN','QB, OT, EDGE',0],['2','CLE','QB, WR, G',0],['3','NYG','QB, EDGE, OL',0],['4','NE','QB, WR, OL',0],['5','LV','CB, OL, DL',0]] },
      { h:'Transfer Portal Impact', rows:[['1','Caleb Downs','S','Alabama → Ohio State'],['2','Will Johnson','CB','Michigan → Texas'],['3','CJ Hansen','WR','Iowa State → Oregon']] },
      { h:'NIL Market Movers', rows:[['1','Arch Manning','',1],['2','Carson Beck','',1],['3','Shedeur Sanders','',1]] },
    ],
    headlines: [
      { kicker:'MOCK DRAFT', t:'2026 NFL Mock Draft: Early Projections', d:'May 12, 2025' },
      { kicker:'ANALYSIS', t:'Top 100 Big Board Updated After Spring Ball', d:'May 11, 2025' },
      { kicker:'RECRUITING', t:'Top Official Visits This Weekend', d:'May 10, 2025' },
    ],
    boardH: '2026 NFL DRAFT BIG BOARD PREVIEW',
    board: [
      { rk:1, name:'Arch Manning',    pos:'QB', school:'Texas',         chip:'TX', grade:98.7, tier:'S' },
      { rk:2, name:'LaNorris Sellers',pos:'QB', school:'South Carolina',chip:'SC', grade:96.1, tier:'S' },
      { rk:3, name:'Cade Klubnik',    pos:'QB', school:'Clemson',       chip:'CU', grade:94.4, tier:'A+' },
      { rk:4, name:'Peter Woods',     pos:'DT', school:'Clemson',       chip:'CU', grade:93.6, tier:'A+' },
      { rk:5, name:'Will Campbell',   pos:'OT', school:'LSU',           chip:'LSU',grade:92.8, tier:'A+' },
    ],
    tie: { name:'TIE OUTPUT EXAMPLE', grade:94.8, tier:'A+', pos:'EDGE · Penn State · Jr.', proj:'Top 10 Pick', nil:'$1.2M', rank:'#3 Overall' },
    tools: [
      { ic:'◇', t:'Player Comparison', s:'Side-by-side TIE breakdowns' },
      { ic:'⊟', t:'Draft Simulator',   s:'Mock the draft, your way' },
      { ic:'⊕', t:'Team Needs Map',    s:'Find fits. Build better.' },
      { ic:'⎙', t:'TIE War Room',      s:'Premium intel. Real edge.' },
    ],
    engine: { title:'THE TIE ENGINE', sub:'One Formula. Three Pillars.', pillars:[
      { pct:40, t:'PERFORMANCE', s:'What a player does on the field', c:'var(--accent)' },
      { pct:30, t:'ATTRIBUTES',  s:'Measurables & athletic traits',    c:'var(--accent-deep)' },
      { pct:30, t:'INTANGIBLES', s:'Character, IQ, leadership',        c:'var(--panel-3)' },
    ]},
    tiers: [
      ['PRIME','var(--amber)','101+','Generational talent · Top 5 lock'],
      ['S','var(--green)','95–100','Top 10 Pick'],
      ['A+','var(--accent)','90–94','Round 1 Early'],
      ['A','var(--accent-deep)','85–89','Round 1'],
      ['B+','var(--panel-3)','80–84','Round 2'],
    ],
    tierRight: [
      ['75–79','Round 3'],['70–74','Day 2/3 Bubble'],['65–69','Mid Rounds'],['<65','Late Round / Priority FA'],
    ],
    nil: { h:'NIL VALUATION ENGINE', sub:'Anchored to real cohorts. No guesswork.', big:'$1.2M', label:'MEDIAN RANGE', bars:[['P10','$650K'],['MEDIAN','$1.2M'],['P90','$2.4M']] },
    portal: { h:'TRANSFER PORTAL TRACKER', sub:'Movement. Impact. Intelligence.', rows:[
      ['Caleb Downs','S','Alabama → Ohio State'],['Will Johnson','CB','Michigan → Texas'],['CJ Hansen','WR','Iowa State → Oregon']
    ]},
    personas: [
      ['PLAYERS','Know your value'],['PARENTS','Make informed decisions'],['SCHOOLS','Recruit with confidence'],['AGENTS','Close with data'],['MEDIA','Cover with authority'],['FANS','Know the game deeper'],
    ],
    war: { t:'Be in the Room.', s:'Draft Week. Real Time. Real Edge.', btn:'Join the War Room' },
    cmo: {
      intro: 'The NFL vertical is our flagship — draft-centric, seven-figure stakes, always-on media cycle. We lead with authority, ship receipts, and refuse to dilute the grade.',
      mission: 'Be the definitive public grade on every NFL prospect — before, during, and after the Draft — and the operating system for War Rooms that can no longer operate on vibes.',
      vision:  'By 2028, every NFL broadcast, beat writer, and front office references a TIE grade the same way they reference a 40 time. The grade is the noun.',
      sig: '— Kendall Marsh, CMO · Per|Form NFL',
      objectives: [
        '10M MAUs through Draft Week via the public Big Board',
        '1,200 paid War Room seats (scouts, agents, media) at $4,800/yr',
        'Broadcast integration with 2 of 3 major networks',
        '0 methodology leaks; TIE v2.5 shipped and pinned by Combine',
      ],
    },
  },

  ncaa: {
    isHome: true,
    nav: ['RECRUITING','NIL','TRANSFER PORTAL','SCHOOLS','RANKINGS & GRADES','CFB PLAYOFF','MEDIA','ABOUT'],
    navActive: 'RECRUITING',
    cta: 'Sign Up / Film Room',
    hero: {
      eyebrow: '● SPRING PORTAL WINDOW · DAY 8 · 412 ENTRIES',
      h1: ['WHERE EVERY', 'RECRUIT GETS GRADED'],
      sub: 'NIL. Portal. Recruitment. Schools. The roster economy graded in public view — for every player, every program, every cycle.',
      cta1: 'Open the Player Index',
      countdownH: 'SPRING PORTAL WINDOW CLOSES',
      countdown: { DAYS: 7, HRS: 12, MIN: 4, SEC: 33 },
      ticker: ['412 Portal Entries · Day 8','Top 5★ Commits This Week','NIL Valuation Refresh','Visit Tracker Live'],
      event: { shield:'NCAA', title:'PORTAL', year:'2026', dates:'APR 16 – APR 30', where:'SPRING WINDOW' }
    },
    rail: [
      { h:'Top Risers (TIE)', rows:[['1','Bryce Underwood','QB',1],['2','Jadyn Davis','QB',1],['3','Jeremiah Smith','WR',1]] },
      { h:'Top Portal Entries', accent:'red', rows:[['1','Nico Iamaleava','QB','UT → ??'],['2','Jaden Rashada','QB','GA → ??'],['3','Julian Sayin','QB','ALA → OSU']] },
      { h:'Commits This Week', rows:[['1','Georgia','5★ LB (TX)',1],['2','Texas','5★ WR (FL)',1],['3','Ohio State','5★ S (CA)',1],['4','Oregon','5★ OT (NV)',1],['5','Alabama','4★ QB (MI)',1]] },
      { h:'NIL Movers ($$)', rows:[['1','Arch Manning','QB','$6.8M'],['2','Dylan Raiola','QB','$3.1M'],['3','Jeremiah Smith','WR','$2.9M']] },
      { h:'Roster Cost (Top 5)', rows:[['1','Texas','$22.4M',1],['2','Ohio State','$20.1M',1],['3','Georgia','$18.7M',1],['4','Oregon','$17.2M',1],['5','Alabama','$16.9M',1]] },
    ],
    headlines: [
      { kicker:'PORTAL', t:'Spring Window · Day 8 Entries & Fit Grades', d:'Apr 23, 2026' },
      { kicker:'NIL', t:'Roster-Cost Index — Top 25 Updated', d:'Apr 22, 2026' },
      { kicker:'RECRUITING', t:'5★ Visit Board · Weekend Tracker', d:'Apr 21, 2026' },
    ],
    boardH: 'NCAA TOP 25 · TIE POWER RANKINGS',
    board: [
      { rk:1, name:'Texas Longhorns',     pos:'SEC', school:'12-1',  chip:'TX',  grade:94.2, tier:'S' },
      { rk:2, name:'Ohio State Buckeyes', pos:'B1G', school:'11-2',  chip:'OSU', grade:93.7, tier:'S' },
      { rk:3, name:'Georgia Bulldogs',    pos:'SEC', school:'12-1',  chip:'UGA', grade:92.9, tier:'A+' },
      { rk:4, name:'Oregon Ducks',        pos:'B1G', school:'11-1',  chip:'ORE', grade:91.8, tier:'A+' },
      { rk:5, name:'Penn State',          pos:'B1G', school:'10-2',  chip:'PSU', grade:90.4, tier:'A+' },
    ],
    tie: { name:'TIE TEAM GRADE · EXAMPLE', grade:94.2, tier:'S', pos:'Texas · SEC · 12-1', proj:'#1 Seed Projection', nil:'$22.4M', rank:'#1 Overall' },
    tools: [
      { ic:'◇', t:'Team Comparison',  s:'Side-by-side TIE breakdowns' },
      { ic:'⊟', t:'Bracket Simulator',s:'12-team CFP mock, your way' },
      { ic:'⊕', t:'Portal Fit Map',   s:'Who moves next. Why.' },
      { ic:'⎙', t:'Film Room Pro',    s:'Grade every drive live' },
    ],
    engine: { title:'THE TIE ENGINE', sub:'One Formula. Three Pillars.', pillars:[
      { pct:40, t:'PERFORMANCE', s:'On-field, opponent-adjusted', c:'var(--accent)' },
      { pct:30, t:'ATTRIBUTES',  s:'Roster, recruiting, physicals', c:'var(--accent-deep)' },
      { pct:30, t:'INTANGIBLES', s:'Culture, coaching, schedule',   c:'var(--panel-3)' },
    ]},
    tiers: [
      ['PRIME','var(--amber)','95+','National Title Contender'],
      ['S','var(--green)','92–94','CFP Lock'],
      ['A+','var(--accent)','88–91','CFP Bubble'],
      ['A','var(--accent-deep)','83–87','NY6 Bowl'],
      ['B+','var(--panel-3)','78–82','Major Bowl'],
    ],
    tierRight: [['72–77','Mid Bowl Tier'],['66–71','Lower Bowl'],['<66','Building']],
    nil: { h:'ROSTER-COST ENGINE', sub:'What a program spends vs. what it wins.', big:'$22.4M', label:'TX 2026 ROSTER', bars:[['LOW','$11.8M'],['MED','$18.6M'],['HIGH','$28.0M']] },
    portal: { h:'PORTAL & RECRUITING', sub:'The roster is a market. Read it.', rows:[
      ['Dillon Gabriel','QB','OU → ORE'],['Jordan Addison','WR','PITT → USC'],['KJ Jefferson','QB','ARK → UCF']
    ]},
    personas: [
      ['RECRUITS','Know your value'],['FAMILIES','See every offer'],['COACHES','Build a roster'],['COLLECTIVES','Spend smarter'],['MEDIA','Rank with rigor'],['FANS','Beyond the eye test'],
    ],
    war: { t:'Own Signing Day.', s:'TIE Grades every commit. So should you.', btn:'Join the Film Room' },
    cmo: {
      intro: 'NCAA is the platform spine — not a vertical. Every pro league feeds off it. NIL + Portal + Recruitment + Schools is the flywheel, and the public scoreboard is our product.',
      mission: 'Be the definitive, public ledger of the college roster economy — TIE grades, NIL valuations, portal fit, and recruitment intel — for every Division I player and program.',
      vision:  'By 2027, no commitment, flip, portal entry, or NIL deal in college sports is reported without a TIE reference. Collectives, families, and media all operate on our board.',
      sig: '— Renée Okafor, CMO · Per|Form NCAA (Platform Lead)',
      objectives: [
        'Grade 134 FBS + 358 D-I basketball programs weekly; 99.5% uptime',
        'Ship Player Index v3 — every recruit, portal entry, and commit in one graph',
        'Public Roster-Cost Index as the defining NIL benchmark of the cycle',
        '75 collectives + 3 major conferences on paid tier by signing day',
      ],
    },
  },

  nba: {
    nav: ['NBA DRAFT','COMBINE','G LEAGUE','INTERNATIONAL','RANKINGS & GRADES','TEAMS','MEDIA','ABOUT'],
    navActive: 'NBA DRAFT',
    cta: 'Sign Up / Lottery Room',
    hero: {
      eyebrow: '● NBA PLAYOFFS · ROUND 1 · GAME 3s TONIGHT',
      h1: ['THE LOTTERY', 'IS SCIENCE'],
      sub: 'One engine reads every prospect — G League, EuroLeague, NCAA. Grade fits, not names. Measure what scales to the L.',
      cta1: 'View 2026 NBA Big Board',
      countdownH: 'COUNTDOWN TO THE 2026 NBA DRAFT',
      countdown: { DAYS: 47, HRS: 8, MIN: 14, SEC: 2 },
      ticker: ['Combine Measurables Live','International Intel Drop','Lottery Odds Update','Workout Tracker'],
      event: { shield:'NBA', title:'DRAFT', year:'2026', dates:'JUNE 25–26, 2026', where:'BARCLAYS · BROOKLYN' }
    },
    rail: [
      { h:'Top Risers', rows:[['1','C. Boozer','PF',1],['2','A.J. Dybantsa','SF',1],['3','Tre Johnson','SG',1]] },
      { h:'Top Fallers', accent:'red', rows:[['1','VJ Edgecombe','SG',-1],['2','Ace Bailey','SF',-1],['3','Kon Knueppel','SG',-1]] },
      { h:'Team Fit (Top 5)', rows:[['1','WAS','Wing + Rim',0],['2','UTA','Floor General',0],['3','CHA','Shot Creator',0],['4','POR','Stretch 5',0],['5','SAS','Wing Defender',0]] },
      { h:'International Watch', rows:[['1','Hugo Gonzalez','SF','Real Madrid'],['2','Egor Demin','PG','Real Madrid'],['3','Noa Essengue','PF','Ulm']] },
      { h:'G League Movers', rows:[['1','London Johnson','PG',1],['2','Aaron Bradshaw','C',1],['3','Izan Almansa','PF',1]] },
    ],
    headlines: [
      { kicker:'COMBINE', t:'Combine Measurables: Winners & Concerns', d:'May 14, 2026' },
      { kicker:'BIG BOARD', t:'Top 60 TIE Board — Post-Lottery', d:'May 13, 2026' },
      { kicker:'INTL', t:'EuroLeague Intel: Who\'s Stashable?', d:'May 10, 2026' },
    ],
    boardH: '2026 NBA DRAFT BIG BOARD PREVIEW',
    board: [
      { rk:1, name:'A.J. Dybantsa',    pos:'SF', school:'BYU',       chip:'BYU', grade:97.8, tier:'S' },
      { rk:2, name:'Cameron Boozer',   pos:'PF', school:'Duke',      chip:'DUKE',grade:96.4, tier:'S' },
      { rk:3, name:'Darryn Peterson',  pos:'SG', school:'Kansas',    chip:'KU',  grade:95.1, tier:'S' },
      { rk:4, name:'Hugo Gonzalez',    pos:'SF', school:'R. Madrid', chip:'RMA', grade:93.7, tier:'A+' },
      { rk:5, name:'Nate Ament',       pos:'SF', school:'Tennessee', chip:'TN',  grade:92.9, tier:'A+' },
    ],
    tie: { name:'TIE OUTPUT EXAMPLE', grade:97.8, tier:'S', pos:'SF · BYU · Fr.', proj:'#1 Pick', nil:'$6.8M*', rank:'#1 Overall' },
    tools: [
      { ic:'◇', t:'Player Comparison', s:'Any league. Apples to apples.' },
      { ic:'⊟', t:'Lottery Simulator', s:'Mock the combine, your way' },
      { ic:'⊕', t:'Team Fit Map',      s:'Who fits. Who scales.' },
      { ic:'⎙', t:'Lottery Room',      s:'Live war-room intel' },
    ],
    engine: { title:'THE TIE ENGINE', sub:'One Formula. Three Pillars.', pillars:[
      { pct:40, t:'PERFORMANCE', s:'On-court, league-adjusted', c:'var(--accent)' },
      { pct:30, t:'ATTRIBUTES',  s:'Frame, length, athleticism', c:'var(--accent-deep)' },
      { pct:30, t:'INTANGIBLES', s:'Feel, IQ, translation', c:'var(--panel-3)' },
    ]},
    tiers: [
      ['PRIME','var(--amber)','97+','Franchise Cornerstone'],
      ['S','var(--green)','94–96','Top 5 Lock'],
      ['A+','var(--accent)','90–93','Lottery'],
      ['A','var(--accent-deep)','85–89','1st Round'],
      ['B+','var(--panel-3)','80–84','1st/2nd Bubble'],
    ],
    tierRight: [['75–79','2nd Round'],['70–74','Two-Way'],['<70','G-League']],
    nil: { h:'ROOKIE SCALE + NIL', sub:'What the pick earns. What the name earns.', big:'$6.8M', label:'YEAR 1 PROJ · #1 PICK', bars:[['P10','$4.2M'],['MED','$6.8M'],['P90','$9.1M']] },
    portal: { h:'INTERNATIONAL WATCHLIST', sub:'Stashables, second-round gems, overseas risers.', rows:[
      ['Hugo Gonzalez','SF','Real Madrid'],['Noa Essengue','PF','Ulm'],['Egor Demin','PG','Real Madrid']
    ]},
    personas: [
      ['PROSPECTS','Know your ceiling'],['FAMILIES','Navigate the L'],['AAU/PROGRAMS','Develop smarter'],['AGENTS','Prep with data'],['MEDIA','Cover with rigor'],['FANS','Scout like a GM'],
    ],
    war: { t:'Run the Lottery.', s:'Every pick. Every fit. Every scenario.', btn:'Enter the Lottery Room' },
    cmo: {
      intro: 'NBA is a global talent market — NCAA, G League, EuroLeague, Oceania, NBL. We win by being the only engine that grades apples-to-apples across all of them.',
      mission: 'Deliver one TIE grade that scales across every feeder league — so front offices, agents, and fans read international prospects on the same axis as college freshmen.',
      vision:  'By 2028, every NBA Draft broadcast cites a TIE grade. Every EuroLeague export is pre-scouted in public. We are the reason the second round stops being a lottery.',
      sig: '— Amari Reyes, CMO · Per|Form NBA',
      objectives: [
        'Cross-league TIE grades live for NCAA, G League, EuroLeague (top-3 leagues)',
        '450 paid Lottery Room seats across NBA front offices & agencies',
        'Combine-week broadcast integration — 2 networks',
        'Ship Team Fit Map before the May Combine',
      ],
    },
  },

  mlb: {
    nav: ['MLB DRAFT','MINORS','INTERNATIONAL','PROSPECT PIPELINE','RANKINGS & GRADES','TEAMS','MEDIA','ABOUT'],
    navActive: 'MLB DRAFT',
    cta: 'Sign Up / Scouting Room',
    hero: {
      eyebrow: '● MLB REG SEASON · WEEK 4 · DRAFT JULY 12–14',
      h1: ['THE PIPELINE', 'IS READABLE'],
      sub: 'Amateur to the Show — one engine reads every prospect. Velocity, spin, exit velo, and the five tools, decomposed.',
      cta1: 'View 2026 MLB Big Board',
      countdownH: 'COUNTDOWN TO THE 2026 MLB DRAFT',
      countdown: { DAYS: 78, HRS: 19, MIN: 31, SEC: 44 },
      ticker: ['Top 100 Prospects Update','Spin Rate Risers','International Signing Window','Minors Promotions'],
      event: { shield:'MLB', title:'DRAFT', year:'2026', dates:'JULY 12–14, 2026', where:'ATLANTA, GA' }
    },
    rail: [
      { h:'Top Risers', rows:[['1','E. Arquette','SS',1],['2','B. Doyle','RHP',1],['3','S. Kurtz','1B',1]] },
      { h:'Top Fallers', accent:'red', rows:[['1','J. Smith','OF',-1],['2','T. Clark','LHP',-1],['3','M. Rudert','C',-1]] },
      { h:'System Strength', rows:[['1','ORIOLES','Top 100: 9',0],['2','DODGERS','Top 100: 8',0],['3','BREWERS','Top 100: 7',0],['4','CUBS','Top 100: 6',0],['5','TIGERS','Top 100: 6',0]] },
      { h:'International Watch', rows:[['1','Leo De Vries','SS','Dominican'],['2','Ethan Salas','C','Venezuela'],['3','Yophery Rodriguez','OF','Dominican']] },
      { h:'Velocity Movers', rows:[['1','B. Doyle','RHP',1],['2','J. Simon','RHP',1],['3','E. Kelley','LHP',1]] },
    ],
    headlines: [
      { kicker:'TOP 100', t:'Pipeline Update: Pre-Draft Top 100', d:'Jun 18, 2026' },
      { kicker:'DRAFT', t:'Consensus Top 10 — Who Fits Where', d:'Jun 12, 2026' },
      { kicker:'INTL', t:'Jan 15 Signing Class — Early Grades', d:'Jun 8, 2026' },
    ],
    boardH: '2026 MLB DRAFT · TOP PROSPECTS',
    board: [
      { rk:1, name:'Ethan Holliday',  pos:'SS',  school:'Stillwater HS', chip:'OK',  grade:96.2, tier:'S' },
      { rk:2, name:'Seth Hernandez',  pos:'RHP', school:'Corona HS',     chip:'CA',  grade:95.1, tier:'S' },
      { rk:3, name:'Aiva Arquette',   pos:'SS',  school:'Oregon St.',    chip:'ORE', grade:93.8, tier:'A+' },
      { rk:4, name:'Kayson Cunningham',pos:'SS', school:'Johnson HS',    chip:'TX',  grade:92.7, tier:'A+' },
      { rk:5, name:'Brady Doyle',     pos:'RHP', school:'Oklahoma',      chip:'OU',  grade:91.9, tier:'A+' },
    ],
    tie: { name:'TIE OUTPUT EXAMPLE', grade:96.2, tier:'S', pos:'SS · Stillwater HS · Sr.', proj:'#1 Pick Projection', nil:'$10.5M', rank:'#1 Overall' },
    tools: [
      { ic:'◇', t:'Prospect Compare',  s:'5 tools, side by side' },
      { ic:'⊟', t:'Draft Simulator',   s:'20 rounds, your way' },
      { ic:'⊕', t:'System Fit Map',    s:'Farm depth × player fit' },
      { ic:'⎙', t:'Scouting Room',     s:'Pro scout workflow' },
    ],
    engine: { title:'THE TIE ENGINE', sub:'One Formula. Three Pillars.', pillars:[
      { pct:40, t:'PERFORMANCE', s:'Stats, Statcast, results',  c:'var(--accent)' },
      { pct:30, t:'ATTRIBUTES',  s:'Tools, velo, spin, frame',  c:'var(--accent-deep)' },
      { pct:30, t:'INTANGIBLES', s:'Makeup, work rate, IQ',     c:'var(--panel-3)' },
    ]},
    tiers: [
      ['PRIME','var(--amber)','96+','Future Star'],
      ['S','var(--green)','92–95','Top 10 Pick'],
      ['A+','var(--accent)','88–91','Comp Round'],
      ['A','var(--accent-deep)','84–87','Round 1–2'],
      ['B+','var(--panel-3)','80–83','Top 5 Rounds'],
    ],
    tierRight: [['75–79','Day 2'],['70–74','Day 3'],['<70','UDFA/Indy']],
    nil: { h:'SIGNING BONUS ENGINE', sub:'Slot value × leverage. What they actually sign for.', big:'$10.5M', label:'#1 PICK SLOT + PROJ', bars:[['SLOT','$9.6M'],['PROJ','$10.5M'],['MAX','$12.8M']] },
    portal: { h:'INTERNATIONAL SIGNING TRACKER', sub:'Jan 15 window. Real-time intel.', rows:[
      ['Leo De Vries','SS','Dominican'],['Ethan Salas','C','Venezuela'],['Y. Rodriguez','OF','Dominican']
    ]},
    personas: [
      ['PROSPECTS','Know your slot'],['FAMILIES','Advisor-level intel'],['PROGRAMS','Develop smarter'],['AGENTS','Negotiate with data'],['MEDIA','Grade beyond scouts'],['FANS','Read every farm'],
    ],
    war: { t:'Open the Farm.', s:'Every system. Every arm. Every bat.', btn:'Enter the Scouting Room' },
    cmo: {
      intro: 'MLB is the deepest talent funnel in sports — HS, college, J2, minors. We win by making the pipeline legible in public view for the first time.',
      mission: 'Deliver one TIE grade across amateur, international, and minor-league prospects — so front offices, agents, and families operate on the same axis the day the pick is made.',
      vision:  'By 2029, every MLB farm system is publicly ranked by TIE. The #1 Top 100 list is ours. No exceptions.',
      sig: '— Diego Navarro, CMO · Per|Form MLB',
      objectives: [
        'Ship TIE grades for all 30 farm systems, top-100 per org',
        '600 paid Scouting Room seats across MLB front offices',
        'Integrate Statcast + Trackman signals end-to-end by Draft Week',
        'International J2 coverage expanded to DR, VZ, MX, PR, JPN, KR',
      ],
    },
  },

  nhl: {
    nav: ['NHL DRAFT','COMBINE','JUNIORS','EUROPE','RANKINGS & GRADES','TEAMS','MEDIA','ABOUT'],
    navActive: 'NHL DRAFT',
    cta: 'Sign Up / War Room',
    hero: {
      eyebrow: '● STANLEY CUP PLAYOFFS · ROUND 1 · COMBINE IN 44',
      h1: ['THE DRAFT', 'GOES COLD'],
      sub: 'Juniors, NCAA, Europe — one engine reads every skater and every goaltender. Pace, physicality, and translatable skill, decomposed.',
      cta1: 'View 2026 NHL Big Board',
      countdownH: 'COUNTDOWN TO THE 2026 NHL DRAFT',
      countdown: { DAYS: 62, HRS: 4, MIN: 52, SEC: 11 },
      ticker: ['Combine Testing Live','CHL Top 50 Update','USNTDP Recap','Draft-Eligible Euro Watch'],
      event: { shield:'NHL', title:'DRAFT', year:'2026', dates:'JUNE 26–27, 2026', where:'LOS ANGELES, CA' }
    },
    rail: [
      { h:'Top Risers', rows:[['1','G. Misa','C',1],['2','M. Schaefer','D',1],['3','P. Hagens','C',1]] },
      { h:'Top Fallers', accent:'red', rows:[['1','J. Smith','W',-1],['2','R. McQueen','C',-1],['3','L. Parekh','D',-1]] },
      { h:'Team Needs', rows:[['1','SJS','C, D',0],['2','CHI','RW, D',0],['3','NSH','C, G',0],['4','SEA','W, D',0],['5','MTL','C, RW',0]] },
      { h:'Euro Watch', rows:[['1','Anton Frondell','C','Djurgårdens'],['2','Sascha Boumedienne','D','Boston U'],['3','Viktor Eklund','W','Djurgårdens']] },
      { h:'Goalie Board', rows:[['1','Petteri Rimpinen','G','Fin'],['2','Jack Parsons','G','OHL'],['3','Joshua Ravensbergen','G','WHL']] },
    ],
    headlines: [
      { kicker:'CHL TOP 50', t:'Midseason Rankings: Risers & Fallers', d:'Mar 22, 2026' },
      { kicker:'COMBINE', t:'Combine Testing — Who Jumps the Board', d:'Jun 4, 2026' },
      { kicker:'EURO', t:'Euro Draft-Eligible Watch · Top 20', d:'May 28, 2026' },
    ],
    boardH: '2026 NHL DRAFT · TOP PROSPECTS',
    board: [
      { rk:1, name:'Gavin McKenna',       pos:'LW',  school:'Medicine Hat', chip:'MH',  grade:98.3, tier:'S' },
      { rk:2, name:'Michael Misa',        pos:'C',   school:'Saginaw',      chip:'SAG', grade:95.8, tier:'S' },
      { rk:3, name:'Porter Martone',      pos:'RW',  school:'Brampton',     chip:'BRA', grade:94.1, tier:'S' },
      { rk:4, name:'Anton Frondell',      pos:'C',   school:'Djurgårdens',  chip:'DIF', grade:92.7, tier:'A+' },
      { rk:5, name:'James Hagens',        pos:'C',   school:'Boston C.',    chip:'BC',  grade:92.1, tier:'A+' },
    ],
    tie: { name:'TIE OUTPUT EXAMPLE', grade:98.3, tier:'S', pos:'LW · Medicine Hat · U18', proj:'#1 Overall', nil:'$950K', rank:'#1 Overall' },
    tools: [
      { ic:'◇', t:'Player Comparison', s:'CHL · NCAA · Euro, one axis' },
      { ic:'⊟', t:'Draft Simulator',   s:'7 rounds, your way' },
      { ic:'⊕', t:'Team Needs Map',    s:'System fit × depth chart' },
      { ic:'⎙', t:'War Room',          s:'Scout sheets, live' },
    ],
    engine: { title:'THE TIE ENGINE', sub:'One Formula. Three Pillars.', pillars:[
      { pct:40, t:'PERFORMANCE', s:'League-adjusted production', c:'var(--accent)' },
      { pct:30, t:'ATTRIBUTES',  s:'Skating, frame, shot',       c:'var(--accent-deep)' },
      { pct:30, t:'INTANGIBLES', s:'Hockey IQ, compete, habits', c:'var(--panel-3)' },
    ]},
    tiers: [
      ['PRIME','var(--amber)','97+','Generational'],
      ['S','var(--green)','93–96','Top 5 Lock'],
      ['A+','var(--accent)','89–92','1st Round'],
      ['A','var(--accent-deep)','84–88','Top 2 Rounds'],
      ['B+','var(--panel-3)','79–83','Top 4 Rounds'],
    ],
    tierRight: [['74–78','Day 2'],['69–73','Late Rounds'],['<69','UDFA/Euro Pro']],
    nil: { h:'ENTRY-LEVEL CONTRACT', sub:'Slot value × performance bonuses.', big:'$950K', label:'ELC · #1 PICK Y1', bars:[['BASE','$950K'],['BONUS','$2.85M'],['MAX','$3.8M']] },
    portal: { h:'EURO + JUNIOR TRACKER', sub:'CHL, NCAA, SHL, Liiga — one board.', rows:[
      ['Anton Frondell','C','Djurgårdens SHL'],['Sascha Boumedienne','D','Boston U NCAA'],['Viktor Eklund','W','Djurgårdens SHL']
    ]},
    personas: [
      ['PROSPECTS','Know your draft stock'],['FAMILIES','Navigate the path'],['PROGRAMS','Develop smarter'],['AGENTS','Prep with data'],['MEDIA','Cover with rigor'],['FANS','Scout like a GM'],
    ],
    war: { t:'Own Draft Weekend.', s:'Seven rounds. Two days. One grade.', btn:'Enter the War Room' },
    cmo: {
      intro: 'NHL is the most international draft in North American sports — CHL, NCAA, USNTDP, SHL, Liiga, KHL. We win by unifying every feeder league onto one translatable axis.',
      mission: 'Grade every draft-eligible skater and goaltender across every major feeder league — one TIE number, one tier, one projection.',
      vision:  'By 2028, TSN, Sportsnet, and ESPN cite TIE grades on the draft broadcast. Every team\'s war-room board starts with ours.',
      sig: '— Soren Lindqvist, CMO · Per|Form NHL',
      objectives: [
        'Cover all 4 CHL leagues + NCAA D-I + SHL/Liiga U20 pools',
        '250 paid War Room seats across NHL front offices',
        'Goaltender Engine: ship a separate G-TIE by Combine',
        'Broadcast integration with 1 of TSN/Sportsnet by Draft Night',
      ],
    },
  },
};
