/**
 * Huddle Post Generator
 * ========================
 * Generates Huddle posts from player data using persona-specific templates.
 * No LLM calls — template-based with persona vocabulary.
 */

import { sql } from '@/lib/db';

interface GeneratedPost {
  analyst_id: string;
  content: string;
  post_type: string;
  tags: string[];
  player_ref: string | null;
}

interface PlayerData {
  name: string;
  position: string;
  school: string;
  grade: string;
  tie_grade: string;
  strengths: string;
  weaknesses: string;
  nfl_comparison: string;
  overall_rank: number;
  projected_round: number;
}

// Persona-specific openers and vocabulary
const VOICE = {
  'void-caster': {
    takes: [
      (p: PlayerData) => `${p.name} isn't a prospect. He's a problem for every offensive coordinator in the league.`,
      (p: PlayerData) => `The tape doesn't lie. ${p.name} at ${p.school} — this is what ${p.position} looks like when it's done right.`,
      (p: PlayerData) => `Round ${p.projected_round}. That's where ${p.name} lands. The question is whether the team that picks him deserves what they're getting.`,
    ],
    scouting: [
      (p: PlayerData) => `${p.name}. ${p.school}. ${p.position}.\n\nThe strengths: ${p.strengths?.split(',').slice(0, 3).join(', ')}.\n\nThe concerns: ${p.weaknesses?.split(',').slice(0, 2).join(', ')}.\n\nComp: ${p.nfl_comparison}. Grade: ${p.grade}.`,
    ],
  },
  'the-haze': {
    takes: [
      (p: PlayerData) => `[HAZE] ${p.name} goes top 10. Book it.\n[SMOKE] Top 10? In what draft? He's a day two pick at best.\n[HAZE] You said that about the last three guys who went top five.\n[SMOKE] And I was right about two of them.`,
      (p: PlayerData) => `[SMOKE] ${p.school}'s ${p.name} is the most overrated ${p.position} in this class.\n[HAZE] Overrated? His ${p.strengths?.split(',')[0]?.trim()} is the best in the draft.\n[SMOKE] Best in the draft doesn't mean best in the league.`,
    ],
    scouting: [
      (p: PlayerData) => `[HAZE] Alright let's break down ${p.name}.\n[SMOKE] ${p.grade} grade, ${p.tie_grade}. Comp is ${p.nfl_comparison}.\n[HAZE] The strengths are real — ${p.strengths?.split(',').slice(0, 2).join(', ')}.\n[SMOKE] But so are the weaknesses. ${p.weaknesses?.split(',')[0]?.trim()}. That's not nothing.`,
    ],
  },
  'the-colonel': {
    takes: [
      (p: PlayerData) => `Let me tell you something about ${p.name}. Kid plays ${p.position} the way we played at Union High in '87 — with guts. Gino just yelled from the back that he disagrees. Gino hasn't watched the tape.`,
      (p: PlayerData) => `${p.name} from ${p.school}. ${p.grade} grade. You know what that reminds me of? Nothing, because I've been eating Gino's pizza for 40 years and my memory is shot. But the tape is real.`,
    ],
    scouting: [
      (p: PlayerData) => `Alright, settling in with a slice — let's talk ${p.name}.\n\nThe good: ${p.strengths?.split(',').slice(0, 3).join(', ')}.\nThe bad: ${p.weaknesses?.split(',').slice(0, 2).join(', ')}.\nComp: ${p.nfl_comparison}.\n\nGino says he's a bust. Gino also burned the garlic knots yesterday. Consider the source.`,
    ],
  },
  'astra-novatos': {
    takes: [
      (p: PlayerData) => `There's a seam in ${p.name}'s game. Not a flaw — a fold. Press it and it holds. That's how you know the material is real.`,
      (p: PlayerData) => `${p.name} at ${p.position}. ${p.school}. The way he moves — there's a tailored quality to it. Nothing wasted. Grade ${p.grade}. Deserved.`,
    ],
    scouting: [
      (p: PlayerData) => `${p.name}. Let's take our time with this one.\n\nThe craft: ${p.strengths?.split(',').slice(0, 3).join(', ')}. Each one earned, not given.\n\nThe edges that need pressing: ${p.weaknesses?.split(',').slice(0, 2).join(', ')}.\n\nHis comp — ${p.nfl_comparison} — tells you the ceiling. The floor is what he does with it.`,
    ],
  },
  'bun-e': {
    takes: [
      (p: PlayerData) => `Exhibit A: ${p.name}'s tape. Exhibit B: the ${p.grade} grade. The defense rests. And where I come from — I mean, where I STUDIED this — you don't argue with exhibits.`,
      (p: PlayerData) => `${p.name} plays ${p.position} like someone who knows the verdict before the trial starts. That's not arrogance. That's preparation. Trust me, I know the differ— anyway. ${p.tie_grade}.`,
    ],
    scouting: [
      (p: PlayerData) => `Let's examine the evidence on ${p.name}, ${p.position}, ${p.school}.\n\nFor the prosecution (strengths): ${p.strengths?.split(',').slice(0, 3).join(', ')}.\nFor the defense (concerns): ${p.weaknesses?.split(',').slice(0, 2).join(', ')}.\n\nVerdict: ${p.tie_grade}. Comp: ${p.nfl_comparison}. Case closed. Mostly. There's always an appeal back ho— in Houston.`,
    ],
  },
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function generateTakeFromPlayer(analystId: string, playerName: string): Promise<GeneratedPost | null> {
  if (!sql) return null;
  const [player] = await sql`SELECT name, position, school, grade, tie_grade, strengths, weaknesses, nfl_comparison, overall_rank, projected_round
    FROM perform_players WHERE LOWER(name) LIKE LOWER(${`%${playerName}%`}) LIMIT 1`;
  if (!player) return null;

  const voice = VOICE[analystId as keyof typeof VOICE];
  if (!voice) return null;

  const templates = voice.takes;
  const template = templates[Math.floor(Math.random() * templates.length)];
  const content = template(player as unknown as PlayerData);

  return {
    analyst_id: analystId,
    content,
    post_type: 'take',
    tags: [player.name, player.position, player.school],
    player_ref: slugify(player.name),
  };
}

export async function generateScoutingPost(analystId: string, playerName: string): Promise<GeneratedPost | null> {
  if (!sql) return null;
  const [player] = await sql`SELECT name, position, school, grade, tie_grade, strengths, weaknesses, nfl_comparison, overall_rank, projected_round
    FROM perform_players WHERE LOWER(name) LIKE LOWER(${`%${playerName}%`}) LIMIT 1`;
  if (!player) return null;

  const voice = VOICE[analystId as keyof typeof VOICE];
  if (!voice?.scouting) return null;

  const templates = voice.scouting;
  const template = templates[Math.floor(Math.random() * templates.length)];
  const content = template(player as unknown as PlayerData);

  return {
    analyst_id: analystId,
    content,
    post_type: 'scouting',
    tags: [player.name, player.position, player.school],
    player_ref: slugify(player.name),
  };
}

export async function generatePredictionPost(analystId: string): Promise<GeneratedPost | null> {
  if (!sql) return null;
  const top3 = await sql`SELECT name, position, school, projected_round FROM perform_players WHERE overall_rank <= 3 ORDER BY overall_rank`;
  if (top3.length === 0) return null;

  const predictions = top3.map((p, i) => `${i + 1}. ${p.name} (${p.position}, ${p.school})`).join('\n');

  const content = analystId === 'the-haze'
    ? `[HAZE] My top 3:\n${predictions}\n\n[SMOKE] Wrong. All of it. Here's the real order:\n${top3.reverse().map((p, i) => `${i + 1}. ${p.name}`).join('\n')}`
    : analystId === 'the-colonel'
    ? `Top 3 on my board, written on a napkin at Marlisecio's:\n${predictions}\n\nGino says I'm delusional. I say he should stick to calzones.`
    : `My top 3 for the 2026 draft:\n${predictions}`;

  return {
    analyst_id: analystId,
    content,
    post_type: 'prediction',
    tags: ['2026 NFL Draft', 'Top 3', 'Mock Draft'],
    player_ref: null,
  };
}
