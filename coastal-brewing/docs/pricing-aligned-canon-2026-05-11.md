# Aligned-Pricing Canon — 2026-05-11 PM

> **Owner directive (verbatim):** *"Align all pricing to be at or
> slightly above the competition pricing, with a buffer for our
> Agentic add-on."*
>
> **Supersedes:** the Anchor→Haggle→Landing model
> (`reference_coastal_anchor_haggle_landing_canon_2026_05_09`) for
> **catalog MSRPs**. The anchor-haggle mechanic stays available as a
> SUPPLEMENTAL negotiation surface for high-touch retail + B2B via
> Sal/LUC/ACHEEVY/Melli, but the **catalog starting price is now
> market-aligned + Agentic buffer**, not a 60%-margin opening anchor.
>
> **Source of market data:** external deep-research report
> `iCloudDrive/.../Pricing in the marketdeep-research-report.md`
> (236 priced items, U.S. benchmark, May 12 2026).

## Formula

```
canon_msrp = research_market_top × 1.15 (Agentic buffer)
           → rounded to next $X.99 anchor
           → floor-enforced (must clear cost + $1.50)
```

- **`research_market_top`**: upper bound of the research's "fair price"
  range per cohort. Reflects the highest defensible specialty retail
  competitor in each category.
- **`1.15` Agentic buffer**: the premium for the team-managed-counter
  experience (Sal/LUC/ACHEEVY/Melli), personalized Custee intake,
  hand-written welcome card, brand-consistency memory, and the
  proof-of-concept halo for FOAI licensees. "Slightly above" interpreted
  as 15% — middle of the 10-20% reasonable band.
- **`$X.99` anchor**: psychological-pricing convention. `_round_to_anchor`
  in `catalog.py` handles the rounding.
- **Floor enforcement**: cost + $1.50 wins. Two cohorts hit the floor
  before alignment completes — see §Cost constraints below.

## Canon table

| Category | Size | New MSRP | Old MSRP (60% anchor) | Research market top |
|---|---:|---:|---:|---:|
| Coffee (Tier A blends + single-origin) | 12oz | $28.99 | $43.99 | $25 |
| Coffee | 1lb | $33.99 | $56.49 | $25 |
| Coffee | 2lb | $49.99 | $94.49 | $44 |
| Coffee | 5lb | $142.99 | $176.49 | $125 |
| Specialty Coffee (Whiskey Barrel / Cold Brew / Coffee of the Month) | 12oz | $34.99 | $47.49–$48.49 | $31 |
| Specialty Coffee | 5lb | $164.99 | $193.99 | $150 |
| Flavored Coffee | 12oz | **$19.99** † | $43.49 | $16 |
| Flavored Coffee | 1lb | **$24.99** † | $54.99 | $20 |
| Flavored Coffee | 2lb | $41.99 | $92.49 | $42 |
| Flavored Coffee | 5lb | $99.99 | $173.99 | $90 |
| Tea (loose-leaf cylinder) | 3oz | $18.99 | $36.49 | $16 |
| Tea (ceremonial matcha tin) | 1oz | $50.99 | $44.49 | $45 |
| K-Cups | 12pk | **$17.99** † | $36.49 | $13 |
| K-Cups | 48pk | $45.99 | $90.99 | $40 |
| Instant Coffee | 3oz | $38.99 | $46.99 | $34 |
| Functional Coffee (mushroom blend) | 8oz | $56.99 | $50.99 | $50 |
| Functional Hojicha / Instant | 3oz | $56.99 | $50.99 | ~$50 |
| Functional Matcha | 1oz | $56.99 | $50.99 | ~$50 |
| Sampler (6×2oz drip bags) | bundle | $30.99 | $44.49 | $27 |

† **Cost-floor anchored** — see §Cost constraints below.

## Implementation

`scripts/catalog.py`:

- New module-level dict `_ALIGNED_MSRP_BY_CATEGORY_SIZE: dict[tuple[str, str], float]`
  is the canon source of truth. Keys are `(category, size)` tuples
  matching the SKU schema.
- `_compute_msrp()` checks the table FIRST; SKUs not in the table fall
  back to the legacy margin-policy compute (used by bundles + ad-hoc
  SKUs).
- After resolution, the cost-floor (`landed_cost + $1.50`) is enforced —
  if any source produces an MSRP below floor, floor wins (next $X.99
  above floor).

`tests/test_aligned_pricing.py` (new, 23 cases):

