/**
 * Stepper-mediated Stripe integration (SHIP-CHECKLIST Gate 4 — canonical
 * billing spine per owner directive "Stripe→Stepper→Taskade→plug APIs;
 * Stripe NEVER called directly").
 *
 * Current state: scaffold only. When STEPPER_URL + STEPPER_KEY + the
 * Taskade `billing.create_checkout` workflow are all in place, Per|Form
 * routes new checkouts through Stepper instead of hitting Stripe directly.
 * When any of those env pieces is missing, callers fall back to the
 * direct-Stripe path in lib/stripe/tokens.ts — keeping existing behavior
 * intact during the Stepper migration window.
 *
 * Outbound protocol (POST to $STEPPER_URL with header x-stepper-key):
 *   { action: 'billing.create_checkout',
 *     source: 'perform',
 *     payload: { user_id, package_id, package, return_url } }
 * Stepper is expected to return { checkout_url } or { error }.
 *
 * Inbound on perform side is handled in /api/webhooks/stepper where a new
 * `billing.credited` action branch calls creditFromStripeSession().
 */

import type { TokenPackage } from '@/lib/stripe/tokens';

export interface StepperBillingResult {
  url: string | null;
  via: 'stepper' | 'unavailable';
  error?: string;
}

/**
 * Returns true when the runtime is configured to route billing through
 * Stepper. Callers use this to decide whether to delegate to
 * createCheckoutViaStepper() or fall back to direct Stripe.
 */
export function stepperBillingConfigured(): boolean {
  return !!(process.env.STEPPER_URL && process.env.STEPPER_KEY);
}

export async function createCheckoutViaStepper(params: {
  userId: string;
  packageId: string;
  pkg: TokenPackage;
  returnUrl: string;
}): Promise<StepperBillingResult> {
  const stepperUrl = process.env.STEPPER_URL;
  const stepperKey = process.env.STEPPER_KEY;
  if (!stepperUrl || !stepperKey) {
    return { url: null, via: 'unavailable', error: 'stepper_not_configured' };
  }

  try {
    const res = await fetch(stepperUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-stepper-key': stepperKey,
      },
      body: JSON.stringify({
        action: 'billing.create_checkout',
        source: 'perform',
        payload: {
          user_id: params.userId,
          package_id: params.packageId,
          package: {
            name: params.pkg.name,
            tokens: params.pkg.tokens,
            price_cents: params.pkg.price_cents,
            recurring: params.pkg.recurring,
            stripe_price_id: params.pkg.stripe_price_id,
          },
          return_url: params.returnUrl,
        },
      }),
    });
    if (!res.ok) {
      return { url: null, via: 'stepper', error: `stepper_${res.status}` };
    }
    const json = (await res.json()) as { checkout_url?: string; error?: string };
    if (!json.checkout_url) {
      return { url: null, via: 'stepper', error: json.error || 'missing_checkout_url' };
    }
    return { url: json.checkout_url, via: 'stepper' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { url: null, via: 'stepper', error: msg };
  }
}
