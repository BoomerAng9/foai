import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripePriceId } from '@/lib/billing/plans';
import { applyRateLimit } from '@/lib/rate-limit';
import { requireAuthenticatedRequest } from '@/lib/server-auth';
import { isOwner } from '@/lib/allowlist';
import { sql } from '@/lib/insforge';

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }

  return new Stripe(secretKey, { apiVersion: '2026-02-25.clover' });
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedRequest(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    // --- OWNER BYPASS (Phase 0) ---
    // Owners never trigger Stripe customer or session creation. The
    // client interprets owner_bypass:true as a redirect to /dashboard
    // with a positive feedback toast — no Stripe call, no charge.
    if (isOwner(authResult.context.user.email)) {
      return NextResponse.json({
        owner_bypass: true,
        redirect_url: '/dashboard?owner_unlimited=1',
        message: 'Owner clearance — no checkout required.',
      });
    }
    // --- END OWNER BYPASS ---

    const rateLimitResponse = applyRateLimit(request, 'stripe-checkout', {
      maxRequests: 5,
      windowMs: 60 * 1000,
      subject: authResult.context.user.uid,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json().catch(() => ({}));
    const requestedPlan = typeof body.plan === 'string' ? body.plan.trim() : '';

    const validPlans = ['pay_per_use', 'bucket_list', 'premium', 'lfg'];
    if (!validPlans.includes(requestedPlan)) {
      return NextResponse.json({ error: 'Invalid plan. Choose: pay_per_use, bucket_list, premium, or lfg.' }, { status: 400 });
    }

    const priceId = getStripePriceId(requestedPlan);
    if (!priceId) {
      return NextResponse.json({ error: 'Stripe price ID is not configured for this plan.' }, { status: 500 });
    }

    if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const stripe = getStripeClient();

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

    const origin = process.env.DOMAIN_CLIENT || new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId || undefined,
      customer_email: customerId ? undefined : authResult.context.user.email || undefined,
      client_reference_id: authResult.context.user.uid,
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        user_id: authResult.context.user.uid,
        plan: requestedPlan,
        price_id: priceId,
      },
      subscription_data: {
        metadata: {
          user_id: authResult.context.user.uid,
          plan: requestedPlan,
          price_id: priceId,
        },
      },
      success_url: `${origin}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?canceled=true`,
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL.' }, { status: 502 });
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Checkout failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST to create a checkout session.' }, { status: 405 });
}
