import { NextRequest, NextResponse } from 'next/server';
import { creditFromStripeSession } from '@/lib/stripe/tokens';

/**
 * Stripe Webhook Handler
 *
 * Listens for `checkout.session.completed` events and credits tokens.
 *
 * Setup:
 *   1. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in .env.local
 *   2. Register this URL in Stripe Dashboard -> Webhooks:
 *      https://your-domain/api/draft/tokens/webhook
 *   3. Events to subscribe: checkout.session.completed
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Record<string, unknown>;

  try {
    const body = await req.text();

    let stripe;
    try {
      const { default: Stripe } = await import('stripe');
      stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
    } catch {
      // SECURITY: Never process unverified webhook payloads.
      // If the stripe package is unavailable, reject the request.
      console.error('[webhook] stripe package not available — cannot verify signature, rejecting');
      return NextResponse.json({ error: 'Webhook verification unavailable' }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const constructed = (stripe as any).webhooks.constructEvent(body, signature, webhookSecret);
    event = constructed;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Signature verification failed';
    console.error('[webhook] Verification error:', msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return handleEvent(event);
}

async function handleEvent(event: Record<string, unknown>): Promise<NextResponse> {
  const type = event.type as string;

  if (type === 'checkout.session.completed') {
    const data = (event.data as Record<string, unknown>) || {};
    const obj = (data.object as Record<string, unknown>) || (data as Record<string, unknown>);
    const metadata = (obj.metadata as Record<string, string>) || {};
    const sessionId = (obj.id as string) || '';

    const userId = metadata.user_id;
    const packageId = metadata.package_id;

    if (!sessionId || !userId || !packageId) {
      console.warn('[webhook] checkout.session.completed missing required fields', { sessionId, userId, packageId });
      return NextResponse.json({ received: true, skipped: true });
    }

    try {
      const { credited, record } = await creditFromStripeSession({ sessionId, userId, packageId });
      console.log(`[webhook] session=${sessionId} user=${userId} pkg=${packageId} credited=${credited} balance=${record.balance} unlimited=${record.is_unlimited}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[webhook] credit failed session=${sessionId}: ${msg}`);
      // Return 500 so Stripe retries the webhook — we'd rather handle a
      // duplicate (idempotent) than miss a credit on a transient DB blip.
      return NextResponse.json({ error: 'credit_failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
