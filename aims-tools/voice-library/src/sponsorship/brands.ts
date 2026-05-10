/**
 * @aims/voice-library/sponsorship — brand directory
 *
 * Cross-vertical brand catalog. Every FOAI vertical's brand is registered
 * here so any character (in any other vertical) can plug it in their voice
 * register. This is the cross-pollination engine: Per|Form analysts plug
 * Coastal Brewing on their podcasts; Coastal's Sal can plug Per|Form
 * analysts back; future verticals join the loop.
 *
 * Compliance hooks:
 *   - `approved_claims` are owner-attested, safe-to-read sentences
 *   - `attribution_required` is mandatory in every plug
 *   - `escalation_required_for` lists topic categories that must NOT be
 *     read without owner sign-off (legal, health, sourcing certs, etc.)
 */

export interface BrandIdentity {
  brand_id: string;
  display_name: string;
  vertical: 'coastal' | 'perform' | 'cti' | 'aims' | 'shared';
  url: string;
  positioning_one_liner: string;
  positioning_long: string;
  approved_claims: string[];
  approved_pitches: string[];
  attribution_required: string;
  forbidden_topics: string[];
  primary_call_to_action: string;
}

export interface ProductSku {
  sku_id: string;
  brand_id: string;
  display_name: string;
  description: string;
  approved_one_liners: string[];
  url: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Coastal Brewing Co.
// ─────────────────────────────────────────────────────────────────────────

export const COASTAL_BRAND: BrandIdentity = {
  brand_id: 'coastal',
  display_name: 'Coastal Brewing Co.',
  vertical: 'coastal',
  url: 'https://brewing.foai.cloud',
  positioning_one_liner: 'Nothing chemically, ever.',
  positioning_long:
    'Small-batch coffee, whole-leaf tea, ceremonial matcha — brewed honest, served by ACHEEVY. Sourced through verified partners. Every public claim has a paper trail.',
  approved_claims: [
    'small-batch',
    'whole-leaf tea',
    'ceremonial-grade matcha',
    'sourced through verified partners',
    'every public claim has a paper trail',
    'every cup is what the label says it is',
    'AI-managed Lowcountry brand',
  ],
  approved_pitches: [
    'For the porch-mornin\' cup, the Sumatra is the one — slow-roasted, low acid.',
    'The Ethiopia is bright and lean — cup of choice when the day needs a sharper edge.',
    'Whole-leaf tea, ceremonial-grade matcha, single-origin coffee. Nothing chemically, ever.',
    'Coastal Brewing — every cup is what the label says it is.',
  ],
  attribution_required: 'powered by ACHIEVEMOR',
  forbidden_topics: [
    'specific health claims (cardiovascular, weight loss, etc.)',
    'sourcing certificate IDs that haven\'t been refreshed in the current batch',
    'comparisons against named competitors',
    'allergen claims without a current attestation in the audit chain',
  ],
  primary_call_to_action: 'brewing.foai.cloud',
};

// ─────────────────────────────────────────────────────────────────────────
// Per|Form
// ─────────────────────────────────────────────────────────────────────────

export const PERFORM_BRAND: BrandIdentity = {
  brand_id: 'perform',
  display_name: 'Per|Form',
  vertical: 'perform',
  url: 'https://perform.foai.cloud',
  positioning_one_liner: 'Sports talent intelligence, called by analysts who know the realm.',
  positioning_long:
    'Per|Form grades, scouts, and tells the story of every athlete on the rise. The analysts (Void-Caster, Bun-E, Haze, Smoke, the Colonel, Astra) call it in their own register, with their own eyes — but the data underneath is the same disciplined grading system.',
  approved_claims: [
    'analyst-driven athlete grading',
    'NIL playbook references',
    'projected-round + legacy-tier blended scoring',
    '2,431 graded prospects in the 2026 class',
    'AI-managed sports intelligence platform',
  ],
  approved_pitches: [
    'When the tape and the data agree, the realm knows who to watch.',
    'Per|Form — analysts who know the game, calling the names that matter.',
    'Six analysts, six dialects, one grading system.',
  ],
  attribution_required: 'powered by ACHIEVEMOR',
  forbidden_topics: [
    'guaranteeing draft outcomes',
    'NIL valuations without a current data refresh',
    'commenting on injury status of named athletes without verified report',
  ],
  primary_call_to_action: 'perform.foai.cloud',
};

// ─────────────────────────────────────────────────────────────────────────
// ACHIEVEMOR (parent)
// ─────────────────────────────────────────────────────────────────────────

export const ACHIEVEMOR_BRAND: BrandIdentity = {
  brand_id: 'achievemor',
  display_name: 'ACHIEVEMOR',
  vertical: 'aims',
  url: 'https://aimanagedsolutions.cloud',
  positioning_one_liner: 'AI Managed Solutions — autonomous companies, audit-chained.',
  positioning_long:
    'ACHIEVEMOR is the AI Managed Solutions parent. Coastal Brewing Co., Per|Form, and the rest of the verticals are autonomous companies powered by the same infrastructure: Chicken Hawk, the Boomer_Angs, the Sett, and the rest of the team that lives where the work is.',
  approved_claims: [
    'AI Managed Solutions',
    'autonomous companies',
    'audit-chained operations',
    'every action is signed by the owner',
  ],
  approved_pitches: [
    'Build a Company. Without the Company.',
    'Powered by ACHIEVEMOR.',
    'Autonomous, audit-chained, owner-signed.',
  ],
  attribution_required: 'ACHIEVEMOR',
  forbidden_topics: [
    'comparisons against named competitor AI platforms',
    'enterprise SLAs without a current attestation',
  ],
  primary_call_to_action: 'aimanagedsolutions.cloud',
};

// ─────────────────────────────────────────────────────────────────────────
// Brand registry
// ─────────────────────────────────────────────────────────────────────────

export const BRAND_REGISTRY: Record<string, BrandIdentity> = {
  coastal: COASTAL_BRAND,
  perform: PERFORM_BRAND,
  achievemor: ACHIEVEMOR_BRAND,
};

// ─────────────────────────────────────────────────────────────────────────
// Product SKUs (sample set — extend as catalog evolves)
// ─────────────────────────────────────────────────────────────────────────

export const COASTAL_SKUS: Record<string, ProductSku> = {
  'sumatra-12oz': {
    sku_id: 'sumatra-12oz',
    brand_id: 'coastal',
    display_name: 'Sumatra Single-Origin (12oz)',
    description: 'Slow-roasted Sumatra single-origin. Low acid, deep body, porch-mornin\' cup.',
    approved_one_liners: [
      'Slow-roasted, low acid, the porch-mornin\' cup.',
      'Deep body, no rush, the cup that breathes for ya.',
    ],
    url: 'https://brewing.foai.cloud/products/sumatra-12oz',
  },
  'ethiopia-12oz': {
    sku_id: 'ethiopia-12oz',
    brand_id: 'coastal',
    display_name: 'Ethiopia Bright (12oz)',
    description: 'Bright, lean Ethiopian single-origin. The cup of choice when the day needs a sharper edge.',
    approved_one_liners: [
      'Bright, lean, the cup that wakes the day up.',
      'Sharp edge, clean finish — when the morning has work to do.',
    ],
    url: 'https://brewing.foai.cloud/products/ethiopia-12oz',
  },
  'matcha-ceremonial': {
    sku_id: 'matcha-ceremonial',
    brand_id: 'coastal',
    display_name: 'Ceremonial-Grade Matcha',
    description: 'Whole-leaf, ceremonial-grade matcha. Whisked the way it was meant to be.',
    approved_one_liners: [
      'Whole-leaf, ceremonial-grade. Whisked the way it was meant to be.',
      'Matcha that earns the bowl it sits in.',
    ],
    url: 'https://brewing.foai.cloud/products/matcha-ceremonial',
  },
};

export const SKU_REGISTRY: Record<string, ProductSku> = {
  ...COASTAL_SKUS,
};

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

export function getBrand(brandId: string): BrandIdentity | undefined {
  return BRAND_REGISTRY[brandId];
}

export function getSku(skuId: string): ProductSku | undefined {
  return SKU_REGISTRY[skuId];
}

export function getSkusByBrand(brandId: string): ProductSku[] {
  return Object.values(SKU_REGISTRY).filter((s) => s.brand_id === brandId);
}
