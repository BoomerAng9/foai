# 09 — Billing Path Options for Coastal Brewing

Coastal Brewing's customers are coffee buyers, not Deploy Platform users. The cti-hub Sqwaadrun checkout pattern (`~/foai/cti-hub/src/app/api/stripe/sqwaadrun/checkout/route.ts`) requires `requireAuthenticatedRequest` + Firebase/Insforge auth + a `profiles.stripe_customer_id` row in Neon. That doesn't fit B2C coffee.

The `stepper-billing-proxy.ts` type discriminator now accepts `'coastal-brewing'` (additive, no behavior change). The actual checkout route is one of three options below — owner picks before code is written.

## Option A — Force Deploy Platform sign-in for coffee buyers

- Coastal subscribers create a Deploy Platform account first.
- Reuses sqwaadrun's pattern verbatim — auth gate, profile lookup, Neon write.

**Pros:** zero new infrastructure; ready to ship immediately.
**Cons:** terrible UX. A coffee buyer should not need a developer-platform account to subscribe. Brand damage. Conversion floor.

**When it fits:** never recommended for B2C; only viable if Coastal subscribers are exclusively existing Deploy users (not the case).

## Option B — Anonymous checkout in cti-hub

- New cti-hub route at `/api/stripe/coastal-brewing/checkout` that accepts email + tier without Deploy auth.
- Stripe creates customer at session-create with email metadata.
- New Neon table `coastal_subscribers` (email PK, stripe_customer_id, status, tier).
- Webhook handler branches in `~/foai/cti-hub/src/app/api/stripe/webhook/route.ts` on `metadata.product === 'coastal-brewing'`.

**Pros:** keeps the Stepper/Stripe spine canonical; one billing module across all FOAI products; reuses the cti-hub Stripe webhook signature verification.
**Cons:** new auth shape inside cti-hub; new table; cross-app concern (cti-hub now serves coffee customers); rate-limit policy needs decision (per-email or per-IP).

**When it fits:** if owner wants ALL FOAI billing to flow through cti-hub regardless of customer type. Aligns with "the canonical Stepper architecture" framing.

## Option C — Runner handles checkout directly at `brewing.foai.cloud`

- Add a `/checkout` endpoint to `scripts/api_server.py`.
- Runner calls Stripe SDK directly; webhook lands at `brewing.foai.cloud/stripe/webhook`.
- Subscriber record lives in Coastal's own Hermes DB (`hermes/coastal_brewing.db`).
- cti-hub's `stepper-billing-proxy.ts` is NOT involved.

**Pros:** clean separation — Coastal Brewing is its own commerce surface; coffee buyers never see Deploy Platform infrastructure; Hostinger Ecommerce migration is simpler (just swap the runner's checkout for the Hostinger storefront).
**Cons:** duplicates Stripe code (sqwaadrun's pattern not reused); duplicates webhook signature verification; small risk of drift between Coastal billing and the rest of FOAI.

**When it fits:** if Coastal Brewing should look and feel like an independent coffee company, not a Deploy Platform plug. Matches the "no Shopify" / "Hostinger Ecommerce future" posture: brewing.foai.cloud is sovereign.

## Recommendation

**Option C** for the interim (pre-Hostinger Ecommerce). Reasons:

1. UX matches the brand — coffee customer never sees FOAI infrastructure.
2. Hostinger Ecommerce migration is a swap-out at the runner, not a refactor across cti-hub.
3. The `stepper-billing-proxy.ts` type extension is still useful: when the runner publishes Stripe webhooks back to Stepper for receipt logging, it can cite `product: 'coastal-brewing'` consistently with the rest of FOAI.
4. Keeps cti-hub's auth model clean (Deploy Platform users only).

When Hostinger Ecommerce launches, **Option C migrates seamlessly:** the runner's checkout endpoint is replaced by Hostinger Ecommerce's checkout, but webhook ingestion + Hermes receipt writing stay the same.

## Next concrete step (after owner picks)

- **A or B chosen:** I write `~/foai/cti-hub/src/app/api/stripe/coastal-brewing/checkout/route.ts` mirroring sqwaadrun's pattern (with auth-gate or anonymous as picked).
- **C chosen:** I add `POST /checkout` to `scripts/api_server.py` + add a Stripe SDK adapter at `scripts/adapters/stripe.py` + ship a Coastal-specific webhook handler at `POST /stripe/webhook`.

In all three, owner provisions Stripe products in dashboard first and adds the price IDs to the runner's `.env`:

```
STRIPE_COASTAL_COFFEE_SUB_PRICE_ID=
STRIPE_COASTAL_TEA_SUB_PRICE_ID=
STRIPE_COASTAL_COMBO_SUB_PRICE_ID=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```
