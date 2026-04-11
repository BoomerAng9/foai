import { describe, it, expect } from 'vitest';
import { assembleBriefing } from '../briefing-assembler';
import type { NewsItem } from '../types';

const sampleItems: NewsItem[] = [
  {
    headline: 'Giants trade up to #3 pick',
    summary: 'New York Giants have agreed to trade up to the #3 overall pick in the 2026 NFL Draft.',
    sourceUrl: 'https://espn.com/nfl/story/123',
    sourceName: 'ESPN',
    publishedAt: '2026-04-11T02:30:00Z',
    relevanceTag: 'NY Giants',
    verified: true,
  },
  {
    headline: 'Daniel Jones minicamp clearance',
    summary: 'QB Daniel Jones has been cleared for full participation in upcoming minicamp.',
    sourceUrl: 'https://nj.com/giants/456',
    sourceName: 'NJ.com',
    publishedAt: '2026-04-10T18:00:00Z',
    relevanceTag: 'NY Giants',
    verified: true,
  },
];

describe('assembleBriefing', () => {
  it('assembles study format from news items', () => {
    const result = assembleBriefing(42, 'NY Giants', sampleItems);
    expect(result.hasNews).toBe(true);
    expect(result.studyContent).toContain('Giants trade up');
    expect(result.studyContent).toContain('Daniel Jones');
    expect(result.sourcesUsed).toBe(2);
    expect(result.verifiedClaims).toBe(2);
  });

  it('assembles commercial format with cleaner presentation', () => {
    const result = assembleBriefing(42, 'NY Giants', sampleItems);
    expect(result.commercialContent).toContain('Giants');
    expect(result.commercialContent.length).toBeGreaterThan(0);
  });

  it('returns no-news briefing when items empty', () => {
    const result = assembleBriefing(42, 'NY Giants', []);
    expect(result.hasNews).toBe(false);
    expect(result.noNewsNotice).toContain('No significant developments');
    expect(result.items).toHaveLength(0);
  });

  it('counts verified vs unverified claims', () => {
    const mixed: NewsItem[] = [
      { ...sampleItems[0], verified: true },
      { ...sampleItems[1], verified: false },
    ];
    const result = assembleBriefing(42, 'NY Giants', mixed);
    expect(result.verifiedClaims).toBe(1);
    expect(result.unverifiedClaims).toBe(1);
  });

  it('includes source attribution in study format', () => {
    const result = assembleBriefing(42, 'NY Giants', sampleItems);
    expect(result.studyContent).toContain('ESPN');
    expect(result.studyContent).toContain('NJ.com');
  });
});
