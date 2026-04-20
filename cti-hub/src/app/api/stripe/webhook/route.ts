/**
 * Stripe webhook receiver — INBOUND path.
 *
 * CANON STATUS (per docs/canon/stripe_architecture_carveout.md, Gate 1c):
 * The Stripe SDK signature verification (`stripe.webhooks.constructEvent`)
 * is a SANCTIONED CARVEOUT. Stripe cannot deliver webhooks to Stepper /
 * Taskade directly; the endpoint must verify the signature here before
 * trusting the payload.
 *
 * HOWEVER the side-effect pattern below — direct Neon writes to
 * `subscriptions` + `profiles` — violates the
 * `project_billing_via_stepper.md` rule. This is a Phase-A interim
 * state; the Phase-C migration rewires each handler case to call
 * `@/lib/billing/stepper-billing-proxy.publishWebhookEvent(...)` and
 * removes the `sql` import from this file.
 *
 * The signature-verification block stays. The DB-mutation blocks migrate.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { determinePlanFromPriceId, determineSqwaadrunTierFromPriceId, SQWAADRUN_TIERS } from '@/lib/billing/plans';
import { sql } from '@/lib/insforge';
import {
  issueSqwaadrunKey,
  emailSqwaadrunKey,
} from '@/lib/billing/sqwaadrun-key-issuance';

function toIsoFromUnix(timestamp?: number | null) {
  if (!timestamp) return null;
  return new Date(timestamp * 1000).toISOString();
}

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured.');
  return new Stripe(secretKey, { apiVersion: '2026-02-25.clover' });
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: 'Stripe webhook secret is not configured.' }, { status: 500 });
  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });

  const stripe = getStripeClient();
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Signature verification failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const product = session.metadata?.product || 'deploy';
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

        if (!userId) break;

        let priceId = session.metadata?.price_id || null;
        let subscriptionStatus = 'active';
        let currentPeriodStart = toIsoFromUnix(session.created) || new Date().toISOString();
        let currentPeriodEnd = toIsoFromUnix(session.expires_at) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          priceId = subscription.items.data[0]?.price?.id || priceId;
          subscriptionStatus = subscription.status;
          currentPeriodStart = toIsoFromUnix(subscription.items.data[0]?.current_period_start) || currentPeriodStart;
          currentPeriodEnd = toIsoFromUnix(subscription.items.data[0]?.current_period_end) || currentPeriodEnd;
        }

        // ── Sqwaadrun add-on subscription ──
        if (product === 'sqwaadrun') {
          const tierId = determineSqwaadrunTierFromPriceId(priceId);
          if (tierId) {
            const tier = SQWAADRUN_TIERS[tierId];
            await sql`
              UPDATE profiles SET
                stripe_customer_id = ${customerId ?? null},
                sqwaadrun_tier = ${tierId},
                sqwaadrun_status = ${subscriptionStatus},
                sqwaadrun_monthly_quota = ${tier.monthly_missions},
                sqwaadrun_period_start = ${currentPeriodStart},
                sqwaadrun_period_end = ${currentPeriodEnd}
              WHERE user_id = ${userId}
            `;

            // Issue per-customer gateway API key + best-effort email delivery
            const issued = await issueSqwaadrunKey({
              userId,
              userEmail: session.customer_details?.email ?? '',
              tierId,
              stripeCustomerId: customerId ?? null,
              stripeSubscriptionId: subscriptionId ?? null,
              periodStart: currentPeriodStart,
              periodEnd: currentPeriodEnd,
            });

            if (session.customer_details?.email) {
              await emailSqwaadrunKey(
                session.customer_details.email,
                issued.plaintextKey,
                tier.name,
              );
            }

            // Stash the freshly-issued plaintext key on the session
            // row so the dashboard can retrieve it via session_id on
            // the success redirect. This is the canonical delivery
            // surface; email is a convenience copy.
            await sql`
              INSERT INTO sqwaadrun_key_handoffs
                (stripe_session_id, user_id, api_key_row_id, plaintext_key, created_at, retrieved_at)
              VALUES
                (${session.id}, ${userId}, ${issued.rowId}, ${issued.plaintextKey}, NOW(), NULL)
              ON CONFLICT (stripe_session_id) DO NOTHING
            `;
          }
          break;
        }

        // ── Deploy Platform subscription (default) ──
        const plan = determinePlanFromPriceId(priceId);
        await sql`UPDATE profiles SET stripe_customer_id = ${customerId ?? null}, tier = ${plan} WHERE user_id = ${userId}`;
        await sql`
          UPDATE subscriptions SET
            stripe_subscription_id = ${subscriptionId ?? null},
            stripe_price_id = ${priceId ?? null},
            plan = ${plan},
            status = ${subscriptionStatus},
            current_period_start = ${currentPeriodStart},
            current_period_end = ${currentPeriodEnd}
          WHERE user_id = ${userId}
        `;
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price?.id || null;
        const product = subscription.metadata?.product || 'deploy';
        const userIdMeta = subscription.metadata?.user_id;

        // Sqwaadrun add-on update
        if (product === 'sqwaadrun' && userIdMeta) {
          const tierId = determineSqwaadrunTierFromPriceId(priceId);
          if (tierId) {
            const tier = SQWAADRUN_TIERS[tierId];
            await sql`
              UPDATE profiles SET
                sqwaadrun_tier = ${tierId},
                sqwaadrun_status = ${subscription.status},
                sqwaadrun_monthly_quota = ${tier.monthly_missions},
                sqwaadrun_period_start = ${toIsoFromUnix(subscription.items.data[0]?.current_period_start)},
                sqwaadrun_period_end = ${toIsoFromUnix(subscription.items.data[0]?.current_period_end)}
              WHERE user_id = ${userIdMeta}
            `;
          }
          break;
        }

        const plan = determinePlanFromPriceId(priceId);
        await sql`
          UPDATE subscriptions SET
            status = ${subscription.status},
            plan = ${plan},
            stripe_price_id = ${priceId},
            cancel_at_period_end = ${subscription.cancel_at_period_end || false},
            current_period_start = ${toIsoFromUnix(subscription.items.data[0]?.current_period_start)},
            current_period_end = ${toIsoFromUnix(subscription.items.data[0]?.current_period_end)}
          WHERE stripe_subscription_id = ${subscription.id}
        `;

        const subRows = await sql`SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ${subscription.id} LIMIT 1`;
        if (subRows[0]?.user_id) {
          await sql`UPDATE profiles SET tier = ${plan} WHERE user_id = ${subRows[0].user_id}`;
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const product = subscription.metadata?.product || 'deploy';
        const userIdMeta = subscription.metadata?.user_id;

        // Sqwaadrun add-on cancellation
        if (product === 'sqwaadrun' && userIdMeta) {
          await sql`
            UPDATE profiles SET
              sqwaadrun_tier = NULL,
              sqwaadrun_status = 'canceled',
              sqwaadrun_monthly_quota = 0
            WHERE user_id = ${userIdMeta}
          `;
          break;
        }

        await sql`
          UPDATE subscriptions SET status = 'canceled', plan = 'free', cancel_at_period_end = true
          WHERE stripe_subscription_id = ${subscription.id}
        `;

        const subRows = await sql`SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ${subscription.id} LIMIT 1`;
        if (subRows[0]?.user_id) {
          await sql`UPDATE profiles SET tier = 'free' WHERE user_id = ${subRows[0].user_id}`;
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };
        const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;

        if (subscriptionId) {
          await sql`UPDATE subscriptions SET status = 'past_due' WHERE stripe_subscription_id = ${subscriptionId}`;
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Stripe webhook processing failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
