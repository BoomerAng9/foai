# Coastal Brewing Co. — Standard Membership Stripe runbook

**Date:** 2026-05-11
**Audience:** Owner (Stripe-dashboard work)
**Scope:** One-time setup steps to flip the $199/yr Standard Membership from "code-ready" to "live and paying"

---

## State of play (what's already shipped)

After PRs #372 / #374 / #375 / #377 / #378 / #379 / #380:

| Layer | Status |
|---|---|
| Membership spec doc | ✓ shipped |
| `/membership` pitch page (Standard tier) | ✓ live at brewing.foai.cloud/membership |
| `/live` paywall card | ✓ live |
| Pure referral logic (mint code, ledger, refund-eligibility) | ✓ shipped + 9 tests |
| Stripe `customer.subscription.created` webhook dispatch | ✓ wired into existing `/stripe/webhook` |
| `POST /api/membership/checkout` endpoint | ✓ shipped |
| Frontend "Become a member · $199" button | ✓ shipped |
| `/membership/welcome` success page | ✓ shipped |
| **Stripe Product + Price registered in dashboard** | **MISSING — owner step** |
| **`STRIPE_COASTAL_MEMBERSHIP_STANDARD_PRICE_ID` env on `aims-vps coastal-runner`** | **MISSING — owner step** |
| `MEMBER_15` coupon (15% auto-apply) | follow-up Phase 5 |

The endpoint returns HTTP 503 with a clear message until the price ID is set. Nothing else breaks.

---

## Step 1 — Create the Stripe Product

