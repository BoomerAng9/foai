/**
 * Subscription Tiers — The Deploy Platform
 *
 * PRELIMINARY PRICING — not final.
 * Commitment windows: 3-month, 6-month, 9-month (longer = better rate)
 *
 * Model access gated per tier:
 * - Pay-per-use: free models only, pay for premium
 * - Lower tiers: free + cheap models
 * - Higher tiers: all models including premium
 */

export type TierSlug = 'pay-per-use' | 'starter' | 'growth' | 'enterprise';
export type CommitmentWindow = '3-month' | '6-month' | '9-month';

export interface SubscriptionTier {
  slug: TierSlug;
  name: string;
  tagline: string;
  entryPrice: number;          // One-time entry fee (pay-per-use only)
  monthlyPrices: Record<CommitmentWindow, number>;
  features: string[];
  agents: string[];            // Which agents are accessible
  models: string[];            // Which model tiers
  tokenAllocation: number;     // Monthly tokens included (-1 = unlimited)
  nurdCardIncluded: boolean;
  nftMintIncluded: boolean;
  color: string;
}

export const TIERS: SubscriptionTier[] = [
  {
    slug: 'pay-per-use',
    name: 'Buy Me a Coffee',
    tagline: 'The price of a mint tea coconut latte gets you in the door.',
    entryPrice: 7,
    monthlyPrices: { '3-month': 0, '6-month': 0, '9-month': 0 }, // No monthly — pay as you go
    features: [
      'Platform access',
      'Starting token package',
      'Pay for what you use',
      'Free-tier models',
      'Chat w/ ACHEEVY',
      'Smart Translate — say it plain, we build it right',
    ],
    agents: ['core'],
    models: ['free-tier'],
    tokenAllocation: 50000, // Starting package
    nurdCardIncluded: false,
    nftMintIncluded: false,
    color: '#6B7280',
  },
  {
    slug: 'starter',
    name: 'Starter',
    tagline: 'For solo builders who want ACHEEVY on their team.',
    entryPrice: 0,
    monthlyPrices: { '3-month': 47, '6-month': 39, '9-month': 33 },
    features: [
      'Everything in Pay-per-use',
      '3 Department Leads (Research, Content, Education)',
      'Standard models',
      'Grammar engine',
      'Voice replies',
      '500K tokens/month',
      'NURD profile card',
    ],
    agents: ['core', 'starter-leads'],
    models: ['standard-tier'],
    tokenAllocation: 500000,
    nurdCardIncluded: true,
    nftMintIncluded: true, // First mint free
    color: '#3B82F6',
  },
  {
    slug: 'growth',
    name: 'Growth',
    tagline: 'Full agent fleet. Premium models. Built to scale.',
    entryPrice: 0,
    monthlyPrices: { '3-month': 147, '6-month': 127, '9-month': 109 },
    features: [
      'Everything in Starter',
      'All 5 Department Leads',
      'Full tactical team',
      'Premium intelligence models',
      'MCP Gateway access',
      'Deep Research',
      '2M tokens/month',
      'Priority routing',
    ],
    agents: ['core', 'all-leads', 'full-tactical'],
    models: ['premium-tier'],
    tokenAllocation: 2000000,
    nurdCardIncluded: true,
    nftMintIncluded: true,
    color: '#22C55E',
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    tagline: 'Unlimited. Custom agents. Dedicated instance. White-label.',
    entryPrice: 0,
    monthlyPrices: { '3-month': 497, '6-month': 447, '9-month': 397 },
    features: [
      'Everything in Growth',
      'Unlimited tokens',
      'Custom agents',
      'Dedicated instance',
      'White-label branding',
      'Sandbox deployments',
      'Autonomous agent personas',
      'Priority support',
      'Custom domain',
    ],
    agents: ['*'], // All
    models: ['*'], // All
    tokenAllocation: -1, // Unlimited
    nurdCardIncluded: true,
    nftMintIncluded: true,
    color: '#E8A020',
  },
];

/**
 * Owner tier — unlimited everything, bypasses all tier checks.
 * ACHEEVY's credentials never get gated.
 */
export const OWNER_TIER: SubscriptionTier = {
  slug: 'enterprise',
  name: 'ACHEEVY (Owner)',
  tagline: 'Unlimited. Everything. Always.',
  entryPrice: 0,
  monthlyPrices: { '3-month': 0, '6-month': 0, '9-month': 0 },
  features: ['*'],
  agents: ['*'],
  models: ['*'],
  tokenAllocation: -1,
  nurdCardIncluded: true,
  nftMintIncluded: true,
  color: '#E8A020',
};

export function getTierBySlug(slug: TierSlug): SubscriptionTier | undefined {
  return TIERS.find(t => t.slug === slug);
}

export function getMonthlyPrice(tier: SubscriptionTier, window: CommitmentWindow): number {
  return tier.monthlyPrices[window];
}

export function getAnnualSavings(tier: SubscriptionTier, window: CommitmentWindow): number {
  const monthly3 = tier.monthlyPrices['3-month'];
  const actual = tier.monthlyPrices[window];
  if (monthly3 === 0 || actual === 0) return 0;
  return Math.round(((monthly3 - actual) / monthly3) * 100);
}
