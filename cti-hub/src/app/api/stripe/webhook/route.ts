import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { determinePlanFromPriceId } from '@/lib/billing/plans';
import { sql } from '@/lib/insforge';

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
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

        if (!userId) break;

        let priceId = session.metadata?.price_id || null;
        let plan = determinePlanFromPriceId(priceId);
        let subscriptionStatus = 'active';
        let currentPeriodStart = toIsoFromUnix(session.created) || new Date().toISOString();
        let currentPeriodEnd = toIsoFromUnix(session.expires_at) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          priceId = subscription.items.data[0]?.price?.id || priceId;
          plan = determinePlanFromPriceId(priceId);
          subscriptionStatus = subscription.status;
          currentPeriodStart = toIsoFromUnix(subscription.items.data[0]?.current_period_start) || currentPeriodStart;
          currentPeriodEnd = toIsoFromUnix(subscription.items.data[0]?.current_period_end) || currentPeriodEnd;
        }

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
