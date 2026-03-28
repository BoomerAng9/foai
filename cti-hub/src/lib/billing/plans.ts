export interface PlanFeature {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  highlight?: boolean;
  priceId: string | null;
}

export const PLAN_CONFIG: Record<'free' | 'pro' | 'enterprise', PlanFeature> = {
  free: {
    name: 'Starter',
    price: '$0',
    period: 'forever',
    features: [
      '3 TLI Data Sources',
      '10 Research Queries / day',
      '1 Agent Instance',
      '50 MB Storage',
    ],
    cta: 'Current Plan',
    priceId: null,
  },
  pro: {
    name: 'Pro',
    price: '$29',
    period: '/month',
    features: [
      '50 TLI Data Sources',
      '500 Research Queries / day',
      '10 Agent Instances',
      '5 GB Storage',
      'Deep Research Mode',
      'Custom Model Selection',
    ],
    cta: 'Upgrade to Pro',
    highlight: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || null,
  },
  enterprise: {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    features: [
      'Unlimited Sources',
      'Unlimited Queries',
      'Unlimited Agents',
      'Unlimited Storage',
      'Deep Research Mode',
      'Custom Models',
      'Priority Support',
      'SLA Guarantee',
    ],
    cta: 'Contact Sales',
    priceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID || null,
  },
};

export function getStripePriceId(plan: string) {
  if (!(plan in PLAN_CONFIG)) {
    return null;
  }

  return PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG].priceId || null;
}

export function determinePlanFromPriceId(priceId?: string | null) {
  if (!priceId) {
    return 'free' as const;
  }

  for (const [planKey, config] of Object.entries(PLAN_CONFIG)) {
    if (config.priceId && config.priceId === priceId) {
      return planKey as keyof typeof PLAN_CONFIG;
    }
  }

  if (priceId.includes('enterprise')) {
    return 'enterprise' as const;
  }

  if (priceId.includes('pro')) {
    return 'pro' as const;
  }

  return 'free' as const;
}
