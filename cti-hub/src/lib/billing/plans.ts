/**
 * Unified Credit Billing — The Deploy Platform
 *
 * 4 tiers: Pay Per Use (entry), Bucket List, Premium, LFG
 * Commitment windows: monthly, 3-month, 6-month, 9-month (9mo = full year value)
 * Credits refresh monthly on subscription tiers.
 */

export type PlanId = 'pay_per_use' | 'bucket_list' | 'premium' | 'lfg';
export type CommitmentWindow = 'monthly' | '3-month' | '6-month' | '9-month';

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  billing: 'one-time' | 'subscription';
  /** One-time price (pay_per_use only) */
  price?: number;
  /** Monthly prices by commitment window (subscription tiers) */
  price_monthly?: number;
  price_3mo?: number;
  price_6mo?: number;
  price_9mo?: number;
  credits: number;
  features: string[];
  color: string;
  recommended?: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  pay_per_use: {
    id: 'pay_per_use',
    name: 'Pay Per Use',
    price: 7,
    billing: 'one-time',
    description: 'One-time entry. Pay as you go.',
    credits: 50,
    features: [
      'Chat with ACHEEVY',
      'Basic agent access',
      'Plug Bin storage (1GB)',
    ],
    color: '#6B7280',
  },
  bucket_list: {
    id: 'bucket_list',
    name: 'Bucket List',
    billing: 'subscription',
    description: 'For solo builders getting started.',
    price_monthly: 29,
    price_3mo: 79,    // save ~9%
    price_6mo: 149,   // save ~14%
    price_9mo: 199,   // = 12 months (save ~43%)
    credits: 500,
    features: [
      'Everything in Pay Per Use',
      'All Boomer_Angs',
      'Broad|Cast Studio',
      '10GB storage',
      'Priority support',
    ],
    color: '#3B82F6',
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    billing: 'subscription',
    description: 'Full agent fleet. Built to scale.',
    price_monthly: 59,
    price_3mo: 159,
    price_6mo: 299,
    price_9mo: 399,
    credits: 2000,
    features: [
      'Everything in Bucket List',
      'All Lil_Hawks',
      'Video generation',
      '50GB storage',
      'API access',
      'White-label options',
    ],
    color: '#E8A020',
    recommended: true,
  },
  lfg: {
    id: 'lfg',
    name: 'LFG',
    billing: 'subscription',
    description: 'Unlimited. Custom agents. Full enterprise.',
    price_monthly: 149,
    price_3mo: 399,
    price_6mo: 749,
    price_9mo: 999,
    credits: 10000,
    features: [
      'Everything in Premium',
      'Unlimited agents',
      'Custom Boomer_Angs',
      '500GB storage',
      'Dedicated support',
      'Full white-label',
      'SLA',
    ],
    color: '#22C55E',
  },
};

export const PLAN_LIST: Plan[] = Object.values(PLANS);

/** Get effective per-month price for a commitment window */
export function getEffectiveMonthly(plan: Plan, window: CommitmentWindow): number {
  if (plan.billing === 'one-time') return 0;
  switch (window) {
    case 'monthly': return plan.price_monthly ?? 0;
    case '3-month': return Math.round((plan.price_3mo ?? 0) / 3);
    case '6-month': return Math.round((plan.price_6mo ?? 0) / 6);
    case '9-month': return Math.round((plan.price_9mo ?? 0) / 9);
  }
}

/** Get total price for a commitment window */
export function getTotalPrice(plan: Plan, window: CommitmentWindow): number {
  if (plan.billing === 'one-time') return plan.price ?? 0;
  switch (window) {
    case 'monthly': return plan.price_monthly ?? 0;
    case '3-month': return plan.price_3mo ?? 0;
    case '6-month': return plan.price_6mo ?? 0;
    case '9-month': return plan.price_9mo ?? 0;
  }
}

/** Calculate savings percentage vs monthly for a commitment window */
export function getSavingsPercent(plan: Plan, window: CommitmentWindow): number {
  if (plan.billing === 'one-time' || window === 'monthly') return 0;
  const monthly = plan.price_monthly ?? 0;
  if (monthly === 0) return 0;
  const months = window === '3-month' ? 3 : window === '6-month' ? 6 : 9;
  const total = getTotalPrice(plan, window);
  const wouldBe = monthly * months;
  return Math.round(((wouldBe - total) / wouldBe) * 100);
}

/** Kept for backward compat with stripe checkout/webhook routes */
export function getStripePriceId(_plan: string): string | null {
  // Stripe price IDs will be configured per plan+window in env
  const key = `NEXT_PUBLIC_STRIPE_${_plan.toUpperCase()}_PRICE_ID`;
  return (typeof process !== 'undefined' && process.env?.[key]) || null;
}

export function determinePlanFromPriceId(priceId?: string | null): string {
  if (!priceId) return 'pay_per_use';
  // Check env vars for matching price ID
  for (const planId of Object.keys(PLANS)) {
    const key = `NEXT_PUBLIC_STRIPE_${planId.toUpperCase()}_PRICE_ID`;
    if (typeof process !== 'undefined' && process.env?.[key] === priceId) return planId;
  }
  return 'pay_per_use';
}

// Re-export for consumers that import PlanFeature
export type PlanFeature = Plan;
export const PLAN_CONFIG = PLANS;
