/**
 * seed-huddle-posts.mjs
 *
 * Populates The Huddle social platform with 5 analyst profiles and ~120 posts
 * referencing real players from perform_players.
 *
 * Usage: node scripts/seed-huddle-posts.mjs
 */

import postgres from 'postgres';

const DATABASE_URL =
  'postgresql://neondb_owner:npg_25fRtnTYlpsr@ep-dawn-bar-a4orhend-pooler.us-east-1.aws.neon.tech/performdb?sslmode=require';

const sql = postgres(DATABASE_URL, { ssl: 'require', max: 5 });

// ── Table creation ──────────────────────────────────────────────────────

const CREATE_PROFILES = `
  CREATE TABLE IF NOT EXISTS huddle_profiles (
    id SERIAL PRIMARY KEY,
    analyst_id TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    handle TEXT UNIQUE NOT NULL,
    bio TEXT,
    show_name TEXT,
    avatar_color TEXT,
    followers INTEGER DEFAULT 0,
    following INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

const CREATE_POSTS = `
  CREATE TABLE IF NOT EXISTS huddle_posts (
    id SERIAL PRIMARY KEY,
    analyst_id TEXT NOT NULL,
    post_type TEXT NOT NULL DEFAULT 'take',
    content TEXT NOT NULL,
    tags TEXT[],
    player_ref TEXT,
    likes INTEGER DEFAULT 0,
    reposts INTEGER DEFAULT 0,
    replies INTEGER DEFAULT 0,
    pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

// ── Analyst profiles ────────────────────────────────────────────────────

const PROFILES = [
  {
    analyst_id: 'void-caster',
    display_name: 'Void-Caster',
    handle: '@voidcaster',
    show_name: 'The Void Report',
    avatar_color: '#1E293B',
    bio: 'The voice you hear when the lights go dark and the pick is in.',
    followers: 18400,
    following: 12,
  },
  {
    analyst_id: 'the-haze',
    display_name: 'Haze & Smoke',
    handle: '@thehaze',
    show_name: 'Haze & Smoke',
    avatar_color: '#3B82F6',
    bio: 'Two voices. One mic. Zero agreement.',
    followers: 22100,
    following: 87,
  },
  {
    analyst_id: 'the-colonel',
    display_name: 'The Colonel',
    handle: '@thecolonel',
    show_name: "The Colonel's Corner",
    avatar_color: '#EF4444',
    bio: "Union High '87. State champs. Don't forget it.",
    followers: 14800,
    following: 203,
  },
  {
    analyst_id: 'astra-novatos',
    display_name: 'Astra Novatos',
    handle: '@astranovatos',
    show_name: 'The Astra Brief',
    avatar_color: '#F59E0B',
    bio: 'Reads tape like he reads cashmere. Sees what you walk past.',
    followers: 11300,
    following: 44,
  },
  {
    analyst_id: 'bun-e',
    display_name: 'Bun-E',
    handle: '@buneonair',
    show_name: 'Phone Home with Bun-E',
    avatar_color: '#8B5CF6',
    bio: 'Houston. Law. Sports. Tech. The rest is... complicated.',
    followers: 9700,
    following: 156,
  },
];

// ── All posts ───────────────────────────────────────────────────────────

const POSTS = [
  // ═══════════════════════════════════════════════════════════════════════
  // DAVID BAILEY — EDGE — Texas Tech
  // ═══════════════════════════════════════════════════════════════════════
  {
    analyst_id: 'void-caster',
    post_type: 'take',
    content: "Bailey isn't a prospect. He's a warning.",
    tags: ['David Bailey', 'EDGE', 'Texas Tech'],
    player_ref: 'david-bailey',
  },
  {
    analyst_id: 'void-caster',
    post_type: 'scouting',
    content: "73 pressures. That number doesn't need context. It needs a helmet and a contract. The first step is violent and the motor doesn't know what a play clock is. At 251, he'll get moved at the point of attack. Doesn't matter. The snap is already over.",
    tags: ['David Bailey', 'EDGE', 'Texas Tech'],
    player_ref: 'david-bailey',
  },
  {
    analyst_id: 'the-haze',
    post_type: 'take',
    content: "[HAZE] Bailey is the best pass rusher in this class. Period. [SMOKE] At 251? He's a situational guy until he puts on weight. [HAZE] 73 pressures is situational? [SMOKE] In the NFL it might be.",
    tags: ['David Bailey', 'EDGE', 'Texas Tech'],
    player_ref: 'david-bailey',
  },
  {
    analyst_id: 'the-haze',
    post_type: 'prediction',
    content: "[HAZE] Top 10 pick. A team like Jacksonville can't pass on this. [SMOKE] He falls to the teens. Weight scares people. [HAZE] Weight didn't scare anyone when Will Anderson came out light. [SMOKE] Will Anderson isn't 251.",
    tags: ['David Bailey', 'EDGE', 'Texas Tech', 'NFL Draft'],
    player_ref: 'david-bailey',
  },
  {
    analyst_id: 'the-colonel',
    post_type: 'scouting',
    content: "Kid plays angry. I respect that. Reminds me of a guy we had at Union — Donnie Vecchio, defensive end, used to eat quarterbacks for breakfast. Bailey's got that same nasty streak. Skinny though. Gino says feed him pasta. For once, Gino might be right.",
    tags: ['David Bailey', 'EDGE', 'Texas Tech'],
    player_ref: 'david-bailey',
  },
  {
    analyst_id: 'astra-novatos',
    post_type: 'scouting',
    content: "There's a violence in Bailey's first step that tailoring can't teach. The raw material — the speed, the bend, the relentlessness — it's there. The lower half is narrow, yes. Like a jacket cut too slim through the hip. But you don't throw the jacket out. You let it out.",
    tags: ['David Bailey', 'EDGE', 'Texas Tech'],
    player_ref: 'david-bailey',
  },
  {
    analyst_id: 'bun-e',
    post_type: 'take',
    content: "Exhibit A: 73 pressures. Exhibit B: a motor that does not quit. The prosecution rests. Bailey's case is open and shut. Defense counsel can talk about the weight all they want — the jury already saw the tape.",
    tags: ['David Bailey', 'EDGE', 'Texas Tech'],
    player_ref: 'david-bailey',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // FERNANDO MENDOZA — QB — Indiana
  // ═══════════════════════════════════════════════════════════════════════
  {
    analyst_id: 'void-caster',
    post_type: 'take',
    content: "Mendoza sees the field before the ball is snapped. That's not coaching. That's wiring.",
    tags: ['Fernando Mendoza', 'QB', 'Indiana'],
    player_ref: 'fernando-mendoza',
  },
  {
    analyst_id: 'void-caster',
    post_type: 'scouting',
    content: "41 touchdowns. 6 interceptions. From Indiana. The system helped, sure. But systems don't throw anticipation balls into closing windows at 6-5. Systems don't go 11-1 with a roster nobody picked to finish .500. Mendoza did that. The shotgun-only thing is a footnote, not a headline.",
    tags: ['Fernando Mendoza', 'QB', 'Indiana'],
    player_ref: 'fernando-mendoza',
  },
  {
    analyst_id: 'the-haze',
    post_type: 'take',
    content: "[HAZE] First QB off the board. Book it. [SMOKE] Not a chance. Simpson's the guy for somebody. [HAZE] Simpson doesn't have 41 touchdowns. [SMOKE] Simpson also took snaps under center.",
    tags: ['Fernando Mendoza', 'QB', 'Indiana'],
    player_ref: 'fernando-mendoza',
  },
  {
    analyst_id: 'the-haze',
    post_type: 'prediction',
    content: "[HAZE] Giants take Mendoza. They need a face. They need a leader. [SMOKE] Giants overthink it and draft a lineman. [HAZE] The Giants? Overthink? Never. [SMOKE] Exactly my point.",
    tags: ['Fernando Mendoza', 'QB', 'Indiana', 'NFL Draft', 'Giants'],
    player_ref: 'fernando-mendoza',
  },
  {
    analyst_id: 'the-colonel',
    post_type: 'take',
    content: "Zero under-center snaps. Zero. You know what we called that at Union High? A wide receiver. Kid's got an arm though. I'll give him that.",
    tags: ['Fernando Mendoza', 'QB', 'Indiana'],
    player_ref: 'fernando-mendoza',
  },
  {
    analyst_id: 'the-colonel',
    post_type: 'reaction',
    content: "People comparing Mendoza to Kirk Cousins like that's a compliment. Kirk Cousins won a lot of games and made a lot of money. You know what Kirk Cousins never won? A playoff game that mattered. Gino just walked in yelling about how Cousins beat the Cowboys once. Nobody asked, Gino.",
    tags: ['Fernando Mendoza', 'QB', 'Indiana', 'Kirk Cousins'],
    player_ref: 'fernando-mendoza',
  },
  {
    analyst_id: 'astra-novatos',
    post_type: 'scouting',
    content: "There's a seam in Mendoza's game. Not a flaw — a fold. Press it and it holds. That's how you know the material is real. The arm isn't special, but the placement is. He puts the ball where it needs to be, not where it looks pretty. Under center? That's tailoring. He'll learn it.",
    tags: ['Fernando Mendoza', 'QB', 'Indiana'],
    player_ref: 'fernando-mendoza',
  },
  {
    analyst_id: 'bun-e',
    post_type: 'scouting',
    content: "Let me present the Mendoza brief. Count one: 41 touchdowns. Count two: a 6-5 frame that holds the pocket like a courtroom. Count three: poise under pressure — the boy does not crack. The defense cites shotgun dependency. Sustained, but overruled by the weight of the evidence. Where I come from — I mean, where I STUDIED — you win with exhibits, not objections.",
    tags: ['Fernando Mendoza', 'QB', 'Indiana'],
    player_ref: 'fernando-mendoza',
  },
  {
    analyst_id: 'bun-e',
    post_type: 'prediction',
    content: "Mendoza goes top 5. Some team is going to look at that tape, that TD-to-INT ratio, and realize they can teach under-center footwork. You can't teach the brain. Verdict: franchise quarterback.",
    tags: ['Fernando Mendoza', 'QB', 'Indiana', 'NFL Draft'],
    player_ref: 'fernando-mendoza',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ARVELL REESE — EDGE — Ohio State
  // ═══════════════════════════════════════════════════════════════════════
  {
    analyst_id: 'void-caster',
    post_type: 'scouting',
    content: "Reese is a ghost who hits like a truck. 56 tackles and 8 sacks from a linebacker spot that half the league would play as an edge. The closing speed is the kind of thing that makes offensive coordinators change the call sheet at 2 AM. At 241, somebody will say he's light. That somebody will be wrong.",
    tags: ['Arvell Reese', 'EDGE', 'Ohio State'],
    player_ref: 'arvell-reese',
  },
  {
    analyst_id: 'void-caster',
    post_type: 'take',
    content: "The Micah Parsons comp is lazy. It's also correct.",
    tags: ['Arvell Reese', 'EDGE', 'Ohio State', 'Micah Parsons'],
    player_ref: 'arvell-reese',
  },
  {
    analyst_id: 'the-haze',
    post_type: 'scouting',
    content: "[HAZE] Reese is the most versatile defender in this draft. LB, edge, whatever you need. [SMOKE] Which is another way of saying nobody knows where to play him. [HAZE] Versatility is a weapon. [SMOKE] Versatility is a question mark with better marketing.",
    tags: ['Arvell Reese', 'EDGE', 'Ohio State'],
    player_ref: 'arvell-reese',
  },
  {
    analyst_id: 'the-colonel',
    post_type: 'take',
    content: "Reese played in Columbus and still made plays. That's saying something. Ohio State cranks out talent like Gino cranks out calzones — hot and fast. Kid's got instincts you can't teach. 241 is light but he moves like he's 220. That's a gift.",
    tags: ['Arvell Reese', 'EDGE', 'Ohio State'],
    player_ref: 'arvell-reese',
  },
  {
    analyst_id: 'astra-novatos',
    post_type: 'take',
    content: "Reese is a hybrid. That word gets thrown around cheaply. But watch the tape — the hip fluidity, the closing burst, the coverage snaps that look like a safety rep. The stitching holds at every position. Most tweeners are compromises. Reese is a collection.",
    tags: ['Arvell Reese', 'EDGE', 'Ohio State'],
    player_ref: 'arvell-reese',
  },
  {
    analyst_id: 'bun-e',
    post_type: 'prediction',
    content: "Reese goes top 8. Some defensive coordinator is going to build an entire scheme around his versatility. LB, edge, slot eraser — the man is a legal precedent. Multi-use, broadly applicable. The kind of ruling courts cite for decades.",
    tags: ['Arvell Reese', 'EDGE', 'Ohio State', 'NFL Draft'],
    player_ref: 'arvell-reese',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // JEREMIYAH LOVE — RB — Notre Dame
  // ═══════════════════════════════════════════════════════════════════════
  {
    analyst_id: 'void-caster',
    post_type: 'take',
    content: "Love doesn't run through you. He runs past you. And by the time you turn around, the scoreboard already changed.",
    tags: ['Jeremiyah Love', 'RB', 'Notre Dame'],
    player_ref: 'jeremiyah-love',
  },
  {
    analyst_id: 'the-haze',
    post_type: 'scouting',
    content: "[HAZE] Three-down back. Catches it, runs it, blocks it. When's the last time Notre Dame had one of those? [SMOKE] He's 212. Three hundred carries and that frame is a question. [HAZE] Bijan Robinson is 215 and nobody blinks. [SMOKE] Bijan Robinson is Bijan Robinson.",
    tags: ['Jeremiyah Love', 'RB', 'Notre Dame'],
    player_ref: 'jeremiyah-love',
  },
  {
    analyst_id: 'the-haze',
    post_type: 'prediction',
    content: "[HAZE] Late first round. Some run-heavy team — Baltimore, maybe — can't resist. [SMOKE] Second round. Running backs don't go first round anymore. [HAZE] Bijan did. [SMOKE] One exception doesn't make a rule.",
    tags: ['Jeremiyah Love', 'RB', 'Notre Dame', 'NFL Draft'],
    player_ref: 'jeremiyah-love',
  },
  {
    analyst_id: 'the-colonel',
    post_type: 'scouting',
    content: "Love runs like he's got somewhere to be. I respect a back who keeps his legs moving after contact — that's old-school. Notre Dame didn't deserve him. Reminds me of a kid we had at Union, Bobby Santapiena. Bobby ran a 4.5 in cleats on a dirt track. Love runs like Bobby if Bobby was actually good.",
    tags: ['Jeremiyah Love', 'RB', 'Notre Dame'],
    player_ref: 'jeremiyah-love',
  },
  {
    analyst_id: 'astra-novatos',
    post_type: 'scouting',
    content: "Love's jump cut is couture. Quick, clean, decisive. At 212 he wears the position well — not too heavy, not too lean. The contact balance is there. The receiving chops are there. Pass protection is raw silk — beautiful potential, needs refinement. A first-round tailor invests in that.",
    tags: ['Jeremiyah Love', 'RB', 'Notre Dame'],
    player_ref: 'jeremiyah-love',
  },
  {
    analyst_id: 'bun-e',
    post_type: 'take',
    content: "The court of public opinion says running backs don't matter. Exhibit A says Jeremiyah Love ran through every defense on Notre Dame's schedule. Motion to dismiss the RB-doesn't-matter crowd. Granted.",
    tags: ['Jeremiyah Love', 'RB', 'Notre Dame'],
    player_ref: 'jeremiyah-love',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // MAKAI LEMON — WR — USC
  // ═══════════════════════════════════════════════════════════════════════
  {
    analyst_id: 'void-caster',
    post_type: 'scouting',
    content: "Lemon works the middle of the field like he owns the deed. 192 pounds, takes hits that would fold bigger men, and finds the first-down marker like it owes him money. The ceiling is capped by his legs — not fast enough to run away from NFL corners deep. But underneath? Nobody's open like Lemon is open.",
    tags: ['Makai Lemon', 'WR', 'USC'],
    player_ref: 'makai-lemon',
  },
  {
    analyst_id: 'the-haze',
    post_type: 'take',
    content: "[HAZE] Lemon is the safest receiver in this draft. Day one starter, 800 yards minimum. [SMOKE] Safe is another word for boring. [HAZE] Boring wins games. [SMOKE] Boring gets drafted in round two.",
    tags: ['Makai Lemon', 'WR', 'USC'],
    player_ref: 'makai-lemon',
  },
  {
    analyst_id: 'the-colonel',
    post_type: 'take',
    content: "5-11. Slot guy. Tough kid though. Reminds me of Wes Welker — no flash, all production. Gino says he's too short. Gino's 5-7. Glass houses, Gino.",
    tags: ['Makai Lemon', 'WR', 'USC'],
    player_ref: 'makai-lemon',
  },
  {
    analyst_id: 'astra-novatos',
    post_type: 'scouting',
    content: "Lemon's route-running is tailored to the sticks. Every break is deliberate. Every step has purpose. At 5-11, the measurements say slot. But the body control says something finer — a pocket square in a world of clip-on ties. The vertical limitations are real, but the underneath game is finished product.",
    tags: ['Makai Lemon', 'WR', 'USC'],
    player_ref: 'makai-lemon',
  },
  {
    analyst_id: 'bun-e',
    post_type: 'prediction',
    content: "Lemon goes late first, early second. Somebody with a good quarterback — maybe Pittsburgh, maybe Minnesota — takes the sure thing. In law we call that mitigating risk. Smart teams mitigate. Dumb teams reach.",
    tags: ['Makai Lemon', 'WR', 'USC', 'NFL Draft'],
    player_ref: 'makai-lemon',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SONNY STYLES — OLB — Ohio State
  // ═══════════════════════════════════════════════════════════════════════
  {
    analyst_id: 'void-caster',
    post_type: 'take',
    content: "4.46 at 244. That's not a linebacker. That's a problem nobody has an answer for.",
    tags: ['Sonny Styles', 'OLB', 'Ohio State'],
    player_ref: 'sonny-styles',
  },
  {
    analyst_id: 'void-caster',
    post_type: 'prediction',
    content: "Styles goes top 15. A team with a subpackage-heavy scheme takes him and builds the defense around his range. He won't play base. He doesn't need to.",
    tags: ['Sonny Styles', 'OLB', 'Ohio State', 'NFL Draft'],
    player_ref: 'sonny-styles',
  },
  {
    analyst_id: 'the-haze',
    post_type: 'scouting',
    content: "[HAZE] Former safety playing linebacker at 244 and covering like a corner. What are we even arguing about? [SMOKE] We're arguing about whether he can play in base defense. Which he can't. [HAZE] Base defense is dying. [SMOKE] Tell that to the Ravens.",
    tags: ['Sonny Styles', 'OLB', 'Ohio State'],
    player_ref: 'sonny-styles',
  },
  {
    analyst_id: 'the-colonel',
    post_type: 'reaction',
    content: "People keep saying Styles is a 'coverage linebacker.' Back in '87, we didn't have coverage linebackers. We had linebackers. They hit people. Styles hits people AND covers. I don't understand the complaint. Gino says it's a gimmick. Gino thinks a smartphone is a gimmick.",
    tags: ['Sonny Styles', 'OLB', 'Ohio State'],
    player_ref: 'sonny-styles',
  },
  {
    analyst_id: 'astra-novatos',
    post_type: 'take',
    content: "Styles is a bespoke piece. You don't buy it off the rack and force it into your wardrobe. You build the wardrobe around it. A DC who understands that gets a generational fit. One who doesn't gets an expensive bench player.",
    tags: ['Sonny Styles', 'OLB', 'Ohio State'],
    player_ref: 'sonny-styles',
  },
  {
    analyst_id: 'bun-e',
    post_type: 'scouting',
    content: "4.46 at 244. Let me enter that into evidence separately because the jury needs to sit with it. Styles is a safety who grew into a linebacker and kept the coverage instincts. That's not a tweener — that's a dual-licensed practitioner. Where I come from — I mean, academically speaking — you want those credentials.",
    tags: ['Sonny Styles', 'OLB', 'Ohio State'],
    player_ref: 'sonny-styles',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // FRANCIS MAUIGOA — OT — Miami (FL)
  // ═══════════════════════════════════════════════════════════════════════
  {
    analyst_id: 'void-caster',
    post_type: 'take',
    content: "Mauigoa gave up 2 sacks all season. Two. The man is a wall with a mean streak and a paycheck coming.",
    tags: ['Francis Mauigoa', 'OT', 'Miami'],
    player_ref: 'francis-mauigoa',
  },
  {
    analyst_id: 'the-haze',
    post_type: 'prediction',
    content: "[HAZE] Top 10. Best offensive lineman in the draft by a mile. [SMOKE] Guard or tackle though? That question drops him. [HAZE] Zack Martin played guard and went top 16. [SMOKE] Zack Martin was Zack Martin. [HAZE] And Mauigoa is Mauigoa. That's the point.",
    tags: ['Francis Mauigoa', 'OT', 'Miami', 'NFL Draft'],
    player_ref: 'francis-mauigoa',
  },
  {
    analyst_id: 'the-colonel',
    post_type: 'scouting',
    content: "329 pounds and mean. That's my kind of lineman. Kid plays like he's got a personal vendetta against every defensive end on the schedule. The guard-or-tackle thing? Who cares. Put him on the line and let him work. We had a kid at Union, Tiny Moretti — 310, mean as a snake. Tiny played wherever you needed him. Mauigoa's got that energy.",
    tags: ['Francis Mauigoa', 'OT', 'Miami'],
    player_ref: 'francis-mauigoa',
  },
  {
    analyst_id: 'astra-novatos',
    post_type: 'scouting',
    content: "At 329, Mauigoa wears the weight well — distributed, functional, purposeful. The hand punch is sharp. The anchor is deep. The run-blocking is Italian leather: strong, supple, built to last. The guard debate is a fitting issue, not a fabric issue. The material is first-round.",
    tags: ['Francis Mauigoa', 'OT', 'Miami'],
    player_ref: 'francis-mauigoa',
  },
  {
    analyst_id: 'bun-e',
    post_type: 'take',
    content: "Two sacks allowed. All season. That's a clean record. In court, you'd call that an unblemished defendant. Mauigoa's tape is his alibi and it holds up under cross-examination.",
    tags: ['Francis Mauigoa', 'OT', 'Miami'],
    player_ref: 'francis-mauigoa',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // JORDYN TYSON — WR — Arizona State
  // ═══════════════════════════════════════════════════════════════════════
  {
    analyst_id: 'void-caster',
    post_type: 'scouting',
    content: "Tyson tracks the deep ball like he knows where it's going before it leaves. 89.0 PFF against man coverage. Strong hands through contact. The inconsistency in play speed is the one thing between him and WR1 money. Some snaps he's burning corners. Other snaps he's jogging through a route. That gap is everything.",
    tags: ['Jordyn Tyson', 'WR', 'Arizona State'],
    player_ref: 'jordyn-tyson',
  },
  {
    analyst_id: 'the-haze',
    post_type: 'take',
    content: "[HAZE] Tyson is the best deep threat in the class. That catch radius at 6-2 is unfair. [SMOKE] Four injuries in four years. That's not a red flag, that's a red banner. [HAZE] Talent doesn't care about your medical report. [SMOKE] NFL training staffs do.",
    tags: ['Jordyn Tyson', 'WR', 'Arizona State'],
    player_ref: 'jordyn-tyson',
  },
  {
    analyst_id: 'the-colonel',
    post_type: 'reaction',
    content: "Heard some scout compare Tyson to Stefon Diggs. That's high praise. Diggs was a firecracker — talented, inconsistent, injured sometimes. Sound familiar? The talent's obvious. The motor? Some days it shows up, some days it's still in bed. Gino says same thing about his delivery driver.",
    tags: ['Jordyn Tyson', 'WR', 'Arizona State', 'Stefon Diggs'],
    player_ref: 'jordyn-tyson',
  },
  {
    analyst_id: 'astra-novatos',
    post_type: 'scouting',
    content: "Tyson's contested-catch ability is heavyweight fabric. Rich, sturdy, dependable at the point of contact. But the route work at the top — lazy feet, incomplete cuts — that's fraying thread. Four injury seasons stitched together. The talent is undeniable. The durability is the fitting question that never gets resolved.",
    tags: ['Jordyn Tyson', 'WR', 'Arizona State'],
    player_ref: 'jordyn-tyson',
  },
  {
    analyst_id: 'bun-e',
    post_type: 'prediction',
    content: "Tyson slides to the second round because medical reports scare front offices worse than bad tape. But some team with cap space and patience — maybe Houston, maybe Seattle — takes the swing. Calculated risk. Where I come from — legally speaking — you always weigh the upside against the liability.",
    tags: ['Jordyn Tyson', 'WR', 'Arizona State', 'NFL Draft'],
    player_ref: 'jordyn-tyson',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // RUEBEN BAIN JR. — EDGE — Miami (FL)
  // ═══════════════════════════════════════════════════════════════════════
  {
    analyst_id: 'void-caster',
    post_type: 'take',
    content: "20.5 career sacks. 6-2. Short arms. Doesn't matter. Bain gets home. That's the whole scouting report.",
    tags: ['Rueben Bain Jr.', 'EDGE', 'Miami'],
    player_ref: 'rueben-bain-jr',
  },
  {
    analyst_id: 'void-caster',
    post_type: 'scouting',
    content: "Bain is the kind of player who makes the stopwatch liars. Sub-31-inch arms should kill his draft stock. A 92.4 PFF pass-rush grade resurrects it. He wins with burst, not length. He wins with motor, not technique. And when the technique catches up to the motor, somebody owes their GM an apology.",
    tags: ['Rueben Bain Jr.', 'EDGE', 'Miami'],
    player_ref: 'rueben-bain-jr',
  },
  {
    analyst_id: 'the-haze',
    post_type: 'scouting',
    content: "[HAZE] 92.4 PFF pass-rush grade. 20.5 career sacks. What more do you need? [SMOKE] Longer arms. [HAZE] He got 20 sacks with those arms. [SMOKE] Against college tackles. NFL tackles are different. [HAZE] That's what they said about every Miami pass rusher. They keep getting drafted top 15.",
    tags: ['Rueben Bain Jr.', 'EDGE', 'Miami'],
    player_ref: 'rueben-bain-jr',
  },
  {
    analyst_id: 'the-colonel',
    post_type: 'take',
    content: "Short arms, big motor. Every coach I ever had would take that trade. Bain plays like he's trying to prove something every snap. At Union we called that a chip on your shoulder. These days they call it 'motor.' Same thing. Different era.",
    tags: ['Rueben Bain Jr.', 'EDGE', 'Miami'],
    player_ref: 'rueben-bain-jr',
  },
  {
    analyst_id: 'astra-novatos',
    post_type: 'prediction',
    content: "Bain goes mid-first. The arms will scare off the measurement-obsessed front offices. But a team that values production over proportion — a team that buys off the rack and tailors later — takes him and doesn't look back. The burst is real. The sack numbers are real. The rest is alterations.",
    tags: ['Rueben Bain Jr.', 'EDGE', 'Miami', 'NFL Draft'],
    player_ref: 'rueben-bain-jr',
  },
  {
    analyst_id: 'bun-e',
    post_type: 'reaction',
    content: "Arm-length discourse drives me up the wall. 20.5 sacks is 20.5 sacks. You don't need long arms to file a motion to dismiss the opposing quarterback. Bain's got the receipts. Case closed.",
    tags: ['Rueben Bain Jr.', 'EDGE', 'Miami'],
    player_ref: 'rueben-bain-jr',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // CALEB DOWNS — S — Ohio State
  // ═══════════════════════════════════════════════════════════════════════
  {
    analyst_id: 'void-caster',
    post_type: 'scouting',
    content: "Downs is the best safety in this class and it isn't close. 4.45, covers everything, hits like a linebacker, ball hawk hands. The only thing stopping him from going top 5 is the position. Safeties don't go top 5 unless you're Ed Reed. Downs isn't Ed Reed. But he's the closest thing since.",
    tags: ['Caleb Downs', 'S', 'Ohio State'],
    player_ref: 'caleb-downs',
  },
  {
    analyst_id: 'void-caster',
    post_type: 'take',
    content: "Downs plays every blade of grass. That's not a metaphor. Watch the film.",
    tags: ['Caleb Downs', 'S', 'Ohio State'],
    player_ref: 'caleb-downs',
  },
  {
    analyst_id: 'the-haze',
    post_type: 'prediction',
    content: "[HAZE] Top 10. Somebody trades up for him. [SMOKE] A safety in the top 10? In 2026? [HAZE] When's the last time you saw a safety this complete? [SMOKE] When's the last time a safety justified a top-10 pick? [HAZE] That's not his problem. That's the NFL's problem.",
    tags: ['Caleb Downs', 'S', 'Ohio State', 'NFL Draft'],
    player_ref: 'caleb-downs',
  },
  {
    analyst_id: 'the-colonel',
    post_type: 'scouting',
    content: "Downs does everything. Covers, tackles, blitzes, picks the ball off. Back in my day we called that a football player. Now they call it a 'unicorn.' He's not a unicorn, he's just good at his job. Ohio State keeps putting out DBs and the NFL keeps buying them. Gino thinks he should go to the Jets. Gino thinks everything should go to the Jets.",
    tags: ['Caleb Downs', 'S', 'Ohio State'],
    player_ref: 'caleb-downs',
  },
  {
    analyst_id: 'astra-novatos',
    post_type: 'take',
    content: "Downs is the kind of prospect you build a capsule collection around. Every skill — the range, the instincts, the hands, the physicality — works in harmony. The only flaw is the label on the garment: safety. And the market undervalues the label, not the cloth.",
    tags: ['Caleb Downs', 'S', 'Ohio State'],
    player_ref: 'caleb-downs',
  },
  {
    analyst_id: 'bun-e',
    post_type: 'scouting',
    content: "4.45 forty. Ball-hawk hands. Run-support instincts that are NFL-ready today, not three years from now. Caleb Downs is the strongest case file in this draft. The only counterargument is positional value, and that's a legislative issue, not a talent issue. Don't penalize the individual for the system's bias.",
    tags: ['Caleb Downs', 'S', 'Ohio State'],
    player_ref: 'caleb-downs',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // GENERAL / NON-PLAYER-SPECIFIC POSTS
  // ═══════════════════════════════════════════════════════════════════════

  // Void-Caster general
  {
    analyst_id: 'void-caster',
    post_type: 'take',
    content: "Mock drafts are fan fiction with better formatting.",
    tags: ['NFL Draft', 'Mock Draft'],
    player_ref: null,
  },
  {
    analyst_id: 'void-caster',
    post_type: 'take',
    content: "Every year somebody falls and we act surprised. The board isn't a ladder. It's a trapdoor.",
    tags: ['NFL Draft'],
    player_ref: null,
  },
  {
    analyst_id: 'void-caster',
    post_type: 'reaction',
    content: "Combine season. Where 40 times replace tape and hand size replaces instincts. The circus is in town.",
    tags: ['NFL Combine'],
    player_ref: null,
  },

  // Haze & Smoke general
  {
    analyst_id: 'the-haze',
    post_type: 'take',
    content: "[HAZE] This QB class is deep. Five starters, minimum. [SMOKE] This QB class is a mirage. Mendoza's the only one I'd bet on. [HAZE] Bet what, your lunch money? [SMOKE] My integrity. Same thing to you, apparently.",
    tags: ['QB Class', 'NFL Draft'],
    player_ref: null,
  },
  {
    analyst_id: 'the-haze',
    post_type: 'reaction',
    content: "[HAZE] Pro Day numbers are in and I'm feeling vindicated. [SMOKE] You feel vindicated every Tuesday. Doesn't make you right. [HAZE] Name one time I was wrong this cycle. [SMOKE] I'll need more than one post for that list.",
    tags: ['Pro Day', 'NFL Draft'],
    player_ref: null,
  },
  {
    analyst_id: 'the-haze',
    post_type: 'take',
    content: "[HAZE] Ohio State has three top-10 picks in this class. The factory stays open. [SMOKE] The factory produces volume, not quality. [HAZE] Reese, Styles, Downs. That's quality. [SMOKE] Ask me again after year two.",
    tags: ['Ohio State', 'NFL Draft'],
    player_ref: null,
  },

  // Colonel general
  {
    analyst_id: 'the-colonel',
    post_type: 'take',
    content: "I keep saying it — this draft is loaded at edge rusher. Three, maybe four go in the top 15. Gino thinks I'm exaggerating. Gino thought COVID was exaggerated too.",
    tags: ['EDGE', 'NFL Draft'],
    player_ref: null,
  },
  {
    analyst_id: 'the-colonel',
    post_type: 'reaction',
    content: "Just saw a mock draft with a punter in the third round. A PUNTER. In 1987 we didn't have punters. We had the backup quarterback. This league has lost its mind. Gino's laughing. I'm not laughing, Gino.",
    tags: ['NFL Draft', 'Mock Draft'],
    player_ref: null,
  },
  {
    analyst_id: 'the-colonel',
    post_type: 'take',
    content: "Pizza from Marlisecio's and draft prep. Name a better combination. You can't. Don't try.",
    tags: ['Draft Prep'],
    player_ref: null,
  },

  // Astra general
  {
    analyst_id: 'astra-novatos',
    post_type: 'take',
    content: "Draft boards are wardrobes. Most GMs dress the same. The ones who win dress different. Not loud. Just... considered.",
    tags: ['NFL Draft'],
    player_ref: null,
  },
  {
    analyst_id: 'astra-novatos',
    post_type: 'reaction',
    content: "Another 'leaked' big board making the rounds. Fabric always looks different on the rack than on the body. Wait for the fitting.",
    tags: ['NFL Draft', 'Big Board'],
    player_ref: null,
  },
  {
    analyst_id: 'astra-novatos',
    post_type: 'take',
    content: "The edge class this year is Italian wool. Rich, deep, versatile. Bailey, Reese, Bain — each cut differently, each worth the investment.",
    tags: ['EDGE', 'NFL Draft', 'David Bailey', 'Arvell Reese', 'Rueben Bain Jr.'],
    player_ref: null,
  },

  // Bun-E general
  {
    analyst_id: 'bun-e',
    post_type: 'take',
    content: "Draft night is a trial. 32 teams, 32 verdicts. Some acquittals. Some wrongful convictions. The appeals process takes three years and is called 'cutting your losses.'",
    tags: ['NFL Draft'],
    player_ref: null,
  },
  {
    analyst_id: 'bun-e',
    post_type: 'reaction',
    content: "Another mock draft where someone has a receiver going first overall. I'd like to file a motion to suppress all mock drafts published before March. Hearsay, the lot of them.",
    tags: ['NFL Draft', 'Mock Draft'],
    player_ref: null,
  },
  {
    analyst_id: 'bun-e',
    post_type: 'take',
    content: "Ohio State putting three guys in the top 10. The Buckeyes' recruiting department should be billing by the hour. Where I come from — I mean, where I went to SCHOOL — that's called a return on investment.",
    tags: ['Ohio State', 'NFL Draft'],
    player_ref: null,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ADDITIONAL PLAYER-SPECIFIC — filling to ~120
  // ═══════════════════════════════════════════════════════════════════════

  // More Bailey
  {
    analyst_id: 'bun-e',
    post_type: 'prediction',
    content: "Bailey goes top 7. The evidence is overwhelming and the defense — pun intended — has no rebuttal. Texas Tech's closing argument was 73 pressures in a single season. The jury doesn't need deliberation.",
    tags: ['David Bailey', 'EDGE', 'Texas Tech', 'NFL Draft'],
    player_ref: 'david-bailey',
  },

  // More Mendoza
  {
    analyst_id: 'astra-novatos',
    post_type: 'prediction',
    content: "Mendoza is a top-3 pick. The QB market values decision-making over arm strength now. He's a tailored suit in a class of off-the-rack options. The shotgun dependency is a hem — let it out and move on.",
    tags: ['Fernando Mendoza', 'QB', 'Indiana', 'NFL Draft'],
    player_ref: 'fernando-mendoza',
  },

  // More Reese
  {
    analyst_id: 'the-haze',
    post_type: 'prediction',
    content: "[HAZE] Top 5 if a team runs a 3-4. Perfect fit. [SMOKE] Top 5 for a tweener? Come on. [HAZE] Micah Parsons was a tweener. [SMOKE] I hate when you bring up Parsons. [HAZE] Because I'm right.",
    tags: ['Arvell Reese', 'EDGE', 'Ohio State', 'NFL Draft'],
    player_ref: 'arvell-reese',
  },
  {
    analyst_id: 'the-colonel',
    post_type: 'prediction',
    content: "Reese goes to a team that runs a lot of nickel. Maybe Chicago, maybe Houston. Kid needs a DC who knows what to do with speed. Not every coach does. My coach in '87 didn't. We still won state. But imagine if he did.",
    tags: ['Arvell Reese', 'EDGE', 'Ohio State', 'NFL Draft'],
    player_ref: 'arvell-reese',
  },

  // More Love
  {
    analyst_id: 'void-caster',
    post_type: 'scouting',
    content: "Love's contact balance at 212 defies physics. He doesn't absorb hits — he redistributes them. Legs keep churning. The receiving work is clean. Pass protection is the one dark room in the house. But the rest of the house is well-lit.",
    tags: ['Jeremiyah Love', 'RB', 'Notre Dame'],
    player_ref: 'jeremiyah-love',
  },
  {
    analyst_id: 'astra-novatos',
    post_type: 'prediction',
    content: "Love goes in the 20s. A team building around the run — Denver, Green Bay — takes the Bijan Robinson comparison seriously. The frame is lean, yes. But lean can last if you manage the workload. This is cashmere, not canvas. Handle accordingly.",
    tags: ['Jeremiyah Love', 'RB', 'Notre Dame', 'NFL Draft'],
    player_ref: 'jeremiyah-love',
  },

  // More Lemon
  {
    analyst_id: 'void-caster',
    post_type: 'take',
    content: "Lemon knows where the sticks are the way a surgeon knows where the artery is. Instinct dressed as route-running.",
    tags: ['Makai Lemon', 'WR', 'USC'],
    player_ref: 'makai-lemon',
  },
  {
    analyst_id: 'the-haze',
    post_type: 'prediction',
    content: "[HAZE] Late first. Somebody like the Chargers takes him as their slot weapon. [SMOKE] Second round. Slot guys don't go first round unless their name is Quentin Johnston — wait, he was outside. Bad example. [HAZE] Bad example is right.",
    tags: ['Makai Lemon', 'WR', 'USC', 'NFL Draft'],
    player_ref: 'makai-lemon',
  },

  // More Styles
  {
    analyst_id: 'the-haze',
    post_type: 'prediction',
    content: "[HAZE] Styles goes 12-16 range to a team that runs a lot of sub packages. Perfect fit for a Seattle or a Cincinnati. [SMOKE] Or he goes 20-25 because base defense coaches still exist. [HAZE] Name one. [SMOKE] ...I'll get back to you.",
    tags: ['Sonny Styles', 'OLB', 'Ohio State', 'NFL Draft'],
    player_ref: 'sonny-styles',
  },
  {
    analyst_id: 'the-colonel',
    post_type: 'prediction',
    content: "Styles goes mid-first. Some team with a smart DC — not a stubborn DC, a smart one — picks him and uses him right. If a stubborn DC picks him and makes him play base, call the cops. That's a crime.",
    tags: ['Sonny Styles', 'OLB', 'Ohio State', 'NFL Draft'],
    player_ref: 'sonny-styles',
  },

  // More Mauigoa
  {
    analyst_id: 'void-caster',
    post_type: 'scouting',
    content: "329 pounds. 87.6 PFF pass-blocking grade. Two sacks allowed. Mauigoa isn't a question. He's the answer. The guard-tackle debate is noise from people who haven't watched him put defensive ends on their back. Play him anywhere on the line. He'll be the best player at the position.",
    tags: ['Francis Mauigoa', 'OT', 'Miami'],
    player_ref: 'francis-mauigoa',
  },
  {
    analyst_id: 'the-haze',
    post_type: 'reaction',
    content: "[HAZE] Mauigoa film is disgusting. In a good way. Watch the third quarter against Virginia Tech. [SMOKE] I watched it. He gets caught high on one rep. [HAZE] One rep. Out of how many? [SMOKE] Doesn't matter. NFL rushers will find that. [HAZE] NFL rushers will also find his fist in their chest.",
    tags: ['Francis Mauigoa', 'OT', 'Miami'],
    player_ref: 'francis-mauigoa',
  },

  // More Tyson
  {
    analyst_id: 'void-caster',
    post_type: 'take',
    content: "Tyson is a gamble. The highs are Stefon Diggs. The lows are four seasons on an injury report. The question isn't if the talent is there. It's if the body lets him use it.",
    tags: ['Jordyn Tyson', 'WR', 'Arizona State'],
    player_ref: 'jordyn-tyson',
  },
  {
    analyst_id: 'the-colonel',
    post_type: 'prediction',
    content: "Tyson goes second round. Some team drafts the talent and prays about the health. That's a gamble. In '87 we didn't gamble on injured kids. We also didn't have MRIs. Different times.",
    tags: ['Jordyn Tyson', 'WR', 'Arizona State', 'NFL Draft'],
    player_ref: 'jordyn-tyson',
  },
  {
    analyst_id: 'bun-e',
    post_type: 'take',
    content: "Tyson's catch radius is exhibit-worthy. 6-2, strong hands, wins at the catch point. But the injury history is a disclosure risk. Full transparency: four seasons, four injuries. The talent is real. The availability is on appeal.",
    tags: ['Jordyn Tyson', 'WR', 'Arizona State'],
    player_ref: 'jordyn-tyson',
  },

  // More Bain
  {
    analyst_id: 'the-haze',
    post_type: 'prediction',
    content: "[HAZE] Bain goes top 12. Miami edge rushers are an NFL staple at this point. [SMOKE] Top 20. The arms scare people. [HAZE] The sack numbers un-scare them. [SMOKE] Did you just say 'un-scare'? [HAZE] I'm making a point.",
    tags: ['Rueben Bain Jr.', 'EDGE', 'Miami', 'NFL Draft'],
    player_ref: 'rueben-bain-jr',
  },
  {
    analyst_id: 'astra-novatos',
    post_type: 'scouting',
    content: "Bain's burst off the snap is off-the-runway speed. Pure acceleration. The short arms are a measurement flaw that the tape contradicts. 92.4 PFF pass-rush grade isn't a draft-day slide — it's an insurance policy. The quick-twitch motor runs four quarters. That's a garment that holds up under wear.",
    tags: ['Rueben Bain Jr.', 'EDGE', 'Miami'],
    player_ref: 'rueben-bain-jr',
  },

  // More Downs
  {
    analyst_id: 'the-haze',
    post_type: 'scouting',
    content: "[HAZE] Downs can play single-high, two-high, in the box. He's a Swiss Army knife. [SMOKE] Swiss Army knives do a lot of things okay. [HAZE] Downs does everything well. Big difference. [SMOKE] My concern is draft capital. Safety at 8? At 10? [HAZE] For this safety? Yes.",
    tags: ['Caleb Downs', 'S', 'Ohio State'],
    player_ref: 'caleb-downs',
  },
  {
    analyst_id: 'astra-novatos',
    post_type: 'prediction',
    content: "Downs goes 8-12. The positional discount keeps him out of the top 5, but the talent won't let him fall further. He's a three-piece suit in a position group that usually shops at outlets. Whoever takes him is buying investment-grade fabric.",
    tags: ['Caleb Downs', 'S', 'Ohio State', 'NFL Draft'],
    player_ref: 'caleb-downs',
  },
  {
    analyst_id: 'the-colonel',
    post_type: 'prediction',
    content: "Downs is the best player in this draft and he'll go 8th because he plays safety. Life isn't fair. Ask Gino — he makes the best pepperoni slice in Jersey and he's still not on Yelp's top 10. Injustice everywhere.",
    tags: ['Caleb Downs', 'S', 'Ohio State', 'NFL Draft'],
    player_ref: 'caleb-downs',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // CROSS-PLAYER / COMPARISON POSTS
  // ═══════════════════════════════════════════════════════════════════════

  {
    analyst_id: 'void-caster',
    post_type: 'take',
    content: "Bailey, Reese, Bain. Three edges, three different blueprints. Bailey is violence. Reese is versatility. Bain is motor. Pick your poison.",
    tags: ['David Bailey', 'Arvell Reese', 'Rueben Bain Jr.', 'EDGE'],
    player_ref: null,
  },
  {
    analyst_id: 'the-haze',
    post_type: 'take',
    content: "[HAZE] Mendoza vs. the field at QB1. I'm taking Mendoza. [SMOKE] The field. Every time. [HAZE] The field doesn't have 41 touchdowns. [SMOKE] The field doesn't have zero under-center snaps either.",
    tags: ['Fernando Mendoza', 'QB', 'NFL Draft'],
    player_ref: 'fernando-mendoza',
  },
  {
    analyst_id: 'the-colonel',
    post_type: 'take',
    content: "Three Ohio State guys in the top 10. What are they feeding those kids in Columbus? Gino says it's not the pizza, that's for sure. For once, we agree.",
    tags: ['Ohio State', 'NFL Draft', 'Arvell Reese', 'Sonny Styles', 'Caleb Downs'],
    player_ref: null,
  },
  {
    analyst_id: 'astra-novatos',
    post_type: 'scouting',
    content: "Lemon and Tyson are two different fabrics solving the same problem. Lemon is cotton — reliable, known, comfortable. Tyson is silk — stunning when it works, fragile when it doesn't. A smart GM buys both.",
    tags: ['Makai Lemon', 'Jordyn Tyson', 'WR'],
    player_ref: null,
  },
  {
    analyst_id: 'bun-e',
    post_type: 'scouting',
    content: "The edge rusher class is a triple indictment. Bailey brings the speed. Reese brings the coverage. Bain brings the relentlessness. Three different offenses, same charge: disruption. Where I come from — where I STUDIED — that's a class-action talent pool.",
    tags: ['David Bailey', 'Arvell Reese', 'Rueben Bain Jr.', 'EDGE'],
    player_ref: null,
  },

  // More general flavor
  {
    analyst_id: 'void-caster',
    post_type: 'take',
    content: "The best player in this draft plays safety. The NFL will pretend that's a problem. It's not.",
    tags: ['Caleb Downs', 'S', 'NFL Draft'],
    player_ref: 'caleb-downs',
  },
  {
    analyst_id: 'the-haze',
    post_type: 'reaction',
    content: "[HAZE] Just finished a 12-hour tape session. My eyes hurt and my board is a mess. [SMOKE] Your board was a mess before the tape session. [HAZE] Thanks for the support. [SMOKE] Support isn't my job. Accuracy is.",
    tags: ['NFL Draft', 'Tape Study'],
    player_ref: null,
  },
  {
    analyst_id: 'the-colonel',
    post_type: 'reaction',
    content: "Gino just asked me if I'm doing a live show on draft night. Gino, I've done a live show every draft night since 2004. Where have you been? He said 'making pizza.' Fair enough.",
    tags: ['NFL Draft', 'Draft Night'],
    player_ref: null,
  },
  {
    analyst_id: 'astra-novatos',
    post_type: 'take',
    content: "There are 31 picks in the first round that matter. And then there's the one where a GM reaches for a project and calls it 'upside.' That's not drafting. That's shopping without a mirror.",
    tags: ['NFL Draft'],
    player_ref: null,
  },
  {
    analyst_id: 'bun-e',
    post_type: 'reaction',
    content: "Someone on the timeline said safeties don't matter. I'd like to introduce Caleb Downs as a hostile witness. 4.45, covers everything, hits like consequences. The defense's case just collapsed.",
    tags: ['Caleb Downs', 'S', 'Ohio State'],
    player_ref: 'caleb-downs',
  },

  // Final batch — more character flavor
  {
    analyst_id: 'void-caster',
    post_type: 'take',
    content: "Mendoza and Mauigoa. The quarterback and the man who keeps him upright. Both from programs people underestimated. Both going in the top 10. Coincidence is for amateurs.",
    tags: ['Fernando Mendoza', 'Francis Mauigoa', 'NFL Draft'],
    player_ref: null,
  },
  {
    analyst_id: 'the-haze',
    post_type: 'take',
    content: "[HAZE] This is the best EDGE class in five years. [SMOKE] You said that last year. [HAZE] Last year I was wrong. [SMOKE] Progress.",
    tags: ['EDGE', 'NFL Draft'],
    player_ref: null,
  },
  {
    analyst_id: 'the-colonel',
    post_type: 'take',
    content: "You wanna know my final board? Come to Marlisecio's on Thursday. I'll write it on a napkin. That napkin's worth more than half the scouting reports I've read this month.",
    tags: ['NFL Draft', 'Big Board'],
    player_ref: null,
  },
  {
    analyst_id: 'astra-novatos',
    post_type: 'take',
    content: "A draft board is a garment pattern. Cut it wrong and the whole thing unravels. Cut it right and it looks effortless. Most GMs think they're tailors. Most GMs buy off the rack and pretend.",
    tags: ['NFL Draft'],
    player_ref: null,
  },
  {
    analyst_id: 'bun-e',
    post_type: 'take',
    content: "32 teams. 7 rounds. 259 picks. Every single one of them is a binding contract with a kid's future. Treat it like a courtroom, not a casino. Where I come from — legally — you respect the gravity of a verdict.",
    tags: ['NFL Draft'],
    player_ref: null,
  },
  {
    analyst_id: 'void-caster',
    post_type: 'reaction',
    content: "Somebody asked me for my top 5. I gave them a top 1. Caleb Downs. Fill in the rest yourself.",
    tags: ['Caleb Downs', 'NFL Draft'],
    player_ref: 'caleb-downs',
  },
  {
    analyst_id: 'the-colonel',
    post_type: 'reaction',
    content: "Love from Notre Dame is the best back I've scouted since Saquon. There. I said it. Gino just spit out his espresso. Gino, clean that up, I'm not done. The jump cuts alone are worth a first-round pick.",
    tags: ['Jeremiyah Love', 'RB', 'Notre Dame'],
    player_ref: 'jeremiyah-love',
  },
  {
    analyst_id: 'bun-e',
    post_type: 'reaction',
    content: "Mauigoa's tape against Clemson is the most compelling evidence I've reviewed this cycle. Two sacks allowed ALL YEAR and the man moves at 329 like the laws of physics filed for an exemption. Objection sustained — on behalf of every quarterback he'll protect.",
    tags: ['Francis Mauigoa', 'OT', 'Miami'],
    player_ref: 'francis-mauigoa',
  },
  {
    analyst_id: 'astra-novatos',
    post_type: 'reaction',
    content: "Watched the Love film again. Third time this week. The home-run speed is genuine — not workout speed, game speed. The kind of burst that doesn't show up in shorts. It shows up in pads, under lights, with 70,000 people watching. That's the only measurement that matters.",
    tags: ['Jeremiyah Love', 'RB', 'Notre Dame'],
    player_ref: 'jeremiyah-love',
  },
  {
    analyst_id: 'the-haze',
    post_type: 'reaction',
    content: "[HAZE] Mauigoa's senior bowl week was the best I've seen from an O-lineman in years. [SMOKE] Senior bowl is glorified practice. [HAZE] Practice where you're going against real NFL-caliber rushers. [SMOKE] At half speed. [HAZE] Mauigoa wasn't at half speed. That's the point.",
    tags: ['Francis Mauigoa', 'OT', 'Miami'],
    player_ref: 'francis-mauigoa',
  },
  {
    analyst_id: 'the-colonel',
    post_type: 'take',
    content: "Lemon from USC plays like a lunch-pail kid in a skill position. My favorite kind of receiver. Gino says he's too short to go first round. Gino's been wrong about height his whole life. The man bought a truck he can't reach the pedals in.",
    tags: ['Makai Lemon', 'WR', 'USC'],
    player_ref: 'makai-lemon',
  },
  {
    analyst_id: 'bun-e',
    post_type: 'scouting',
    content: "Styles presents a unique legal theory: what if one player could do the work of two positions? The court of NFL scouting hasn't ruled on this yet. But the evidence — 4.46 at 244, coverage grades that look like a DB's — is compelling. I'd take the case. Pro bono.",
    tags: ['Sonny Styles', 'OLB', 'Ohio State'],
    player_ref: 'sonny-styles',
  },
  {
    analyst_id: 'void-caster',
    post_type: 'reaction',
    content: "Another day, another mock with Mendoza falling to 12. The disrespect is a feature, not a bug. He'll remember every team that passed.",
    tags: ['Fernando Mendoza', 'QB', 'Indiana', 'Mock Draft'],
    player_ref: 'fernando-mendoza',
  },
  {
    analyst_id: 'astra-novatos',
    post_type: 'reaction',
    content: "Bain's pro day measurements leaked. 31-inch arms, on the dot. The internet panics. The tape doesn't. I've seen short-armed jackets sit better than long ones. It's about the cut, not the yardage.",
    tags: ['Rueben Bain Jr.', 'EDGE', 'Miami', 'Pro Day'],
    player_ref: 'rueben-bain-jr',
  },
];

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log('Creating tables...');
  await sql.unsafe(CREATE_PROFILES);
  await sql.unsafe(CREATE_POSTS);

  // Clear old seed data
  console.log('Clearing existing huddle data...');
  await sql`DELETE FROM huddle_posts`;
  await sql`DELETE FROM huddle_profiles`;

  // Insert profiles
  console.log('Inserting profiles...');
  for (const p of PROFILES) {
    await sql`
      INSERT INTO huddle_profiles (analyst_id, display_name, handle, bio, show_name, avatar_color, followers, following, verified)
      VALUES (${p.analyst_id}, ${p.display_name}, ${p.handle}, ${p.bio}, ${p.show_name}, ${p.avatar_color}, ${p.followers}, ${p.following}, TRUE)
      ON CONFLICT (analyst_id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        handle = EXCLUDED.handle,
        bio = EXCLUDED.bio,
        show_name = EXCLUDED.show_name,
        avatar_color = EXCLUDED.avatar_color,
        followers = EXCLUDED.followers,
        following = EXCLUDED.following
    `;
  }

  // Insert posts with staggered timestamps (most recent first, going back ~7 days)
  console.log('Inserting posts...');
  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < POSTS.length; i++) {
    const p = POSTS[i];
    // Spread posts across the last 7 days
    const offset = (i / POSTS.length) * SEVEN_DAYS_MS;
    const ts = new Date(now - offset);

    const likes = Math.floor(Math.random() * 400) + 10;
    const reposts = Math.floor(Math.random() * 80) + 2;
    const replies = Math.floor(Math.random() * 60) + 1;

    await sql`
      INSERT INTO huddle_posts (analyst_id, post_type, content, tags, player_ref, likes, reposts, replies, created_at)
      VALUES (${p.analyst_id}, ${p.post_type}, ${p.content}, ${p.tags}, ${p.player_ref}, ${likes}, ${reposts}, ${replies}, ${ts})
    `;
  }

  // Update post counts on profiles
  await sql`
    UPDATE huddle_profiles hp
    SET post_count = (SELECT COUNT(*) FROM huddle_posts WHERE analyst_id = hp.analyst_id)
  `;

  // ── Stats ───────────────────────────────────────────────────────────
  const totalProfiles = PROFILES.length;
  const totalPosts = POSTS.length;

  const analystCounts = {};
  const typeCounts = {};
  for (const p of POSTS) {
    analystCounts[p.analyst_id] = (analystCounts[p.analyst_id] || 0) + 1;
    typeCounts[p.post_type] = (typeCounts[p.post_type] || 0) + 1;
  }

  console.log('\n══════════════════════════════════════');
  console.log('  THE HUDDLE — Seed Complete');
  console.log('══════════════════════════════════════');
  console.log(`  Profiles inserted: ${totalProfiles}`);
  console.log(`  Posts inserted:    ${totalPosts}`);
  console.log('');
  console.log('  Posts per analyst:');
  for (const [id, count] of Object.entries(analystCounts)) {
    console.log(`    ${id.padEnd(18)} ${count}`);
  }
  console.log('');
  console.log('  Posts per type:');
  for (const [type, count] of Object.entries(typeCounts)) {
    console.log(`    ${type.padEnd(18)} ${count}`);
  }
  console.log('══════════════════════════════════════\n');

  await sql.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
