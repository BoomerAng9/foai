/**
 * Sentino adapter — Big Five, NEO-PI, HEXACO, DISC (~250 traits).
 * Input: any authored text (tweets, blogs, emails, resumes, calls).
 * IBM Watson Personality Insights replacement.
 */

import type { PersonalityEnrichmentInput, PersonalityProfile } from '../service';

export async function enrichWithSentino(
  input: PersonalityEnrichmentInput,
): Promise<PersonalityProfile | null> {
  if (!input.textCorpus) return null;

  const apiKey = process.env.SENTINO_API_KEY;
  const base = process.env.SENTINO_API_BASE ?? 'https://api.sentino.org/api';

  if (!apiKey) return null;

  const response = await fetch(`${base}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify({ text: input.textCorpus }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) return null;

  const raw = await response.json();

  return {
    provider: 'sentino',
    bigFive: raw.big5 ?? raw.big_five ?? undefined,
    disc: raw.disc ?? undefined,
    traits: raw.traits ?? {},
    raw,
    createdAt: new Date().toISOString(),
  };
}
