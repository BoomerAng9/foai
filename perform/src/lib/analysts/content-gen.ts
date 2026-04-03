import { generateText } from '@/lib/openrouter';
import { getAnalyst, type AnalystPersona } from './personas';

export type ContentType = 'scouting_report' | 'film_breakdown' | 'hot_take' | 'podcast_script' | 'debate_bull' | 'debate_bear' | 'ranking_update';

const TYPE_PROMPTS: Record<ContentType, string> = {
  scouting_report: 'Write a 2-paragraph scouting report on this player. Include TIE grade context, strengths, weaknesses, and NFL projection.',
  film_breakdown: 'Break down the film on this player. What do you see? Tendencies, technique, areas of growth. Be specific about plays and formations.',
  hot_take: 'Give your hottest take on this topic. Be bold, be provocative, back it up with evidence.',
  podcast_script: 'Write a 3-5 minute podcast script with [PAUSE], [EMPHASIS], and [GRAPHIC: description] production cues. Include cold open (10s), intro (30s), main segment (2-3 min), closing take (30s), outro (15s).',
  debate_bull: 'Argue the BULL case — why this player/team is being UNDERRATED. Be passionate and specific.',
  debate_bear: 'Argue the BEAR case — why this player/team is being OVERRATED. Be honest and specific.',
  ranking_update: 'Provide a ranking update with your analysis. Who moved up, who dropped, and why.',
};

export async function generateAnalystContent(
  analystId: string,
  contentType: ContentType,
  context: string,
): Promise<{ content: string; analyst: AnalystPersona }> {
  const analyst = getAnalyst(analystId);
  if (!analyst) throw new Error(`Analyst ${analystId} not found`);

  const userMessage = `${TYPE_PROMPTS[contentType]}\n\nContext:\n${context}`;
  const content = await generateText(analyst.systemPrompt, userMessage);

  return { content, analyst };
}
