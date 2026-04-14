import { DEFAULT_MODEL, generateText } from '@/lib/openrouter';
import type { ScrapedArticle } from './scraper';

const EXTRACTION_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  DEFAULT_MODEL,
] as const;

export interface PlayerUpdate {
  playerName: string;
  updateType: 'stats' | 'combine' | 'injury' | 'transfer' | 'commitment' | 'grade_change' | 'news';
  summary: string;
  data?: Record<string, string | number>;
  source: string;
  confidence: number;
}

export async function extractPlayerUpdates(articles: ScrapedArticle[]): Promise<PlayerUpdate[]> {
  if (articles.length === 0) return [];

  const articleText = articles.map((a, i) =>
    `[${i + 1}] ${a.title}\nSource: ${a.source}\n${a.description}`
  ).join('\n\n');

  const systemPrompt = `You are a sports data extraction agent. Given news articles about college football and the NFL Draft, extract structured player updates.

For each player mentioned, output a JSON array of updates. Each update must have:
- playerName: full name
- updateType: one of "stats", "combine", "injury", "transfer", "commitment", "grade_change", "news"
- summary: one sentence description of the update
- data: optional object with specific metrics (e.g., {"forty_yard": 4.35, "vertical": 38.5})
- source: which article it came from (use the source hostname)
- confidence: 0.0-1.0 how confident you are this is accurate

ONLY extract factual, verifiable information. If an article is speculative, set confidence below 0.5.
Return ONLY the JSON array, no markdown, no explanation.`;

  for (const model of EXTRACTION_MODELS) {
    try {
      const response = await generateText(
        systemPrompt,
        `Extract player updates from these articles:\n\n${articleText}`,
        model,
      );
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Try the next model.
    }
  }

  return [];
}
