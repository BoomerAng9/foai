import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_25fRtnTYlpsr@ep-dawn-bar-a4orhend-pooler.us-east-1.aws.neon.tech/performdb?sslmode=require');

// Hand-written scouting rewrites for top 50 players
// Rules: no "elite", no "projects as"/"profiles as", scout-to-scout tone,
// specific measurables, honest weaknesses, single NFL comp, tight summaries

const rewrites = {
  1: { // David Bailey, EDGE, Texas Tech, 6'4" 251
    strengths: "Violent first step, 73 pressures on the year, wins with speed-to-power conversion, relentless motor, long arms that disrupt passing lanes, PFF 93+ pass-rush grade",
    weaknesses: "Gets washed against the run at 251, narrow base, skinny lower half, NFL tackles will anchor him down, limited counter moves when initial rush stalls",
    scouting_summary: "Speed rusher who lives in the backfield but disappears when teams run at him. Day 1 passing-down contributor, but the three-down question is real until he puts on 15 pounds of good weight.",
    nfl_comparison: "Will Anderson Jr. (light version)"
  },
  2: { // Fernando Mendoza, QB, Indiana, 6'5" 236
    strengths: "41 TD to 6 INT, sees the field pre-snap, puts the ball where only his guy can get it, 6-5 frame with a plus arm, competitive as hell, doesn't rattle",
    weaknesses: "97% of snaps from shotgun — zero under-center reps, arm talent is good not special, processing slows against exotic pressures, system inflated some numbers",
    scouting_summary: "Big, smart, accurate quarterback who produced at a stupid level in 2025. The shotgun-only thing is a real concern for NFL offenses that need play-action under center. Ceiling is a top-15 starter, floor is a really good backup.",
    nfl_comparison: "Kirk Cousins"
  },
  3: { // Arvell Reese, EDGE, Ohio State, 6'4" 241
    strengths: "Hybrid tweener who actually makes it work, closing speed is terrifying, 8 sacks plus 56 tackles from the LB spot, fluid hips, covers ground sideline to sideline",
    weaknesses: "241 is light for a full-time edge, combine speed numbers still TBD, positional fit is a question — LB or edge? — and some teams won't want to figure it out",
    scouting_summary: "Does a little bit of everything and most of it at a high level. The Micah Parsons comp is lazy but not wrong — he's that kind of chess piece if a DC is creative enough.",
    nfl_comparison: "Micah Parsons (if he stays healthy)"
  },
  4: { // Jeremiyah Love, RB, Notre Dame, 6'0" 212
    strengths: "Home-run speed, three-down back who catches it clean out of the backfield, jump cuts in traffic, 212 with legit contact balance, keeps his legs churning",
    weaknesses: "Lean frame raises durability red flags at 300+ carries, can get bounced at the second level, pass protection is willing but technique is raw",
    scouting_summary: "Best pure running back prospect since Bijan Robinson. Explosive, instinctive, and he makes the first guy miss every single time. The only question is whether that 212-pound frame holds up to a full NFL workload.",
    nfl_comparison: "Bijan Robinson"
  },
  5: { // Makai Lemon, WR, USC, 5'11" 192
    strengths: "Body control off the charts, knows where the sticks are, tough over the middle at 192, works the slot like a vet, smooth route runner with quick feet at the break",
    weaknesses: "5-11 with average top-end speed, gets boxed out on contested catches by longer corners, lacks the burst to separate vertically, ceiling tied to slot role",
    scouting_summary: "Savvy slot receiver who wins with craft and toughness, not physical tools. He'll get open in the NFL because he's smarter than the guy covering him. Limited ceiling but a really high floor.",
    nfl_comparison: "Tyler Boyd"
  },
  6: { // Sonny Styles, OLB, Ohio State, 6'5" 244
    strengths: "4.46 forty at 244, converted safety so he covers like a DB, sideline-to-sideline range, All-American production, rare size-speed combo for an off-ball linebacker",
    weaknesses: "Pass-rush technique is still raw, between-the-tackles run fits need work, still figuring out the linebacker position after playing safety, best in sub-packages not base",
    scouting_summary: "Freak athlete at 6-5, 244 who runs a 4.46. Covers like a safety because he was one. Not a finished product as a linebacker, but the tools are absurd and he's only scratching the surface.",
    nfl_comparison: "Roquan Smith (bigger, faster, rawer)"
  },
  7: { // Francis Mauigoa, OT, Miami, 6'6" 329
    strengths: "Mauler in the run game, 329 pounds with real feet, 87.6 PFF pass blocking grade, gave up 2 sacks all year, nasty hand punch, strong anchor, plays with a mean streak",
    weaknesses: "Guard-or-tackle debate follows him, minor technique lapses under speed pressure, 329 is heavy even for the NFL — conditioning matters",
    scouting_summary: "Road-grading run blocker who also held up in pass pro at Miami. Some teams see a dominant right tackle, others see an All-Pro guard. Either way he's starting Week 1 somewhere.",
    nfl_comparison: "Zack Martin"
  },
  8: { // Jordyn Tyson, WR, Arizona State, 6'2" 203
    strengths: "Tracks the deep ball like a centerfielder, 89.0 PFF grade against man coverage, strong hands through contact, 6-2 with a wide catch radius, wins contested catches consistently",
    weaknesses: "Lazy feet at the top of routes, play speed is inconsistent — looks fast sometimes and pedestrian other times, hurt in all four college seasons, blocking effort comes and goes",
    scouting_summary: "When he's on, he looks like a WR1. The tape shows real ball-tracking ability and contested-catch skill that translates. But the injuries pile up and the inconsistent motor is a yellow flag.",
    nfl_comparison: "Stefon Diggs"
  },
  9: { // Rueben Bain Jr., EDGE, Miami, 6'2" 263
    strengths: "20.5 career sacks, 92.4 PFF pass-rush grade, quick-twitch burst off the snap, versatile alignment at 5-tech and edge, motor runs hot all four quarters",
    weaknesses: "Sub-31-inch arms are a problem, 6-2 is short for the position, loses the leverage battle after contact, gap discipline breaks down against misdirection, hands get sloppy late in reps",
    scouting_summary: "Productive as hell but the tape and the measurables tell different stories. Short arms and average length mean he has to be perfect with his technique, and right now he isn't. Passing-down weapon in an odd front, not a base end.",
    nfl_comparison: "Yannick Ngakoue"
  },
  10: { // Caleb Downs, S, Ohio State, 6'0" 206
    strengths: "4.45 forty, covers every blade of grass, instincts in run support are NFL-ready, experience in multiple defensive schemes, ball hawk with great hands, physical tackler for a safety",
    weaknesses: "Positional value — safeties don't go top 5 unless they're Ed Reed, and he's not Ed Reed",
    scouting_summary: "Cleanest safety prospect in years. Does everything well, nothing poorly, and he's been doing it against top competition at Ohio State. The only thing holding him back on draft night is that he plays safety.",
    nfl_comparison: "Budda Baker"
  },
  11: { // Jermod McCoy, CB, Tennessee, 6'1" 188
    strengths: "4.38 forty, 89.6 PFF coverage grade, only 4 missed tackles in 2024, anticipates routes before the break, fluid hips, plays bigger than 188",
    weaknesses: "Coming off an ACL — that's the whole conversation, one real season at Tennessee, slight frame gets bullied in press-man against big receivers",
    scouting_summary: "Electric cover corner with legit top-end speed and instincts. The ACL recovery is the swing factor — if the medicals check out, he's a top-15 pick. If there's any hitch in the knee, he slides to Day 2.",
    nfl_comparison: "Sauce Gardner (pre-injury comp)"
  },
  12: { // Mansoor Delane, CB, LSU, 6'0" 187
    strengths: "89.1 PFF man coverage grade, zero scores allowed, disciplined — 0 penalties in 2025, safety convert who reads QBs, sticky in man coverage, physical at the catch point",
    weaknesses: "187 pounds soaking wet, needs 10 pounds of muscle for NFL press work, athletic testing data incomplete, can he hold up against 6-3 receivers at the next level?",
    scouting_summary: "Former safety who moved to corner and immediately locked guys down in the SEC. The coverage instincts are real. Needs to bulk up or he's getting pushed around by NFL-sized receivers, but the technique and IQ are already there.",
    nfl_comparison: "Quinyon Mitchell"
  },
  13: { // Peter Woods, DL, Clemson, 6'2" 298
    strengths: "Disruptive interior presence, 1st Team All-ACC, quick hands at the point of attack, plays with leverage despite size, penetrating 3-technique",
    weaknesses: "Undersized at 298, pad level is inconsistent — plays high and gets walked back, TFLs dropped from 8.5 to 3.5, athleticism is average for the NFL interior, anchoring against double teams is a problem",
    scouting_summary: "Flashes of dominance on tape but the production fell off a cliff his last year. Undersized interior guy who needs to win with quickness because he can't win with power. Boom-or-bust pick.",
    nfl_comparison: "Grover Stewart (undersized version)"
  },
  14: { // Carnell Tate, WR, Ohio State, 6'2" 192
    strengths: "94th percentile catch rate, reliable blocker for a receiver, polished route runner with clean releases, 75% catch rate, 6-2 frame, football IQ shows up on every rep",
    weaknesses: "Needs to add functional strength, 192 is thin for a 6-2 outside receiver, won't win many 50-50 balls against physical corners, lacks a true separator trait",
    scouting_summary: "Does everything right and nothing spectacular. The route running and hands are ready for the NFL today. He's the kind of receiver who gives you 70 catches and 900 yards for a decade. Not a WR1 but a very good WR2.",
    nfl_comparison: "Courtland Sutton"
  },
  15: { // Spencer Fano, OT, Utah, 6'6" 311
    strengths: "4.91 forty at 311 — that's absurd, mirror and redirect like a lighter man, natural fit in zone-run schemes, fluid lateral movement, feels pressure before it arrives",
    weaknesses: "Pad level is an issue, core strength needs work, gets pushed back as reps go long, scheme-dependent — needs a zone team, won't survive in a gap-heavy offense",
    scouting_summary: "Best athlete in the tackle class. Moves like he weighs 280 and plays with real feel for angles and landmarks. If he lands in a Shanahan-style scheme he's a Pro Bowler. Wrong scheme and he's average.",
    nfl_comparison: "Tristan Wirfs (scheme-dependent)"
  },
  16: { // Keldric Faulk, EDGE, Auburn, 6'6" 276
    strengths: "6-6, 276 with room to grow, lines up everywhere across the D-line, high character kid, only 21 years old, 7 sacks in 2024, frame is still filling out",
    weaknesses: "Stiff in the lower half, can't bend the corner, relies on bull rush because he can't win laterally, hand usage and counter moves are undeveloped, raw is the nicest word for it",
    scouting_summary: "A bet on physical traits and age. The measurables scream first-rounder but the tape says he's two years away from being two years away on pass-rush technique. Whoever drafts him needs patience.",
    nfl_comparison: "Tyree Wilson"
  },
  17: { // T.J. Parker, EDGE, Clemson, 6'4" 263
    strengths: "21.5 career sacks, stout against the run, 33-inch arms, collapses the pocket with power, reliable three-down defender, plays with physicality",
    weaknesses: "Wins with power not speed, lacks the bend to threaten the corner, not going to beat NFL tackles with first-step quickness, developmental pass-rush ceiling",
    scouting_summary: "Blue-collar edge defender who eats his lunch against the run and generates pocket push. Not a sack artist but a steady player who keeps his gap and doesn't get fooled. Safe pick, limited upside.",
    nfl_comparison: "Jermaine Johnson II"
  },
  18: { // Ty Simpson, QB, Alabama, 6'1" 211
    strengths: "Clean mechanics, plus arm with real zip, accurate from a clean pocket, quick through his progressions when the picture is simple, composure under pressure",
    weaknesses: "Stares down receivers, anticipation on breaking routes is late, ball security issues, pocket management is inconsistent, 6-1 is short for a pocket passer, decision-making under stress breaks down",
    scouting_summary: "Looks the part in shorts and when the pocket is clean. The physical tools are legit. But the processing speed hasn't caught up to the arm, and that's the whole ballgame at quarterback.",
    nfl_comparison: "Jared Goff (developmental)"
  },
  19: { // Monroe Freeling, OT, Georgia, 6'7" 315
    strengths: "6-7 frame with real length, 85.6 PFF pass blocking grade, fluid in his pass set, strong grip once he gets his hands on you, potential to climb to the second level in the run game",
    weaknesses: "Upright in drive blocking and it costs him balance, hand usage is raw, can't find angles in space at the second level, limited college starts",
    scouting_summary: "Prototype left tackle body with the pass protection chops to match. Run blocking is a work in progress but the physical ceiling is enormous. Needs reps more than coaching.",
    nfl_comparison: "Jedrick Wills"
  },
  20: { // Omar Cooper Jr., WR, Indiana, 6'0" 199
    strengths: "Dynamic after the catch, big-play ability — 22 career TDs, physical in the slot, ascending player who got better every year, makes defenders miss in space",
    weaknesses: "Route tree is limited — Indiana ran RPOs 70% of the time, doesn't fight for contested catches, blocking effort is below average, scheme product concerns are real",
    scouting_summary: "Electric with the ball in his hands but the question is how he got it there. Indiana's RPO-heavy offense didn't ask him to run a full route tree. NFL DCs will test that immediately.",
    nfl_comparison: "Keon Coleman (slot version)"
  },
  21: { // Dillon Thieneman, S, Oregon, 6'0" 201
    strengths: "4.35 forty at 201, downhill trigger against the run, covers sideline to sideline, high football IQ, three-down player who doesn't come off the field",
    weaknesses: "Health flag in the reports, 201 is light for a safety who wants to play in the box, takes angles that leave him exposed to cutback runs",
    scouting_summary: "Fastest safety in the class with real range and instincts. Plays like his hair is on fire. The medicals will determine where he goes — talent says top 20, durability says maybe not.",
    nfl_comparison: "Derwin James (speed version)"
  },
  22: { // KC Concepcion, WR, Texas A&M, 6'0" 196
    strengths: "Long speed that shows up in games not just the forty, ACC Rookie of the Year, dangerous after the catch, slot-outside versatility, return game value",
    weaknesses: "Focus drops — takes his eyes off the ball, 196 limits his ability to fight through contact, route running needs nuance at the top, average blocker",
    scouting_summary: "Speed kills and this kid has plenty of it. The catch drops are maddening because the physical ability is obvious. If he cleans up the concentration issues, he's a starting slot. If not, he's a returner.",
    nfl_comparison: "Jaylen Waddle (raw version)"
  },
  23: { // Kenyon Sadiq, TE, Oregon, 6'3" 241
    strengths: "1.54 ten-yard split — that's receiver speed, plus blocker who actually wants to hit people, 241 with real play strength, best tight end in the class",
    weaknesses: "6-3 is short for a tight end, route tree is developing, can get swallowed by bigger linebackers in coverage, catch radius limited by height",
    scouting_summary: "Tight end who blocks and runs. Rare combination of speed and physicality at the position. Short for the spot but plays bigger because he's built like a fullback with receiver feet.",
    nfl_comparison: "George Kittle"
  },
  24: { // Chris Johnson, CB, San Diego State, 6'0" 193
    strengths: "91.6 PFF grade, 4 INTs with 2 pick-sixes, 4.40 forty, physical run supporter, can flip to safety if needed, competitive in press",
    weaknesses: "Mountain West competition — biggest asterisk on his file, false steps in transitions, hand placement timing on jams is inconsistent, man coverage gets shaky against speed",
    scouting_summary: "Put up video game numbers against Sun Belt-level competition. The tools and production are real, but we need to see it against better receivers. Cover-3 corner who might struggle in pure man.",
    nfl_comparison: "L'Jarius Sneed"
  },
  25: { // Denzel Boston, WR, Washington, 6'4" 212
    strengths: "6-4, 212 with strong hands, wins contested catches consistently, smooth mover for his size, physical at the catch point, natural boundary X receiver",
    weaknesses: "Lacks a second gear — gets caught from behind, struggles against zone coverage, release package needs work, route tree is limited to what Washington asked him to run",
    scouting_summary: "Big-bodied possession receiver who wins above the rim. He's not going to run past anyone but he'll out-physical most corners at the catch point. Classic X receiver who needs a QB who trusts him on the back shoulder.",
    nfl_comparison: "Michael Pittman Jr."
  },
  26: { // Caleb Lomu, OT, Utah, 6'6" 313
    strengths: "Pass protection instincts beyond his experience, balanced base, well-timed punch, strong anchor, smart against stunts, 82.1 PFF grade, 6-6 with real length",
    weaknesses: "Feet are average — won't recover against speed rushers, scheme dependent, only two years starting, developmental timeline is longer than you'd like for a first-rounder",
    scouting_summary: "Steady, smart, fundamentally sound tackle who blocks with his brain as much as his body. Not a freak athlete but makes up for it with technique and awareness. Needs the right scheme to maximize him.",
    nfl_comparison: "Dion Dawkins"
  },
  27: { // Cashius Howell, EDGE, Texas A&M, 6'2" 253
    strengths: "Natural dip and bend around the corner, diverse pass-rush toolbox, athletic quickness, shake-and-go moves, wins with speed and finesse",
    weaknesses: "Doesn't threaten tackles off the snap — initial burst is average, 6-2 253 is undersized, gets stuck when he can't win with speed, run defense is an afterthought",
    scouting_summary: "Finesse rusher with a bag of moves but no fastball to set them up. Needs that get-off speed to improve or NFL tackles will sit on his counters. Fun player on third down, liability on first and second.",
    nfl_comparison: "Bryce Huff"
  },
  28: { // Olaivavega Ioane, OG, Penn State, 6'4" 320
    strengths: "Best pure guard in the draft, technique is already NFL-caliber, ready punch, strong anchor, high football IQ against line games, plug-and-play starter from Day 1",
    weaknesses: "320 with average length — bigger interior DL will challenge him, athletic ceiling isn't special, guard value limits draft capital",
    scouting_summary: "As clean a guard prospect as you'll find. Nothing flashy, just correct technique on every snap. All-American for a reason. Starts immediately and gives you 10 years.",
    nfl_comparison: "Chris Lindstrom"
  },
  29: { // Brandon Cisse, CB, South Carolina, 6'0" 189
    strengths: "4.42 forty, 75-7/8 wingspan, fluid in man coverage, 89.2 PFF run defense grade, physical and not afraid to hit, long for a corner at 6-0",
    weaknesses: "Zone awareness disappears — loses spatial feel, late to read routes, wrapping-up issues in the open field, picks up holding penalties when he panics",
    scouting_summary: "Physical press corner with real length and speed. Excellent when he can see the receiver and react. Falls apart when he has to play zone and trust his eyes. Man-heavy scheme or bust.",
    nfl_comparison: "Eli Apple (better athlete)"
  },
  30: { // Avieon Terrell, CB, Clemson, 5'11" 186
    strengths: "90.7 PFF run defense grade for a corner, 5 forced fumbles in 2025, tracks the ball well downfield, high football IQ, consistent coverage grades above 76",
    weaknesses: "5-11, 186 — that's small and there's no getting around it, needs more urgency against the run despite the good grade, physical corners at the NFL level will bully him",
    scouting_summary: "Smart, instinctive corner with great ball skills and surprising physicality for his size. Brother A.J. paved the way and Avieon has similar traits in a smaller package. Size will scare some teams off.",
    nfl_comparison: "A.J. Terrell (smaller)"
  },
  31: { // Colton Hood, CB, Tennessee, 6'0" 193
    strengths: "Man-to-man coverage grades among the best in the SEC, physical run defender, uses length to disrupt at the line, competitive nature shows up on every snap",
    weaknesses: "Tackling technique is suspect — leads with the shoulder and misses, zone coverage experience is thin, grabs jerseys when he gets beat and refs will call it at the next level",
    scouting_summary: "Press-man corner who wants to fight at the line of scrimmage. Fun to watch in man, concerning in zone. The penalty issue is fixable but it has to get fixed before he starts in the NFL.",
    nfl_comparison: "Carlton Davis"
  },
  32: { // C.J. Allen, OLB, Georgia, 6'1" 230
    strengths: "Smooth in zone coverage, covers tight ends and backs in man, tough, high football IQ, instinctive against the run, Georgia pedigree",
    weaknesses: "6-1, 230 gets eaten up by NFL guards, 101.7 passer rating allowed in coverage, man coverage breaks down against bigger targets, undersized for the position",
    scouting_summary: "Zone coverage linebacker who processes fast and gets to his spot. Smart player. But he's 230 pounds and NFL offenses are going to run right at him until he proves he can hold up.",
    nfl_comparison: "Devin Lloyd"
  },
  33: { // Emmanuel McNeil-Warren, S, Toledo, 6'3" 201
    strengths: "6-3, 210 — rare size for a safety, strong instincts in the robber role, range to cover ground, aggressive hitter who arrives with bad intentions, feels routes developing",
    weaknesses: "Probably running high 4.5s — burst isn't there, limited agility for a safety, needs a scheme that protects him from getting isolated in space against speed, MAC competition level",
    scouting_summary: "Big safety from Toledo with a nose for the ball and a frame that looks like a linebacker. Athletic limitations are real and the competition level is a concern, but the instincts and size are unique.",
    nfl_comparison: "Jaquan Brisker"
  },
  34: { // Kayden McDonald, DL, Ohio State, 6'2" 326
    strengths: "34 run stops — swallows running lanes, demands double teams, 326 pounds of space-eating interior presence, NFL-ready size and power right now",
    weaknesses: "Pass-rush motor quits when the first move fails, limited upside as a pass rusher, one-dimensional run stuffer at this point, needs a scheme that doesn't ask him to rush",
    scouting_summary: "Old-school nose tackle who eats blocks and spits them out. Won't get you 5 sacks but he'll make your linebackers look great by occupying two linemen every snap. Value play if he falls to Day 2.",
    nfl_comparison: "Vita Vea (run-only version)"
  },
  35: { // Jake Golday, OLB, Cincinnati, 6'4" 239
    strengths: "Explosive downhill, closing speed when he sees the ball, sure tackler, sideline-to-sideline range, 6-4 239 is a good size for a modern SAM linebacker",
    weaknesses: "Drifts out of his zone in coverage, coverage awareness is below average, more powerful than elusive — tight ends will eat him up in man, limited pass-rush value",
    scouting_summary: "Downhill thumper who makes tackles in the run game and on special teams. Won't help you in coverage. Useful player on a team that runs a lot of single-high looks and needs someone to fill the alley.",
    nfl_comparison: "Nick Bolton"
  },
  36: { // Kadyn Proctor, OT, Alabama, 6'7" 352
    strengths: "6-7, 352 with a 5.21 forty and a 32.5-inch vertical — those numbers at that size are insane, immovable anchor, mauler in the run game, nasty disposition",
    weaknesses: "Footwork is inconsistent, speed rushers get around him, 22 pressures allowed is too many, might end up at guard, 352 is a lot of weight to maintain",
    scouting_summary: "Physical freak with rare size-athleticism combo. When he's locked in he's unblockable. When he's sloppy he gives up pressures he shouldn't. The talent is undeniable — the consistency isn't.",
    nfl_comparison: "Trent Brown"
  },
  37: { // Christen Miller, DL, Georgia, 6'4" 321
    strengths: "90.2 PFF run defense grade, explosive first step for a 300-pounder, plus length at 6-4, disciplined gap defender, two-year starter at Georgia against SEC competition",
    weaknesses: "Pass-rush upside is unclear — limited data on rush moves, athletic testing not available, can he rush the passer or is he just a run stuffer?",
    scouting_summary: "Run-stuffing interior lineman from Georgia who controls his gap and plays with good leverage. The question is whether there's a pass-rush gear hiding in there. If there is, he's a first-rounder. If not, he's a very solid Day 2 pick.",
    nfl_comparison: "Javon Hargrave"
  },
  38: { // Jadarian Price, RB, Notre Dame, 5'11" 203
    strengths: "Contact balance is exceptional, 4.49 speed, runs through arm tackles, high effort on every carry, big-play ability, fights for extra yards",
    weaknesses: "25.3 PFF pass protection grade — can't block, limited receiver, 3 fumbles in 2025, 203 pounds raises durability questions, Notre Dame's RB2 for a reason",
    scouting_summary: "Physical runner who breaks tackles and makes something out of nothing between the tackles. Can't catch, can't block, can't hold onto the ball. Early-down back only until the other stuff improves.",
    nfl_comparison: "Raheem Mostert"
  },
  39: { // Akheem Mesidor, EDGE, Miami, 6'3" 259
    strengths: "Deep pass-rush repertoire, 33.5 career sacks, 90.0 PFF run defense grade, quick hands, high motor, wins with speed and bend, not just a one-trick pony",
    weaknesses: "Short arms limit his reach, foot injury history in 2023, relies on quickness — when power is needed he comes up short, 259 is tweener weight",
    scouting_summary: "Productive edge rusher with real pass-rush moves and not just bull rush. The foot injury and short arms are flags, but 33.5 sacks against ACC competition is impossible to ignore.",
    nfl_comparison: "Khalil Ngakoue"
  },
  40: { // Gabe Jacas, EDGE, Illinois, 6'4" 260
    strengths: "11 sacks in a breakout junior year, wins with a power-to-speed combo off the edge, stout frame drives tackles back, quick hand transitions",
    weaknesses: "Pad level is too high, gets pushed out of plays, can't anchor when tackles lock onto him, struggles to disengage and finish, leverage disappears late in reps",
    scouting_summary: "Breakout pass rusher from Illinois who showed up in a big way as a junior. The production is real but the technique needs a lot of work. High-upside Day 2 pick if a team believes in the coaching-up potential.",
    nfl_comparison: "Marcus Davenport (pre-Saints)"
  },
  41: { // Eli Stowers, TE, Vanderbilt, 6'4" 239
    strengths: "Former quarterback — spatial awareness and football IQ are off the charts, quick acceleration, body control in traffic, 146 career catches, reliable hands from the slot",
    weaknesses: "Blocking is raw — bad angles and no power at the point, limited inline value, slot-only tight end, won't survive on the line of scrimmage against NFL ends, needs time to add mass",
    scouting_summary: "Receiving tight end who lined up in the slot at Vanderbilt and caught everything. The QB background shows up in his feel for zones and windows. He'll never be an inline blocker so a team needs to use him like a big receiver.",
    nfl_comparison: "Kyle Pitts (budget version)"
  },
  42: { // Caleb Banks, DL, Florida, 6'6" 327
    strengths: "6-6, 327 with a breakout season — 4.5 sacks and 7 TFLs, massive frame with upside, two years of starting experience at Florida, versatile alignment",
    weaknesses: "Flashes brilliance then disappears for stretches, started slow — 1.5 sacks his first year, technical inconsistencies across the board, effort fluctuates",
    scouting_summary: "Huge interior lineman with a frame you can't teach and production you can't trust yet. The breakout was encouraging but the inconsistency is a real problem. Boom-or-bust prospect who needs the right coaching staff.",
    nfl_comparison: "Calais Campbell (way early in the development curve)"
  },
  43: { // Dani Dennis-Sutton, EDGE, Penn State, 6'6" 256
    strengths: "33.5-inch arms, thick frame, 9.96 RAS, 23.5 career sacks, smart run defender, high motor, built for a 3-4 end role, plus length creates problems",
    weaknesses: "Heavy feet, no explosive first step, won't beat tackles with speed, needs a broader pass-rush move set, gets stuck on blocks he should win",
    scouting_summary: "Big, long, productive edge defender who wins with length and effort rather than speed. He's not going to be a double-digit sack guy but he can hold the point of attack and set the edge in a 3-4. Safe pick.",
    nfl_comparison: "Montez Sweat (slower)"
  },
  44: { // Keionte Scott, CB, Miami, 5'11" 193
    strengths: "31-3/8-inch arms for a 5-11 guy, slot versatility, blitzing instincts, quick feet, processes rush lanes well, smart and tenacious, plays with edge",
    weaknesses: "5-11 limits him to the slot, no combine testing data to validate athleticism, size is a ceiling-capper, outside corner reps will be limited",
    scouting_summary: "Slot corner with nickel blitz value who plays bigger than his frame. Smart player who understands leverage and uses his length well inside. Not an outside guy but a useful piece in a sub-package defense.",
    nfl_comparison: "Mike Hilton"
  },
  45: { // Lee Hunter, DL, Texas Tech, 6'3" 318
    strengths: "Dominant Senior Bowl performance, run-stuffing presence, active hands at the point of attack, 318 with real power, earned 'The Fridge' nickname for a reason",
    weaknesses: "Slow off the snap, plays high and loses leverage, gives ground on double teams, pass-rush moves are rudimentary at best",
    scouting_summary: "Classic two-down nose tackle who clogs lanes and eats space. The Senior Bowl showed he can do it against better competition. Limited pass-rush ability means he needs a strong rotation partner to stay fresh.",
    nfl_comparison: "Dontari Poe"
  },
  46: { // Ted Hurst, WR, Georgia State, 6'4" 206
    strengths: "6-4 with contested-catch ability, build-up speed gets him behind defenses, willing blocker with a big frame, X receiver body type",
    weaknesses: "Top speed plateaus, route tree is narrow, drops too many catchable balls, 206 needs 15 more pounds to survive outside, Georgia State competition level",
    scouting_summary: "Long, lean outside receiver who can go up and get it but disappears against better competition. The small-school thing is a real factor. Needs to prove the contested-catch ability holds up against NFL corners.",
    nfl_comparison: "Mack Hollins (with more upside)"
  },
  47: { // Anthony Hill Jr., ILB, Texas, 6'2" 238
    strengths: "90th percentile tackling grade, runs downhill with violence, explosive hip rotation through contact, finishes every tackle, physical tone-setter, 6-2 238 is ideal size",
    weaknesses: "Coverage metrics are a black box — no data available, athletic testing unknown, can he drop into coverage or is he a two-down thumper?",
    scouting_summary: "Violent downhill linebacker who hits people for a living. The tackling tape is as good as anyone in this class. The coverage question will determine if he's a three-down player or comes off the field on third and long.",
    nfl_comparison: "Pete Werner"
  },
  48: { // Germie Bernard, WR, Alabama, 6'1" 206
    strengths: "Smooth route runner, strong hands, technical against press coverage, competitive toughness, does the little things right, professional approach to the position",
    weaknesses: "No vertical explosion, limited YAC ability, doesn't dominate contested catches, lacks a true separator trait that makes him special, ceiling is a solid WR2 at best",
    scouting_summary: "Dependable route-runner from Alabama who won't wow you with any one trait but won't lose you a game either. Classic complementary receiver. Mid-round value, long career.",
    nfl_comparison: "Allen Lazard (better route runner)"
  },
  49: { // Malachi Lawrence, EDGE, UCF, 6'4" 253
    strengths: "4.52 forty at 253, natural bend around the corner, developed rush moves beyond his experience level, consistent pressure, 9.90 explosive index",
    weaknesses: "Run defense is a liability, inconsistent gap integrity, discipline issues on tape, probably a rotational pass rusher not an every-down end",
    scouting_summary: "Speed rusher from UCF who can bend the corner and has real pass-rush moves. Run defense is bad enough that he's a situational player right now. If he can learn to set an edge, the ceiling goes way up.",
    nfl_comparison: "Harold Landry"
  },
  50: { // Max Iheanachor, OT, Arizona State, 6'6" 321
    strengths: "4.91 forty at 321, loose hips, exceptional foot speed for his size, high developmental upside, raw athletic tools that are rare for a tackle",
    weaknesses: "New to football and it shows — sloppy hands, mistimed punches, lunges in the run game, footwork is all over the place, spatial awareness disappears on twists and stunts",
    scouting_summary: "Project tackle with rare movement skills who is still learning the position. The athletic testing is absurd. The tape is rough. Patient team with a good O-line coach could have something special in two years.",
    nfl_comparison: "Orlando Brown Jr. (more athletic, less polished)"
  }
};

async function main() {
  console.log('Starting scouting report overhaul for top 50 players...\n');

  let updated = 0;
  let errors = 0;

  for (const [id, data] of Object.entries(rewrites)) {
    try {
      const result = await sql`
        UPDATE perform_players
        SET
          strengths = ${data.strengths},
          weaknesses = ${data.weaknesses},
          scouting_summary = ${data.scouting_summary},
          nfl_comparison = ${data.nfl_comparison},
          updated_at = NOW()
        WHERE id = ${parseInt(id)}
        RETURNING id, name, overall_rank
      `;

      if (result.length > 0) {
        console.log(`  [${result[0].overall_rank}] ${result[0].name} — updated`);
        updated++;
      } else {
        console.log(`  [?] ID ${id} — no row found`);
        errors++;
      }
    } catch (err) {
      console.error(`  ERROR on ID ${id}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Errors: ${errors}`);
  await sql.end();
}

main();
