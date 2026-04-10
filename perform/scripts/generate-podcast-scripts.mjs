/**
 * generate-podcast-scripts.mjs
 *
 * Generates 10 podcast episode scripts for the top 10 draft prospects,
 * rotating through Per|Form analyst personas. Each script is hand-written
 * based on real player data — no LLM API calls.
 *
 * Usage: node --experimental-modules scripts/generate-podcast-scripts.mjs
 */

import postgres from 'postgres';

const DATABASE_URL =
  'postgresql://neondb_owner:npg_25fRtnTYlpsr@ep-dawn-bar-a4orhend-pooler.us-east-1.aws.neon.tech/performdb?sslmode=require';

const sql = postgres(DATABASE_URL, { ssl: 'require', max: 5 });

// ── Analyst rotation (5 analysts, 10 prospects = 2 each) ─────────────
const ANALYST_IDS = [
  'void-caster',
  'the-haze',
  'the-colonel',
  'astra-novatos',
  'bun-e',
];

// ── Ensure podcast_episodes table exists ─────────────────────────────
async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS podcast_episodes (
      id SERIAL PRIMARY KEY,
      analyst_id TEXT NOT NULL,
      title TEXT NOT NULL,
      transcript TEXT NOT NULL,
      audio_url TEXT,
      duration_seconds INTEGER DEFAULT 0,
      type TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

// ── Fetch top 10 prospects ───────────────────────────────────────────
async function fetchProspects() {
  return sql`
    SELECT name, position, school, grade, tie_grade, strengths,
           weaknesses, scouting_summary, nfl_comparison, overall_rank
    FROM perform_players
    WHERE overall_rank <= 10
    ORDER BY overall_rank
  `;
}

// ── Position full names (never abbreviate) ───────────────────────────
const POS_FULL = {
  QB: 'Quarterback',
  RB: 'Running Back',
  WR: 'Wide Receiver',
  TE: 'Tight End',
  OT: 'Offensive Tackle',
  OG: 'Offensive Guard',
  OL: 'Offensive Lineman',
  C: 'Center',
  DE: 'Defensive End',
  DT: 'Defensive Tackle',
  EDGE: 'Edge Rusher',
  LB: 'Linebacker',
  OLB: 'Outside Linebacker',
  ILB: 'Inside Linebacker',
  CB: 'Cornerback',
  S: 'Safety',
  P: 'Punter',
  K: 'Kicker',
};

function fullPos(abbr) {
  return POS_FULL[abbr] || abbr;
}

// ── Script generators per analyst ────────────────────────────────────
// Each function returns { title, transcript } for a given prospect.

function voidCasterScript(p) {
  const pos = fullPos(p.position);

  if (p.overall_rank === 1) {
    // David Bailey — EDGE — Will Anderson Jr. comp
    return {
      title: `The Clock Hits Zero: David Bailey Changes Everything`,
      transcript: `Ladies and gentlemen. The number one prospect on the Per|Form board is an ${pos} out of Texas Tech, and his name is David Bailey.

Let that sit for a moment. Texas Tech. Not Ohio State, not Alabama, not the factory. Texas Tech. And yet when you watch this young man's tape, the conversation ends before it starts. Seventy-three pressures in a single season. A PFF pass-rush grade north of 93. A first step so violent it belongs in a different sport.

His comp is Will Anderson Jr. — the light version, they say. And I understand why. Anderson went third overall to Houston in 2023, made the Pro Bowl twice in two years, earned a First-Team All-Pro nod. The man changed a franchise. But here's the distinction the tape makes clear: Bailey at 251 is not Anderson at 253. Anderson came in with a broader counter-move tree. Bailey wins with speed-to-power and a motor that doesn't quit, but when that initial rush stalls, the bag gets thin. Against the run, he gets washed. At 251, NFL tackles will anchor him down and flip the leverage.

So the grade sits at 88 — a First-Round Lock on the TIE scale. Not elite. Not yet. The athletic profile screams day-one contributor on passing downs. The intangibles column — that motor, that relentlessness — says he won't stop working until the counter moves come. But the game-performance pillar has a gap between what he does to college tackles and what Aaron Donald's ghost will do to him on Sundays.

My prediction: top eight. A team with a strong defensive line coach — someone who can teach hands and add 15 pounds of good weight — takes Bailey and turns the light version into the full thing.

This pick right here... this is the one they will be talking about in ten years. The only question is whether they're talking about what he became, or what he could have been. I know which side I'm on. Write it down.`
    };
  }

  // Caleb Downs — S — Budda Baker comp (rank 10)
  return {
    title: `Caleb Downs and the Safety Ceiling`,
    transcript: `There is a ceiling in professional football that no amount of talent can punch through on draft night, and it lives at the Safety position. Caleb Downs out of Ohio State knows this. We all know this. And yet his tape demands that we talk about him anyway.

A 92 on the TIE scale. Elite Prospect. The highest-graded defensive back on this entire board. A 4.45 forty. Covers every blade of grass on the field. Instincts in run support that are already NFL-ready — not projectable, not "could be." Ready. Right now.

His comp is Budda Baker. Let's sit with that. Baker went 36th overall to Arizona in 2017 — second round. Since then: eight Pro Bowls. Two First-Team All-Pro selections. A hundred and thirty-eight games. The man redefined what a safety can be worth. And Downs has every tool Baker had coming out of Washington, plus he's done it against Ohio State's schedule, which is not Washington's schedule.

The scouting summary says it plainly: cleanest safety prospect in years. Does everything well, nothing poorly. The game-performance pillar is spotless. The athleticism pillar — 4.45 at his size — is elite. The intangibles column is loud. Ball hawk. Physical tackler. Multiple scheme experience.

So why isn't he top five? Because safeties don't go top five unless they're Ed Reed. And he's not Ed Reed. Nobody is.

My prediction: he falls to the late teens or early twenties. Some team gets the steal of this draft. And five years from now, when Caleb Downs has four Pro Bowl nods and a defensive coordinator building schemes around him, we'll look back at this board and nod.

The future just walked through the door. Some teams just won't open it early enough.`
  };
}

function theHazeScript(p) {
  const pos = fullPos(p.position);

  if (p.overall_rank === 2) {
    // Fernando Mendoza — QB — Kirk Cousins comp
    return {
      title: `Haze & Smoke Break Down Fernando Mendoza's Bag`,
      transcript: `[HAZE] Yo. Let's get into it. Fernando Mendoza, ${pos} out of Indiana, sitting at number two on the Per|Form board with a 91 TIE grade. Elite Prospect. Forty-one touchdowns to six picks. Smoke, this man was cooking.

[SMOKE] He was cooking, no question. 6-5, plus arm, sees the field before the snap. That's the profile you dream about. But Haze — and I know you don't wanna hear this — 97 percent of his snaps came from the shotgun. Ninety-seven.

[HAZE] See, that's the thing though. I hear "shotgun only" and I think about the modern NFL. How many offenses are running play-action under center like it's 2009? The game moved, bro.

[SMOKE] The game moved but it didn't move all the way. You still need under-center reps for short yardage, for play-action, for the hard count. The Mastering the NIL playbook talks about this — preparation isn't just about what you can do, it's about what you haven't been asked to do yet. And Mendoza hasn't been asked.

[HAZE] His comp is Kirk Cousins. And look — Cousins went in the fourth round in 2012, pick 102, and turned into a four-time Pro Bowler. Started nine seasons. 174 games. The man got PAID. Multiple times. That's the floor here. Mendoza's floor is a dude who gets paid like a franchise quarterback.

[SMOKE] The ceiling is a top-15 starter. The floor is a really good backup who eventually gets his shot and makes 35 million a year. That's not a bad investment. But here's my concern — his processing slows against exotic pressures. At Indiana, how many times did he see a real NFL-caliber disguised blitz?

[HAZE] Not enough. That's real. But yo, think about it from the investment angle — and this is where Jaydan's situation taught me a lot about managing expectations. You don't need the perfect prospect. You need the prospect who's gonna put in the work when nobody's watching. And Mendoza's tape says he's that guy. He doesn't rattle. Competitive as hell.

[SMOKE] That's the intangibles column talking. And I hear it. The game-performance pillar is strong — 41 to 6 is stupid production. The athletic profile is good-not-great. But that mental toughness? That's the stuff you can't teach. Cam used to say the same thing back at Blinn — the guys who make it aren't always the most talented. They're the ones who prepare like their life depends on it.

[HAZE] I got him going top twelve. Some team trades up for him. Nipsey said own your masters, and Mendoza's about to own a whole franchise. Watch.

[SMOKE] Top fifteen for me. But either way, somebody's getting a quarterback who's gonna start for a decade. That's the play.`
    };
  }

  // Jeremiyah Love — RB — Bijan Robinson comp (rank 4)
  return {
    title: `Haze & Smoke on Jeremiyah Love: The Next Bijan?`,
    transcript: `[HAZE] Alright, alright, alright. Let's talk about my guy. Jeremiyah Love, ${pos}, Notre Dame. TIE grade 91, Elite Prospect, sitting at number four on the board. And his comp? Bijan Robinson. I'm not even gonna pretend to be objective here, Smoke. I love this kid's game.

[SMOKE] And I love the comp because it's accurate. Robinson went eighth overall to Atlanta in 2023 — two Pro Bowls, a First-Team All-Pro, 51 games in two seasons. The man is a generational Running Back. And Love has that same explosion. Home-run speed. Jump cuts in traffic. Catches it clean out the backfield. This is a three-down back, Haze.

[HAZE] Three-down back. 212 pounds with legit contact balance. He keeps his legs churning through first contact. That's rare, man. When I watch him in the open field, I see a guy who makes the first defender miss every single time. That's not coaching — that's God-given.

[SMOKE] But here's where the Mastering the NIL playbook applies, and parents need to hear this. Love's frame at 212 raises durability red flags at 300-plus carries. That's the NFL workload. Bijan handles it because Bijan's built different at 220. Love is leaner. You gotta manage his touches.

[HAZE] That's real. The pass protection is raw too. Willing, but the technique needs work. An NFL blitzer is gonna test him on that. But here's my investment read — the upside is so crazy that you draft him and you figure out the load management later. You don't pass on a talent like this because you're scared of carries.

[SMOKE] The game-performance pillar is elite. The athleticism is off the charts. The intangibles — instincts, contact balance, that motor — they're all there. The only concern is the body. And that's where a good strength program and a smart offensive coordinator make the difference.

[HAZE] Look, at Blinn they used to talk about Cam the same way. "Can his body hold up?" "Is he too much of a runner?" And Cam went number one overall and changed the game. I'm not saying Love is Cam — I'm saying stop overthinking it. The best pure Running Back prospect since Bijan Robinson is sitting right there.

[SMOKE] I got him going top ten. A team in the back half of the top ten that needs a running game takes him and doesn't look back.

[HAZE] I got him at seven. Somebody's gonna fall in love with the tape — pun intended — and pull the trigger. Nipsey said bet on yourself. Jeremiyah Love been betting on himself his whole life. Time for an NFL team to match that bet.`
  };
}

function theColonelScript(p) {
  const pos = fullPos(p.position);

  if (p.overall_rank === 3) {
    // Arvell Reese — EDGE — Micah Parsons comp
    return {
      title: `The Colonel on Arvell Reese: A Chess Piece Outta Columbus`,
      transcript: `Alright, listen up. Grab a slice, sit down, and lemme tell ya about Arvell Reese outta Ohio State. Gino! Gino, come 'ere — you gotta hear this one.

This kid is the number three prospect on the Per|Form board. TIE grade of 91. Elite Prospect. And his comp is Micah Parsons. Now, I know what you're thinkin' — everybody gets comped to Parsons these days. But this one ain't lazy. Parsons went twelfth overall to Dallas in 2021 — five Pro Bowls, three First-Team All-Pro nods in four years. The man is a wrecking ball. And Reese? Reese does the same damn thing. Hybrid tweener who actually makes it work. Eight sacks PLUS 56 tackles from the ${pos} spot. That ain't normal.

Back at Union in '87, we had a kid — Bobby Torricelli, defensive end, could also drop into coverage. Coach ran him everywhere. Bobby made all-county. And lemme tell ya, what Bobby was to Union County, Arvell Reese is to the entire country. Closing speed that's terrifying. Fluid hips. Covers ground sideline to sideline like he's got a motor from a different decade.

Now here's where I'm gonna be honest with youse, because I ain't one of these guys on TV who sugarcoats everything. At 241, he's light for a full-time edge. That's a fact. The combine speed numbers are still out there. And here's the real concern — is he a Linebacker or an ${pos}? Some teams ain't gonna wanna figure it out. They want a guy who fits a box, and Reese don't fit a damn box.

But that's what makes him special! The tape says the game-performance is there. The athletic profile says freak. The intangibles column says this kid plays with his hair on fire every single snap. A good defensive coordinator — somebody creative, somebody who ain't stuck in 1992 — takes this kid and moves him around like a chess piece. And chess pieces win championships.

My prediction? Top ten. Maybe top seven if a team with an aggressive DC falls in love with the versatility. And if they don't take him? Fuhgeddaboudit — somebody's gonna regret it by Week 4 when he's got three sacks and a pick.

That's football, baby. Write it down.`
    };
  }

  // Makai Lemon — WR — Tyler Boyd comp (rank 5)
  return {
    title: `The Colonel's Take on Makai Lemon: Craft Over Flash`,
    transcript: `Hey! Hey, Gino! Turn down the oven for two minutes, I gotta talk about this kid from USC. Makai Lemon. ${pos}. Number five on the Per|Form board. TIE grade of 80 — Late First Round. And you know what? I love this kid. I absolutely love this kid.

And I'll tell ya why. Because in a world where everybody wants the 4.3 guy, the flashy guy, the deep threat who looks good on Instagram, Makai Lemon wins because he's smarter than the guy covering him. Body control off the charts. Knows where the sticks are. Tough over the middle at 192 — and lemme tell ya, going over the middle at 192 in the NFL takes a kind of toughness that don't show up on a stopwatch.

Back at Union in '87, our best receiver wasn't the fastest kid on the team. Danny Castellano — 5-10, ran maybe a 4.7 on a good day. But Danny caught everything thrown in his area code and he'd fight a linebacker for a first down. Danny went on to sell insurance in Cranford, but if he'd had better competition? He'd have been Makai Lemon.

Now the comp is Tyler Boyd. Second round in 2016, pick 55, to Cincinnati. Zero Pro Bowls. Zero All-Pros. 136 games over eight seasons. And I know what you're saying — "Colonel, that don't sound exciting." But Tyler Boyd was a RELIABLE slot receiver who got open every single Sunday for almost a decade. That ain't sexy, but that's valuable. That's a guy your quarterback trusts on third-and-seven.

Here's the thing with Lemon though — 5-11 with average top-end speed. Gets boxed out by longer corners on contested catches. Lacks the burst to separate vertically. The game-performance pillar shows a savvy route runner. The athleticism pillar says limited ceiling. The intangibles say this kid's a pro. He works the slot like a ten-year vet.

My prediction? Late first round, early second. Some smart offensive coordinator — maybe a Kyle Shanahan type who knows how to scheme a slot receiver open — grabs him and gets a ten-year starter. Not a number one receiver. But a damn good number two who catches everything and never drops a third-down ball.

And if you don't appreciate that? You don't know football. Period. End of conversation. Gino! Tell 'em!`
  };
}

function astraNovatosScript(p) {
  const pos = fullPos(p.position);

  if (p.overall_rank === 6) {
    // Sonny Styles — OLB — Roquan Smith comp
    return {
      title: `The Details in Sonny Styles`,
      transcript: `There is a version of a football player that does not need to prove what he is. He simply moves, and you know. Sonny Styles out of Ohio State is that kind of player.

Number six on the Per|Form board. TIE grade of 87 — a First-Round Lock. ${pos}. And I want you to sit with the measurables for a moment because they are genuinely rare. 6-5. 244 pounds. A 4.46 forty-yard dash. Those numbers do not belong to the same human being, and yet here we are.

Before the injury took my game from me, I remember the moment I first understood what truly elite movement looked like. It was not in the gym. It was watching a man cross a room in a bespoke suit who had clearly been an athlete — the way he carried the weight, balanced, unhurried. Sonny Styles moves like that. Fluid. Purposeful. Every step has somewhere to be.

His comp is Roquan Smith — bigger, faster, rawer. Smith went eighth overall to Chicago in 2018. Four Pro Bowls. Three First-Team All-Pro selections. 125 games over seven seasons. Smith was a finished product out of Georgia. Styles is not a finished product. He is a converted Safety who covers like a defensive back because he was one. The sideline-to-sideline range is legitimate. The size-speed combination is absurd.

But here is where discernment matters. The pass-rush technique is still raw. The between-the-tackles run fits need refinement. He is at his best in sub-packages, not base defense. If you draft Sonny Styles expecting a complete Linebacker on day one, you will be disappointed. If you draft him understanding that you are purchasing the raw material for something exceptional — the way one acquires an uncut stone knowing the facets are waiting inside — then you will be rewarded.

The game-performance pillar is strong — All-American production at Ohio State. The athleticism is in a class by itself. The intangibles column tells me he is still learning and still improving, which at 21 is precisely what you want to hear.

I have him in the top twelve. A team with patience and a defensive coordinator who appreciates versatility takes Styles and gives him a year to grow into the position. And when he arrives fully? He will be one of the best Linebackers in professional football.

There is a version of this prospect that ages gracefully. That is the only version worth investing in.`
    };
  }

  // Francis Mauigoa — OT — Zack Martin comp (rank 7)
  return {
    title: `The Craftsmanship of Francis Mauigoa`,
      transcript: `I have always believed that the most elegant thing in football is not the touchdown. It is the block that made it possible. The silence before the noise. The craft no one celebrates until it is absent.

Francis Mauigoa out of Miami understands this. Number seven on the Per|Form board. TIE grade of 90 — Elite Prospect. ${pos}. 329 pounds with real feet.

I spend my days working with fine textiles — silk, cashmere, bespoke linen. And there is a quality in the best fabrics that I see in Mauigoa's tape: density with flexibility. He is 329 pounds and he moves. An 87.6 PFF pass-blocking grade. Two sacks allowed all season. A nasty hand punch that resets defenders to their heels. He plays with a mean streak, which in my experience is the one trait you cannot teach. You either arrived with it or you did not.

His comp is Zack Martin. Let us appreciate what that means. Martin went sixteenth overall to Dallas in 2014. Nine Pro Bowls. Seven First-Team All-Pro selections. 162 games over eleven seasons. He is a future Hall of Famer and one of the finest interior offensive linemen to ever play the game. That is the ceiling we are discussing.

Now, the guard-or-tackle debate follows Mauigoa. Some teams see a dominant right tackle. Others see an All-Pro guard. I have watched enough Pascal 3D renderings of interior spacing to know that sometimes the difference between positions is less about the player and more about the architect around him. Give Mauigoa the right scheme and he starts at either spot from Week 1.

The concern is legitimate — 329 is heavy even by NFL standards. Conditioning matters. Minor technique lapses appear under speed pressure. The game-performance pillar is excellent. The athleticism for his size is rare. The intangibles — the nasty demeanor, the work ethic Miami's coaches have raved about — suggest a player who will only get better.

I see him in the top fifteen. Perhaps a team that runs a zone scheme and needs a day-one starter on the offensive line. The man who blocks does not make the highlight reel. But without him, there is no reel to highlight.

That is the detail most miss. I do not.`
  };
}

function bunEScript(p) {
  const pos = fullPos(p.position);

  if (p.overall_rank === 8) {
    // Jordyn Tyson — WR — Stefon Diggs comp
    return {
      title: `Jordyn Tyson: Tracking the Deep Ball, Tracking the Truth`,
      transcript: `Good evening. This is Phone Home With Bun-E, and tonight we are looking at a young man whose tape tells one story while his body tells another.

Jordyn Tyson, ${pos} out of Arizona State. Number eight on the Per|Form board. TIE grade of 73 — Solid Contributor. And before anyone dismisses that grade, I would ask you to consider what a "solid contributor" means in the context of the professional game. It means a player who can help a team win on Sundays. That is not small.

Tyson tracks the deep ball like a centerfielder. An 89.0 PFF grade against man coverage, which tells me that when a corner presses him at the line, he has the tools to win. Strong hands through contact. 6-2 with a wide catch radius. He wins contested catches consistently — and in the parlance of Black's Law, consistency establishes precedent. What a player does once is anecdote. What he does repeatedly is evidence.

His comp is Stefon Diggs. And that comparison carries weight. Diggs was a fifth-round pick — 146th overall — out of Maryland in 2015. And from that late selection he built a career: four Pro Bowls, one First-Team All-Pro, 161 games across ten seasons. The man was told he was too small, too slow, too inconsistent. He answered every single time.

Tyson will need to answer similar questions. The weaknesses are real — lazy feet at the top of routes. Play speed that is inconsistent, looking explosive on one snap and pedestrian on the next. He has been hurt in all four college seasons. The blocking effort comes and goes, which speaks to the intangibles column in a way that concerns me.

The game-performance pillar shows genuine ball-tracking ability that translates. The athletic profile is there when he decides to use it. But the intangibles — the motor, the durability, the consistency of effort — those are the questions that separate a career from a cautionary tale.

When I was back h-- back in graduate school studying constitutional interpretation, I learned that potential without discipline is merely a theory. A theory cannot win a case. Only evidence can.

I have Jordyn Tyson going in the second round. Late first if a team falls in love with the upside. The ceiling is a number-one receiver. The floor is a player whose body would not let him become what his tape promised.

The truth of him lives somewhere between those two outcomes. And that is precisely where the scouting gets interesting.`
    };
  }

  // Rueben Bain Jr. — EDGE — Yannick Ngakoue comp (rank 9)
  return {
    title: `Rueben Bain Jr.: The Case of Production Versus Proportion`,
    transcript: `Good evening. Bun-E here. And tonight I want to present a legal brief — if you will forgive the metaphor — on behalf of Rueben Bain Jr., ${pos} out of Miami.

Number nine on the Per|Form board. TIE grade of 91 — Elite Prospect. 20.5 career sacks. A 92.4 PFF pass-rush grade. Quick-twitch burst off the snap that makes offensive tackles guess wrong. And yet — and this is the tension at the heart of this case — the measurables do not support the production.

In Black's Law Dictionary, there is a principle: the evidence must fit the claim. Bain's evidence is extraordinary. The production is undeniable. But the claim — that he can be a complete ${pos} in the National Football League — runs into a problem of proportion. Sub-31-inch arms. 6-2. That is short for the position, and in a sport where leverage is physics and physics is non-negotiable, short arms after contact mean lost reps.

His comp is Yannick Ngakoue. Third round in 2016, pick 69, to Jacksonville. One Pro Bowl. 134 games over eight seasons. Ngakoue was a productive pass rusher who never became a complete defensive end because the measurables set a ceiling. He was a weapon on passing downs, not a three-down anchor. And that is what we are projecting for Bain — a passing-down weapon in an odd front, not a base end.

The game-performance pillar is undeniable — 20.5 career sacks is production that cannot be fabricated. The athleticism is real but specific: burst, not length. The intangibles column says the motor runs hot all four quarters, but it also says the hands get sloppy late in reps and gap discipline breaks down against misdirection.

When wisdom meets the system, and the system meets the helm, sometimes the numbers that matter most are not the ones on the stat sheet. They are the ones on the measuring tape.

I see Bain going in the middle of the first round. Perhaps fifteen to twenty. A team with a creative defensive coordinator who can deploy him in favorable situations and protect him from having to hold the point of attack on every snap.

He is immensely talented. The question is not whether he can rush the passer. The question is whether the rest of his game can catch up to the one thing he does at an elite level. That is the brief. The jury is the draft board.`
  };
}

// ── Map prospects to script functions ────────────────────────────────
function generateScript(prospect) {
  const rank = prospect.overall_rank;
  // Rotation: ranks 1,10 → void-caster; 2,4 → the-haze; 3,5 → the-colonel;
  //           6,7 → astra-novatos; 8,9 → bun-e
  const mapping = {
    1: { analystId: 'void-caster', fn: voidCasterScript },
    2: { analystId: 'the-haze', fn: theHazeScript },
    3: { analystId: 'the-colonel', fn: theColonelScript },
    4: { analystId: 'the-haze', fn: theHazeScript },
    5: { analystId: 'the-colonel', fn: theColonelScript },
    6: { analystId: 'astra-novatos', fn: astraNovatosScript },
    7: { analystId: 'astra-novatos', fn: astraNovatosScript },
    8: { analystId: 'bun-e', fn: bunEScript },
    9: { analystId: 'bun-e', fn: bunEScript },
    10: { analystId: 'void-caster', fn: voidCasterScript },
  };

  const entry = mapping[rank];
  if (!entry) throw new Error(`No script mapping for rank ${rank}`);

  const { title, transcript } = entry.fn(prospect);
  return { analystId: entry.analystId, title, transcript };
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  console.log('Ensuring podcast_episodes table exists...');
  await ensureTable();

  console.log('Fetching top 10 prospects...');
  const prospects = await fetchProspects();

  if (prospects.length === 0) {
    console.error('No prospects found with overall_rank <= 10');
    process.exit(1);
  }

  console.log(`Found ${prospects.length} prospects. Generating scripts...\n`);

  for (const p of prospects) {
    const { analystId, title, transcript } = generateScript(p);

    const wordCount = transcript.split(/\s+/).length;
    const durationSeconds = Math.round((wordCount / 150) * 60);

    // Insert into podcast_episodes
    const rows = await sql`
      INSERT INTO podcast_episodes (analyst_id, title, transcript, duration_seconds, type)
      VALUES (${analystId}, ${title}, ${transcript}, ${durationSeconds}, 'prospect-breakdown')
      RETURNING id
    `;

    const episodeId = rows[0]?.id;
    console.log(`[${p.overall_rank}] ${p.name} (${p.position}) — ${analystId}`);
    console.log(`    Title: "${title}"`);
    console.log(`    Words: ${wordCount} | Duration: ~${durationSeconds}s | Episode ID: ${episodeId}`);
    console.log('');
  }

  console.log('Done. All 10 podcast scripts generated and inserted.');
  await sql.end();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
