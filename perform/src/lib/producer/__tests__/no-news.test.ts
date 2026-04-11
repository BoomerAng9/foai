import { describe, it, expect } from 'vitest';
import { generateNoNewsNotice, isNoNewsDay, generateLowActivityNotice } from '../no-news';

describe('No News Protocol', () => {
  it('detects no-news day when items array is empty', () => {
    expect(isNoNewsDay([])).toBe(true);
  });

  it('detects news day when items exist', () => {
    expect(isNoNewsDay([{ headline: 'Trade', summary: '', sourceUrl: '', sourceName: '', publishedAt: '', relevanceTag: '', verified: true }])).toBe(false);
  });

  it('generates a timestamped notice with team name', () => {
    const notice = generateNoNewsNotice('NY Giants', '2026-04-11T05:00:00Z');
    expect(notice).toContain('NY Giants');
    expect(notice).toContain('No significant developments');
    expect(notice).toContain('Monitoring continues');
    expect(notice).not.toContain('{{');
    expect(notice).not.toContain('TBD');
  });

  it('includes last check timestamp', () => {
    const notice = generateNoNewsNotice('Colorado Buffaloes', '2026-04-11T04:30:00Z');
    expect(notice).toContain('April');
    expect(notice).toContain('2026');
  });

  it('never pads with filler content', () => {
    const notice = generateNoNewsNotice('NY Giants', '2026-04-11T05:00:00Z');
    expect(notice.length).toBeLessThan(500);
    expect(notice).not.toContain('lorem');
    expect(notice).not.toContain('Meanwhile');
    expect(notice).not.toContain('In other news');
  });

  it('generates low activity notice with correct count', () => {
    expect(generateLowActivityNotice('NY Giants', 1)).toContain('1 minor update.');
    expect(generateLowActivityNotice('NY Giants', 3)).toContain('3 minor updates.');
  });
});
