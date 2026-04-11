/**
 * Receptiviti adapter — 200+ psycholinguistic signals, Big Five, DISC.
 * Input: any language data (transcripts, emails, chats, social posts).
 * Requires key + secret auth.
 */

import type { PersonalityEnrichmentInput, PersonalityProfile } from '../service';

export async function enrichWithReceptiviti(
  input: PersonalityEnrichmentInput,
): Promise<PersonalityProfile | null> {
  if (!input.textCorpus) return null;

  const apiKey = process.env.RECEPTIVITI_API_KEY;
  const apiSecret = process.env.RECEPTIVITI_API_SECRET;
  const base = process.env.RECEPTIVITI_API_BASE ?? 'https://api.receptiviti.com';

  if (!apiKey || !apiSecret) return null;

  const response = await fetch(`${base}/v1/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      'X-API-Secret': apiSecret,
    },
    body: JSON.stringify({ content: input.textCorpus }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) return null;

  const raw = await response.json();

  return {
    provider: 'receptiviti',
    bigFive: raw.personality?.big5 ?? undefined,
    disc: raw.personality?.disc ?? undefined,
    traits: raw.scores ?? {},
    raw,
    createdAt: new Date().toISOString(),
  };
}
