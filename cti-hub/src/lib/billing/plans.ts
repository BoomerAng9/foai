export interface PlanFeature {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  highlight?: boolean;
  priceId: string | null;
  tier: string;
  tokenAllotment?: string;
  upcharge?: string;
}

export const PLAN_CONFIG: Record<string, PlanFeature> = {
  'pay-per-use': {
    name: 'Pay-Per-Use',
    price: '$5',
    period: 'entry fee',
    tier: 'pay-per-use',
    tokenAllotment: '50,000 tokens included',
    upcharge: '1.5x standard rate after allotment',
    features: [
      'Buy Me a Coffee entry — $5 gets you started',
      '50,000 tokens included with entry',
      'Full platform access — all features unlocked',
      'Test Premium, Bucket List, and LFG tiers',
      'Pay only for what you use after allotment',
      'Switch between execution tiers freely',
      'All Boomer_Angs and Lil_Hawks available',
      'Broad|Cast Studio access',
    ],
    cta: 'Get Started — $5',
    highlight: true,
    priceId: null, // Uses Stripe or Fiverr
  },
  premium: {
    name: 'Premium',
    price: '$19',
    period: '/month',
    tier: 'premium',
    tokenAllotment: '500,000 tokens/month',
    upcharge: 'Standard rate — no upcharge',
    features: [
      '500,000 tokens per month',
      'Standard rate — lowest cost per token',
      'Priority agent routing',
      'All Boomer_Angs + Chicken Hawk dispatch',
      'Broad|Cast Studio — full access',
      'Per|Form sports analytics',
      'Voice input/output',
      'Semantic memory across sessions',
    ],
    cta: 'Subscribe — $19/mo',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || null,
  },
  'bucket-list': {
    name: 'Bucket List',
    price: '$49',
    period: '/month',
    tier: 'bucket-list',
    tokenAllotment: '2,000,000 tokens/month',
    upcharge: 'Standard rate — no upcharge',
    features: [
      '2M tokens per month',
      'Premium model access (faster, smarter)',
      'Dedicated agent instances',
      'Video generation priority queue',
      '4K upscaling included',
      'Channel connections (Telegram, WhatsApp, Discord)',
      'Custom Boomer_Ang personas',
      'Priority support',
    ],
    cta: 'Subscribe — $49/mo',
    priceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID || null,
  },
  lfg: {
    name: 'LFG',
    price: '$99',
    period: '/month',
    tier: 'lfg',
    tokenAllotment: '10,000,000 tokens/month',
    upcharge: 'Standard rate — no upcharge',
    features: [
      '10M tokens per month',
      'Top-tier models for all operations',
      'Unlimited Broad|Cast renders',
      'Unlimited 4K upscaling',
      'All channel connections',
      'Custom Boomer_Ang training',
      'White-label aiPLUG deployment',
      'Dedicated infrastructure',
      'SLA guarantee',
    ],
    cta: 'Subscribe — $99/mo',
    priceId: null, // Contact or Stripe
  },
};

export function getStripePriceId(plan: string) {
  if (!(plan in PLAN_CONFIG)) return null;
  return PLAN_CONFIG[plan].priceId || null;
}

export function determinePlanFromPriceId(priceId?: string | null) {
  if (!priceId) return 'pay-per-use';
  for (const [planKey, config] of Object.entries(PLAN_CONFIG)) {
    if (config.priceId && config.priceId === priceId) return planKey;
  }
  return 'pay-per-use';
}
