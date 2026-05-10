/**
 * Per|Form tier definitions + limits (SHIP-CHECKLIST Gate 4 · Item 23).
 *
 * Tiers mirror the AIMS pricing-matrix taxonomy. Per|Form-specific limits
 * live here (rather than in the matrix) because what counts as "a heavy
 * action" is Per|Form-domain-specific — draft simulations, voice gens,
 * image gens — and tier-limits keyed to those would bloat the matrix.
 *
 * The matrix stays the source-of-truth for *pricing*; this file is the
 * source-of-truth for *enforcement*.
 */

export type Tier = 'free' | 'standard' | 'premium' | 'flagship';

export interface TierLimits {
  tier: Tier;
  /** Max draft simulations per rolling 24 hours. -1 = unlimited. */
  drafts_per_day: number;
  /** Max voice generations per day. -1 = unlimited. */
  voice_per_day: number;
  /** Max image generations per day. -1 = unlimited. */
  images_per_day: number;
  /** Max /api/tie/submit calls per day. -1 = unlimited. */
  tie_submits_per_day: number;
  /** Middleware cost-heavy rate-limit multiplier (baseline = 1x free). */
  rate_multiplier: number;
  /** Human label for UI / audit. */
  label: string;
}

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: {
    tier: 'free',
    drafts_per_day: 1,
    voice_per_day: 2,
    images_per_day: 3,
    tie_submits_per_day: 3,
    rate_multiplier: 1,
    label: 'Free',
  },
  standard: {
    tier: 'standard',
    drafts_per_day: 10,
    voice_per_day: 20,
    images_per_day: 30,
    tie_submits_per_day: 25,
    rate_multiplier: 3,
    label: 'Standard',
  },
  premium: {
    tier: 'premium',
    drafts_per_day: -1,
    voice_per_day: -1,
    images_per_day: -1,
    tie_submits_per_day: -1,
    rate_multiplier: 10,
    label: 'Premium (Unlimited)',
  },
  flagship: {
    tier: 'flagship',
    drafts_per_day: -1,
    voice_per_day: -1,
    images_per_day: -1,
    tie_submits_per_day: -1,
    rate_multiplier: 50,
    label: 'Flagship (Enterprise)',
  },
};

export type ActionKey =
  | 'drafts_per_day'
  | 'voice_per_day'
  | 'images_per_day'
  | 'tie_submits_per_day';

/**
 * Checks whether a given tier is within its daily cap for an action. The
 * `currentUsage` is expected to be pulled by the caller from usage logs
 * (pipeline_runs, voice_logs, image_generations, perform_submissions).
 * Keeping that read out of this module avoids a circular DB dep and lets
 * individual call-sites pick the right bucket for their action.
 */
export function checkTierLimit(
  tier: Tier,
  action: ActionKey,
  currentUsage: number,
): { allowed: boolean; cap: number; remaining: number; reason?: string } {
  const limits = TIER_LIMITS[tier];
  const cap = limits[action];

  if (cap === -1) {
    return { allowed: true, cap: -1, remaining: -1 };
  }
  if (currentUsage >= cap) {
    return {
      allowed: false,
      cap,
      remaining: 0,
      reason: `Daily limit of ${cap} ${action.replace(/_/g, ' ')} reached on the ${limits.label} tier. Upgrade for more.`,
    };
  }
  return { allowed: true, cap, remaining: cap - currentUsage };
}
