# C|Brew Tier Mechanics — Wood Stork Referral Discount + Pooler Pass Geographic Gate

**Date:** 2026-05-10
**Status:** Owner-ratified mechanics; pending engineering wire-up
**Companion:** `annual-membership-pricing-research-2026-05-10.md`, `coastal-standard-membership-spec-2026-05-10.md`

---

## 1. Wood Stork — Tiered Referral Discount (PERCENT, not flat $)

Owner directive 2026-05-10: Wood Stork referral credit is a **percent discount that tiers with referral volume**, not a flat dollar amount. Caps at 50% maximum discount.

### Discount-by-volume schedule

| Successful referrals (cumulative) | Discount on Wood Stork member's own orders |
|---|---|
| 0 | 18% (base Wood Stork rate) |
| 1–5 | 25% |
| 5–10 | 35% |
| 10–20 | 45% |
| 20+ | **50% (max — caps here)** |

**Maximum discount: 50%.** Every referral beyond 20 holds at the 50% ceiling — the member doesn't lose anything by continuing to refer, but the discount doesn't increase past 50%.

### Definitions

- **Successful referral:** a new paid Coastal Custee, new Wood Stork member, or new Pooler Pass member who:
  1. Has never been a Coastal Brewing Co. retail customer, subscriber, or member before
  2. Signs up using the Wood Stork member's unique referral code
  3. Completes their first annual fee payment without refund within 90 days

- **Cumulative count:** lifetime running total of successful referrals from this Wood Stork account. Renewals of previously-referred members do NOT count as new referrals (one-time per referred customer). If a previously-referred member cancels and later returns under the SAME referral code, the original credit stands but no new credit is granted.

- **Tier-band edges:** "1–5" means 1 through 5 inclusive (5 referrals = 25% tier). The 6th referral promotes to the next band (35%).

### Apply rules

