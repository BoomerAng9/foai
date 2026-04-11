/**
 * Per|Form for Podcasters — Subscription Pricing
 *
 * Monthly subscription via Paperform + Stepper.
 * Nothing is free. $7 BMC is the floor.
 */

import type { PlanTier } from './plans';

export interface TierPricing {
  tier: PlanTier;
  monthly: number;
  tokenPackage: number;
}

export const TIER_PRICING: Record<PlanTier, TierPricing> = {
  bmc: {
    tier: 'bmc',
    monthly: 7,
    tokenPackage: 50000,
  },
  premium: {
    tier: 'premium',
    monthly: 47,
    tokenPackage: 0,
  },
  bucket_list: {
    tier: 'bucket_list',
    monthly: 87,
    tokenPackage: 0,
  },
  lfg: {
    tier: 'lfg',
    monthly: 147,
    tokenPackage: 0,
  },
};

export function getMonthlyPrice(tier: PlanTier): number {
  return TIER_PRICING[tier]?.monthly ?? 0;
}

export function getTokenPackage(tier: PlanTier): number {
  return TIER_PRICING[tier]?.tokenPackage ?? 0;
}
