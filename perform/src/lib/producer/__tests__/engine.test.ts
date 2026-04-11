import { describe, it, expect } from 'vitest';
import { runDeliveryCycle, type PodcasterClient } from '../engine';
import type { NewsItem } from '../types';

const mockClient: PodcasterClient = {
  userId: 42,
  email: 'dash@bigdashknows.com',
  podcastName: 'BigDashKnows',
  team: 'NY Giants',
  vertical: 'NFL',
  tier: 'premium',
  deliveryPreferences: {
    interval: 'daily',
    deliveryTime: '05:00',
    timezone: 'America/New_York',
    emailDelivery: true,
    emailAddress: 'dash@bigdashknows.com',
    format: 'both',
    notificationChannels: ['email', 'dashboard'],
  },
};

const mockNews: NewsItem[] = [
  {
    headline: 'Giants sign free agent LB',
    summary: 'The New York Giants have signed a veteran linebacker to a two-year deal worth $12M.',
    sourceUrl: 'https://espn.com/nfl/story/789',
    sourceName: 'ESPN',
    publishedAt: '2026-04-11T03:00:00Z',
    relevanceTag: 'NY Giants',
    verified: true,
  },
];

describe('runDeliveryCycle', () => {
  it('returns a delivery result with grade', async () => {
    const result = await runDeliveryCycle(mockClient, {
      skipEmail: true,
      skipDashboard: true,
      mockNewsItems: mockNews,
    });
    expect(result.userId).toBe(42);
    expect(result.grade).toBeDefined();
    expect(result.briefingId).toMatch(/^BRF-/);
    expect(result.deliveredAt).toBeTruthy();
  });

  it('marks as shipped when grade >= B', async () => {
    const result = await runDeliveryCycle(mockClient, {
      skipEmail: true,
      skipDashboard: true,
      mockNewsItems: mockNews,
    });
    expect(result.shipped).toBe(true);
    expect(['S', 'A', 'B']).toContain(result.grade);
  });

  it('includes charter ID', async () => {
    const result = await runDeliveryCycle(mockClient, {
      skipEmail: true,
      skipDashboard: true,
      mockNewsItems: mockNews,
    });
    expect(result.charterId).toMatch(/^CHR-/);
  });

  it('handles no-news gracefully', async () => {
    const result = await runDeliveryCycle(mockClient, {
      skipEmail: true,
      skipDashboard: true,
      mockNewsItems: [],
    });
    expect(result.grade).toBeDefined();
    expect(result.briefingId).toMatch(/^BRF-/);
  });

  it('delivers to dashboard when not skipped', async () => {
    const result = await runDeliveryCycle(mockClient, {
      skipEmail: true,
      skipDashboard: false,
      mockNewsItems: mockNews,
    });
    if (result.shipped) {
      expect(result.deliveredVia).toContain('dashboard');
    }
  });
});
