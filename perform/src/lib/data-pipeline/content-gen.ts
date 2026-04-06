/**
 * Content Generation Pipeline
 * Uses free OpenRouter models (Llama 3.3 70B) to generate
 * scouting reports, strengths/weaknesses, and NFL comparisons
 * for all 600 prospects.
 */

import { chatCompletion, DEFAULT_MODEL } from '@/lib/openrouter';

// Primary: Llama 3.3 70B free. Fallback: default model from openrouter.ts
const MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  DEFAULT_MODEL,
];

interface ScoutingReport {
  scoutingSummary: string;
  strengths: string;
  weaknesses: string;
  nflComparison: string;
  analystNotes: string;
}

export async function generateScoutingReport(
  name: string,
  position: string,
  school: string,
  grade: number,
  projectedRound: number,
  stats?: Record<string, number>,
): Promise<ScoutingReport> {
  const statsStr = stats && Object.keys(stats).length > 0
    ? `\nKey stats: ${Object.entries(stats).map(([k, v]) => `${k}: ${v}`).join(', ')}`
    : '';

  const systemPrompt = `You are a Per|Form senior NFL Draft analyst writing prospect scouting reports. Write in a confident, authoritative voice — like Daniel Jeremiah meets Bucky Brooks. Be specific about traits. No filler. No generic praise.

RULES:
- Scouting summary: 2-3 sentences MAX. Lead with the defining trait.
- Strengths: 3-5 specific traits with ratings (e.g., "Vision 9.5/10")
- Weaknesses: 2-3 honest concerns. Don't sugarcoat.
- NFL comparison: ONE current or recent NFL player. Explain the comp in 5 words.
- Analyst notes: One line of key stats or combine numbers.

Return ONLY valid JSON with keys: scoutingSummary, strengths, weaknesses, nflComparison, analystNotes`;

  const userPrompt = `Generate a scouting report for:
Name: ${name}
Position: ${position}
School: ${school}
Per|Form Grade: ${grade}
Projected Round: ${projectedRound}${statsStr}

Return JSON only.`;

  // Try each model in order until one works
  for (const model of MODELS) {
    try {
      const res = await chatCompletion({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 1000,
      });
      const data = await res.json();

      // Check for API-level errors (rate limit, model unavailable)
      if (data.error) continue;

      const raw: string = data.choices?.[0]?.message?.content ?? '';
      if (!raw) continue;

      // Strip markdown fences and parse JSON
      const cleaned = raw
        .replace(/```(?:json)?\n?/g, '')
        .replace(/```\s*$/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);
      return {
        scoutingSummary: parsed.scoutingSummary || '',
        strengths: parsed.strengths || '',
        weaknesses: parsed.weaknesses || '',
        nflComparison: parsed.nflComparison || '',
        analystNotes: parsed.analystNotes || '',
      };
    } catch {
      // Try next model
      continue;
    }
  }

  // All models failed
  return {
    scoutingSummary: '',
    strengths: '',
    weaknesses: '',
    nflComparison: '',
    analystNotes: '',
  };
}

/** Generate reports in batches to stay under rate limits */
export async function batchGenerateReports(
  prospects: {
    name: string;
    position: string;
    school: string;
    grade: number;
    projectedRound: number;
  }[],
  batchSize: number = 3,
  delayMs: number = 1000,
): Promise<Map<string, ScoutingReport>> {
  const results = new Map<string, ScoutingReport>();

  for (let i = 0; i < prospects.length; i += batchSize) {
    const batch = prospects.slice(i, i + batchSize);
    const promises = batch.map(async (p) => {
      const report = await generateScoutingReport(
        p.name, p.position, p.school, p.grade, p.projectedRound,
      );
      if (report.scoutingSummary) {
        results.set(p.name, report);
      }
    });
    await Promise.all(promises);

    // Rate limit: 20 req/min on free tier
    if (i + batchSize < prospects.length) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  return results;
}
