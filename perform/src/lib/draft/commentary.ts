/**
 * Draft Commentary Engine — Template-based analyst commentary
 * Client-side, no LLM calls. Fast enough for real-time streaming.
 *
 * 3 analysts x 8 scenarios x 5-8 templates = ~130 templates
 */

import type { DraftPick } from './types';

export type CommentaryScenario =
  | 'expected'    // Pick matches consensus
  | 'surprise'    // Unexpected pick
  | 'reach'       // Drafted higher than expected
  | 'steal'       // Drafted lower than expected (value)
  | 'trade'       // Trade involved
  | 'qb'          // Quarterback selected
  | 'position_run'// 3+ same position in a row
  | 'day_one'     // First-round pick emphasis
  ;

export type AnalystId = 'the-colonel' | 'bun-e' | 'void-caster';

interface CommentaryTemplate {
  scenario: CommentaryScenario;
  analyst: AnalystId;
  templates: string[];
}

// ─── THE COLONEL ───────────────────────────────────────────

const COLONEL_TEMPLATES: CommentaryTemplate[] = [
  {
    scenario: 'expected',
    analyst: 'the-colonel',
    templates: [
      'This is the right pick, plain and simple. {player} to {team} — you saw it comin\' from a mile away. Back at Union in \'87 we had a kid just like this.',
      'Nothin\' fancy here, {team} does what they shoulda done. {player} outta {school}? That\'s football, baby.',
      'You know what I love about this? {team} didn\'t overthink it. {player} was the best player on their board. Write it down.',
      'Hey Gino! Gino come \'ere — tell me this ain\'t the most obvious pick of the night. {player} to {team}. Easy money.',
      'Look, I said it on the show last week — {team} was takin\' {player}. Nobody listened. Now they\'re all actin\' surprised. Fuhgeddaboudit.',
    ],
  },
  {
    scenario: 'surprise',
    analyst: 'the-colonel',
    templates: [
      'What the — okay, I did NOT see that comin\'. {player} to {team}? Somebody in that war room had too much espresso.',
      'Hold on, hold on, hold on. {team} just took {player}?! That\'s a bold move, and I don\'t mean that as a compliment.',
      'Gino! Get over here! You believe this? {player} to {team}! I\'m losin\' my mind over here!',
      'This reminds me of the \'87 draft when Coach Marinelli picked that kid nobody heard of. We thought he was crazy. He WAS crazy. But it worked out.',
      'I need a slice of pizza and a minute to process this. {player} was NOT on anyone\'s board for {team}.',
    ],
  },
  {
    scenario: 'reach',
    analyst: 'the-colonel',
    templates: [
      '{team} reachin\' for {player} like my ex reaches for the last cannoli. There were better options on the board, people.',
      'Look, I like {player} as a player. But HERE? At this spot? {team} coulda waited. That\'s a reach and a half.',
      'Back at Union in \'87, Coach woulda benched the GM for this pick. {player}\'s good but not THIS good.',
      'Gino always says don\'t overpay for the pizza, don\'t overpay for the player. {team} just overpaid for {player}.',
      '{player} outta {school} — the tape is decent, the intangibles are decent. But decent don\'t go this high. That\'s a reach.',
    ],
  },
  {
    scenario: 'steal',
    analyst: 'the-colonel',
    templates: [
      'Are you KIDDIN\' me?! {player} falls to {team}?! That\'s robbery! Someone call the cops!',
      'This is the steal of the draft. {player} to {team}. The tape was screaming first-round talent and they got him HERE.',
      'Hey Gino! Lock the doors! {team} just stole {player} and they\'re gettin\' away with it!',
      'Back at Union in \'87, when a player this good fell to us, we threw a pizza party. {team} should be throwin\' one right now.',
      'The athletic profile on {player} is ELITE. How did {team} get this kid here? Everybody else fell asleep!',
    ],
  },
  {
    scenario: 'trade',
    analyst: 'the-colonel',
    templates: [
      'TRADE! Now we\'re talkin\'! {team} moves up for {player}! This is what draft night is all about, baby!',
      'You hear that? That\'s the sound of phones ringin\' off the hook. {team} made a deal and grabbed {player}. Bold move.',
      'Gino! We got a TRADE! {team}\'s movin\' pieces around like chess. And they land on {player}. Smart or stupid? I say smart.',
      'This trade reminds me of when Union traded our best cornerback to get two linebackers in \'87. Wait, that\'s not how drafts work. Whatever — {player} to {team}!',
      'When you want a guy, you go GET the guy. {team} traded up for {player} and I respect the aggression.',
    ],
  },
  {
    scenario: 'qb',
    analyst: 'the-colonel',
    templates: [
      '{player} — Quarterback — {school}. Here we go. {team} puts their chips on this kid. The intangibles column better be screaming.',
      'A Quarterback changes everything. {team} takes {player} and the whole draft board shifts. Gino, pass me a napkin, I\'m sweatin\'.',
      'I\'ve seen a lotta Quarterbacks come through this draft. {player} has that look. The tape says he can play. But can he play in JANUARY?',
      'Back at Union, our Quarterback was 5\'9" and threw like a cannon. {player}\'s got better measurables but does he have the heart? Time will tell.',
      '{team} swings for the fences on {player}. Quarterback — the most important position in sports. No pressure, kid.',
    ],
  },
  {
    scenario: 'position_run',
    analyst: 'the-colonel',
    templates: [
      'That\'s THREE {position}s in a row! We got a full-on position run, people! Everybody wants one!',
      'It\'s a {position} party and everybody\'s invited! Three straight! When it rains, it pours.',
      'Gino, remember when everybody at the shop ordered pepperoni at the same time? That\'s what\'s happenin\' with {position}s right now.',
      'Position run on {position}. When one team panics, they all panic. This is beautiful chaos.',
      'I love a good run. Three {position}s off the board — somebody\'s gettin\' desperate and somebody\'s gettin\' a steal.',
    ],
  },
  {
    scenario: 'day_one',
    analyst: 'the-colonel',
    templates: [
      'Round 1, pick {pick_number}. This is where legacies start. {player} to {team}. The kid better be ready.',
      'First round picks don\'t get excuses. {player} walks into {team}\'s facility tomorrow as THE guy. That\'s football, baby.',
      'Pick {pick_number} overall — {player} to {team}. You dream about this moment as a kid. Now deliver.',
      'Day one pick. Top of the draft. {player} outta {school} to {team}. This better work out or somebody\'s gettin\' fired.',
      'The bright lights of Round 1. {player} just became a very rich young man. Now earn it, kid.',
    ],
  },
];