In the Stripe dashboard ([dashboard.stripe.com/products](https://dashboard.stripe.com/products)), under the live mode (not test mode):

1. Click **+ Add product**
2. Fill in:
   - **Name:** `Coastal Brewing Co. Standard Membership`
   - **Description:** `Annual membership — unlimited free delivery (under $15 freight ceiling), automatic 15% discount on all products, welcome box, live 2D look-in to the Pooler floor, and refer-2-and-fee-returned mechanic.`
   - **Image:** upload the storefront-window-etching brand mark (the canonical Coastal Brewing Co. wordmark with the period)
3. Under **Pricing**, set:
   - **Pricing model:** Standard pricing
   - **Price:** `$199.00`
   - **Billing period:** Yearly
   - **Currency:** USD
4. Click **Save product**

Stripe assigns the product an ID like `prod_RxyzABC123` and the price an ID like `price_1RxyzABCxxxx`. **Copy the price ID** — that's what the runner needs.

---

## Step 2 — Set the env var on `aims-vps coastal-runner`

SSH to `aims-vps` and update the runner container's environment:

```bash
ssh myclaw-vps   # or aims-vps per your alias
docker exec coastal-runner sh -c 'echo "STRIPE_COASTAL_MEMBERSHIP_STANDARD_PRICE_ID=price_1RxyzABCxxxx" >> /etc/coastal-runner.env'
docker compose -f /docker/coastal-brewing/docker-compose.yml up -d coastal-runner
```

Replace `price_1RxyzABCxxxx` with the actual price ID from Step 1.

Verify it took:

```bash
docker exec coastal-runner env | grep STRIPE_COASTAL_MEMBERSHIP
# expected: STRIPE_COASTAL_MEMBERSHIP_STANDARD_PRICE_ID=price_1RxyzABCxxxx
```

---

## Step 3 — Smoke test the live flow

1. Open `https://brewing.foai.cloud/membership` in an incognito window
2. Enter a real email (yours or a tester's)
3. Click **Become a member · $199**
4. Browser redirects to `https://checkout.stripe.com/...` — this is the hosted Stripe Checkout page
5. Complete payment (live card or `4242 4242 4242 4242` if you bumped the test-mode toggle accidentally)
6. Browser redirects back to `https://brewing.foai.cloud/membership/welcome?session_id=cs_xxxxx`
7. Within ~10 seconds, your owner Telegram channel should ping with a message like:

```
[Coastal Brewing Co.] new Standard Member — ship welcome box.
  email:    you@example.com
  referral: CBC-abc123XY
  action:   ceramic dripper + sticker set + 50g Habbak tin → ship within 10 business days.
```

If the Telegram ping doesn't arrive, check:
- `docker logs coastal-runner | grep membership_report` — look for the webhook event log
- Stripe dashboard → Developers → Webhooks → recent deliveries → confirm 200 OK

---

## Step 4 — Update Stripe webhook subscriptions

In the Stripe dashboard ([dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)):

1. Click the existing endpoint pointing at `https://brewing.foai.cloud/stripe/webhook`
2. Click **Add events**
3. Subscribe to **`customer.subscription.created`** if not already
4. Save

(The runner already handles `checkout.session.completed` for the escalation flow; add `customer.subscription.created` so the new membership branch fires.)

---

## Step 5 — Test-mode parallel setup (recommended)

Repeat Steps 1–4 in **test mode** with a separate price ID:

```
STRIPE_COASTAL_MEMBERSHIP_STANDARD_PRICE_ID_TEST=price_1RtestXxxxxx
```

This lets you verify the full flow with `4242 4242 4242 4242` cards before flipping live, and gives a sandbox for future Phase 5+ coupon work.

---

## How the welcome box gets fulfilled

The Telegram ping you receive contains the customer email + referral code. For the first ~50 members, Sal hand-packs the box manually:

- Ceramic pour-over dripper (V60-style, owner-sourced from the wholesale partner)
- Coastal Brewing Co. storefront-window-etching sticker set (5 stickers)
- 50g foil-lined tin of Habbak (Saudi Hassawi mint, sourced from the Lorton, VA tea partner)
- Hand-written welcome card with the referral code

Ship within 10 business days per the membership terms (page §4 T&Cs).

When volume passes ~50/wk, automate via a shipping-label API integration (separate Phase). For now, manual fulfillment is the proof-of-concept and gives Sal direct contact with each founding member.

---

## Phase 5 (next) — `MEMBER_15` coupon

Future work. Plan:

1. **Stripe coupon** — In dashboard, create a coupon `MEMBER_15`:
   - 15% off
   - Forever
   - Restricted to active member customers (via Customer metadata flag `membership_tier` — includes `standard`, plus grandfathered `lifetime_member`/`lifetime_concierge` records from before 2026-05-11 retirement)
2. **Webhook extension** — On `customer.subscription.created` for membership product, also set the Customer metadata `membership_tier=standard` and apply the coupon.
3. **Checkout integration** — On every retail checkout session created for a member-flagged customer, attach `discounts: [{coupon: "MEMBER_15"}]`.

This ships in a separate PR once the Phase 1–4 flow is verified live.

---

## What this runbook is NOT

- **Not a Lifetime tier setup** — Coastal Lifetime tiers were retired 2026-05-11 (see `lifetime-tier-positioning-2026-05-11.md`). Lifetime is now AIMS / Plug-Me-In licensee tier, handled separately under the AIMS stack — not in this runbook.
- **Not the retail Shopify-TCR path** — bag/SKU sales stay on Shopify per canon.
- **Not multi-vertical** — when other verticals (Per|Form, CTI Hub) need their own membership-style products, they get their own runbooks following the same pattern.

---

## Failure modes + safety

- **Wrong price ID in env** → `/api/membership/checkout` returns 503 with "checkout session mint failed". Frontend shows the error; owner gets no spurious telegram.
- **Webhook signature mismatch** → handler returns 400; Stripe retries automatically.
- **Telegram down** → membership still records (in the runner ledger); just no owner ping. Owner can audit via Stripe dashboard subscriptions.
- **Stripe down** → checkout fails fast at the API call; frontend shows fallback to `members@coastalbrewing.co`.

No path silently fails. Every error is either visible to the customer or recorded for owner review.

---

*Made in PLR · Coastal Brewing Co.*
