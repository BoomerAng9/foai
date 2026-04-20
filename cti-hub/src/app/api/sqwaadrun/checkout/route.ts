/**
 * POST /api/sqwaadrun/checkout
 *
 * Customer-facing endpoint that opens a Sqwaadrun subscription via
 * Stepper. Plug code never touches Stripe directly — all billing
 * operations route through the Stepper proxy per
 * project_billing_via_stepper.md.
 *
 * Flow:
 *   1. Verify caller's Firebase ID token → authoritative user_id/email
 *   2. Resolve Stripe price ID from the requested tier
 *   3. Apply 20% Deploy-subscriber discount if applicable
 *   4. Call stepper.createCheckoutSession(...)
 *   5. Return { checkoutUrl } for client-side redirect
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { sql } from '@/lib/insforge';
import { createCheckoutSession } from '@/lib/billing/stepper-billing-proxy';
import {
  SQWAADRUN_TIERS,
  SqwaadrunTierId,
  getSqwaadrunPriceId,
  SQWAADRUN_DEPLOY_DISCOUNT_PERCENT,
} from '@/lib/billing/plans';

const VALID_TIERS: SqwaadrunTierId[] = [
  'lil_hawk_solo',
  'sqwaad',
  'sqwaadrun_commander',
];

async function verifyAuth(
  request: NextRequest,
): Promise<{ userId: string; userEmail: string } | NextResponse> {
  const authHeader = request.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing Authorization Bearer token' },
      { status: 401 },
    );
  }
  const idToken = authHeader.slice(7);
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    if (!decoded.email) {
      return NextResponse.json(
        { error: 'Firebase user has no email' },
        { status: 403 },
      );
    }
    return { userId: decoded.uid, userEmail: decoded.email };
  } catch {
    return NextResponse.json(
      { error: 'Invalid or expired ID token' },
      { status: 401 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth instanceof NextResponse) return auth;

  let body: { tierId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const tierId = body.tierId;
  if (!tierId || !VALID_TIERS.includes(tierId as SqwaadrunTierId)) {
    return NextResponse.json(
      {
        error: `tierId must be one of ${VALID_TIERS.join(', ')}`,
      },
      { status: 400 },
    );
  }

  const priceId = getSqwaadrunPriceId(tierId as SqwaadrunTierId);
  if (!priceId) {
    return NextResponse.json(
      {
        error: `Stripe price ID not configured for tier ${tierId}. Set NEXT_PUBLIC_STRIPE_SQWAADRUN_${tierId.toUpperCase()}_PRICE_ID.`,
      },
      { status: 503 },
    );
  }

  const tier = SQWAADRUN_TIERS[tierId as SqwaadrunTierId];

  // Discount resolution — active Deploy subscribers get 20% off
  // Read-path: per stepper_read_path_carveout, cart/pricing reads
  // bypass workflows and query Neon directly.
  let discountCouponId: string | null = null;
  let existingStripeCustomerId: string | null = null;
  if (sql) {
    const profileRows = await sql<
      { tier: string | null; stripe_customer_id: string | null }[]
    >`SELECT tier, stripe_customer_id FROM profiles WHERE user_id = ${auth.userId} LIMIT 1`;
    const profile = profileRows[0];
    existingStripeCustomerId = profile?.stripe_customer_id ?? null;

    const hasActiveDeploy =
      profile?.tier && profile.tier !== 'free' && profile.tier !== null;
    if (hasActiveDeploy) {
      discountCouponId =
        process.env.STRIPE_COUPON_SQWAADRUN_DEPLOY_DISCOUNT ?? null;
    }
  }

  const origin =
    request.headers.get('origin') ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'https://deploy.foai.cloud';

  try {
    const result = await createCheckoutSession({
      userId: auth.userId,
      userEmail: auth.userEmail,
      plan: tierId,
      priceId,
      product: 'sqwaadrun',
      origin,
      existingStripeCustomerId,
      discountCouponId,
      extraMetadata: {
        tier_id: tierId,
        tier_name: tier.name,
        monthly_quota: String(tier.monthly_missions),
        deploy_discount_pct: discountCouponId
          ? String(SQWAADRUN_DEPLOY_DISCOUNT_PERCENT)
          : '0',
      },
    });

    return NextResponse.json({
      checkoutUrl: result.checkoutUrl,
      sessionId: result.sessionId,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Stepper checkout creation failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
