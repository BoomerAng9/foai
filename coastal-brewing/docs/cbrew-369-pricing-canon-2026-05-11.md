# C|Brew 3-6-9 Pricing Canon

**Date:** 2026-05-11
**Status:** OWNER-RATIFIED CANON · supersedes flat-annual pricing in `cbrew-tier-mechanics-spec-2026-05-10.md`
**Authority:** Mirrors A.I.M.S. Tesla 3-6-9 vortex pricing model + existing Coastal billing matrix Dimension 1 (`coastal-billing-matrix-spec-2026-05-09.md`)
**Applies to:** Every C|Brew Yearly Subscription tier — Pooler Pass Standard / Pooler Pass Plus / Coastal Custee Card / Wood Stork Standard / Wood Stork Reserve

---

## 1. The 3-6-9 strategy (canon — every tier follows this)

Every C|Brew tier publishes a single **monthly retail price**. From that, four cadence options derive automatically:

| Cadence | Discount | Months paid | Months delivered | Customer-facing framing |
|---|---|---|---|---|
| **Month-to-month** | 0% | 1 | 1 | "Standard. No commitment." |
| **3-month plan** | 15% off retail | 3 | 3 | "First commitment — supporting us." |
| **6-month plan** | 20% off retail | 6 | 6 | "Balance — buying into the mission." |
| **9-month plan** | 25% off retail | 9 | **12** | "Full support — pay 9, get 12." |

The 9-month cadence pays for 9 months at 25% off and **delivers 12 months of access**. That's an effective ~44% discount vs 12 straight monthly payments — the headline value-anchor.

The customer renews at the cadence they chose:
- 3-mo customers → renew every 3 months (4× per year)
- 6-mo customers → renew every 6 months (2× per year)
- 9-mo customers → renew every 12 months (the "year" is 9 mo paid + 3 mo free)

---

## 2. Pricing math (clean monthly retail anchor)

Monthly retail is rounded to clean ascending numbers. The 9-month "annual headline" drifts slightly above the legacy flat-annual anchors ($49/$199/$499/$999) — that's intentional: Sal/LUC/ACHEEVY can **haggle DOWN to those round legacy anchors** during negotiation, which is the demo theater built into the product.

| Tier | Monthly retail | Monthly bill | 3mo total | 6mo total | 9mo total (= 12 mo access) |
|---|---|---|---|---|---|
| **Pooler Pass Standard** | $7.49/mo | $7.49 | $19.10 | $35.95 | **$50.56** |
| **Pooler Pass Plus** | $14.99/mo | $14.99 | $38.22 | $71.95 | **$101.18** |
| **Coastal Custee Card** | $29.99/mo | $29.99 | $76.47 | $143.95 | **$202.43** |
| **Wood Stork Standard** | $74.99/mo | $74.99 | $191.22 | $359.95 | **$506.18** |
| **Wood Stork Reserve** | $149.99/mo | $149.99 | $382.47 | $719.95 | **$1,012.43** |

### Year-over-year savings at each cadence (vs 12 straight monthly)

| Tier | 12× monthly | 4× 3mo | 2× 6mo | 1× 9mo (= 12mo access) |
|---|---|---|---|---|
| Pooler Pass Standard | $89.88 | $76.40 (15% off) | $71.90 (20% off) | **$50.56 (43.8% off)** |
| Pooler Pass Plus | $179.88 | $152.90 (15%) | $143.90 (20%) | **$101.18 (43.7%)** |
| Coastal Custee Card | $359.88 | $305.90 (15%) | $287.90 (20%) | **$202.43 (43.8%)** |
| Wood Stork Standard | $899.88 | $764.90 (15%) | $719.90 (20%) | **$506.18 (43.7%)** |
| Wood Stork Reserve | $1,799.88 | $1,529.90 (15%) | $1,439.90 (20%) | **$1,012.43 (43.7%)** |

### Negotiation envelope on the 3-6-9 anchors

Per Coastal negotiation envelope canon (`reference_coastal_pricing_canon_2026_05_09`):

- **Sal_Ang** (5-15% auto): can haggle 9mo Custee Card from $202.43 down to ~$172
- **LUC** (up to 25% if commit-or-lock-in): can take same 9mo Custee Card to ~$152
- **ACHEEVY** (up to 30% bundle/bulk): can land the 9mo Custee at ~$142 in a bundle
- **Melli Capensi** (+15% B2B): adds wholesale layer on top of Wood Stork tiers
- **Hard floor:** cost + $1.50, NEVER cross

**Marketing phrasing:** "Asking price is $202.43 for the year. Sal might land you at $179. Bring two friends and ACHEEVY can do better." That's the story.

---

## 3. Cadence interaction with Wood Stork referral discount

Wood Stork's tiered referral discount (per `cbrew-tier-mechanics-spec-2026-05-10.md`) applies to the member's **product orders** (coffee bags, gear, etc.). It does **NOT stack on top of the cadence discount on the membership renewal itself**.

