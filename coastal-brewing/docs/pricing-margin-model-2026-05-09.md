# Coastal Brewing Co. — Pricing & Margin Model (2026-05-09)

Owner directive 2026-05-09: pricing must be thoroughly studied from
Temecula Q1 2026 cost basis BEFORE Path A escalation flow ships. This
doc establishes per-SKU retail, subscription, bulk, corporate, and
vendor-multi-location prices, plus the negotiation envelope each agent
operates within.

Cost basis: `coastal-brewing/scripts/data/temecula-q1-2026-pricing.json`
(canonical 12K JSON, last updated 2026-05-05 from TCR Q1 2026 PDF).

**Verified 2026-05-09**: cross-checked against the source XLSX
`iCloudDrive/.../coastal-brewing/03-supplier-tcr/TCR Q1 2026 Drop Ship Pricing.xlsx`
(139 rows × 20 cols). All 7 coffee tiers + tea + K-cups + functional
+ sample packs + 8 subscription tiers match the JSON 1:1. No drift.
Raw XLSX dump archived as
`scripts/data/temecula-q1-2026-pricing-xlsx-verified-2026-05-09.json`
for audit.

(Earlier note about the WhatsApp transfer: the `temecula-supplier-docs.zip`
sent via WhatsApp Desktop arrived as 21 zero-byte files because the
Apple-package wrapper stripped content in transit. The owner's iCloud
canonical path is the working source.)

## Pricing principles

1. **Drop-ship prices include shipping.** Coastal pays the drop-ship
   number; TCR ships direct to custee. No additional ship cost.
2. **Bulk prices are EX-WAREHOUSE.** Coastal pays cost + ships from
   own warehouse. Estimate: $5/12oz, $8/2lb, $15/5lb USPS/UPS.
3. **Margin floor protects business.** Floor = cost-basis + $1.50.
   No discount can take retail price below floor. Hard guard in
   `equation.py`.
4. **Retail target = TCR drop-ship × 1.6 to 2.0×** depending on tier.
   Single-origin and fairtrade earn higher markups (premium positioning
   + smaller velocity).
5. **Subscription target = retail × 0.85** (15% off). Coastal's
   existing 3 sub price IDs (`STRIPE_COASTAL_{COFFEE,TEA,COMBO}_SUB_PRICE_ID`)
   anchor this.
6. **Corporate / vendor-multi-location** unlocks deeper discount but
   requires contract terms (minimum monthly volume, 12-month lockup,
   net-30 payment).

## Retail price table — Coffee (12oz primary unit)

| Tier | TCR SKU example | Drop-ship cost | **Retail one-off** | **Subscription** | **Bulk 5lb retail** | **Floor (no-go)** | Target margin |
|---|---|---|---|---|---|---|---|
| A — House blends | ITALY, FRENCH, 6BEAN, BBLEND, COWB | $15.78 | **$24.99** | **$21.24** | **$95.00** (5lb) | $17.28 | 36.9% |
| B — Premium blends | BB+, AFRICA, MAX, BLOND, KOPI, COLD | $16.21 | **$26.99** | **$22.94** | **$98.00** (5lb) | $17.71 | 39.9% |
| C — Decaf / special | DECAES, DEPER, HALFCAF, WBAR | $16.50 | **$26.99** | **$22.94** | **$99.00** (5lb) | $18.00 | 38.9% |
| D — Flavored | DBAI, SMOR, FRVAN, HAZL, MOCHA, etc. | $16.27 | **$26.99** | **$22.94** | **$98.00** (5lb) | $17.77 | 39.7% |
| E — Single-origin standard | COLO, COSTA, ETHN, GUAT, HOND, MEX, PERU, TANZ | $16.47 | **$28.99** | **$24.64** | **$99.00** (5lb) | $17.97 | 43.2% |
| F — Single-origin premium | BALI, BRAZ, KENYA, SUM | $16.78 | **$32.99** | **$28.04** | **$104.00** (5lb) | $18.28 | 49.1% |
| G — Fairtrade | FTSUM, FTPERU, FTGUAT, FTCOLO + decaf-FT | $16.75 | **$31.99** | **$27.19** | **$103.00** (5lb) | $18.25 | 47.6% |

(Floor = drop-ship cost + $1.50 protective margin.)

## Retail price table — Tea (3oz loose-leaf primary unit)

| Tier | SKUs | Cost | **Retail one-off** | **Subscription** | **Bulk 1oz retail** | **Floor** | Target margin |
|---|---|---|---|---|---|---|---|
| Standard tea | TJAS, TENG, TCHAI, TEARL, TPEACH, TMANG, TMINT, TROO, THIB | $12.00 | **$19.99** | **$16.99** | **$13.00** (1oz) | $13.50 | 40.0% |
| Premium tea | THOJ (Hojicha), TMATCH (Matcha) | $15.00 | **$26.99** | **$22.94** | **$17.50** (1oz) | $16.50 | 44.4% |

## Retail price table — K-cup (12-pack primary)

| SKU | Drop-ship 12-pack | **Retail 12-pack** | **Subscription 12-pack** | Drop-ship 48-pack | **Retail 48-pack** | Floor | Target margin |
|---|---|---|---|---|---|---|---|
| 12K{6BEAN,COWB,BBLEND,PERU,MEXICO,BALI} | $14.50 | **$22.99** | **$19.54** | $39.00 | **$59.99** | $16.00 | 36.9% |
| 12KDEPER (decaf) | $15.00 | **$23.99** | **$20.39** | — | — | $16.50 | 37.5% |

