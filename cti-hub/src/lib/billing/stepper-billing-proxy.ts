/**
 * Stepper billing proxy — Phase B live, Phase C pending.
 *
 * Canonical rule (project_billing_via_stepper.md): plug code NEVER
 * imports `stripe`. This module is the sole holder of the Stripe SDK
 * in the cti-hub codebase (alongside `/api/stripe/webhook/route.ts`,
 * which signature-verifies inbound events as a sanctioned carveout).
 *
 * Phase B (LIVE in this module):
 *   - `createCheckoutSession` → creates/reuses a Stripe Customer and
 *     opens a Checkout Session for the requested plan. Returns the
 *     hosted-checkout URL.
 *   - `isStepperBillingWired()` → true when env is set so callers
 *     can gate cleanly.
 *
 * Phase C (still NotYetWired):
 *   - `publishWebhookEvent` → reroutes verified webhook events to a
 *     Taskade workflow for side-effect execution. Until Phase C lands,
 *     `/api/stripe/webhook/route.ts` keeps its direct-Neon writes
 *     behind the same signature-verification gate.
 *
 * See docs/canon/stripe_architecture_carveout.md for the phased plan.
 */

import Stripe from 'stripe';

export interface CreateCheckoutSessionInput {
  userId: string;
  userEmail: string;
  displayName?: string | null;
  /** Canonical Deploy plan id OR Sqwaadrun tier id. */
  plan: string;
  /** Stripe price ID resolved by the caller from the plan. */
  priceId: string;
  /** Product scope — 'deploy' (default) or 'sqwaadrun'. */
  product?: 'deploy' | 'sqwaadrun';
  /** Origin used for success/cancel URLs. */
  origin: string;
  /** Stripe customer id if already known. */
  existingStripeCustomerId?: string | null;
  /** Optional discount coupon id (e.g. 20% Deploy-subscriber discount for Sqwaadrun). */
  discountCouponId?: string | null;
  /** Optional extra metadata merged into the Checkout Session metadata. */
  extraMetadata?: Record<string, string>;
}

export interface CreateCheckoutSessionResult {
  checkoutUrl: string;
  sessionId: string;
  customerId: string;
}

export type StripeWebhookEventType =
  | 'checkout.session.completed'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_failed';

export interface PublishWebhookEventInput {
  eventId: string;
  eventType: StripeWebhookEventType;
  payload: Record<string, unknown>;
  receivedAt: string;
}

export interface PublishWebhookEventResult {
  accepted: boolean;
  stepperEventId?: string;
}

export class NotYetWiredError extends Error {
  constructor(method: string) {
    super(
      `[stepper-billing-proxy] ${method} is not yet wired. See ` +
        `docs/canon/stripe_architecture_carveout.md. Do NOT fall back ` +
        `to direct Stripe — that would regress canon.`,
    );
    this.name = 'NotYetWiredError';
  }
}

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      'STRIPE_SECRET_KEY is not configured. Stepper cannot reach Stripe.',
    );
  }
  return new Stripe(secretKey, { apiVersion: '2026-02-25.clover' });
}

async function resolveOrCreateCustomer(
  stripe: Stripe,
  input: CreateCheckoutSessionInput,
): Promise<string> {
  if (input.existingStripeCustomerId) {
    return input.existingStripeCustomerId;
  }
  const customer = await stripe.customers.create({
    email: input.userEmail,
    name: input.displayName ?? undefined,
    metadata: {
      user_id: input.userId,
      product: input.product ?? 'deploy',
    },
  });
  return customer.id;
}

/**
 * Create a Stripe Checkout Session for the given plan. Plug code
 * should never call Stripe directly — it routes through here.
 */
export async function createCheckoutSession(
  input: CreateCheckoutSessionInput,
): Promise<CreateCheckoutSessionResult> {
  const stripe = getStripeClient();
  const customerId = await resolveOrCreateCustomer(stripe, input);
  const product = input.product ?? 'deploy';

  const metadata: Record<string, string> = {
    user_id: input.userId,
    plan: input.plan,
    product,
    price_id: input.priceId,
    ...(input.extraMetadata ?? {}),
  };

  const successPath =
    product === 'sqwaadrun'
      ? '/hawks/dashboard?session_id={CHECKOUT_SESSION_ID}'
      : '/billing/success?session_id={CHECKOUT_SESSION_ID}';
  const cancelPath = product === 'sqwaadrun' ? '/hawks' : '/billing';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: input.priceId, quantity: 1 }],
    metadata,
    subscription_data: { metadata },
    success_url: `${input.origin}${successPath}`,
    cancel_url: `${input.origin}${cancelPath}`,
    allow_promotion_codes: true,
    discounts: input.discountCouponId
      ? [{ coupon: input.discountCouponId }]
      : undefined,
  });

  if (!session.url) {
    throw new Error(
      `Stripe did not return a checkout URL for session ${session.id}`,
    );
  }

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    customerId,
  };
}

/**
 * Publish a signature-verified Stripe webhook event to Stepper's
 * Taskade workflow for side-effect execution. Phase C target — until
 * wired, callers keep their direct Neon writes behind the sanctioned
 * signature-verification carveout.
 */
export async function publishWebhookEvent(
  _input: PublishWebhookEventInput,
): Promise<PublishWebhookEventResult> {
  throw new NotYetWiredError('publishWebhookEvent');
}

/** True once Stepper's backing Taskade workflows are configured. */
export function isStepperBillingWired(): boolean {
  return !!process.env.STEPPER_BILLING_URL && !!process.env.STEPPER_BILLING_TOKEN;
}
