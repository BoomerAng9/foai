/**
 * Per|Form for Podcasters — Plan Tiers & Feature Gates
 *
 * Nothing is free. BMC $7 entry is the floor.
 * Billing: Paperform payment forms → Stripe (acct_1TKytyBGyeSI9qMt)
 * Webhook: Paperform → n8n (vps2) → POST /api/podcasters/upgrade-plan
 */

export type PlanTier = 'bmc' | 'premium' | 'bucket_list' | 'lfg';

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
  maxEpisodePackages: number;
  hawkScrapesPerMonth: number;
  dailyBriefing: boolean;
  guestResearch: boolean;
  sponsorScan: boolean;
  clipsPerEpisode: number;
}

export const PLAN_FEATURES: Record<PlanTier, PlanConfig> = {
  bmc: {
    name: 'BMC',
    description: 'War Room access. 1 episode package per cycle. Token-based extras.',
    warRoom: true,
    workbench: true,
    distribution: false,
    customHawks: false,
    whiteLabel: false,
    maxScriptsPerMonth: 5,
    maxClipsPerMonth: 3,
    maxEpisodePackages: 1,
    hawkScrapesPerMonth: 0,
    dailyBriefing: false,
    guestResearch: false,
    sponsorScan: false,
    clipsPerEpisode: 0,
  },
  premium: {
    name: 'Premium',
    description: 'Full production pipeline. Daily briefing. 3 clips per episode.',
    warRoom: true,
    workbench: true,
    distribution: true,
    customHawks: false,
    whiteLabel: false,
    maxScriptsPerMonth: 100,
    maxClipsPerMonth: 50,
    maxEpisodePackages: 4,
    hawkScrapesPerMonth: 0,
    dailyBriefing: true,
    guestResearch: false,
    sponsorScan: false,
    clipsPerEpisode: 3,
  },
  bucket_list: {
    name: 'Bucket List',
    description: 'Everything + guest research, analytics, sponsor scan. 5 clips per episode.',
    warRoom: true,
    workbench: true,
    distribution: true,
    customHawks: true,
    whiteLabel: false,
    maxScriptsPerMonth: -1,
    maxClipsPerMonth: -1,
    maxEpisodePackages: 8,
    hawkScrapesPerMonth: 50,
    dailyBriefing: true,
    guestResearch: true,
    sponsorScan: true,
    clipsPerEpisode: 5,
  },
  lfg: {
    name: 'LFG',
    description: 'Unlimited. White-label. Custom data feeds. API access.',
    warRoom: true,
    workbench: true,
    distribution: true,
    customHawks: true,
    whiteLabel: true,
    maxScriptsPerMonth: -1,
    maxClipsPerMonth: -1,
    maxEpisodePackages: -1,
    hawkScrapesPerMonth: -1,
    dailyBriefing: true,
    guestResearch: true,
    sponsorScan: true,
    clipsPerEpisode: -1,
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
  return PLAN_FEATURES[tier] || PLAN_FEATURES.bmc;
}

export function isUnlimited(tier: PlanTier, feature: 'maxScriptsPerMonth' | 'maxClipsPerMonth' | 'hawkScrapesPerMonth' | 'maxEpisodePackages' | 'clipsPerEpisode'): boolean {
  return (PLAN_FEATURES[tier]?.[feature] ?? 0) === -1;
}