- Discount is **automatic at checkout** on Wood Stork member's own orders — applied silently via Stripe coupon `WSTORK_<TIER>` keyed by referral count
- Discount **stacks with no other promo** (Coastal Custee 15% does NOT stack on top; Wood Stork tier replaces it)
- Discount applies only to **member's own retail orders** — does NOT discount the new referred member's first payment (the new member pays full annual fee, which is what funds the referrer's tier promotion)
- Discount **does NOT apply to wholesale-pricing orders** (B2B at-cost orders are already below member-discount band per `negotiation-envelope-spec-2026-05-09.md`)
- Discount **does NOT apply to membership renewals** themselves — Wood Stork member still pays full $499 (Standard) or $999 (Reserve) at annual renewal. Discount is on PRODUCTS only.

### Why percent-not-flat-dollar (rationale per owner directive)

Flat $50/successful-referral was proposed in the prior brief. Owner corrected to percent-tiered for these reasons:
1. **Aligns referrer incentive with their own purchasing volume** — bigger Wood Storks (multi-location, corporate) get more discount on their bigger orders, scaling reward to actual usage
2. **Caps Coastal exposure** — flat $50 × unlimited referrals could create runaway credit liability; 50% ceiling is bounded
3. **Cleaner accounting** — % discount is a Stripe coupon configuration, not an issued credit-balance to track
4. **Stronger upsell at each tier-edge** — the jump from 1 to 5 to 10 to 20 referrals creates clear behavioral milestones to celebrate publicly

### Engineering implementation

- **Storage:** new column `wood_stork_referral_count` on `members` table; auto-incremented on referred-member's payment-confirmed webhook
- **Stripe coupon set** (mint at deploy):
  - `WSTORK_BASE` — 18%
  - `WSTORK_T1` — 25% (1–5 referrals)
  - `WSTORK_T2` — 35% (5–10)
  - `WSTORK_T3` — 45% (10–20)
  - `WSTORK_MAX` — 50% (20+)
- **Coupon-application logic:** `scripts/api_server.py` reads `wood_stork_referral_count`, picks coupon per band, attaches to next Stripe checkout session via `discounts` parameter
- **Promotion event:** when a referral pushes member into a new band, fire ACHEEVY-voiced congratulations email + Telegram alert (if member opted in to Telegram channel) — "You hit 5 referrals — your Wood Stork discount jumped to 35% on your next order. Sal sends his thanks."
- **Promotion ledger:** record every band-promotion event in `audit_ledger` with `before/after` discount + triggering referral ID

---

## 2. Pooler Pass — Geographic Gate (50–100 mile radius)

Owner directive 2026-05-10: Pooler Pass is for **customers within 50 to 100 miles** of Pooler, GA ZIP **31322** (NOT a hard 50-mile cutoff as previously drafted).

### Eligibility band

- **Inside 50 mi:** Pooler Pass available + recommended (the natural local tier)
- **50–100 mi:** Pooler Pass available (extended local — Hilton Head, Beaufort, Statesboro, Brunswick, Hinesville, parts of inland GA + SC Lowcountry)
- **Outside 100 mi:** Pooler Pass NOT available — system upsells to Coastal Custee Card ($199/yr) instead

### Geographic enforcement at signup

1. **ZIP entry** — first field on Pooler Pass signup form
2. **Radius check** — server-side calculation against ZIP centerpoint of 31322 using haversine distance to ZIP centerpoint of provided ZIP (use ZIP centerpoint database — `uszipcodes` Python package or equivalent; cached locally)
3. **Three responses:**
   - Distance ≤ 50 mi → "Welcome to Pooler Pass — you're a local. Standard tier is $49/yr or Plus is $99/yr."
   - Distance 50–100 mi → "Pooler Pass is available for your area as Extended Local — same $49/$99 pricing, with the caveat that monthly in-person events may be a drive."
   - Distance > 100 mi → "Pooler Pass is for our 100-mile-radius locals. Coastal Custee Card ($199/yr) is the right fit for you — same discount stack, ships to your door anywhere in the US."

### Address re-verification

- **At signup:** ZIP captured + verified
- **At first in-person redemption:** if member tries to redeem in-store, no further check (presence proves locality)
- **At each renewal:** re-verify shipping ZIP on file. If member moved out of 100-mi band during the year, send 30-day notice + offer to convert to Coastal Custee Card at next renewal (no proration; the year already paid stays valid until renewal date)

### What 50-100 mile band gets that pure-50 does NOT

Same Pooler Pass benefits regardless of band (12% off, free local pickup, member-only events, monthly Sal_Ang voice check-in). The 50-100 band is **eligibility extension**, not benefit-tier difference. Single Pooler Pass product, single price, expanded radius.

### Engineering implementation

- **ZIP database:** ship `data/us_zip_centerpoints.json` with package (lat/lng for every US ZIP)
- **Haversine helper:** `scripts/util/geo.py` — `distance_miles(zip_a: str, zip_b: str) -> float`
- **Signup endpoint:** `POST /api/membership/pooler-pass/signup` — validate ZIP, compute distance, branch on band
- **Renewal cron:** weekly job re-validates Pooler Pass member ZIPs; flags any that crossed the 100-mi threshold for renewal-conversion notice
- **Catalog reference cities** (for marketing copy — confirm distances at engineering time):
  - 50-mi band: Pooler, Savannah, Richmond Hill, Bloomingdale, Garden City, Port Wentworth, Tybee Island, Hilton Head Island, Bluffton
  - 50-100 mi band: Beaufort, Statesboro, Brunswick, Hinesville, Jesup, Vidalia, Walterboro, Charleston (~100mi exact, edge case)

---

## 3. Amazon Marketplace Compliance (sole requirement)

Owner directive 2026-05-10: For Amazon channel, **just comply with Amazon's Terms of Service.** No separate seller-of-record contract step needed beyond what Amazon already requires.

### Compliance checklist (via Print Press skill when it creates the account)

1. **Amazon Brand Registry** — register Coastal Brewing Co. trademark under Coastal's name (requires existing USPTO trademark or in-process application)
2. **Amazon Seller Central account** — Professional plan ($39.99/mo) since Coastal will exceed 40 units/mo
3. **Drop Shipping Policy compliance** (Amazon ToS — already canon):
   - Coastal is Seller of Record on every listing
   - Packaging, packing slips, invoices reference only Coastal Brewing Co. (TCR's brand never appears in customer-facing materials)
   - Coastal handles all returns + customer service (route through ACHEEVY/Sal_Ang)
4. **Grocery & Gourmet Food category requirements:**
   - Product images on white background, 1000×1000+ pixels
   - Ingredient lists per FDA labeling requirements
   - Allergen disclosure
   - Best-by date in product description
5. **Product safety:** FDA Food Facility Registration on file (TCR holds this; Coastal references TCR's FFR via wholesale agreement)
6. **No prohibited claims:** "Nothing chemically, ever" tagline reviewed against Amazon's restricted-claim list (no medical/health claims; flavor + ingredient claims OK)
7. **Returns policy** matches Amazon Marketplace minimum: 30-day return window, free returns for defective items

### What is NOT required (per owner clarification)

- Separate seller-of-record contract step beyond the standard TCR wholesale agreement
- Brand Authorization Letter from TCR (TCR is supplier, not the brand on the bag — Coastal IS the brand)
- LOA from any third party for Coastal-only SKUs (LOA only needed if we ever sell co-branded SKUs)

### Print Press automation scope

When Print Press fires Amazon account creation:
1. Submit Coastal Brewing Co. Brand Registry application
2. Open Seller Central Professional account
3. Bulk-upload initial SKU set (Tier A 12oz at $19.99, Tier B-D at $24.99, Tier F Reserve at $32.99)
4. Configure FBM shipping templates (TCR ships from Temecula, Coastal pays no Amazon storage)
5. Set returns address to Coastal Pooler HQ
6. Wire `Lil_Amazon_Hawk` to ingest order webhooks → fire to TCR fulfillment endpoint

---

## 4. Updated Pricing Summary (all corrections applied)

| Tier | Price | Audience | Member discount | Notes |
|---|---|---|---|---|
| **Pooler Pass Standard** | $49/yr | Local 50-100 mi from 31322 | 12% off in-store + free local pickup | Single Pooler Pass product, expanded radius |
| **Pooler Pass Plus** | $99/yr | Local power-buyers | 12% off + monthly Habbak refill + first dibs | Same geographic band as Standard |
| **Coastal Custee Card** (= existing Standard Membership) | $199/yr | National DTC + Amazon | 15% off + free ship under $15 freight | Refer-2-fee-back unchanged |
| **Wood Stork Standard** | $499/yr | B2B, multi-location, referrers | **18-50% tiered by referral count** | Auto-promotes via Stripe coupon |
| **Wood Stork Reserve** | $999/yr | Licensee prospects | Same 18-50% tier + ACHEEVY pod + LP visit | Discount applies to product orders, not membership renewal |

> Note: Lifetime Member ($999 once) and Lifetime Concierge ($4,999 once) tiers
> were retired from Coastal canon 2026-05-11 per owner directive — lifetime is
> now the AIMS / Plug-Me-In licensee tier only. See
> `lifetime-tier-positioning-2026-05-11.md`.

---

## 5. Open Items

1. **Trademark status check** — Coastal Brewing Co. USPTO filing status needed before Amazon Brand Registry application
2. **TCR wholesale agreement review** — does it need an addendum referencing Amazon Marketplace as a sales channel? Owner-counsel call
3. **ZIP centerpoint database license** — `uszipcodes` is Apache 2.0 (✓), but verify no API-key lock-in
4. **Stripe coupon naming convention** — `WSTORK_BASE/T1/T2/T3/MAX` proposed; confirm or reroute to per-member dynamic coupons
5. **Telegram opt-in for Wood Stork promotion alerts** — separate consent flow vs auto-on by Wood Stork tier?

---

## 6. Files Touched This Round

- `coastal-brewing/web/app/compare/page.tsx` — NEW comparison page
- `coastal-brewing/web/components/nav.tsx` — added "Compare" to top nav + drawer
- `coastal-brewing/web/app/membership/page.tsx` — added "See how we compare" CTA section
- `coastal-brewing/docs/cbrew-tier-mechanics-spec-2026-05-10.md` — THIS FILE
- `coastal-brewing/docs/annual-membership-pricing-research-2026-05-10.md` — to be updated with corrections (next)
