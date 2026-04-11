/**
 * Humantic AI adapter — Big Five + DISC + workplace behavioral factors.
 * Input: LinkedIn URL, email, document, or 300+ words text.
 */

import type { PersonalityEnrichmentInput, PersonalityProfile } from '../service';

export async function enrichWithHumantic(
  input: PersonalityEnrichmentInput,
): Promise<PersonalityProfile | null> {
  const apiKey = process.env.HUMANTIC_API_KEY;
  const base = process.env.HUMANTIC_API_BASE ?? 'https://api.humantic.ai';

  if (!apiKey) return null;

  const payload: Record<string, string> = {};
  if (input.linkedinUrl) payload.linkedin_profile_url = input.linkedinUrl;
  if (input.email) payload.email = input.email;
  if (!payload.linkedin_profile_url && !payload.email && input.textCorpus) {
    payload.text = input.textCorpus;
  }
  if (Object.keys(payload).length === 0) return null;

  const response = await fetch(`${base}/v1/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) return null;

  const raw = await response.json();

  return {
    provider: 'humantic',
    bigFive: raw.big_five ?? raw.big5 ?? undefined,
    disc: raw.disc ?? undefined,
    traits: raw.traits ?? {},
    raw,
    createdAt: new Date().toISOString(),
  };
}