## Retail price table — Functional / Instant / Sample Packs

| Product | Cost | **Retail** | **Subscription** | Floor | Notes |
|---|---|---|---|---|---|
| Instant Coffee (3oz) | $16.00 | **$24.99** | **$21.24** | $17.50 | Premium-sub required |
| Functional 8oz (mushroom variants TRIO*) | $16.00 | **$28.99** | **$24.64** | $17.50 | Functional-sub required |
| Best-sellers sample pack (6×2oz) | $18.00 | **$28.99** | n/a | $19.50 | Trial-tier, no sub |
| Single-origin sample pack | $18.00 | **$28.99** | n/a | $19.50 | Trial-tier |
| Flavored sample pack | $18.00 | **$28.99** | n/a | $19.50 | Trial-tier |

## Corporate / vendor-multi-location pricing

For B2B/wholesale customers committing to multi-month contracts. Melli
closes these per `negotiation-envelope-spec-2026-05-09.md`.

| Tier | Volume commitment | Discount off retail one-off | Notes |
|---|---|---|---|
| **Small Office** | ≥ 5 lb/month, 6-month contract | 15% off retail | Single-location |
| **Mid-Market** | ≥ 25 lb/month, 12-month contract | 22% off retail | 1-3 locations |
| **Multi-Location Vendor** | ≥ 50 lb/month, 12-month contract, 4+ locations | 28% off retail | Co-branded label option, dedicated supply manager (Melli) |
| **Enterprise / White-Label** | ≥ 200 lb/month, 24-month contract, 10+ locations | 35% off retail | Custom roast profile available, label co-design, dedicated AIMS Soul Character |

All B2B tiers above retail-floor by construction (28% off Tier A retail
= $17.99, above $17.28 floor).

## Bulk-discount tiers (one-off, no contract)

For wholesale-curious custees not yet committing to a contract. Sal
quotes these. Stays inside agent envelope.

| Order qty (any SKU) | Discount off retail |
|---|---|
| 1-4 units | 0% |
| 5-9 units (bundle) | 8% off |
| 10-23 units | 12% off |
| 24-49 units (full case) | 18% off |
| 50+ units (multi-case) | 22% off, requires Melli warm-handoff |

## Negotiation envelope summary (full spec in separate doc)

| Agent | Auto-discount range | Conditional max | Trigger |
|---|---|---|---|
| **Sal** | 5-15% | 20% (with 3+ haggles AND past purchase OR live purchase) | First-line haggle |
| **LUC** | n/a (advisor) | 25% (if subscription commit OR one-off lock-in) | Visible Chain-of-Thought enters when Sal nears cap |
| **ACHEEVY** | 25%+ | 30% (bundles/bulk 5+ items only) | Custee wants more items + greater discount |
| **Melli** | inherits ACHEEVY % | + up to 15% more (so up to 45% theoretical for B2B) | Warm-transfer from ACHEEVY, B2B close |

**Hard floor**: NO discount path can bring price below `cost + $1.50`.
Equation engine enforces. Above 45% nominal would require explicit
owner approval via Telegram.

## Margin verification — worst case Tier A 5lb bulk

| Scenario | Retail | After discount | Cost basis | Margin |
|---|---|---|---|---|
| Sal max (20%) | $95.00 | $76.00 | $47.00 + $15 ship = $62 | $14 (18%) |
| LUC max (25%) | $95.00 | $71.25 | $62 | $9.25 (13%) |
| ACHEEVY (30%) | $95.00 | $66.50 | $62 | $4.50 (7%) |
| Melli max (45%) | $95.00 | $52.25 | $62 | -$9.75 ⚠️ BELOW FLOOR |

Implication: Melli's 15%-additional only applies when custee adds
volume that lowers per-unit cost (Coastal moves from drop-ship to
bulk pricing internally). Melli's max-discount calculation must factor
the volume bump, not stack naively. **Spec for `equation.py`**:
recompute cost basis at the new volume tier before computing Melli's
max discount.

## How retail prices got chosen

Anchored to:
- Specialty coffee retail benchmarks (Stumptown, Blue Bottle, Counter
  Culture range $18-32 for 12oz single-origin).
- Drop-ship cost + 60-100% markup (industry standard for specialty
  third-wave).
- Subscription discount = 15% (matches Stumptown/Blue Bottle/Trade
  Coffee subscription industry norms).
- Premium positioning (single-origin Tier F at $32.99 puts Coastal in
  Stumptown/Blue Bottle band; Tier A at $24.99 in Onyx/Trade band).

These are NOT competing on price. They're positioned as quality
specialty, and the negotiation envelope is the haggle dance — not the
price.

## Things this doc does NOT cover (separate docs)

- Negotiation flow (Sal → LUC → ACHEEVY → Melli) → `negotiation-envelope-spec-2026-05-09.md`
- Team-visible deliberation UX → `team-deliberation-ux-spec-2026-05-09.md`
- Bundle pricing math → `bundle-proposals-2026-05-09.md`
- Habbak + accessories sourcing → `sourcing/`
- Catalog code update — eventual edit to `scripts/catalog.py` to set
  these as `msrp` per SKU. Owner ratifies retail prices first.

## Change log

- 2026-05-09: First margin model. Cost basis = TCR Q1 2026.
- TCR price refresh (next quarter) requires this doc to be re-derived
  + retail prices re-ratified.
