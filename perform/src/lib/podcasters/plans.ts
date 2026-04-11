/**
 * Per|Form for Podcasters — Plan Tiers & Feature Gates
 *
 * Billing: Paperform payment forms → Stripe (acct_1TKytyBGyeSI9qMt)
 * Webhook: Paperform → n8n (vps2) → POST /api/podcasters/upgrade-plan
 */

export type PlanTier = 'free' | 'bmc' | 'premium' | 'bucket_list' | 'lfg';

export interface PlanConfig {
  name: string;
  description: string;
  warRoom: boolean;
  workbench: boolean;
  distribution: boolean;
  customHawks: boolean;
  whiteLabel: boolean;
  maxScriptsPerMonth: number;
  maxClipsPerMonth: number;
  hawkScrapesPerMonth: number;
}

export const PLAN_FEATURES: Record<PlanTier, PlanConfig> = {
  free: {
    name: 'Free Trial',
    description: 'Explore the War Room — see what your team data looks like.',
    warRoom: true,
    workbench: false,
    distribution: false,
    customHawks: false,
    whiteLabel: false,
    maxScriptsPerMonth: 0,
    maxClipsPerMonth: 0,
    hawkScrapesPerMonth: 0,
  },
  bmc: {
    name: 'BMC',
    description: 'War Room + Workbench. Write scripts, prep shows.',
    warRoom: true,
    workbench: true,
    distribution: false,
    customHawks: false,
    whiteLabel: false,
    maxScriptsPerMonth: 20,
    maxClipsPerMonth: 10,
    hawkScrapesPerMonth: 0,
  },
  premium: {
    name: 'Premium',
    description: 'Full creation-to-distribution pipeline.',
    warRoom: true,
    workbench: true,
    distribution: true,
    customHawks: false,
    whiteLabel: false,
    maxScriptsPerMonth: 100,
    maxClipsPerMonth: 50,
    hawkScrapesPerMonth: 0,
  },
  bucket_list: {
    name: 'Bucket List',
    description: 'Everything + custom Hawks data squadrons.',
    warRoom: true,
    workbench: true,
    distribution: true,
    customHawks: true,
    whiteLabel: false,
    maxScriptsPerMonth: -1, // unlimited
    maxClipsPerMonth: -1,
    hawkScrapesPerMonth: 50,
  },
  lfg: {
    name: 'LFG',
    description: 'Full white-label. Your brand, your platform.',
    warRoom: true,
    workbench: true,
    distribution: true,
    customHawks: true,
    whiteLabel: true,
    maxScriptsPerMonth: -1,
    maxClipsPerMonth: -1,
    hawkScrapesPerMonth: -1, // unlimited
  },
};

export function hasFeature(tier: PlanTier, feature: keyof PlanConfig): boolean {
  const plan = PLAN_FEATURES[tier];
  if (!plan) return false;
  const val = plan[feature];
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  return !!val;
}

export function getPlanConfig(tier: PlanTier): PlanConfig {
  return PLAN_FEATURES[tier] || PLAN_FEATURES.free;
}

export function isUnlimited(tier: PlanTier, feature: 'maxScriptsPerMonth' | 'maxClipsPerMonth' | 'hawkScrapesPerMonth'): boolean {
  return (PLAN_FEATURES[tier]?.[feature] ?? 0) === -1;
}