- Pins every `(category, size)` anchor in the canon table — drift fails CI.
- Probes representative SKU resolutions (`coastal-italian-roast-12oz`,
  `coastal-dubai-chocolate-12oz`, K-Cup 12pk) to confirm `_compute_msrp`
  → canon path works.
- Sanity-checks the floor enforcement across every non-retired SKU.

## What did NOT change

- **Tier subscription pricing** (Pooler Pass / Custee Card / Wood Stork
  monthly retail anchors at $7.49 / $14.99 / $29.99 / $74.99 / $149.99).
  Per PR #415 these are envelope-bounded tiers with different
  competitive set (multi-month commitment, mix-and-match within
  envelope, free shipping). Custee Card 9mo bill of $22.49 already lands
  inside the research's $22-28 coffee-sub fair zone.
- **Cost-floor rule** (cost + $1.50). Non-negotiable. Now layered on top
  of canon anchors as a safety net.
- **Anchor-haggle mechanic.** Sal/LUC/ACHEEVY/Melli can still negotiate
  on high-touch orders. The difference: the starting catalog price is
  now market-aligned, so haggle headroom is smaller (the heavy
  discounting was the old 60%-anchor's job; now haggle is for genuine
  service-recovery + B2B volume).
- **Bundles + retired legacy subscription SKUs.** Bundles fall through
  to margin-policy compute (out of scope for this PR). Retired SKUs
  remain filtered per PR #418.

## Cost constraints (TCR wholesale exceeds research market top)

Two cohorts cannot be aligned to "research market top × 1.15" because
TCR's wholesale + fulfillment cost exceeds even that target:

| Cohort | Cost (landed) | Floor ($cost + $1.50) | Research top × 1.15 | Canon (floor-anchored) | Effective premium vs market |
|---|---:|---:|---:|---:|---:|
| Flavored 12oz | $18.07 | $19.57 | $17.93 (impossible) | $19.99 | +25% over market top $16 |
| Flavored 1lb | $22.95 | $24.45 | $22.94 (impossible) | $24.99 | +25% over market top $20 |
| K-Cup 12pk | $16.30 | $17.80 | $14.95 (impossible) | $17.99 | +38% over market top $13 |

**Implication:** flavored coffee and 12-pack K-Cups will read as "slightly
above market" even at canon-floor prices — competitors achieve their
$16/$13 market tops because their wholesale costs are far lower than
TCR's. Three potential responses (deferred to owner ratification):

1. **Renegotiate TCR pricing** on flavored beans + 12-pod K-Cup format
2. **Find an alternative supplier** for these two specific lines
3. **Reposition** flavored + 12pk K-Cups as "premium specialty" so the
   above-market price is brand-consistent rather than apologetic
4. **Discontinue** the affected SKUs (most aggressive)

The current canon ships option (3) by default — keep the line, price at
floor, brand the premium as Agentic + brand-consistency.

## Open follow-ups

1. **Bundles** (`coastal-discovery-bundle`, `coastal-pantry-refill`,
   `coastal-gift-bundle`) still resolve via margin-policy compute. Once
   their canon anchors are derived from the new SKU prices, add them to
   the aligned table.
2. **`/pricing` page tier comparison table** unchanged this PR — its
   values reflect tier subscriptions (Pooler/Custee/Wood Stork), not
   per-SKU retail. The product catalog pages will surface the new MSRPs
   automatically via `list_products()`.
3. **TCR supplier renegotiation** on flavored + 12-pod K-Cup format —
   real margin pressure, owner-strategic decision.
4. **`market-pricing-research-2026-05-09.md`** explicitly states "No
   catalog price changes from market research. Per-category retail
   recommendations in this doc become **landing-zone targets** for the
   negotiation envelope, not catalog MSRPs." That sentence is now
   superseded by this canon doc — would benefit from an inline
   correction pointing here.
5. **`reference_coastal_anchor_haggle_landing_canon_2026_05_09`** memory
   entry remains canon for negotiation mechanics but should be updated
   to clarify: anchor = catalog (market-aligned), haggle = small
   service-recovery / B2B-volume window, landing = "near catalog" rather
   than "30-40% below catalog."

## Files touched in this PR

| File | Change |
|------|--------|
| `coastal-brewing/scripts/catalog.py` | New `_ALIGNED_MSRP_BY_CATEGORY_SIZE` dict; `_compute_msrp()` consults the table first; floor enforcement layered on as safety net |
| `coastal-brewing/tests/test_aligned_pricing.py` | NEW — 23 cases pinning the canon table + representative SKU resolutions + sitewide floor sanity check |
| `coastal-brewing/docs/pricing-aligned-canon-2026-05-11.md` | NEW — this doc |
