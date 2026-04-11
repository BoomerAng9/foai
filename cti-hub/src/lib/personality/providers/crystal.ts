/**
 * Crystal Knows adapter — DISC profiles + communication playbooks.
 * Input: email, LinkedIn URL, or 300+ words text.
 */

import type { PersonalityEnrichmentInput, PersonalityProfile } from '../service';

export async function enrichWithCrystal(
  input: PersonalityEnrichmentInput,
): Promise<PersonalityProfile | null> {
  const apiKey = process.env.CRYSTAL_API_KEY;
  const base = process.env.CRYSTAL_API_BASE ?? 'https://developers.crystalknows.com';

  if (!apiKey) return null;

  let response: Response;

  if (input.email || input.linkedinUrl) {
    const payload: Record<string, string> = {};
    if (input.email) payload.email = input.email;
    if (input.linkedinUrl) payload.linkedin = input.linkedinUrl;

    response = await fetch(`${base}/v1/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });
  } else if (input.textCorpus) {
    response = await fetch(`${base}/v1/text-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({ text: input.textCorpus }),
      signal: AbortSignal.timeout(30_000),
    });
  } else {
    return null;
  }

  if (!response.ok) return null;

  const raw = await response.json();
  const disc = raw.disc ?? raw.personality ?? undefined;

  return {
    provider: 'crystal',
    disc: disc ? { type: disc.type, scores: disc.scores } : undefined,
    raw,
    createdAt: new Date().toISOString(),
  };
}
