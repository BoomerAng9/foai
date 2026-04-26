/**
 * Sqwaadrun add-on checkout — OUTBOUND path.
 *
 * CANON STATUS (docs/canon/stripe_architecture_carveout.md, Gate 1c):
 * Phase B MIGRATION COMPLETE on this route. Stripe SDK is no longer
 * imported here — all Stripe calls go through Stepper's
 * `createCheckoutSession`. The only direct Stripe touchpoint left in
 * cti-hub is `/api/stripe/webhook/route.ts`, which holds the sanctioned
 * signature-verification carveout.
 *
 * Behavior preserved end-to-end: owner bypass, rate limiting, Deploy
 * 20% discount detection, identical response shape for the landing
 * page's existing fetch call.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  SQWAADRUN_TIERS,
  SQWAADRUN_DEPLOY_DISCOUNT_PERCENT,
  getSqwaadrunPriceId,
  type SqwaadrunTierId,
} from '@/lib/billing/plans';
import { createCheckoutSession } from '@/lib/billing/stepper-billing-proxy';
import { applyRateLimit } from '@/lib/rate-limit';
import { requireAuthenticatedRequest } from '@/lib/server-auth';
import { isOwner } from '@/lib/allowlist';
import { sql } from '@/lib/insforge';

const VALID_TIERS = new Set<SqwaadrunTierId>([
  'lil_hawk_solo',
  'sqwaad',
  'sqwaadrun_commander',
]);

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedRequest(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    // Owner bypass — no Stripe interaction, go straight to control surface
    if (isOwner(authResult.context.user.email)) {
      return NextResponse.json({
        owner_bypass: true,
        redirect_url: '/smelter-os',
        message: 'Owner clearance — no checkout required.',
      });
    }

    const rateLimitResponse = applyRateLimit(request, 'sqwaadrun-checkout', {
      maxRequests: 5,
      windowMs: 60 * 1000,
      subject: authResult.context.user.uid,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json().catch(() => ({}));
    const tierId =
      typeof body.tier === 'string' ? (body.tier as SqwaadrunTierId) : null;
    if (!tierId || !VALID_TIERS.has(tierId)) {
      return NextResponse.json(
        {
          error:
            'Invalid tier. Choose: lil_hawk_solo, sqwaad, or sqwaadrun_commander.',
        },
        { status: 400 },
      );
    }

    const tier = SQWAADRUN_TIERS[tierId];
    const priceId = getSqwaadrunPriceId(tierId);
    if (!priceId) {
      return NextResponse.json(
        { error: `Stripe price ID not configured for ${tierId}` },
        { status: 500 },
      );
    }

    if (!sql) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    // Discount detection — Phase A read path per stepper_read_path_carveout
    const profileRows = await sql<
      { plan: string | null; plan_status: string | null; stripe_customer_id: string | null }[]
    >`
      SELECT plan, plan_status, stripe_customer_id
      FROM profiles
      WHERE user_id = ${authResult.context.user.uid}
      LIMIT 1
    `;
    const profile = profileRows[0];
    const hasActiveDeployPlan =
      profile?.plan_status === 'active' &&
      ['bucket_list', 'premium', 'lfg'].includes(profile?.plan ?? '');
    const discountCouponId = hasActiveDeployPlan
      ? process.env.STRIPE_SQWAADRUN_DEPLOY_DISCOUNT_COUPON ?? null
      : null;

    const origin = process.env.DOMAIN_CLIENT || new URL(request.url).origin;

    const result = await createCheckoutSession({
      userId: authResult.context.user.uid,
      userEmail: authResult.context.user.email ?? '',
      displayName: authResult.context.profile?.display_name ?? null,
      plan: tierId,
      priceId,
      product: 'sqwaadrun',
      origin,
      successUrl: `/plug/sqwaadrun?success=true&tier=${tierId}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `/plug/sqwaadrun?canceled=true`,
      existingStripeCustomerId: profile?.stripe_customer_id ?? null,
      discountCouponId,
      extraMetadata: {
        tier: tierId,
        tier_name: tier.name,
        monthly_quota: String(tier.monthly_missions),
        deploy_discount_applied: hasActiveDeployPlan ? 'true' : 'false',
      },
    });

    return NextResponse.json({
      url: result.checkoutUrl,
      sessionId: result.sessionId,
      tier: tierId,
      tier_name: tier.name,
      monthly_price: tier.price_monthly,
      monthly_missions: tier.monthly_missions,
      discount_applied: hasActiveDeployPlan && !!discountCouponId,
      discount_percent:
        hasActiveDeployPlan && !!discountCouponId
          ? SQWAADRUN_DEPLOY_DISCOUNT_PERCENT
          : 0,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Sqwaadrun checkout failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Use POST to create a Sqwaadrun checkout session.' },
    { status: 405 },
  );
}
