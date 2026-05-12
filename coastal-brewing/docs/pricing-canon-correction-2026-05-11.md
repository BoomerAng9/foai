# Pricing Canon Correction — 2026-05-11

> **Supersedes:** the "upfront cadence total" reading of
> [`cbrew-369-pricing-canon-2026-05-11.md`](./cbrew-369-pricing-canon-2026-05-11.md)
> that the tier checkout endpoints implemented in PRs #409 / #410 / #411.
>
> **Status:** owner-ratified · code-landed · 2026-05-11 PM.

## What was wrong

The 3 tier checkout endpoints (Custee Card / Pooler Pass / Wood Stork) were
minting Stripe Checkout Sessions in `mode="payment"` with `unit_amount =
cadence_total_cents` — i.e., the **full N-month cadence total billed
upfront** as a single one-time charge. For the Custee Card 9-month plan
that meant the Custee paid $202.43 today, in one charge, for 12 months of
product delivery.

That contradicted the canon. The 3-6-9 plans are **monthly installments**,
not single upfront charges:

- **3-mo plan**: customer pays $X/mo for 3 months
- **6-mo plan**: customer pays $X/mo for 6 months
- **9-mo plan**: customer pays $X/mo for 9 months → 12 months of delivery
- **monthly** (no commitment): customer pays full retail per month

Separately, the **$6.54 service-initiation fee** was implicitly bundled
into the subscription line items in the legacy 4-product subscribe flow
(see `tests/test_membership_subscribe.py`). Owner correction: the
service-initiation fee is **NOT** part of any subscription checkout. It
is a one-time fee that fires **once per Custee** from one of two
surfaces (whichever comes first).

## What canon now says

### 1. Tier checkouts: subscription mode

All 3 tier checkout endpoints now mint Stripe Checkout Sessions in
`mode="subscription"` with a recurring monthly Price.

- `unit_amount` = `cadence_monthly_billing_cents(monthly_retail, cadence)`
- `recurring = {"interval": "month"}`
- The cadence determines the **discount on the monthly rate**, not the
  duration of the subscription. A "9-month plan" customer is billed
  monthly at the 25%-off rate until they cancel.
- **Auto-renew** at the same cadence = the discount persists as long as
  the subscription is active. There is no automatic flip to full retail
  after N cycles.
- **Cancel anytime** — standard Stripe subscription cancellation flow.

#### Monthly billing canon (5 tiers × 4 cadences)

| Tier                 | Monthly retail | monthly  | 3-mo (15% off) | 6-mo (20% off) | 9-mo (25% off) |
|----------------------|---------------:|---------:|---------------:|---------------:|---------------:|
| Pooler Pass Standard | $7.49          | $7.49    | $6.37          | $5.99          | $5.62          |
| Pooler Pass Plus     | $14.99         | $14.99   | $12.74         | $11.99         | $11.24         |
| Coastal Custee Card  | $29.99         | $29.99   | $25.49         | $23.99         | $22.49         |
| Wood Stork Standard  | $74.99         | $74.99   | $63.74         | $59.99         | $56.24         |
| Wood Stork Reserve   | $149.99        | $149.99  | $127.49        | $119.99        | $112.49        |

Monthly retail anchors are taken **directly** from
[`cbrew-369-pricing-canon-2026-05-11.md`](./cbrew-369-pricing-canon-2026-05-11.md) §2
(clean: $7.49 / $14.99 / $29.99 / $74.99 / $149.99). The 9-mo cadence
total intentionally drifts ABOVE the legacy $49 / $99 / $199 / $499 / $999
annual anchors — Sal/LUC/ACHEEVY haggle DOWN to those round numbers as
built-in negotiation theater.

> **Correction 2026-05-11 PM:** an earlier revision of this doc claimed
> monthly retail was derived `monthly = annual / 6.75` from the legacy
> annuals (which produced $7.26 / $14.67 / $29.48 / $73.93 / $148.00).
> That contradicted canon §2 and was applied to `membership_pooler_pass.py`
> + `membership_wood_stork.py` so 4 of 5 tiers were billing the wrong
> amount on Stripe. Constants are now direct canon anchors; tests under
> `tests/test_tier_retail_canon.py` pin them so this drift can't recur.

#### Pay 9, get 12 (9mo plan)

Stripe is billing the customer monthly at the 25%-off rate. The
"pay 9, get 12" delivery extension on the 9-mo plan is enforced by
**fulfillment logic**, not by Stripe phase-based scheduling. Concretely:
the subscription bills monthly forever (until cancellation); fulfillment
schedules 12 shipments per 9 monthly invoices when the customer's tier-
cadence metadata says `cadence=9mo`.

If a customer cancels mid-cycle, Stripe stops billing at period end (no
proration refund) and fulfillment stops at the next due shipment. The
delivery-extension benefit is structurally tied to staying subscribed.

> **Deferred to follow-up:** phase-based Stripe `subscription_schedule`
> enforcement of the 9-payment → 12-delivery ratio. Today's implementation
> trades enforcement for simplicity; the marketing headline still matches
> what fulfillment delivers as long as Custees stay subscribed for the
> full term.

### 2. Service initiation: separate $6.54 fee

The `$6.54` service-initiation fee:

- Is **NOT** bundled into any tier subscription Checkout Session.
- Fires **once per Custee**, idempotent on email (case-insensitive).
- Is triggered by one of two surfaces, whichever comes first:
  - **Meeting Mode trial start** (`trigger="trial"`)
  - **First standard-prices retail order** (`trigger="retail_first_purchase"`)
- Is a one-time Stripe Checkout Session in `mode="payment"`.

Surfaces:
- New endpoint: `POST /api/service-initiation/charge`
- Webhook branch in `/stripe/webhook` that records `flow=service_initiation`
  `checkout.session.completed` events into the ledger.
