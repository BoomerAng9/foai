import { generateText } from '@/lib/openrouter';
import { getAnalyst, type AnalystPersona } from './personas';
import { gradeAllProspects, type GradedProspect } from '@/lib/draft/open-mind-grader';

export type ContentType =
  | 'scouting_report'
  | 'film_breakdown'
  | 'hot_take'
  | 'podcast_script'
  | 'debate_bull'
  | 'debate_bear'
  | 'ranking_update';

const TYPE_PROMPTS: Record<ContentType, string> = {
  scouting_report:
    'Write a 2-3 paragraph scouting report. Reference the player BY NAME repeatedly — never say "that tight end" or "this quarterback" generically. Include TIE grade context, strengths, weaknesses, and draft projection. Work in at least two of your personal talking points or catchphrases from your system prompt.',
  film_breakdown:
    'Break down the film on a specific real player. REFERENCE THE PLAYER BY NAME — not by position. Describe specific plays, formations, techniques. If you have a co-host, bounce real lines off each other using [HAZE] [SMOKE] tags — like Jadakiss and Styles P, not like AI. At least two personal references from your backstory per take.',
  hot_take:
    'Give your hottest take on this topic. Reference specific players BY NAME. Back it up with specific evidence. Stay in character — your voice, your catchphrases, your backstory.',
  podcast_script:
    'Write a 3-5 minute podcast script with [PAUSE], [EMPHASIS], and [GRAPHIC] cues. Cold open (10s), intro (30s), main segment (2-3 min), closing take (30s), outro (15s). Reference specific players BY NAME. Drop at least three personal backstory callbacks during the script.',
  debate_bull:
    'Argue the BULL case on a specific named player — why they are being UNDERRATED. Be passionate and specific. Use your personal voice and at least one catchphrase.',
  debate_bear:
    'Argue the BEAR case on a specific named player — why they are being OVERRATED. Be honest and specific. Use your personal voice and at least one catchphrase.',
  ranking_update:
    'Provide a ranking update with your analysis. Name AT LEAST 5 specific real prospects from the 2026 class by full name and position. Who moved up, who dropped, and why. Work in your personal backstory callbacks.',
};

/* ── Build the grounding block from the canonical board ── */
function buildBoardContext(): string {
  const graded = gradeAllProspects();
  const top25 = graded.slice(0, 25);
  const lines = top25.map(
    (p: GradedProspect) =>
      `#${p.performRank} ${p.name} (${p.position}, ${p.school}) — TIE ${p.grade.toFixed(1)} ${p.gradeLetter}`,
  );
  return [
    'CANONICAL 2026 BIG BOARD — top 25 (reference these players BY FULL NAME in your takes):',
    ...lines,
    '',
    'STRICT RULES:',
    '- NEVER say "that tight end", "this quarterback", or "the edge rusher" without a name.',
    '- If you bring up a prospect, use the EXACT name from the list above.',
    '- If you need to reference a player not on the list, pick one from the board above instead.',
    '- If you have a co-host, write actual back-and-forth dialogue tagged with [HAZE] [SMOKE] — the kind of real conversation Jadakiss and Styles P would have, never AI-stiff.',
    '- Drop your personal backstory callbacks naturally (Blinn CC, your brother Jaydan, your book, your glory days, your origin — whatever your system prompt says is yours).',
    '- NEVER leak <think> tags, reasoning prefixes, or XML scaffolding into the response. Output clean prose only.',
  ].join('\n');
}

export async function generateAnalystContent(
  analystId: string,
  contentType: ContentType,
  context: string,
): Promise<{ content: string; analyst: AnalystPersona }> {
  const analyst = getAnalyst(analystId);
  if (!analyst) throw new Error(`Analyst ${analystId} not found`);

  const board = buildBoardContext();
  const userMessage = `${TYPE_PROMPTS[contentType]}\n\n${board}\n\nCONTEXT FOR THIS SEGMENT:\n${context}`;
  const content = await generateText(analyst.systemPrompt, userMessage);

  return { content, analyst };
}
