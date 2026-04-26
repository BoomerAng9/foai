# 10 — Stripe Products Setup (owner-driven)

This is the exact step-by-step for provisioning Stripe products so the live `/checkout` flow activates. Coastal's runner already speaks the Stripe API; the only blocker is the owner-side dashboard config + secrets.

## Step 1 — create Stripe account (skip if existing)

- https://dashboard.stripe.com → sign up with `bpo@achievemor.io`
- Verify business identity (Coastal Brewing) — needed for live mode
- Stay in TEST MODE for the first end-to-end dry-run

## Step 2 — create the three subscription products

In Stripe Dashboard → Products → "+ Add product":

| Product Name | Description | Price | Billing | Lookup Key (optional) |
|---|---|---|---|---|
| Coastal Coffee — Monthly | One 12oz bag of Coastal Brewing coffee delivered monthly. Cancel anytime. | $17.00 USD | Recurring monthly | `coastal_coffee_monthly` |
| Coastal Tea — Monthly | One Coastal Brewing tea selection delivered monthly. Cancel anytime. | $13.00 USD | Recurring monthly | `coastal_tea_monthly` |
| Coastal Coffee + Tea — Monthly | One coffee bag + one tea selection, delivered monthly. Cancel anytime. | $28.00 USD | Recurring monthly | `coastal_combo_monthly` |

Each product gets a **Price ID** that looks like `price_1Q9...`. Copy each one.

## Step 3 — drop price IDs into Coastal `.env`

On `aims-vps` at `/docker/coastal-brewing/.env`:

```bash
ssh aims-vps
cd /docker/coastal-brewing

# append (replace the placeholders with your real values)
cat >> .env <<'EOF'
STRIPE_SECRET_KEY=sk_test_...           # from Stripe Dashboard → Developers → API keys
STRIPE_COASTAL_COFFEE_SUB_PRICE_ID=price_1Q9...
STRIPE_COASTAL_TEA_SUB_PRICE_ID=price_1Q9...
STRIPE_COASTAL_COMBO_SUB_PRICE_ID=price_1Q9...
EOF
chmod 600 .env

# force-recreate so env reloads
docker compose up -d --force-recreate
```

After restart, `/healthz` should show `"stripe_configured": true`.

## Step 4 — webhook endpoint registration

In Stripe Dashboard → Developers → Webhooks → "+ Add endpoint":

- **Endpoint URL:** `https://brewing.foai.cloud/stripe/webhook`
- **Events to send:**
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- Copy the **Signing secret** (starts with `whsec_...`)

Add to `.env`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

Force-recreate the container again so the webhook secret loads.

## Step 5 — verify (3 tests)

```bash
# 1. /healthz reports stripe_configured: true
curl -sS https://brewing.foai.cloud/healthz | python3 -m json.tool

# 2. /checkout returns a real Stripe Checkout URL (not 503)
TOKEN=$(grep "^COASTAL_GATEWAY_TOKEN=" /docker/coastal-brewing/.env | cut -d= -f2)
curl -sS -X POST https://brewing.foai.cloud/checkout \
  -H "Content-Type: application/json" \
  -H "X-Coastal-Token: $TOKEN" \
  -d '{"tier":"coffee_monthly","customer_email":"test@example.com"}'

# Expected: {"checkout_url":"https://checkout.stripe.com/c/pay/...","session_id":"cs_test_...",...}

# 3. Send a test webhook from Stripe Dashboard → Developers → Webhooks → your endpoint → "Send test webhook"
# Pick "checkout.session.completed". Coastal should log it under /docker/coastal-brewing/stripe_events/<event_id>.json
ssh aims-vps 'ls -la /docker/coastal-brewing/stripe_events/ | tail -5'
```

## Step 6 — first real test purchase (still TEST MODE)

1. Open the checkout_url returned by step 5 test 2
2. Use Stripe test card `4242 4242 4242 4242` with any future expiry + any CVC
3. Complete the purchase
4. Verify:
   - Browser redirects to `https://brewing.foai.cloud/checkout/success?session_id=cs_test_...`
   - Stripe webhook fires `checkout.session.completed` → file appears in `stripe_events/`
   - Coastal-runner AuditLedger records the new subscription (manual: query stripe_events file for the customer + plan)

## Step 7 — switch to LIVE mode

When TEST mode flow is fully proven:

1. Stripe Dashboard → toggle to LIVE mode (top right)
2. Re-create the same 3 products in LIVE mode (separate price IDs)
3. Re-create the webhook endpoint in LIVE mode (separate signing secret)
4. Update `.env` with the LIVE-mode values:
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `STRIPE_COASTAL_*_PRICE_ID=price_...` (live)
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (live)
5. Force-recreate container
6. Now Coastal accepts real customer payments

## Operating contract

Per kit + memory:
- No checkout link surfaces on `brewing.foai.cloud` until step 6 passes in TEST mode
- No live charge happens without owner-approved test purchase first
- Subscription billing changes (cancellation, refund, plan change) all route through `/run` with `risk_tags: ["money", "supplier_change"]` → owner Telegram approval

## Known limitations (will address after step 7)

- Currently no public-facing checkout button on `brewing.foai.cloud/` landing — owner triggers /checkout via API, not yet UI-driven
- No customer self-serve cancellation page — handled via owner approval Telegram for now
- AuditLedger doesn't yet have a `subscriptions` table — webhook events land as JSON files, not DB rows. Migration when subscription volume justifies it.

## Owner action checklist

- [ ] Create Stripe account (or confirm existing)
- [ ] Create 3 subscription products in TEST mode
- [ ] Create webhook endpoint in TEST mode
- [ ] Add 5 env vars to `/docker/coastal-brewing/.env`
- [ ] Force-recreate `coastal-runner`
- [ ] Run 3 verification tests above
- [ ] Run a test purchase end-to-end
- [ ] Approve switch to LIVE mode
- [ ] Re-create products + webhook in LIVE mode
- [ ] Update .env with live keys
- [ ] First real customer purchase
