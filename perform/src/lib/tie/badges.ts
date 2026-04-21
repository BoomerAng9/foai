/**
 * 2K-style badge tiers derived from attribute ratings.
 * Bronze 80-84 · Silver 85-89 · Gold 90-94 · Hall of Fame 95-99.
 * Badges are derived — never stored as source of truth. They're cached
 * on perform_players.attribute_badges for fast card rendering.
 */

import type { BadgeTier, AttributeDef } from './attributes';
import { getAttribute } from './attributes';

export interface Badge {
  code: string;            // e.g., "SPD_hof"
  attributeCode: string;   // "SPD"
  attributeLabel: string;  // "Speed"
  tier: BadgeTier;
  rating: number;          // the actual 0-99 rating that earned it
}

export function ratingToTier(rating: number): BadgeTier | null {
  if (rating >= 95) return 'hof';
  if (rating >= 90) return 'gold';
  if (rating >= 85) return 'silver';
  if (rating >= 80) return 'bronze';
  return null;
}

export function deriveBadges(ratings: Record<string, number>): Badge[] {
  const badges: Badge[] = [];
  for (const [code, rating] of Object.entries(ratings)) {
    if (typeof rating !== 'number' || !Number.isFinite(rating)) continue;
    const tier = ratingToTier(rating);
    if (!tier) continue;
    const def = getAttribute(code);
    if (!def) continue;
    badges.push({
      code: `${code}_${tier}`,
      attributeCode: code,
      attributeLabel: def.label,
      tier,
      rating,
    });
  }
  // HoF first, then Gold, Silver, Bronze — sort for stable display.
  const tierOrder: Record<BadgeTier, number> = { hof: 0, gold: 1, silver: 2, bronze: 3 };
  badges.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier] || b.rating - a.rating);
  return badges;
}

export const BADGE_TIER_COLORS: Record<BadgeTier, { fg: string; bg: string; border: string }> = {
  hof:    { fg: '#F4D47A', bg: 'rgba(244,212,122,0.18)', border: 'rgba(244,212,122,0.55)' }, // gold-leaf
  gold:   { fg: '#FFB27A', bg: 'rgba(255,178,122,0.14)', border: 'rgba(255,178,122,0.45)' }, // warm gold
  silver: { fg: '#D9DEE8', bg: 'rgba(217,222,232,0.10)', border: 'rgba(217,222,232,0.40)' }, // cool platinum
  bronze: { fg: '#C89C6B', bg: 'rgba(200,156,107,0.10)', border: 'rgba(200,156,107,0.40)' }, // bronze
};

export const BADGE_TIER_LABEL: Record<BadgeTier, string> = {
  hof: 'HOF',
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
};
