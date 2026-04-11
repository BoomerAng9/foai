/**
 * Personality & Identity Enrichment Service
 *
 * Single interface behind 4 commercial providers:
 * Crystal Knows (DISC), Humantic AI (Big Five + DISC),
 * Receptiviti (200+ psych signals), Sentino (Big Five/NEO/HEXACO/DISC).
 *
 * Lil_API_Hawk calls this — provider-agnostic at the Hawk level.
 * All secrets in GCP Secret Manager, env vars for Cloud Run.
 */

import { enrichWithCrystal } from './providers/crystal';
import { enrichWithHumantic } from './providers/humantic';
import { enrichWithReceptiviti } from './providers/receptiviti';
import { enrichWithSentino } from './providers/sentino';

export type PersonalityProvider = 'crystal' | 'humantic' | 'receptiviti' | 'sentino';

export interface PersonalityEnrichmentInput {
  personId: string;
  email?: string;
  linkedinUrl?: string;
  textCorpus?: string;
}

export interface PersonalityProfile {
  bigFive?: Record<string, number>;
  disc?: { type: string; scores: Record<string, number> };
  traits?: Record<string, number>;
  provider: PersonalityProvider;
  raw: unknown;
  createdAt: string;
}

export const PersonalityService = {
  async enrichWith(
    provider: PersonalityProvider,
    input: PersonalityEnrichmentInput,
  ): Promise<PersonalityProfile | null> {
    switch (provider) {
      case 'crystal':     return enrichWithCrystal(input);
      case 'humantic':    return enrichWithHumantic(input);
      case 'receptiviti': return enrichWithReceptiviti(input);
      case 'sentino':     return enrichWithSentino(input);
    }
  },

  async enrichWithAll(
    input: PersonalityEnrichmentInput,
    providers: PersonalityProvider[] = ['crystal', 'humantic', 'receptiviti', 'sentino'],
  ): Promise<Map<PersonalityProvider, PersonalityProfile | null>> {
    const results = new Map<PersonalityProvider, PersonalityProfile | null>();
    const settled = await Promise.allSettled(
      providers.map(async (p) => {
        const profile = await PersonalityService.enrichWith(p, input);
        return { provider: p, profile };
      }),
    );
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.set(result.value.provider, result.value.profile);
      }
    }
    return results;
  },
};
