# Stripe architecture — sanctioned carveout

**Gate 1c decision** of the 2026-04-17 Rish arbitration. Locks the
interpretation of the `Stripe → Stepper → Taskade → plug APIs` canon
against the reality of cti-hub's current direct-Stripe code.

## The apparent conflict

Two canon memories set the rule:

- `project_billing_via_stepper.md` — "Stripe → Stepper → Taskade → plug
  APIs. Stripe NEVER called directly."
- `project_stepper_read_path_carveout.md` — "Cart/plans/billing reads
  bypass workflows; served from Neon mirrors. Only mutations invoke
  Taskade."

cti-hub has:
- `src/app/api/stripe/checkout/route.ts` — creates Stripe Checkout
  sessions via `stripe.customers.create` + `stripe.checkout.sessions.create`
- `src/app/api/stripe/webhook/route.ts` — receives Stripe webhooks via
  `stripe.webhooks.constructEvent` and writes directly to Neon
  (`subscriptions`, `profiles`)
- `src/app/api/stripe/sqwaadrun/checkout/route.ts` — Sqwaadrun-tier
  variant of checkout

The apparent violation: cti-hub IS calling Stripe directly.

## The resolved decision

**Outbound** Stripe API calls (checkout session creation, customer
creation, subscription updates) are canon-violating. They must migrate
to a Stepper-proxy pattern.

**Inbound** Stripe webhooks are **necessary** — Stripe cannot deliver
webhooks to Stepper/Taskade directly. The webhook endpoint must verify
the Stripe signature, which requires Stripe SDK access. This is a
sanctioned carveout.

BUT: the webhook handler's **side effects** (Neon writes to
`subscriptions` + `profiles`) are ALSO canon-violating. The webhook
should **publish events** to Stepper/Taskade and let Stepper workflows
handle the DB mutations.

## The resulting architecture

| Direction | Canonical | Implementation |
|---|---|---|
| Outbound Stripe calls (checkout, customer) | Through Stepper | cti-hub route becomes a thin proxy that calls a Stepper endpoint; Stepper calls Stripe |
| Inbound Stripe webhooks (signature verification) | In cti-hub (sanctioned carveout) | Necessary — Stripe delivers here |
| Webhook side effects (DB mutations) | Through Stepper | cti-hub webhook handler publishes events to Stepper; Stepper workflows handle `UPDATE profiles` + `UPDATE subscriptions` |
| Billing reads | Direct to Neon mirrors | Already compliant per `project_stepper_read_path_carveout.md` |

## Phased migration

This decision lands in three phases so no single PR risks billing.

### Phase A — decision locked (this PR)

- This canon doc is merged.
- `checkout/route.ts` + `webhook/route.ts` + `sqwaadrun/checkout/route.ts`
  each carry a file-level JSDoc block referencing this doc and naming
  the follow-up work.
- A stub adapter lands at `cti-hub/src/lib/billing/stepper-billing-proxy.ts`
  defining the interface the Phase B + Phase C handlers will use. No
  code path changes behavior yet.

### Phase B — outbound through Stepper

- `stepper-billing-proxy.ts` gains a real `createCheckoutSession()` +
  `createCustomer()` implementation that posts to Stepper's billing
  endpoint.
- `checkout/route.ts` becomes a thin wrapper: auth → rate-limit →
  `stepper-billing-proxy.createCheckoutSession()` → return the URL.
- Stepper-side workflow handles Stripe customer + session creation.
- Stripe SDK `import` is removed from `checkout/route.ts` (and
  `sqwaadrun/checkout/route.ts`).

### Phase C — webhooks publish events

- `webhook/route.ts` keeps the Stripe-SDK signature verification path.
- After verification, the handler STOPS writing to Neon and instead
  publishes a structured event to `stepper-billing-proxy.publishEvent(eventType, payload)`.
- Stepper-side workflow consumes the event and performs the
  appropriate `UPDATE subscriptions` / `UPDATE profiles` writes.
- The webhook route keeps the Stripe SDK import — this is the
  carveout.

## Why not remove the webhook entirely

Stripe webhooks require:

1. An HTTPS endpoint that Stripe's infrastructure can reach
2. Signature verification using `stripe.webhooks.constructEvent` + the
   webhook secret
3. A 2xx response within a timeout, or Stripe retries

Routing Stripe's webhook traffic through Stepper would mean either:

- Exposing a Stepper HTTPS endpoint Stripe can call directly (Stepper
  would need to implement Stripe SDK anyway — same canon violation,
  different host), OR
- Forwarding HTTPS traffic from cti-hub to Stepper without verification
  (loses signature verification — security regression)

The cleanest path is to keep verification in cti-hub and treat the
webhook as a **thin signature-verifying relay** whose only job is to
publish verified events to Stepper.

## Observable outcomes after Phase C

- No `stripe.customers.create`, `stripe.checkout.sessions.create`, or
  `stripe.subscriptions.retrieve` calls originate from cti-hub. Those
  all live in Stepper's workflow.
- `cti-hub/src/app/api/stripe/webhook/route.ts` keeps ONLY
  `stripe.webhooks.constructEvent` and the publish-to-Stepper step.
- `cti-hub/src/app/api/stripe/webhook/route.ts` writes ZERO rows to
  Neon. All mutations come from Stepper workflows.
- `cti-hub/src/lib/billing/stepper-billing-proxy.ts` is the single
  module that knows how to talk to Stepper about billing.

## Canon references

- `project_billing_via_stepper.md` — the primary rule
- `project_stepper_read_path_carveout.md` — the read-path exception
- `project_taskade_replaces_paperform.md` — the 2026-04-15 lock of
  Stepper+Taskade as the billing spine
- `project_session_delta_2026_04_17_18_20pr_wave.md` — Gate 1c listed
  pending here
- Rish arbitration 2026-04-17 — Gate 1c decision authority

## Open questions

- **Stepper billing endpoint shape:** exact request/response contract
  for `createCheckoutSession` + `publishEvent`. Needs Rish to confirm
  what Taskade's Stepper surface exposes today, or a follow-up workflow
  creation PR.
- **Retry + idempotency:** webhook handler must be idempotent (Stripe
  retries on non-2xx). Stepper event publishing must be idempotent too.
  Lands with the Phase C wiring.
