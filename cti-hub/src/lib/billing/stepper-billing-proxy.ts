/**
 * Stepper billing proxy — Phase-A stub.
 *
 * Defines the interface the Phase B + Phase C Stripe route handlers will
 * use to route billing operations through Stepper/Taskade per the
 * canonical rule in `project_billing_via_stepper.md`.
 *
 * Phase A (this module's current state): types + interface only. No
 * wire implementation. Methods throw `NotYetWiredError` to make misuse
 * surface loudly rather than silently falling back to direct-Stripe.
 *
 * Phase B: `createCheckoutSession` + `createCustomer` go live. The
 *   `/api/stripe/checkout` route becomes a thin proxy.
 * Phase C: `publishWebhookEvent` goes live. The `/api/stripe/webhook`
 *   route stops writing to Neon; Stepper workflows own the DB mutations.
 *
 * See `docs/canon/stripe_architecture_carveout.md` for the full
 * decision context.
 */

export interface CreateCheckoutSessionInput {
  userId: string;
  userEmail: string;
  displayName?: string | null;
  /** One of the canonical plan ids: 'pay_per_use' | 'bucket_list' | 'premium' | 'lfg' */
  plan: string;
  /** Stripe price ID resolved by the caller from the plan. */
  priceId: string;
  /** Product scope — 'deploy' (default) or 'sqwaadrun'. */
  product?: 'deploy' | 'sqwaadrun';
  /** Origin used for success/cancel URLs. */
  origin: string;
  /** Stripe customer id if already known. */
  existingStripeCustomerId?: string | null;
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
  eventId: string;                             // Stripe event.id — for idempotency
  eventType: StripeWebhookEventType;
  /** Verified Stripe event payload (already signature-checked by the cti-hub webhook route). */
  payload: Record<string, unknown>;
  /** When cti-hub received + verified the webhook (ISO-8601). */
  receivedAt: string;
}

export interface PublishWebhookEventResult {
  accepted: boolean;
  /** Stepper-side reference id for the event-ingest workflow. */
  stepperEventId?: string;
}

export class NotYetWiredError extends Error {
  constructor(method: string) {
    super(
      `[stepper-billing-proxy] ${method} is not yet wired. Phase-A ships ` +
        `the interface only. See docs/canon/stripe_architecture_carveout.md ` +
        `for the phased migration plan. Do NOT fall back to direct Stripe — ` +
        `that would regress Gate 1c.`,
    );
    this.name = 'NotYetWiredError';
  }
}

/**
 * Call Stepper to create a Stripe checkout session + customer.
 * Stepper-side workflow owns the Stripe SDK call.
 *
 * Phase B target.
 */
export async function createCheckoutSession(
  _input: CreateCheckoutSessionInput,
): Promise<CreateCheckoutSessionResult> {
  throw new NotYetWiredError('createCheckoutSession');
}

/**
 * Publish a verified Stripe webhook event to Stepper. Stepper-side
 * workflow consumes the event and performs the DB mutations
 * (`UPDATE subscriptions`, `UPDATE profiles`).
 *
 * Phase C target. Must be idempotent on `eventId`.
 */
export async function publishWebhookEvent(
  _input: PublishWebhookEventInput,
): Promise<PublishWebhookEventResult> {
  throw new NotYetWiredError('publishWebhookEvent');
}

/** Gate for callers that want to conditionally exercise the Stepper path. */
export function isStepperBillingWired(): boolean {
  return !!process.env.STEPPER_BILLING_URL && !!process.env.STEPPER_BILLING_TOKEN;
}
