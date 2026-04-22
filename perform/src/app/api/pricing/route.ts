import { NextResponse } from 'next/server';
import { TOKEN_PACKAGES } from '@/lib/stripe/tokens';
import { TIER_LIMITS } from '@/lib/billing/tiers';

/**
 * GET /api/pricing — Per|Form-specific pricing snapshot (SHIP-CHECKLIST Gate 4 · Item 20).
 *
 * Merges two sources:
 *   - TOKEN_PACKAGES  — the concrete products a user can buy from Per|Form
 *                       (single / pack / war-room / unlimited)
 *   - TIER_LIMITS     — what each tier unlocks (for the pricing-page UI
 *                       comparison table)
 *
 * AIMS pricing matrix (@aims/pricing-matrix) owns ecosystem-wide plans
 * (3/6/9-month individual/family/team, PPU, Enterprise). Those live on the
 * matrix and the AIMS-core /pricing page; Per|Form's token bundles are
 * product-specific and stay local. This endpoint returns both shapes so a
 * client rendering pricing never has to round-trip the matrix package.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const packages = Object.entries(TOKEN_PACKAGES).map(([id, p]) => ({
    id,
    name: p.name,
    tokens: p.tokens,
    price_cents: p.price_cents,
    price_usd: p.price_cents / 100,
    recurring: p.recurring,
    tier: p.tokens === -1 ? 'premium' : 'standard',
  }));

  const tiers = Object.values(TIER_LIMITS).map(t => ({
    tier: t.tier,
    label: t.label,
    drafts_per_day: t.drafts_per_day,
    voice_per_day: t.voice_per_day,
    images_per_day: t.images_per_day,
    tie_submits_per_day: t.tie_submits_per_day,
    rate_multiplier: t.rate_multiplier,
  }));

  return NextResponse.json({
    packages,
    tiers,
    stripe_configured: !!process.env.STRIPE_SECRET_KEY,
    stepper_configured: !!(process.env.STEPPER_URL && process.env.STEPPER_KEY),
  });
}