// ─── BUN-E ─────────────────────────────────────────────────

const BUNE_TEMPLATES: CommentaryTemplate[] = [
  {
    scenario: 'expected',
    analyst: 'bun-e',
    templates: [
      'The universe aligned for this one. {player} to {team} — when the tape speaks and the intangibles confirm, there is no debate.',
      '{player} was always meant to land here. The criteria told the story weeks ago. {team} simply listened.',
      'Precision in process. {team} selects {player} from {school} — exactly where the evaluation placed them. Order in the draft.',
      'Some picks require no argument. {player} to {team} is one of them. The athletic profile and the game tape are in complete agreement.',
      'When the data and the eye test converge, you get {player} to {team}. A measured choice. A correct one.',
    ],
  },
  {
    scenario: 'surprise',
    analyst: 'bun-e',
    templates: [
      'Now this... this is unexpected. {player} to {team}. The conventional wisdom said otherwise. Sometimes the conventional wisdom is wrong.',
      'I had to look twice. {player} was not the name most had circled for {team}. There is a story behind this pick we have not heard yet.',
      'Surprise is just another word for information we did not have. {team} sees something in {player} that the consensus missed.',
      '{player} to {team} — the stars rearranged themselves on this one. When wisdom meets the system, sometimes the system blinks first.',
      'Every draft has a pick that rewrites the board. This might be that pick. {player} to {team}. Unexpected. Possibly brilliant.',
    ],
  },
  {
    scenario: 'reach',
    analyst: 'bun-e',
    templates: [
      '{team} extends beyond the consensus for {player}. The game performance tape says one thing, the draft position says another. A tension worth watching.',
      'Reaching for {player} here is a statement of conviction. Whether it is conviction or stubbornness — that we will learn in time.',
      'The criteria placed {player} lower. {team} placed them here. Someone is wrong. The tape will tell us who, eventually.',
      '{player} from {school} — the athletic profile is there, but the evaluation gap between draft slot and board rank is notable.',
      'When wisdom meets ambition... sometimes ambition overpays. {player} to {team} feels early. But early is not always wrong.',
    ],
  },
  {
    scenario: 'steal',
    analyst: 'bun-e',
    templates: [
      'Star energy, cosmic trajectory. {player} falling to {team} is a gift wrapped in other teams\' hesitation.',
      'The universe has favorites, and tonight {team} is one of them. {player} at this spot? That is a steal of the highest order.',
      '{player} from {school} — the tape said elite, the intangibles column confirmed it. And yet here they are, still on the board. {team} benefits.',
      'Sometimes the best strategy is patience. {team} waited, and {player} came to them like gravity.',
      'When the board falls in your favor, you do not ask questions. You simply say thank you. {team} says thank you for {player}.',
    ],
  },
  {
    scenario: 'trade',
    analyst: 'bun-e',
    templates: [
      'A trade. The board reshuffles. {team} moves with purpose to secure {player}. Bold decisions define draft nights.',
      'When you know, you move. {team} traded to this position for {player}. There is no uncertainty in that action.',
      'The draft is a living system, and trades are its heartbeat. {team} just sent a message — {player} was their target.',
      'Movement on the board. {team} acquires {player} through a trade. The chess pieces shift. Everyone else recalculates.',
      'A trade for {player} — {team} decided the cost of missing was greater than the cost of moving. That is how conviction works.',
    ],
  },
  {
    scenario: 'qb',
    analyst: 'bun-e',
    templates: [
      '{player} — Quarterback — from {school}. The most consequential position in the sport, and {team} puts their future in these hands.',
      'A Quarterback selection reshapes everything downstream. {player} to {team}. The intangibles here will matter more than the arm.',
      'When the game\'s most important position meets a player of this caliber... {player} to {team}. The evaluation speaks clearly.',
      '{team} selects their Quarterback of the future. {player} from {school}. The weight of this pick extends far beyond tonight.',
      'Quarterback. {player}. {team}. Three words that will define a franchise for the next decade. The tape says they chose well.',
    ],
  },
  {
    scenario: 'position_run',
    analyst: 'bun-e',
    templates: [
      'Three consecutive {position} selections. The board has spoken — this is the position of the moment. Supply, meet demand.',
      'A run on {position}. When multiple evaluators converge on the same conclusion simultaneously, it is not coincidence. It is correctness.',
      'The {position} run continues. Each selection makes the next one more expensive. The economics of scarcity in real time.',
      'Three {position}s in sequence. The talent pool at this position was deep, and teams are harvesting it before it is gone.',
      'Position runs are the draft\'s way of telling you something the mock drafts missed. {position} was the need nobody ranked high enough.',
    ],
  },
  {
    scenario: 'day_one',
    analyst: 'bun-e',
    templates: [
      'Pick {pick_number}. Round one. {player} to {team}. Tonight, a career begins. The criteria say this one has what it takes.',
      'First-round selections carry a different weight. {player} from {school} enters {team} with expectations already set. The tape must match the investment.',
      'Day one. The brightest lights. {player} walks through the door as a first-round pick for {team}. There is no looking back now.',
      'Pick {pick_number} — {player} to {team}. The athletic profile is first-round caliber. The game performance is first-round caliber. The moment matches the player.',
      'When they call your name on day one, the universe notices. {player} — welcome to {team}, and welcome to the stage.',
    ],
  },
];