| Discount type | Applies to | Stacks with cadence? |
|---|---|---|
| 3-6-9 cadence discount (15/20/25%) | Membership renewal payment | This IS the cadence discount |
| Wood Stork referral discount (18-50%) | Product orders only (bags, gear) | N/A — applied at product checkout, not membership |
| Coastal Custee 15% member discount | Product orders | Replaces the 18% Wood Stork base when in product checkout flow (Wood Stork tier wins) |
| Lifetime Concierge 25% | Product orders | Owner-call: stacks or wins, TBD per renewal contract |

---

## 4. Stripe products + coupons (rebuilt for 3-6-9)

The owner needs to mint **5 tiers × 4 cadences = 20 Stripe products** in dashboard. Each product is a single-payment-then-renewal cadence at the cadence-discounted price.

### Product naming convention

Pattern: `coastal_membership_{tier}_{cadence}`

| Stripe Product ID | Price | Recurring interval |
|---|---|---|
| `coastal_membership_pooler_pass_standard_monthly` | $7.49 | 1 month |
| `coastal_membership_pooler_pass_standard_3mo` | $19.10 | 3 months |
| `coastal_membership_pooler_pass_standard_6mo` | $35.95 | 6 months |
| `coastal_membership_pooler_pass_standard_9mo` | $50.56 | 12 months *(pay 9, deliver 12)* |
| `coastal_membership_pooler_pass_plus_monthly` | $14.99 | 1 month |
| `coastal_membership_pooler_pass_plus_3mo` | $38.22 | 3 months |
| `coastal_membership_pooler_pass_plus_6mo` | $71.95 | 6 months |
| `coastal_membership_pooler_pass_plus_9mo` | $101.18 | 12 months |
| `coastal_membership_custee_card_monthly` | $29.99 | 1 month |
| `coastal_membership_custee_card_3mo` | $76.47 | 3 months |
| `coastal_membership_custee_card_6mo` | $143.95 | 6 months |
| `coastal_membership_custee_card_9mo` | $202.43 | 12 months |
| `coastal_membership_wood_stork_standard_monthly` | $74.99 | 1 month |
| `coastal_membership_wood_stork_standard_3mo` | $191.22 | 3 months |
| `coastal_membership_wood_stork_standard_6mo` | $359.95 | 6 months |
| `coastal_membership_wood_stork_standard_9mo` | $506.18 | 12 months |
| `coastal_membership_wood_stork_reserve_monthly` | $149.99 | 1 month |
| `coastal_membership_wood_stork_reserve_3mo` | $382.47 | 3 months |
| `coastal_membership_wood_stork_reserve_6mo` | $719.95 | 6 months |
| `coastal_membership_wood_stork_reserve_9mo` | $1,012.43 | 12 months |

### Recurring-interval implementation note

Stripe recurring billing supports `interval: month` with `interval_count: 3` (= every 3 months), `interval_count: 6` (= every 6 months), and `interval_count: 12` (= every 12 months). The 9-month cadence specifically uses **`interval: month` + `interval_count: 12`** because the customer is billed once and gets 12 months of access — Stripe doesn't natively support "pay 9 months once, run for 12 months" so we model it as a 12-month interval at the 9-month-equivalent price.

### Coupons (Wood Stork referral, separate from cadence)

`WSTORK_BASE` (18%) / `WSTORK_T1` (25%) / `WSTORK_T2` (35%) / `WSTORK_T3` (45%) / `WSTORK_MAX` (50%) — unchanged from prior spec. These attach to **product orders**, not membership renewals.

### Env vars on coastal-runner (rebuilt)

```
STRIPE_COASTAL_POOLER_PASS_STANDARD_MONTHLY_PRICE_ID
STRIPE_COASTAL_POOLER_PASS_STANDARD_3MO_PRICE_ID
STRIPE_COASTAL_POOLER_PASS_STANDARD_6MO_PRICE_ID
STRIPE_COASTAL_POOLER_PASS_STANDARD_9MO_PRICE_ID
STRIPE_COASTAL_POOLER_PASS_PLUS_MONTHLY_PRICE_ID
STRIPE_COASTAL_POOLER_PASS_PLUS_3MO_PRICE_ID
STRIPE_COASTAL_POOLER_PASS_PLUS_6MO_PRICE_ID
STRIPE_COASTAL_POOLER_PASS_PLUS_9MO_PRICE_ID
STRIPE_COASTAL_CUSTEE_CARD_MONTHLY_PRICE_ID
STRIPE_COASTAL_CUSTEE_CARD_3MO_PRICE_ID
STRIPE_COASTAL_CUSTEE_CARD_6MO_PRICE_ID
STRIPE_COASTAL_CUSTEE_CARD_9MO_PRICE_ID
STRIPE_COASTAL_WOOD_STORK_STANDARD_MONTHLY_PRICE_ID
STRIPE_COASTAL_WOOD_STORK_STANDARD_3MO_PRICE_ID
STRIPE_COASTAL_WOOD_STORK_STANDARD_6MO_PRICE_ID
STRIPE_COASTAL_WOOD_STORK_STANDARD_9MO_PRICE_ID
STRIPE_COASTAL_WOOD_STORK_RESERVE_MONTHLY_PRICE_ID
STRIPE_COASTAL_WOOD_STORK_RESERVE_3MO_PRICE_ID
STRIPE_COASTAL_WOOD_STORK_RESERVE_6MO_PRICE_ID
STRIPE_COASTAL_WOOD_STORK_RESERVE_9MO_PRICE_ID
```

