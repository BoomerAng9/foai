/**
 * Vertex AI — Gemini integration.
 *
 * Server-side only. Uses the unified @google/genai SDK in Vertex mode so we
 * authenticate via ADC (the service account at GOOGLE_APPLICATION_CREDENTIALS).
 *
 * Use this from API route handlers — never import from client components.
 */

import { GoogleGenAI } from '@google/genai';
import type { Destination, Intention } from './validation';

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
const PRO_MODEL = process.env.VERTEX_GEMINI_MODEL || 'gemini-2.5-pro';
const FLASH_MODEL = process.env.VERTEX_GEMINI_FLASH_MODEL || 'gemini-2.5-flash';

let cached: GoogleGenAI | null = null;

function client(): GoogleGenAI {
  if (cached) return cached;
  if (!PROJECT) {
    throw new Error(
      '[destinations-ai/vertex] GOOGLE_CLOUD_PROJECT is not set — cannot init Vertex client.',
    );
  }
  cached = new GoogleGenAI({
    vertexai: true,
    project: PROJECT,
    location: LOCATION,
  });
  return cached;
}

export interface RankingResult {
  destinationId: string;
  score: number; // 0..1
  reasoning: string;
}

/**
 * Rank the caller's destinations against their intention set using Gemini.
 *
 * `model: 'flash'` is the default — sub-second latency, sufficient accuracy
 * for chip-weight ranking. Use `'pro'` for deeper multi-factor reasoning
 * (e.g., cross-referencing vibe descriptors with intentions phrased abstractly).
 */
export async function rankDestinations(args: {
  destinations: Destination[];
  intentions: Intention[];
  model?: 'flash' | 'pro';
  maxResults?: number;
}): Promise<RankingResult[]> {
  const { destinations, intentions, model = 'flash', maxResults = 10 } = args;
  if (intentions.length === 0 || destinations.length === 0) return [];

  const prompt = buildRankingPrompt(destinations, intentions);
  const modelId = model === 'pro' ? PRO_MODEL : FLASH_MODEL;

  const response = await client().models.generateContent({
    model: modelId,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            destinationId: { type: 'string' },
            score: { type: 'number' },
            reasoning: { type: 'string' },
          },
          required: ['destinationId', 'score', 'reasoning'],
        },
      },
    },
  });

  const text = response.text;
  if (!text) return [];

  try {
    const parsed = JSON.parse(text) as RankingResult[];
    return parsed
      .filter(
        (r) =>
          typeof r.destinationId === 'string' &&
          typeof r.score === 'number' &&
          r.score >= 0 &&
          r.score <= 1,
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  } catch (err) {

    console.error('[destinations-ai/vertex] ranking parse failed', err, { text });
    return [];
  }
}

function buildRankingPrompt(
  destinations: Destination[],
  intentions: Intention[],
): string {
  const weightedIntentions = intentions
    .map((i) => `- "${i.phrase}" (weight ${i.weight.toFixed(2)})`)
    .join('\n');

  const destinationLines = destinations
    .map((d) => {
      const pulse = d.pulse;
      const vibes = pulse.vibeDescriptors.join(', ');
      const price = d.medianHomePrice != null ? `$${d.medianHomePrice.toLocaleString()}` : 'n/a';
      return `- id=${d.destinationId} | ${d.name} (${d.region}, ${d.state}) | price ${price} | walk ${pulse.walkScore ?? 'n/a'}/100 | schools ${pulse.schoolRating ?? 'n/a'}/10 | vibes: ${vibes}`;
    })
    .join('\n');

  return `You are a ranking engine for ACHIEVEMOR Destinations AI. The user has expressed a weighted set of natural-language intentions about where they want to live. Score each destination 0.0–1.0 on how well it matches the intention set, weighted by each intention's weight. Return JSON array.

INTENTIONS (weighted):
${weightedIntentions}

DESTINATIONS:
${destinationLines}

For each destination, return { destinationId, score, reasoning }. Keep reasoning under 140 characters. Scores must be comparable across destinations — reserve 0.9+ for exceptional matches, 0.5–0.7 for partial matches, below 0.4 for poor fits. Do not invent destinations. Do not include commentary outside the JSON.`;
}
