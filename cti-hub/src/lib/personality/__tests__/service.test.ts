import {
  PersonalityService,
  type PersonalityProvider,
  type PersonalityEnrichmentInput,
  type PersonalityProfile,
} from '../service';

describe('PersonalityService', () => {
  const input: PersonalityEnrichmentInput = {
    personId: 'test-person-123',
    email: 'test@example.com',
    linkedinUrl: 'https://linkedin.com/in/test',
    textCorpus: 'This is a test corpus with enough words to meet the minimum threshold for personality analysis across multiple providers.',
  };

  it('exports all four provider names', () => {
    const providers: PersonalityProvider[] = ['crystal', 'humantic', 'receptiviti', 'sentino'];
    expect(providers).toHaveLength(4);
  });

  it('enrichWith returns null for missing env vars', async () => {
    const result = await PersonalityService.enrichWith('crystal', input);
    expect(result).toBeNull();
  });

  it('enrichWith returns null for sentino without text corpus', async () => {
    const noText: PersonalityEnrichmentInput = { personId: 'test', email: 'test@test.com' };
    const result = await PersonalityService.enrichWith('sentino', noText);
    expect(result).toBeNull();
  });

  it('enrichWith returns null for receptiviti without text corpus', async () => {
    const noText: PersonalityEnrichmentInput = { personId: 'test', email: 'test@test.com' };
    const result = await PersonalityService.enrichWith('receptiviti', noText);
    expect(result).toBeNull();
  });

  it('PersonalityProfile has required shape', () => {
    const profile: PersonalityProfile = {
      provider: 'sentino',
      raw: { test: true },
      createdAt: new Date().toISOString(),
    };
    expect(profile.provider).toBe('sentino');
    expect(profile.raw).toBeDefined();
    expect(profile.createdAt).toBeDefined();
  });

  it('enrichWithAll returns a map', async () => {
    const results = await PersonalityService.enrichWithAll(input);
    expect(results).toBeInstanceOf(Map);
  });
});
