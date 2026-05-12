# Pricing Research Response — 2026-05-11

> **Status:** Read of external deep-research report (received 2026-05-11 PM)
> against current Coastal canon. Documents what's already canon-compliant,
> what's a real canon gap, and what's a one-shot catalog cleanup (shipped).
>
> **Source:** `iCloudDrive/.../Pricing in the marketdeep-research-report.md`
> (236 priced items, U.S. benchmark, May 12 2026).

## TL;DR

The research is accurate against our **real catalog prices** — they match to the penny. Most of the variance (~60% of the catalog) is **explained by the Anchor→Haggle→Landing canon** that the research wasn't told about. The remaining ~40% surfaces three things:

1. **A canon-gap for K-Cups** (no defined landing zone) — needs ratification
2. **A canon-gap for seasonal SKUs** (no May lifecycle policy) — needs ratification
3. **A cleanup** (legacy retired subscription SKUs were still visible to scrapers) — **fixed in this PR**

Catalog prices stay where they are. The research's "fair price" recommendations are not a price reset — they are validation of the existing canon landing zones (`reference_coastal_anchor_haggle_landing_canon_2026_05_09`).

## What the research found

| Cohort | Catalog (anchor) | Research "fair" | Variance vs midpoint |
|---|---:|---:|---:|
| Core coffee 12oz | $43.99–$46.49 | $21–$25 | +106% |
| Core coffee 1lb | $56.49–$61.49 | $22–$26 | +157% |
| Flavored 12oz | $43.49 | $13–$16 | +193% |
| Specialty 12oz | $47.49–$48.49 | $25–$31 | +78% |
| Loose tea 3oz | $36.49 | $12–$16 | +170% |
| Hojicha 3oz | $44.49 | $15–$22 | +168% |
| Matcha 1oz | $44.49 | $32–$45 | +26% (research called this "defensible") |
| K-Cups 12-ct | $36.49/$37.49 | $9–$13 | +216% |
| K-Cups 48-ct | $90.99 | $30–$40 | +171% |
| Instant 3oz | $46.99 | $29–$34 | +57% |
| Samplers | $44.49 | $20–$27 | +113% |
| Coffee subscription | $39.49/mo | $22–$28/mo | +80% |

## What's canon-compliant (no change needed)

Most of these gaps are intentional anchor-haggle theater per
`reference_coastal_anchor_haggle_landing_canon_2026_05_09.md`:

- **Catalog MSRP IS the opening anchor at 60% margin** — `coastal-brewing/scripts/catalog.py:11-14` ("Final Coastal MSRP commits when owner reviews competitor reference price bands"), `market-pricing-research-2026-05-09.md` L22-29.
- **The research's "fair price" IS the canon landing zone.** Italian Roast 12oz: anchor $43.99 → Sal-haggle landing $26-32 retail / Melli-stacked B2B landing $20-24 — exactly the research's $21-25 band.
- **Haggle authority caps:** Sal 5-15% auto / 20% conditional · LUC 25% · ACHEEVY 30% · Melli +15% B2B stack. Floor = cost + $1.50.
- **`_MARGIN_FLOOR_BY_CATEGORY` STAYS at 60% default. No catalog price changes from market research.** (`market-pricing-research-2026-05-09.md` L29 — owner directive.)
- **`pricing-margin-model-2026-05-09.md` was superseded** by `market-pricing-research-2026-05-09.md` on the same date. The $24.99 final-retail proposal at L48 of the margin-model doc is NOT current canon. Current canon: catalog $43.99 stays as anchor; $24.99-$32 is the landing zone Sal/LUC/ACHEEVY haggle to.

**Methodological note for any future research:** the deep-research report compares opening anchors to market closing prices, which is invalid for a haggle-led storefront. Research never asked "what's the haggled close rate?" — without that, the +106% variance reads as "we're 2x the market" instead of "our opening is 2x the market and we close into the market."

## Real canon gaps the research surfaced

### Gap 1: K-Cups have no canon landing zone

`coastal-billing-matrix-spec-2026-05-09.md` Dimension 4 (category multipliers, L60-75) does not include a K-Cup row. Anchor is $36.49 (12-ct) / $90.99 (48-ct). Even at maximum stacked haggle (Sal 20% + LUC 25% = ~45% combined cap), the 48-ct lands ~$50 — still above the research's $30-$40 ceiling.

K-Cups are commodity-pressured. Mass retail (Walmart Green Mountain 48-ct = $27.67; McCafé $27.97; Tim Hortons $31.32) compresses the acceptable street price. Anchor-haggle theater doesn't recover this category because the haggle ceiling is below market.