- Ledger: `$HOME/.coastal/service-init-ledger.json` (JSON, keyed by
  lowercased email, first payment wins).

Idempotency:
- Repeat calls to the endpoint for an already-paid email return
  `{ok: True, already_paid: True, paid_at: "..."}` without re-minting.
- Webhook idempotency: the existing event-id-keyed filesystem dedupe
  prevents Stripe at-least-once redelivery from double-recording.

### 3. Tier-as-envelope + mix-and-match

Owner-ratified strategic answer to "what fits inside each tier":

- The tier signals **audience** (local 50–100 mi / national DTC / B2B) and
  **envelope size** (max monthly product retail value the Custee can pack
  into their plan).
- Within the envelope, Custees mix-and-match products freely via the
  existing `ProductMatrixPicker` UX (PR #409 / #410).
- Exceeding the envelope returns 400 with an upgrade-tier upsell.

Envelope canon (monthly product retail, cents):

| Tier                 | Envelope  | What fits                                          |
|----------------------|----------:|----------------------------------------------------|
| Pooler Pass Standard | $15/mo    | 1 item: tea OR coffee OR functional coffee         |
| Pooler Pass Plus     | $30/mo    | Up to 2 items + à la carte discount                |
| Coastal Custee Card  | $60/mo    | 2 items / quarter swap + 15% à la carte discount   |
| Wood Stork Standard  | $150/mo   | Bulk coffee / bulk tea / multi-location (1–3)       |
| Wood Stork Reserve   | $300/mo   | Bulk + whitelabel + multi-location (1–10)           |

Per-item floor: `monthly_retail ≥ monthly_cost + $1.50`.

Upgrade chain:
`pooler-pass-standard → pooler-pass-plus → custee-card → wood-stork-standard → wood-stork-reserve → contact-sales`.

> **Note 2026-05-11:** the pure-logic envelope checker
> (`scripts/profitability.py`) is implemented and tested (11 cases). The
> endpoint-layer wiring (checking basket against envelope before Stripe
> mint) is **deferred to a follow-up** — it requires per-product
> `monthly_retail_cents` data, which currently lives only at the tier
> level (`CUSTEE_CARD_MONTHLY_RETAIL_DOLLARS` etc.). When the catalog
> exposes per-product monthly retail, the envelope gate flips on at all
> 3 tier endpoints in one wiring change.

### 4. No-plan path

The `/pricing` page now includes an explicit alternative for Custees who
don't want a subscription:

> **Don't want a plan?** Shop standard prices below — no subscription,
> no commitment.

The link anchors to the Bundles section on the same page (`#bundles`),
where standard retail bundles are listed without any subscription
mechanic. The full catalog at `/products` is also one click away.

## Surfaces changed

| File | Change |
|------|--------|
| `scripts/profitability.py` (new) | Tier envelope + cost-floor pure logic |
| `scripts/cadence.py` | New `cadence_monthly_billing_cents()`; `cadence_pricing_table()` now exposes `monthly_billing` |
| `scripts/service_initiation.py` (new) | $6.54 fee pure logic + ledger primitives |
| `scripts/api_server.py` | 3 tier endpoints: mode flip; new `/api/service-initiation/charge`; webhook records `flow=service_initiation` |
| `web/app/pricing/page.tsx` | Headline column flipped to monthly billing; "Don't want a plan?" path; `#bundles` anchor |
| `web/components/cbrew-cadence-picker.tsx` | Big-number switched from `total_charge` to `monthly_billing` |
| `web/app/forms/membership/*/checkout/route.ts` (×3) | Response field `total_cents` → `monthly_billing_cents` |
| `web/tests/e2e/pricing-subscribe.spec.ts` | Asserts monthly-billing display values |
| `tests/test_profitability.py` (new) | 11 cases |
| `tests/test_cadence_monthly_billing.py` (new) | 6 cases |
| `tests/test_service_initiation.py` (new) | 11 cases |

All 181 pytest cases pass. Playwright e2e updated; not run from this
session (no live browser).

## What did NOT change

- The 5-tier brand canon (Pooler Standard / Plus / Custee Card / Wood
  Stork Standard / Reserve) — names, brand marks, audience signals, and
  Higgsfield card art are untouched.
- The `ProductMatrixPicker` UX inside each tier — same matrix selector
  shipped in PRs #409 / #410.
- The annual landing headlines ($49 / $99 / $199 / $499 / $999) — these
  remain the **canonical anchor** that the monthly retail derivation
  rounds backwards to. They no longer appear as the customer-facing
  headline on `/pricing` (the monthly bill does), but they're still the
  number that drives the math.
- The legacy 4-product subscribe-flow retirement (PR #411) — that flow
  stays retired. The `$6.54`-in-line-item logic in
  `scripts/membership_subscribe.py` is dead code per the retirement
  comment and was not touched in this correction.

## Open items (deferred)

1. **Envelope gate wiring at endpoint layer** — `profitability.check_envelope`
   is in-tree but not yet called from the 3 tier endpoints. Pending
   per-product `monthly_retail_cents` in the catalog.
2. **Phase-based Stripe `subscription_schedule`** for pay-9-get-12
   enforcement — current implementation relies on fulfillment to deliver
   the 12-month benefit; mid-cycle cancellation trims delivery to the
   billed period.
3. **Service-initiation Meeting Mode trigger** — the endpoint exists and
   the webhook records completion; Meeting Mode's trial-start flow still
   needs to call the endpoint when a trial is initiated (Phase 2 of the
   Meeting Mode plan, currently parked).
4. **Service-initiation retail trigger** — the first-retail-order surface
   needs a call site (likely in the cart-completion or one-time checkout
   flow). Today the endpoint is mintable but no surface fires it.