// ─── VOID-CASTER ───────────────────────────────────────────

const VOIDCASTER_TEMPLATES: CommentaryTemplate[] = [
  {
    scenario: 'expected',
    analyst: 'void-caster',
    templates: [
      'And there it is. {player} to {team}. The clock hits zero and the future walks through the door exactly as predicted.',
      'No drama. No surprises. Just the right name in the right place. {player} to {team}. This is how you build a franchise.',
      '{player} from {school} — the tape told us this was coming. The intangibles confirmed it. {team} makes the pick that everyone saw. Sometimes obvious is beautiful.',
      'Ladies and gentlemen, {player} to {team}. When the evaluation is clean and the fit is right, the pick makes itself.',
      'The board said it. The tape said it. The scouts said it. {player} to {team}. Consensus for a reason.',
    ],
  },
  {
    scenario: 'surprise',
    analyst: 'void-caster',
    templates: [
      'Well. That is... unexpected. {player} to {team}. The draft just took a turn nobody predicted. This is why we watch.',
      'Silence in the room. {player} to {team} was not on anyone\'s final mock. Someone in that building knows something we do not.',
      '{player}. {team}. A combination that was not on any board I have seen. And I have seen them all. This pick right here... this is the one they will debate for years.',
      'The draft has a way of humbling the consensus. {player} to {team} just humbled everyone in this room.',
      'In this realm, certainty is an illusion. {player} to {team} just proved it. The board reshuffles. Everything changes.',
    ],
  },
  {
    scenario: 'reach',
    analyst: 'void-caster',
    templates: [
      '{team} reaches for {player}. The game performance grade did not say this spot. The board did not say this spot. But {team}\'s board did.',
      'A reach by any measure. {player} to {team} — the talent is real but the slot is aggressive. Time will be the judge.',
      'When a team falls in love with a player, the board becomes irrelevant. {team} fell hard for {player}. The question is whether the tape justifies the emotion.',
      '{player} from {school} goes higher than expected. {team} pays the premium. The athletic profile better be elite, because the draft capital just got expensive.',
      'This pick will age like fine wine or sour milk. {player} to {team}, ahead of consensus. Bold. Very bold.',
    ],
  },
  {
    scenario: 'steal',
    analyst: 'void-caster',
    templates: [
      'And {player} falls. And falls. And lands with {team}. This, ladies and gentlemen, is the steal of the draft.',
      'Someone will lose their job for letting {player} slide this far. {team} just received a gift they did not deserve. But they will take it.',
      '{player} to {team} at this slot. The numbers do not lie — this is a first-round talent at a discount price. Pure value.',
      'You can have all the measurables in the world, but a grade like {player}\'s? That is legacy on paper. And {team} just got it for a song.',
      'In ten years, when they look back at this draft, they will circle this pick. {player} to {team}. The one everyone else missed.',
    ],
  },
  {
    scenario: 'trade',
    analyst: 'void-caster',
    templates: [
      'TRADE. The board just shifted. {team} moves into position and takes {player}. This is the moment the draft changes direction.',
      'A trade. A statement. {team} wanted {player} and they went and got him. That is what conviction looks like on draft night.',
      'The phones are ringing. {team} makes a move and secures {player}. When you see your player, you do not wait. You strike.',
      'This trade will be studied. {team} moves up, grabs {player}, and resets the board for everyone behind them. Masterful or reckless? Time will tell.',
      'Draft night comes alive with a trade. {team} acquires {player}. The clock hits zero and the future, once again, walks through the door.',
    ],
  },
  {
    scenario: 'qb',
    analyst: 'void-caster',
    templates: [
      '{player}. Quarterback. {school}. {team}. Four words that will define the next decade. Ladies and gentlemen, this is the pick.',
      'The most important position in professional sports. {team} places their bet on {player}. The tape says elite. The intangibles say leader. The clock says now.',
      'A franchise Quarterback. Those words carry weight that no other position can match. {player} to {team}. This is why we are all here tonight.',
      '{player} to {team}. Quarterback. The pick that changes everything. Every other move this franchise makes for the next five years flows through this decision.',
      'They say the Quarterback is the sun and everything else orbits around him. {team} just chose their sun. {player} from {school}.',
    ],
  },
  {
    scenario: 'position_run',
    analyst: 'void-caster',
    templates: [
      'Three {position}s. In a row. The dam has broken. When one team moves, they all move. This is a full position run.',
      'The {position} run is on. Three consecutive picks at the same position. The board just condensed — everyone else is scrambling.',
      'Position runs are the draft\'s way of correcting itself. {position} was undervalued. Now everyone is paying full price at once.',
      'Three straight {position} selections. The value at this position just evaporated. Whoever needed one and waited... they are in trouble.',
      'A run on {position}. This is the moment where draft boards get thrown in the trash and instinct takes over.',
    ],
  },
  {
    scenario: 'day_one',
    analyst: 'void-caster',
    templates: [
      'Round one. Pick {pick_number}. {player} to {team}. The lights are brightest on day one, and this player just stepped into them.',
      'Day one. The main stage. {player} from {school} hears their name called by {team}. A dream realized. A career begins. This is the moment.',
      'Pick {pick_number}. First round. {player}. {team}. This is where legacies begin. This is what the draft is about.',
      'The first round is a promise. {team} promises {player} they believe. {player} promises {team} they will deliver. Pick {pick_number}.',
      'Under the lights of day one, {player} becomes a first-round pick for {team}. You can have all the measurables in the world, but walking across that stage? That is something else entirely.',
    ],
  },
];