**Owner ratification needed:**
- Should K-Cups have their own landing zone (e.g., 12-ct → $13-18 landing, 48-ct → $35-50 landing)?
- Should haggle authority for K-Cups extend higher (e.g., ACHEEVY 50% to land $90.99 at $45)?
- Should the K-Cup line be deprioritized in favor of bag-coffee margins?
- Or should K-Cups be repositioned (e.g., compostable pods premium, subscription-locked) to defend the current anchors?

### Gap 2: Seasonal SKUs have no May lifecycle rule

Canon is silent on the lifecycle of Pumpkin Spice / Christmas Blend / Candy Cane / Holiday Blend. These are LTOs (limited-time offerings) in standard retail — Equator's Holiday Blend says "available through the end of the year"; Starbucks' Christmas Blend launches early November. Carrying them in May without markdown:

- suppresses conversion (out-of-season customers don't pull seasonal flavors)
- raises stale-inventory risk
- breaks the "every cup feels intentional" brand promise

**Owner ratification needed:**
- Auto-discount seasonal SKUs ~30% Jan–Sep, full price Oct–Dec?
- Unlist seasonal SKUs Oct–Dec for fresh-batch refresh, relist Nov 1?
- Move seasonal SKUs to a `seasonal: { active_months: [...] }` field that `list_products()` filters against the current month?

## What's fixed in this PR (cleanup)

The legacy 4-product subscribe-flow SKUs (`coastal-coffee-monthly` / `coastal-tea-monthly` / `coastal-combo-monthly`) were retired 2026-05-11 when the per-tier `ProductMatrixPicker` shipped (PR #409-#411). But the SKU records remained in `scripts/catalog.py` `PRODUCTS` dict at lines 4735-4786 — so:

- `list_products()` returned them in customer-facing catalog responses
- `get_product()` resolved them at recomputed margin MSRPs
- `recommend_bundle()` (Sal's chat recommender) picked them on `size=monthly` probes
- External scrapers (including this research) saw them at $34.99 / $26.99 / $59.99 → 55%-margin MSRPs $39.49 / $30.99 / $67.49

**Fixed by this PR:**

- Each of the 3 SKUs now carries a `retired_at: "2026-05-11"` field + `retired_reason` pointer to PR #409-#411.
- `list_products()` skips retired SKUs (customer-facing).
- `get_product()` returns `None` for retired SKUs.
- `list_products_internal()` + `get_product_internal()` still resolve retired SKUs (audit, margin calc, grandfathered Stripe billing keep working).
- `recommend_bundle()` filters retired SKUs from picks and falls back to the Discovery Bundle + a tier-upsell nudge if filtering leaves picks empty.
- `tests/test_retired_skus.py` (7 cases) pins the filter behavior.

The 4th legacy SKU (`coastal-functional-coffee-monthly`) referenced in `tests/test_membership_subscribe.py` is **not in `PRODUCTS`** — never landed in the catalog dict, no cleanup required.

## What did NOT change

- Catalog MSRP anchors — all 31 core coffee 12oz at $43.99, 16 flavored at $43.49, etc. Per canon, those are opening anchors and stay where they are.
- Margin policy (`_MARGIN_FLOOR_BY_CATEGORY`) — stays at 60% default.
- Anchor→Haggle→Landing model — unchanged. Research validates it (their "fair prices" are our landing zones).
- The pricing-margin-model-2026-05-09.md's $24.99 proposal — remains superseded.

## Files touched in this PR

| File | Change |
|------|--------|
| `coastal-brewing/scripts/catalog.py` | Added `retired_at` + `retired_reason` to 3 legacy sub SKUs; filtered them out of `list_products` / `get_product` / `recommend_bundle`; fallback to Discovery Bundle when filter leaves picks empty |
| `coastal-brewing/tests/test_retired_skus.py` | NEW — 7 cases pinning the filter |
| `coastal-brewing/docs/pricing-research-response-2026-05-11.md` | NEW — this doc |

## Open items (owner ratification)

1. **K-Cups landing zone:** define canonical landing values OR redirect the category (compostable / sub-locked / sunset). Suggested starting point: 12-ct landing $13-18, 48-ct landing $35-50, with extended haggle authority on this category specifically.
2. **Seasonal SKU lifecycle:** auto-markdown vs unlist; January 1 baseline.
3. **Optional follow-up:** add a TCR-direct-consumer-price field per SKU + enforce the canon "never above TCR" ceiling as a code gate (currently only enforced manually via owner review). The research didn't have access to TCR consumer prices but the memory rule is unambiguous.
