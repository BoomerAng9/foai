/**
 * Stripe Sqwaadrun add-on checkout — OUTBOUND path (sibling of
 * `/api/stripe/checkout/route.ts`). Same Gate 1c canon status: direct
 * Stripe calls are Phase-A interim; Phase-B turns this into a thin
 * proxy over `@/lib/billing/stepper-billing-proxy.createCheckoutSession`
 * with `product: 'sqwaadrun'`. See
 * `docs/canon/stripe_architecture_carveout.md`.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  getSqwaadrunPriceId,
  SQWAADRUN_TIERS,
  SQWAADRUN_DEPLOY_DISCOUNT_PERCENT,
  type SqwaadrunTierId,
} from '@/lib/billing/plans';
import { applyRateLimit } from '@/lib/rate-limit';
import { requireAuthenticatedRequest } from '@/lib/server-auth';
import { isOwner } from '@/lib/allowlist';
import { sql } from '@/lib/insforge';

/* ──────────────────────────────────────────────────────────────
 *  POST /api/stripe/sqwaadrun/checkout
 *  Body: { tier: 'lil_hawk_solo' | 'sqwaad' | 'sqwaadrun_commander' }
 *
 *  Creates a Stripe checkout session for a Sqwaadrun tier. If the
 *  user has an active Deploy Platform subscription, applies the
 *  20% discount automatically via a Stripe coupon.
 * ────────────────────────────────────────────────────────────── */

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }
  return new Stripe(secretKey, { apiVersion: '2026-02-25.clover' });
}

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

    // --- OWNER BYPASS (Phase 0) ---
    // Owners never trigger Stripe customer or session creation on the
    // Sqwaadrun checkout path either.
    if (isOwner(authResult.context.user.email)) {
      return NextResponse.json({
        owner_bypass: true,
        redirect_url: '/smelter-os',
        message: 'Owner clearance — no checkout required.',
      });
    }
    // --- END OWNER BYPASS ---

    const rateLimitResponse = applyRateLimit(request, 'sqwaadrun-checkout', {
      maxRequests: 5,
      windowMs: 60 * 1000,
      subject: authResult.context.user.uid,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json().catch(() => ({}));
    const tierId = typeof body.tier === 'string' ? (body.tier as SqwaadrunTierId) : null;

    if (!tierId || !VALID_TIERS.has(tierId)) {
      return NextResponse.json(
        { error: 'Invalid tier. Choose: lil_hawk_solo, sqwaad, or sqwaadrun_commander.' },
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

    const stripe = getStripeClient();

    // Get or create Stripe customer
    let customerId = authResult.context.profile?.stripe_customer_id || null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: authResult.context.user.email || undefined,
        name: authResult.context.profile?.display_name || undefined,
        metadata: { user_id: authResult.context.user.uid },
      });
      customerId = customer.id;
      await sql`
        UPDATE profiles SET stripe_customer_id = ${customerId}
        WHERE user_id = ${authResult.context.user.uid}
      `;
    }

    // Detect active Deploy Platform subscription for discount eligibility
    const profileRows = await sql`
      SELECT plan, plan_status FROM profiles
      WHERE user_id = ${authResult.context.user.uid}
      LIMIT 1
    `;
    const hasActiveDeployPlan =
      profileRows.length > 0 &&
      profileRows[0].plan_status === 'active' &&
      ['bucket_list', 'premium', 'lfg'].includes(profileRows[0].plan);

    // Build the discount block (only if eligible)
    const discounts = hasActiveDeployPlan
      ? [{
          coupon: process.env.STRIPE_SQWAADRUN_DEPLOY_DISCOUNT_COUPON || '',
        }]
      : undefined;

    const origin = process.env.DOMAIN_CLIENT || new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId || undefined,
      client_reference_id: authResult.context.user.uid,
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      ...(discounts && discounts[0].coupon ? { discounts } : {}),
      metadata: {
        user_id: authResult.context.user.uid,
        product: 'sqwaadrun',
        tier: tierId,
        price_id: priceId,
        deploy_discount_applied: hasActiveDeployPlan ? 'true' : 'false',
      },
      subscription_data: {
        metadata: {
          user_id: authResult.context.user.uid,
          product: 'sqwaadrun',
          tier: tierId,
          price_id: priceId,
        },
      },
      success_url: `${origin}/plug/sqwaadrun?success=true&tier=${tierId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/plug/sqwaadrun?canceled=true`,
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL.' }, { status: 502 });
    }

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      tier: tierId,
      tier_name: tier.name,
      monthly_price: tier.price_monthly,
      monthly_missions: tier.monthly_missions,
      discount_applied: hasActiveDeployPlan,
      discount_percent: hasActiveDeployPlan ? SQWAADRUN_DEPLOY_DISCOUNT_PERCENT : 0,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sqwaadrun checkout failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST to create a Sqwaadrun checkout session.' }, { status: 405 });
}