// ─── Combined registry ─────────────────────────────────────

const ALL_TEMPLATES: CommentaryTemplate[] = [
  ...COLONEL_TEMPLATES,
  ...BUNE_TEMPLATES,
  ...VOIDCASTER_TEMPLATES,
];

const templateMap = new Map<string, string[]>();
for (const t of ALL_TEMPLATES) {
  templateMap.set(`${t.analyst}:${t.scenario}`, t.templates);
}

// ─── Scenario detection ────────────────────────────────────

function detectScenario(pick: DraftPick, recentPicks?: DraftPick[]): CommentaryScenario {
  // Trade
  if (pick.is_trade) return 'trade';

  // QB
  if (pick.position === 'QB') return 'qb';

  // Position run: check last 2 picks
  if (recentPicks && recentPicks.length >= 2) {
    const last2 = recentPicks.slice(-2);
    if (last2.every(p => p.position === pick.position)) return 'position_run';
  }

  // Surprise score thresholds
  const surprise = pick.surprise_score ?? 50;
  if (surprise > 70) return 'reach';
  if (surprise < 20) return 'steal';
  if (surprise > 55) return 'surprise';

  // First round
  if (pick.round === 1) return 'day_one';

  return 'expected';
}

// ─── Fill template ─────────────────────────────────────────