All endpoints return 503 cleanly when the matching env var isn't set. No half-broken state.

---

## 5. Existing Standard Membership ($199/yr flat) — migration path

The current `coastal-standard-membership-spec-2026-05-10.md` and the live `/membership` page describe a flat $199/yr Standard Membership with `coastal_membership_standard_annual` as the Stripe product.

**Migration plan:**

1. **Existing $199/yr members are grandfathered** — they keep the flat $199/yr deal at next renewal, no change. Code path stays in `scripts/membership.py` for the legacy product ID.
2. **New signups go through 3-6-9** — frontend offers cadence picker, defaults to 9mo (best value, biggest headline).
3. **Marketing copy on `/membership` page updates** to lead with "$29.99/mo or $202.43/yr (pay 9, get 12)" framing.
4. **Stripe product `coastal_membership_standard_annual` stays alive** for legacy renewal billing only — no new Custee assigned to it after cutover.

---

## 6. Backend code changes required

### Pure-logic modules (extend, don't replace)

- `scripts/membership_wood_stork.py` — add `cadence_pricing(monthly_retail, cadence)` helper returning the at-cadence total + delivered months
- `scripts/membership_pooler_pass.py` — same helper
- `scripts/membership.py` (legacy Standard Membership) — unchanged; legacy customers keep flat $199 billing
- New `scripts/cadence.py` — single source of truth for the 4-cadence schedule (monthly/3mo/6mo/9mo discount %s + delivered-months math)

### API endpoints (extend, don't break)

- `POST /api/membership/{tier}/checkout` — body adds `cadence` field (`"monthly" | "3mo" | "6mo" | "9mo"`); endpoint resolves the right Stripe price ID per tier × cadence
- New `GET /api/membership/{tier}/cadence-pricing` — returns the 4 cadence prices for a given tier (powers the cadence picker UI without bouncing through Stripe)

### Frontend changes

- `web/components/wood-stork-checkout-form.tsx` — add cadence picker (4 buttons) before email field
- `web/components/pooler-pass-checkout-form.tsx` — same cadence picker after the ZIP gate clears
- New `web/components/cbrew-cadence-picker.tsx` — shared component, takes `tier` + onChange, emits selected cadence
- Each tier landing page (`/wood-stork`, `/pooler-pass`, plus eventually `/membership`) shows all 4 cadence prices in a comparison table at the top

---

## 7. What this changes downstream

| Touched file/concept | Change |
|---|---|
| `cbrew-tier-mechanics-spec-2026-05-10.md` | SUPERSEDES the flat-annual $49/$99/$199/$499/$999 in §1 — but keeps Wood Stork referral % discount table + Pooler Pass geo-gate |
| `annual-membership-pricing-research-2026-05-10.md` | Pricing table is now monthly retail + 4 cadences; "annual" framing becomes "9mo (pay 9, get 12)" specifically |
| `coastal-billing-matrix-spec-2026-05-09.md` | Already canon — this doc just confirms Coastal sits inside it correctly. Cadence defs in Dimension 1 are the source of truth. |
| `web/app/wood-stork/page.tsx` | Update tier price display from "$499 / $999" to monthly + 9mo headline + cadence-picker |
| `web/app/pooler-pass/page.tsx` | Same — replace flat annual with 4-cadence picker |
| `web/app/membership/page.tsx` | Lead-line shifts from "$199/yr" to "$29.99/mo or $202.43/yr (pay 9, get 12)"; legacy customers unaffected |
| `scripts/api_server.py` | Wood Stork + Pooler Pass checkout endpoints add `cadence` param; resolve right price ID |
| `brain.md` | Tier table updated; 4-cadence schedule added under Coastal canon section |

---

## 8. Owner gates remaining

1. **Confirm clean-monthly-retail anchors** ($7.49 / $14.99 / $29.99 / $74.99 / $149.99) — yes / adjust?
2. **Confirm 9mo as default cadence** in the picker UI — yes / surface monthly first?
3. **Stripe dashboard work:** owner mints 20 products + 5 WSTORK coupons (or delegates to Print Press automation when token is in vault)
4. **Migration cutover date** for new-signup Standard Membership flow ($199/yr flat → 3-6-9 cadenced) — owner sets when

---

## Sources

- AIMS Tesla 3-6-9 model: `~/AIMS/frontend/lib/stripe.ts:1-126`
- Coastal billing matrix Dimension 1 (cadences): `coastal-brewing/docs/coastal-billing-matrix-spec-2026-05-09.md:30-82`
- Existing Standard Membership $199/yr canon: `coastal-brewing/docs/coastal-standard-membership-spec-2026-05-10.md`
- Tier-mechanics spec (Wood Stork referral % + Pooler Pass geo-gate stays canon): `coastal-brewing/docs/cbrew-tier-mechanics-spec-2026-05-10.md`
- Negotiation envelope: `reference_coastal_pricing_canon_2026_05_09` memory entry