function fillTemplate(template: string, pick: DraftPick): string {
  return template
    .replace(/\{player\}/g, pick.player_name)
    .replace(/\{team\}/g, pick.team_abbr)
    .replace(/\{position\}/g, pick.position)
    .replace(/\{school\}/g, pick.school)
    .replace(/\{grade\}/g, pick.tie_grade)
    .replace(/\{pick_number\}/g, String(pick.pick_number));
}

// ─── Public API ────────────────────────────────────────────

const ANALYST_ROTATION: AnalystId[] = ['the-colonel', 'bun-e', 'void-caster'];

/**
 * Generate pick commentary for a specific analyst and pick.
 */
export function generatePickCommentary(
  pick: DraftPick,
  analyst: AnalystId,
  recentPicks?: DraftPick[]
): string {
  const scenario = detectScenario(pick, recentPicks);
  const key = `${analyst}:${scenario}`;
  const templates = templateMap.get(key);
  if (!templates || templates.length === 0) {
    return `${pick.player_name} selected by ${pick.team_abbr}.`;
  }
  const idx = Math.floor(Math.random() * templates.length);
  return fillTemplate(templates[idx], pick);
}

/**
 * Get the analyst for a given pick index (rotates).
 */
export function getAnalystForPick(pickIndex: number): AnalystId {
  return ANALYST_ROTATION[pickIndex % ANALYST_ROTATION.length];
}

/**
 * Get display info for an analyst.
 */
export function getAnalystDisplayInfo(id: AnalystId): { name: string; color: string; icon: string } {
  switch (id) {
    case 'the-colonel': return { name: 'The Colonel', color: '#EF4444', icon: 'C' };
    case 'bun-e': return { name: 'Bun-E', color: '#8B5CF6', icon: 'B' };
    case 'void-caster': return { name: 'Void-Caster', color: '#D4A853', icon: 'V' };
  }
}

/**
 * Total template count for stats reporting.
 */
export function getTemplateStats(): { total: number; perAnalyst: Record<AnalystId, number>; perScenario: Record<string, number> } {
  const perAnalyst: Record<string, number> = { 'the-colonel': 0, 'bun-e': 0, 'void-caster': 0 };
  const perScenario: Record<string, number> = {};
  let total = 0;
  for (const t of ALL_TEMPLATES) {
    const count = t.templates.length;
    total += count;
    perAnalyst[t.analyst] += count;
    perScenario[t.scenario] = (perScenario[t.scenario] || 0) + count;
  }
  return { total, perAnalyst: perAnalyst as Record<AnalystId, number>, perScenario };
}
