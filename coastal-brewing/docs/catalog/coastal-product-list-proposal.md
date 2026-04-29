<<<<<<< Updated upstream
# Coastal Brewing Co. — Proposed Product List

**Drafted by**: Sqwaadrun research lane
**Date**: 2026-04-29
**Authority**: Owner directive 2026-04-29 — "Organic and Fairtrade only, properly priced against industry"
**Sources**: `vendor-temecula-organic-fairtrade.csv` + `industry-pricing-comparison.csv` (this folder)

---

## CRITICAL OWNER DECISIONS REQUIRED BEFORE SHIP

1. **Temecula tea & matcha lack visible Organic+Fairtrade dual cert at the product-page level.** Only Temecula's six Fairtrade coffees carry Fairtrade. Their teas, matcha, and single-origin coffees do NOT publish dual cert. Coastal's brand promise — "every cup is what the label says it is" — is at risk if we ship Temecula tea/matcha as "Organic+Fairtrade." OPTIONS:
   - (A) Owner contacts Temecula directly for cert documentation on tea/matcha line and we hold ship until verified.
   - (B) We pivot tea+matcha to runner-up vendors with verified dual cert: **Mizuba Tea Co.** for matcha (JAS Organic + Uji single-estate), **Numi Organic Tea** for sachet teas (USDA Organic + Fairtrade dual-cert), or **Rishi Tea** for loose-leaf (Direct Trade + 95%+ organic).
   - (C) We keep Temecula tea but relabel as "small-batch tea" not "Organic+Fairtrade tea" — preserves vendor relationship at the cost of dropping a brand pillar.
2. **The existing `lowcountry-house-blend-12oz` SKU has no direct Temecula equivalent** unless we contract a custom blend. The closest single-origin Fairtrade equivalents are Colombia, Guatemala, Peru. Decision: do we keep "Lowcountry House Blend" as a custom blend (later) or rename SKUs to single-origin now?
3. **Pricing band**: Coastal's current MSRP is $18 for 12oz coffee. Industry verified band: Stumptown $18.50 / Blue Bottle $18 / Equator FT-Organic $19.75 / Counter Culture Organic $21.99 / Temecula Fairtrade direct $24.49. Coastal's wholesale cost for Temecula Fairtrade 12oz is ~$9.75 (estimated). At $18 MSRP and $9.75+$1.80 fulfillment = $6.45 unit margin (35.8%). Owner should confirm: keep $18 (volume play, undercut Temecula direct) OR raise to $19-20 (mid-band, higher margin, signals dual-cert quality).

---

## Coffee SKUs (Temecula Fairtrade — verified)

### `coastal-colombia-fairtrade-12oz`

- **Name**: Coastal Colombia Fairtrade
- **Category**: coffee
- **Size**: 12oz
- **Vendor source SKU**: TCR-FT-COLOMBIA-12OZ
- **Certifications**: Fairtrade (Organic NOT visible — flag for verification)
- **Origin**: Tolima, Colombia
- **Flavor notes**: Caramel sweetness, citrus brightness, milk chocolate finish
- **Proposed Coastal MSRP**: $19.00
- **Proposed wholesale_cost**: $9.75
- **Proposed fulfillment_cost**: $1.80
- **Proposed margin floor**: $4.00
- **Customer-facing blurb**: "Bright Colombian Fairtrade — caramel and citrus, the cup that wakes the day up clean. Sourced through verified Tolima cooperatives."
- **Pricing rationale**: Industry FT-Organic single-origin band is $19.00-$21.99 (Equator $19.75, Counter Culture $21.99). $19 sits at the entry of the verified-cert band — undercuts Counter Culture by $3 and Temecula direct by $5.49.

### `coastal-guatemala-fairtrade-12oz`

- **Name**: Coastal Guatemala Fairtrade
- **Category**: coffee
- **Size**: 12oz
- **Vendor source SKU**: TCR-FT-GUATEMALA-12OZ
- **Certifications**: Fairtrade
- **Origin**: San Marcos, Guatemala
- **Flavor notes**: Clean cup, milk chocolate, soft fruit, balanced acidity
- **Proposed Coastal MSRP**: $19.00
- **Proposed wholesale_cost**: $9.75
- **Proposed fulfillment_cost**: $1.80
- **Proposed margin floor**: $4.00
- **Customer-facing blurb**: "Smooth, balanced Guatemala — soft fruit and chocolate, the everyday cup. From San Marcos cooperatives."
- **Pricing rationale**: Same band logic as Colombia. Pair-priced to encourage trial across origins.

### `coastal-peru-fairtrade-12oz`

- **Name**: Coastal Peru Fairtrade
- **Category**: coffee
- **Size**: 12oz
- **Vendor source SKU**: TCR-FT-PERU-12OZ
- **Certifications**: Fairtrade (lab-tested glyphosate-free)
- **Origin**: Amazonas, Peru (1600-1800m)
- **Flavor notes**: Lemon, herbal, milk chocolate, medium acidity, smooth body
- **Proposed Coastal MSRP**: $19.00
- **Proposed wholesale_cost**: $9.75
- **Proposed fulfillment_cost**: $1.80
- **Proposed margin floor**: $4.00
- **Customer-facing blurb**: "High-altitude Peru Fairtrade — lemon, herbal, milk chocolate. Lab-tested clean. The cup that proves the paper trail."
- **Pricing rationale**: "Lab-tested glyphosate-free" is a Coastal-specific brand asset (aligns to "every cup is what the label says it is"). Justifies sitting in mid-band.

### `coastal-sumatra-fairtrade-12oz` (REPLACES current Sumatra plug in voice-library)

- **Name**: Coastal Sumatra Fairtrade
- **Category**: coffee
- **Size**: 12oz
- **Vendor source SKU**: TCR-FT-SUMATRA-12OZ
- **Certifications**: Fairtrade (URL slug suggests Organic — owner to verify)
- **Origin**: Aceh, Takengon, Sumatra (1100-1600m)
- **Flavor notes**: Dark chocolate, dried fruit, earthy, syrupy body, lingering finish
- **Proposed Coastal MSRP**: $20.00
- **Proposed wholesale_cost**: $10.45
- **Proposed fulfillment_cost**: $1.80
- **Proposed margin floor**: $4.50
- **Customer-facing blurb**: "Slow-roasted Sumatra Fairtrade — low acid, deep body, the porch-mornin' cup. Grade 1 Triple Pick from KBQB cooperative."
- **Pricing rationale**: Anchor to existing voice-library Sumatra pitch. Slight premium ($1 above Colombia/Guatemala/Peru) reflects medium/dark roast cost and KBQB cooperative reputation. Still below Temecula direct ($24.49) and Counter Culture ($21.99).

### `coastal-honduras-darkroast-12oz`

- **Name**: Coastal Honduras Dark Roast Fairtrade
- **Category**: coffee
- **Size**: 12oz
- **Vendor source SKU**: TCR-FT-HONDURAS-12OZ
- **Certifications**: Fairtrade
- **Origin**: Copan, Honduras
- **Flavor notes**: Cocoa, brown sugar, walnut, smooth body
- **Proposed Coastal MSRP**: $20.00
- **Proposed wholesale_cost**: $9.85
- **Proposed fulfillment_cost**: $1.80
- **Proposed margin floor**: $4.50
- **Customer-facing blurb**: "Bold dark-roast Honduras Fairtrade — cocoa, brown sugar, the cup with weight. From Copan cooperatives."
- **Pricing rationale**: Replaces "Lowcountry Dark Roast" with a verifiable Fairtrade origin. Pairs with Sumatra in dark-roast tier.

### `coastal-decaf-peru-fairtrade-12oz` (REPLACES `lowcountry-decaf-12oz`)

- **Name**: Coastal Peru Decaf Fairtrade (Swiss Water)
- **Category**: coffee
- **Size**: 12oz
- **Vendor source SKU**: TCR-FT-PERU-DECAF-12OZ
- **Certifications**: Fairtrade + Swiss Water Process (chemical-free decaffeination)
- **Origin**: Amazonas, Peru
- **Flavor notes**: Smooth body, mild chocolate, low acidity
- **Proposed Coastal MSRP**: $20.50
- **Proposed wholesale_cost**: $10.45
- **Proposed fulfillment_cost**: $1.80
- **Proposed margin floor**: $4.50
- **Customer-facing blurb**: "Swiss-water-process decaf Peru Fairtrade. Full body, no compromise, no chemicals. Ever."
- **Pricing rationale**: Swiss Water + Fairtrade dual-asset story justifies $20.50 vs Counter Culture Slow Motion ($17.99) and Death Wish decaf ($16.44 mass-market). Premium framing, niche audience.

---

## Tea SKUs (PIVOT REQUIRED — see Critical Owner Decision #1)

If owner approves PIVOT to Numi or Rishi for verified dual-cert teas, the SKUs below are placeholder shapes. If owner contracts Temecula for cert documentation, swap vendor_source_sku and re-verify before ship.

### `coastal-breakfast-tea-50ct` (PROPOSED VENDOR: Numi)

- **Name**: Coastal Breakfast Tea
- **Category**: tea
- **Size**: 50ct sachets (or 18ct if Numi's standard)
- **Vendor source SKU**: RUNNERUP-NUMI-FT-ORGANIC-18CT (substitute Numi SKU until decided)
- **Certifications**: USDA Organic + Fairtrade (verified at vendor brand level)
- **Origin**: Multi-origin Assam/Ceylon blend
- **Flavor notes**: Strong, malty, classic breakfast
- **Proposed Coastal MSRP**: $14.00 (matches existing catalog)
- **Proposed wholesale_cost**: $4.50 (Numi 18ct band) — adjust if 50ct Numi pack
- **Proposed fulfillment_cost**: $1.20
- **Proposed margin floor**: $3.50
- **Customer-facing blurb**: "Strong black breakfast tea, whole-leaf, no dust. Organic + Fairtrade — every cup is what the label says it is."
- **Pricing rationale**: Harney & Sons 50ct = $19.99 (no cert). Numi 18ct retail ~$8.99 (dual cert). $14 MSRP for 50ct equivalent sits between — undercuts Harney by $6 with stronger cert story.

### `coastal-jasmine-tea-50ct` (PROPOSED VENDOR: Numi or Rishi)

- **Name**: Coastal Jasmine Green
- **Category**: tea
- **Size**: 50ct sachets
- **Vendor source SKU**: RUNNERUP-NUMI-FT-ORGANIC-18CT
- **Certifications**: USDA Organic + Fairtrade
- **Origin**: Fujian, China (Numi sourcing)
- **Flavor notes**: Hand-paired jasmine blossoms + green tea, medium body, sweet/silky
- **Proposed Coastal MSRP**: $14.00
- **Proposed wholesale_cost**: $4.50
- **Proposed fulfillment_cost**: $1.20
- **Proposed margin floor**: $3.50
- **Customer-facing blurb**: "Hand-paired jasmine and whole-leaf green. Organic + Fairtrade. Sweet, silky, slow."
- **Pricing rationale**: Mirrors existing `coastal-green-tea-50ct` MSRP. Adds origin specificity.

### `coastal-earl-grey-50ct`

- **Name**: Coastal Earl Grey
- **Category**: tea
- **Size**: 50ct sachets
- **Vendor source SKU**: RUNNERUP-NUMI-FT-ORGANIC-18CT (or Rishi loose)
- **Certifications**: USDA Organic + Fairtrade (Numi) — verify Numi has Earl Grey in line
- **Origin**: Sri Lanka Ceylon + bergamot
- **Flavor notes**: Ceylon black + bergamot oil, classic citrus-forward
- **Proposed Coastal MSRP**: $14.00
- **Proposed wholesale_cost**: $4.50
- **Proposed fulfillment_cost**: $1.20
- **Proposed margin floor**: $3.50
- **Customer-facing blurb**: "Ceylon black tea + bergamot oil. Whole-leaf, Organic + Fairtrade. The afternoon-pause cup."
- **Pricing rationale**: Harney 50ct Earl Grey = $19.99. $14 with dual-cert undercuts at $5.99 with a stronger story.

### `coastal-herbal-rooibos-50ct`

- **Name**: Coastal Rooibos Herbal
- **Category**: tea
- **Size**: 50ct sachets
- **Vendor source SKU**: RUNNERUP-NUMI-FT-ORGANIC-18CT
- **Certifications**: USDA Organic + Fairtrade
- **Origin**: South Africa Cederberg
- **Flavor notes**: Naturally caffeine-free, smooth and mild, honey/woodsy
- **Proposed Coastal MSRP**: $14.00
- **Proposed wholesale_cost**: $4.50
- **Proposed fulfillment_cost**: $1.20
- **Proposed margin floor**: $3.50
- **Customer-facing blurb**: "Caffeine-free South African rooibos. Smooth, mild, naturally sweet. Organic + Fairtrade."
- **Pricing rationale**: Replaces existing `coastal-herbal-tea-50ct` with origin specificity.

### `coastal-masala-chai-50ct`

- **Name**: Coastal Masala Chai
- **Category**: tea
- **Size**: 50ct sachets (or 3oz loose if pivoting to Rishi)
- **Vendor source SKU**: TCR-TEA-MASALACHAI-3OZ (Temecula has organic ingredients per product description) OR RUNNERUP-NUMI-FT-ORGANIC-18CT
- **Certifications**: Organic ingredients (Temecula description) — owner verifies whole-product cert
- **Origin**: Assam India
- **Flavor notes**: Organic Assam black + organic cardamom/clove/ginger/cinnamon/star anise/black pepper
- **Proposed Coastal MSRP**: $15.00
- **Proposed wholesale_cost**: $5.00
- **Proposed fulfillment_cost**: $1.20
- **Proposed margin floor**: $3.50
- **Customer-facing blurb**: "Organic Assam + cardamom, clove, ginger, cinnamon. Whole-spice masala chai, every ingredient on the label."
- **Pricing rationale**: Slight premium over plain teas reflects spice complexity. Temecula's chai description was the only tea on their line that explicitly cited "organic" ingredients — best Temecula-tea candidate to retain.

---

## Matcha SKUs

### `coastal-ceremonial-matcha-30g` (PROPOSED VENDOR PIVOT: Mizuba)

- **Name**: Coastal Ceremonial Matcha
- **Category**: matcha
- **Size**: 30g
- **Vendor source SKU**: RUNNERUP-MIZUBA-YOROKOBI-30G
- **Certifications**: JAS Organic + Single-Estate (Mizuba Yorokobi) — verifiable
- **Origin**: Uji, Kyoto, Japan
- **Flavor notes**: Single-estate ceremonial, vibrant emerald, deep umami, no bitterness
- **Proposed Coastal MSRP**: $32.00
- **Proposed wholesale_cost**: $18.00
- **Proposed fulfillment_cost**: $1.20
- **Proposed margin floor**: $7.00
- **Customer-facing blurb**: "Single-estate Uji ceremonial matcha. JAS Organic certified. Whisked the way it was meant to be."
- **Pricing rationale**: Mizuba retail $40. Ippodo Kan $28-36. Coastal at $32 sits below Mizuba direct ($8 savings) and above Ippodo Kan ($4 premium for organic cert that Ippodo doesn't carry). REPLACES Temecula matcha which lacks visible cert.

### `coastal-house-matcha-50g` (DAILY GRADE)

- **Name**: Coastal House Matcha (Daily)
- **Category**: matcha
- **Size**: 50g
- **Vendor source SKU**: Mizuba Daily Matcha (verify cert)
- **Certifications**: Organic (verify on Mizuba product page)
- **Origin**: Uji, Kyoto
- **Flavor notes**: Daily-drinker grade, lattes/smoothies friendly
- **Proposed Coastal MSRP**: $24.00
- **Proposed wholesale_cost**: $12.00
- **Proposed fulfillment_cost**: $1.20
- **Proposed margin floor**: $5.50
- **Customer-facing blurb**: "Daily-drinker matcha. Lattes, smoothies, the morning whisk."
- **Pricing rationale**: Tier below ceremonial, broader-use grade. Encourages adoption beyond once-a-week ceremonial drinkers.

---

## Subscription SKUs (recurring)

### `coastal-coffee-monthly`

- **Name**: Coastal Coffee Monthly
- **Category**: subscription
- **Size**: 12oz/month
- **Vendor source SKU**: rotates through coastal-{colombia,guatemala,peru,sumatra,honduras}-fairtrade-12oz
- **Certifications**: Fairtrade (rotate origin month-to-month)
- **Origin**: Rotating
- **Proposed Coastal MSRP**: $18.00/month
- **Proposed wholesale_cost**: $9.85 (avg)
- **Proposed fulfillment_cost**: $1.80
- **Proposed margin floor**: $3.00
- **Customer-facing blurb**: "One 12oz Fairtrade coffee bag every month. Rotating origins. Cancel anytime."
- **Pricing rationale**: $1 below single-purchase MSRP — subscription incentive. Industry norm: Blue Bottle, Stumptown, Counter Culture all discount subs 5-15%.

### `coastal-tea-monthly`

- **Name**: Coastal Tea Monthly
- **Category**: subscription
- **Size**: 50ct/month
- **Vendor source SKU**: rotating (Numi or Rishi line)
- **Certifications**: Organic + Fairtrade
- **Proposed Coastal MSRP**: $13.00/month
- **Proposed wholesale_cost**: $4.50
- **Proposed fulfillment_cost**: $1.20
- **Proposed margin floor**: $2.50
- **Customer-facing blurb**: "One Organic + Fairtrade tea every month. Rotating selection. Cancel anytime."

### `coastal-combo-monthly`

- **Name**: Coastal Coffee + Tea Monthly
- **Category**: subscription
- **Size**: 12oz coffee + 50ct tea/month
- **Vendor source SKU**: combo of above
- **Proposed Coastal MSRP**: $28.00/month
- **Proposed wholesale_cost**: $14.35
- **Proposed fulfillment_cost**: $2.00
- **Proposed margin floor**: $5.00
- **Customer-facing blurb**: "Coffee + tea every month. The full daily ritual. Cancel anytime."

### `coastal-matcha-monthly` (NEW)

- **Name**: Coastal Matcha Monthly
- **Category**: subscription
- **Size**: 30g/month
- **Vendor source SKU**: RUNNERUP-MIZUBA-YOROKOBI-30G
- **Certifications**: JAS Organic
- **Proposed Coastal MSRP**: $30.00/month
- **Proposed wholesale_cost**: $18.00
- **Proposed fulfillment_cost**: $1.20
- **Proposed margin floor**: $7.00
- **Customer-facing blurb**: "30g of single-estate ceremonial matcha every month. The slow-morning subscription."
- **Pricing rationale**: $2 below single-purchase MSRP. Niche but high-LTV audience.
=======
# Coastal Brewing Co. — Proposed Product List (v2)

**Drafted by**: Sqwaadrun research lane + inline finish
**Date**: 2026-04-29 (v2)
**Authority**: Owner directives 2026-04-29 — single Organic OR Fairtrade cert acceptable; Coastal MSRPs deferred (competitor reference bands only); Temecula primary; Lowcountry House Blend OK if Temecula offers custom-mix
**Sources**: `vendor-temecula-organic-fairtrade.csv` + `industry-pricing-comparison.csv` + `temecula-custom-blend.md` (this folder)

> **What changed from v1:** Single-cert filter (relaxed from dual-cert). Coastal MSRPs / wholesale costs / margin floors REMOVED — owner deferred pricing decisions. Competitor reference price bands replace them. Lowcountry House Blend resolution updated per the Temecula custom-blend memo (private-label rebrand OK; from-scratch custom recipes are not self-serve).

---

## Owner status of the three v1 decisions

1. ~~Tea/matcha cert problem (dual-cert required)~~ → **RESOLVED** by owner directive 2026-04-29: single cert acceptable.
2. ~~Pricing band (hold $18 vs move $19-20)~~ → **DEFERRED** by owner directive 2026-04-29: pricing not important right now.
3. ~~Lowcountry House Blend keep vs rename~~ → **RESOLVED** by owner directive 2026-04-29: keep IF Temecula offers a custom mix. Per `temecula-custom-blend.md` verdict: PARTIAL (private-label OK with no MOQ, same-day shipping; from-scratch custom recipe is a sales-rep conversation).

---

## SKU summary

| Category | Source vendor | Coastal SKUs |
|---|---|---|
| Coffee — Fairtrade single-origin | Temecula (verified) | 6 |
| Coffee — Lowcountry House Blend (private-label rebrand) | Temecula | 1 |
| Tea — Organic ingredient-level | Temecula (verified) | 4 |
| Tea — Jasmine (brand-canon §11 motif requirement) | Numi or Rishi (Temecula doesn't qualify) | 1 |
| Matcha — JAS Organic ceremonial | Mizuba (Temecula doesn't qualify) | 1 |
| Subscriptions | Composed from above | 3 |
| Bundles | Composed from above | 3 |
| **Total** | — | **19** |

---

## Coffee SKUs

### `coastal-colombia-fairtrade-12oz`
- **Name**: Coastal Colombia Fairtrade
- **Category**: coffee · single-origin · medium roast
- **Size**: 12oz
- **Vendor source SKU**: TCR-FT-COLOMBIA-12OZ
- **Certifications**: Fairtrade ✅
- **Origin**: Tolima, Colombia
- **Flavor notes**: Caramel sweetness, citrus brightness, milk chocolate finish
- **Vendor retail (Temecula collection page)**: $19.49
- **Competitor reference price band** (FT/Organic-leaning 12oz single-origin):
  - Low: $18.00 (Blue Bottle Three Africas — non-cert)
  - Median: $19.75 (Equator FT-Organic; Verve)
  - High: $24.49 (Temecula FT Sumatra direct)
  - Sample size: 7 comps from `industry-pricing-comparison.csv`
- **Customer-facing blurb**: Bright Colombian Fairtrade — caramel and citrus, the cup that wakes the day up clean. Sourced through verified Tolima cooperatives.
- **Pricing TBD note**: Coastal MSRP deferred per owner directive 2026-04-29.

### `coastal-guatemala-fairtrade-12oz`
- **Name**: Coastal Guatemala Fairtrade
- **Category**: coffee · single-origin · medium roast
- **Size**: 12oz
- **Vendor source SKU**: TCR-FT-GUATEMALA-12OZ
- **Certifications**: Fairtrade ✅
- **Origin**: San Marcos, Guatemala
- **Flavor notes**: Clean cup, milk chocolate, soft fruit, balanced acidity
- **Vendor retail**: $19.49
- **Competitor reference price band**: Same as Colombia (single-origin 12oz band, N=7)
- **Customer-facing blurb**: A clean, honest Guatemalan medium — milk chocolate and soft fruit, the kind of cup that doesn't ask for attention but rewards it.

### `coastal-peru-fairtrade-12oz` ⭐ flagship
- **Name**: Coastal Peru Fairtrade — Clean Coffee Project
- **Category**: coffee · single-origin · medium roast
- **Size**: 12oz
- **Vendor source SKU**: TCR-FT-PERU-12OZ (a.k.a. TCR-CCP-CLEAN-PERU)
- **Certifications**: Fairtrade ✅ + **Eurofins lab-tested** (glyphosate-free, heavy-metals clean, mycotoxin clean) — the SOLE Temecula product currently in the Clean Coffee Project
- **Origin**: Amazonas, Peru (1600-1800m)
- **Flavor notes**: Lemon, herbal, milk chocolate, medium acidity, smooth body
- **Vendor retail**: $19.49
- **Competitor reference price band**: Single-origin 12oz band (N=7). Note: no comparable comp carries lab-tested clean cert — this SKU has an outsized "every cup is what the label says it is" story.
- **Customer-facing blurb**: Lab-clean Peru. Glyphosate-free, heavy-metal-tested, mycotoxin-tested — the literal proof of "every cup is what the label says it is." Lemon and herbal lift over a smooth chocolate body.
- **Note**: This is the strongest single-SKU brand-asset on the Temecula line. Recommend front-of-store positioning + dedicated product page treatment.

### `coastal-peru-decaf-fairtrade-12oz`
- **Name**: Coastal Peru Decaf — Swiss Water Process
- **Category**: coffee · single-origin · decaf · medium roast
- **Size**: 12oz
- **Vendor source SKU**: TCR-FT-PERU-DECAF-12OZ
- **Certifications**: Fairtrade ✅ + **Swiss Water Process** (chemical-free decaffeination — pairs with Coastal "nothing chemically, ever" brand promise)
- **Origin**: Amazonas, Peru
- **Flavor notes**: Smooth body, mild chocolate, low acidity
- **Vendor retail**: $19.49
- **Competitor reference price band** (decaf 12oz):
  - Low: $16.44 (Death Wish 16oz scaled — mass-tier)
  - Median: $17.99 (Counter Culture Slow Motion — Organic + Swiss Water)
  - Sample size: 2 comps (thin — surface for owner)
- **Customer-facing blurb**: Decaf without the chemicals. Swiss Water Process, Fairtrade Peru — the cup you can drink at 4pm without thinking twice.

### `coastal-honduras-fairtrade-12oz`
- **Name**: Coastal Honduras Fairtrade
- **Category**: coffee · single-origin · medium/dark roast
- **Size**: 12oz
- **Vendor source SKU**: TCR-FT-HONDURAS-12OZ
- **Certifications**: Fairtrade ✅
- **Origin**: Copán, Honduras
- **Flavor notes**: Cocoa, brown sugar, walnut, smooth body
- **Vendor retail**: $19.49
- **Competitor reference price band** (dark-roast 12oz):
  - Low: $16.44 (Death Wish — mass)
  - Median: $19.75 (Equator French Roast — FT-Organic)
  - High: $21.99 (Counter Culture Forty-Six — Organic)
  - Sample size: 3 comps
- **Customer-facing blurb**: Cocoa and brown sugar from the Copán hills. The dark-roast complement to the Sumatra — a porch cup with patience.

### `coastal-sumatra-fairtrade-12oz` ⭐ anchor
- **Name**: Coastal Sumatra Fairtrade
- **Category**: coffee · single-origin · medium/dark roast
- **Size**: 12oz
- **Vendor source SKU**: TCR-FT-SUMATRA-12OZ
- **Certifications**: Fairtrade ✅ (Note: Temecula's URL slug includes "organic" but customer-service confirmed organic cert is in-progress, not yet certified)
- **Origin**: Aceh / Takengon, Indonesia (1100-1600m, KBQB cooperative, Giling Basha wet-hull, Grade 1 Triple Pick)
- **Flavor notes**: Dark chocolate, dried fruit, earthy, syrupy body, lingering finish
- **Vendor retail**: $19.49 (collection page) / $24.49 (detail page) — **price discrepancy flagged for owner verification with Temecula**
- **Competitor reference price band**: Single-origin 12oz band (N=7) skewed toward the high end given dark-roast premium.
- **Customer-facing blurb**: The slow-roast porch cup. Dark chocolate, dried fruit, syrupy body — the Sumatra that earns its place on the shelf.
- **Open question**: Confirm with Temecula which retail price is canonical ($19.49 collection vs $24.49 detail) before any pricing decision.

### `lowcountry-house-blend-12oz` (kept — private-label rebrand)
- **Name**: Lowcountry House Blend
- **Category**: coffee · house blend · medium roast
- **Size**: 12oz
- **Vendor source SKU**: TBD — Temecula private-label rebrand of one of:
  - Temecula's existing "Breakfast Blend" or "Cowboy Blend" (their own house blends — needs verification on Fairtrade status)
  - OR rebrand of `TCR-FT-COLOMBIA-12OZ` or `TCR-FT-GUATEMALA-12OZ` as the "house" cup (both are Fairtrade medium roasts that fit a house-blend register)
- **Certifications**: Fairtrade ✅ (inherits Temecula's cert under private-label per the custom-blend memo)
- **Origin**: TBD per chosen base SKU
- **Flavor notes**: Smooth medium-roast house blend — the daily-cup default
- **Vendor retail**: $19.49 (matches whichever Fairtrade single-origin we rebrand from)
- **Competitor reference price band**: Single-origin 12oz band (N=7)
- **Customer-facing blurb**: The Lowcountry House Blend — every-morning coffee, low-key, the cup you don't have to think about. A medium-roast Fairtrade, ground or whole bean.
- **Owner decision**: Pick the base SKU. Recommend Colombia (mid-acidity, caramel, milk chocolate) as the most "house-blend appropriate" of the verified Fairtrade Temecula coffees.

---

## Tea SKUs

### `coastal-masala-chai-3oz`
- **Name**: Coastal Masala Chai
- **Category**: tea · chai
- **Size**: 3oz
- **Vendor source SKU**: TCR-TEA-MASALACHAI-3OZ
- **Certifications**: Organic ingredient-level (Assam black + organic cardamom, clove, ginger, cinnamon, star anise, black pepper) ✅
- **Vendor retail**: $19.99
- **Competitor reference price band** (loose-leaf tea 3oz / 50ct sachets):
  - Low: $19.99 (Harney & Sons English Breakfast 50ct)
  - Median: $19.99 (Harney & Sons across line)
  - High: $19.99 (Harney & Sons Earl Grey Supreme 50ct)
  - Sample size: 3 comps (Harney sets the heritage-blender band)
- **Customer-facing blurb**: Whole-spice masala chai — Assam, cardamom, clove, ginger, cinnamon, black pepper. The cup that warms the porch in February.

### `coastal-english-breakfast-3oz`
- **Name**: Coastal English Breakfast
- **Category**: tea · black
- **Vendor source SKU**: TCR-TEA-ENGLISHBREAKFAST-3OZ
- **Certifications**: Organic ingredient-level (Assam TGFOP + Ceylon OP + 2nd Flush Darjeeling) ✅
- **Vendor retail**: $19.99
- **Competitor reference price band**: Same as masala chai (heritage-blender band, $19.99 across Harney)
- **Customer-facing blurb**: Whole-leaf English Breakfast — Assam, Ceylon, Darjeeling. Strong, complete, no shortcut.

### `coastal-moroccan-mint-3oz`
- **Name**: Coastal Moroccan Mint
- **Category**: tea · green
- **Vendor source SKU**: TCR-TEA-MOROCCANMINT-3OZ
- **Certifications**: Organic ingredient-level (gunpowder green + spearmint + peppermint) ✅
- **Vendor retail**: $19.99
- **Competitor reference price band**: Heritage-blender band ($19.99) + Numi green-bagged ($8.99 / 18ct = ~$0.50/bag, low-tier sachet pricing). Loose-leaf positioning aligns with $19.99 band.
- **Customer-facing blurb**: Green tea + mint, the way it's done from Marrakech to Charleston. Whole-leaf, organic, ready for sweet tea or hot pour.

### `coastal-hibiscus-berry-rooibos-3oz` ⭐ strongest organic story
- **Name**: Coastal Hibiscus Berry Rooibos
- **Category**: tea · herbal · caffeine-free
- **Vendor source SKU**: TCR-TEA-HIBISCUSBERRYROOIBOS-3OZ
- **Certifications**: Organic ingredient-level — **7 organic ingredients** (hibiscus flowers, rosehips, orange peel, rooibos, blueberry, passionfruit, mango flavors)
- **Vendor retail**: $19.99
- **Competitor reference price band**: Heritage band ($19.99). Premium for the 7-organic-ingredient story.
- **Customer-facing blurb**: Caffeine-free hibiscus and rooibos with seven organic ingredients on the label. The afternoon cup that doesn't keep you up.

### `coastal-jasmine-green-loose-3oz` (Temecula doesn't qualify — Numi or Rishi)
- **Name**: Coastal Jasmine Green
- **Category**: tea · green · jasmine
- **Vendor source SKU**: TBD — `SECONDARY-NUMI-FT-ORGANIC-18CT` (sachets) OR `SECONDARY-RISHI-LOOSE-LEAF-LB` (loose-leaf)
- **Certifications**: USDA Organic + Fairtrade (Numi) OR Organic + Direct Trade (Rishi)
- **Vendor retail**: Numi $8.99 / 18ct (small format) or Rishi $60 / lb wholesale
- **Competitor reference price band** (jasmine green):
  - Low: $8.99 (Numi 18ct)
  - High: ~$30 / 3oz loose-leaf retail equivalent (Rishi at $60/lb scaled)
  - Sample size: 2 comps (thin — owner verify)
- **Customer-facing blurb**: Jasmine green, hand-paired with cut jasmine flowers. Tea that smells like the porch in May.
- **Note**: Brand canon §11 makes Jasmine Tea a load-bearing motif (cut jasmine branches placed beside the Jasmine Tea tins on the storefront). This SKU exists because Temecula's Jasmine doesn't carry Organic or Fairtrade markers. Owner picks: Numi sachet (cheaper, dual-cert, smaller SKU) or Rishi loose-leaf (premium, supports the loose-leaf storyline + 5gal twine-wrapped jar visual in §11.3 warehouse).

---

## Matcha SKU

### `coastal-ceremonial-matcha-30g` (Temecula doesn't qualify — Mizuba)
- **Name**: Coastal Ceremonial Matcha
- **Category**: matcha · ceremonial-grade
- **Size**: 30g
- **Vendor source SKU**: `SECONDARY-MIZUBA-YOROKOBI-30G`
- **Certifications**: JAS Organic + single-estate ✅
- **Origin**: Uji, Kyoto (single-estate)
- **Flavor notes**: Vibrant emerald, deep umami, no bitterness
- **Vendor retail**: $40.00
- **Competitor reference price band** (ceremonial matcha 30g):
  - Low: $24.99 (Temecula 1oz — non-cert)
  - Median: $28.00 (Ippodo Kan — heritage Kyoto, no export cert)
  - High: $40.00 (Mizuba Yorokobi — JAS-Organic single-estate, our source)
  - Sample size: 3 comps
- **Customer-facing blurb**: Ceremonial matcha from a single Uji estate — the way matcha is meant to be: stone-milled, vibrant, no bitter. Whisked the way it should be.
- **Note**: Mizuba Yorokobi at $40 is the high end of the band. Coastal MSRP TBD per owner pricing-deferred directive; premium positioning is appropriate.

---

## Subscription SKUs

### `coastal-coffee-monthly`
- **Composition**: One 12oz Fairtrade single-origin per month, customer chooses or rotates
- **Source SKUs available**: `coastal-colombia-fairtrade-12oz`, `coastal-guatemala-fairtrade-12oz`, `coastal-peru-fairtrade-12oz`, `coastal-honduras-fairtrade-12oz`, `coastal-sumatra-fairtrade-12oz`, `lowcountry-house-blend-12oz`
- **Competitor reference**: Atlas Coffee Club $14/month (mass tier rotation); Trade Coffee $15-22/month (specialty curated). Sample size: 2 (thin — surface).
- **Customer-facing blurb**: One Fairtrade single-origin a month. Pick yours, or let us rotate.

### `coastal-tea-monthly`
- **Composition**: One 3oz tea per month
- **Source SKUs**: 4 Temecula organic teas + Coastal Jasmine Green
- **Customer-facing blurb**: One whole-leaf tea a month. From masala chai to jasmine green.

### `coastal-combo-monthly`
- **Composition**: 1 coffee + 1 tea per month
- **Customer-facing blurb**: Coffee and tea, monthly. One subscription, one cancellation.
>>>>>>> Stashed changes

---

## Bundle SKUs

<<<<<<< Updated upstream
### `coffee-tea-discovery-bundle` (UPDATE existing)

- **Name**: Coastal Discovery Bundle
- **Category**: bundle
- **Size**: 1 coffee 12oz + 1 tea 50ct + 1 matcha sample
- **Vendor source SKUs**: Coastal Sumatra + Coastal Breakfast Tea + matcha sample
- **Proposed Coastal MSRP**: $48.00 (was $42)
- **Proposed wholesale_cost**: $19.95
- **Proposed fulfillment_cost**: $2.00
- **Proposed margin floor**: $8.00
- **Customer-facing blurb**: "1 Fairtrade coffee, 1 Organic + Fairtrade tea, 1 ceremonial matcha sample. The whole shelf, one box."
- **Pricing rationale**: Sum of singles ~$54 ($20+$14+$32 sample-sized). $48 = $6 bundle discount (~11%). Industry norm for discovery bundles.

### `coastal-pantry-refill` (NEW)

- **Name**: Coastal Pantry Refill (3 coffees)
- **Category**: bundle
- **Size**: 3 x 12oz coffee
- **Vendor source SKUs**: 3 of customer's choice
- **Proposed Coastal MSRP**: $52.00 (vs $57 individually)
- **Proposed wholesale_cost**: $29.55
- **Proposed fulfillment_cost**: $4.00 (one shipment)
- **Proposed margin floor**: $10.00
- **Customer-facing blurb**: "Three 12oz Fairtrade coffees. Pick your origins. Pantry stocked."

### `coastal-gift-trio` (NEW)

- **Name**: Coastal Gift Trio
- **Category**: bundle
- **Size**: 1 coffee + 1 tea + 1 ceremonial matcha (full size)
- **Vendor source SKUs**: combo of 3 full-size SKUs in gift box
- **Proposed Coastal MSRP**: $66.00 (vs $66 individually — gift packaging is the value-add)
- **Proposed wholesale_cost**: $32.20 (incl gift packaging cost ~$2)
- **Proposed fulfillment_cost**: $3.00
- **Proposed margin floor**: $12.00
- **Customer-facing blurb**: "Full-size coffee, tea, and ceremonial matcha. Gift-boxed. The whole brand, one ribbon."

---

## Margin Summary

| Tier | MSRP band | Wholesale band | Margin band | Notes |
|------|-----------|----------------|-------------|-------|
| Coffee single-origin | $19-20 | $9.75-10.45 | $7-8 (37-42%) | Healthy specialty band |
| Decaf | $20.50 | $10.45 | $8.25 (40%) | Premium niche |
| Tea bagged | $14-15 | $4.50-5.00 | $7.30-8.30 (52-55%) | Strong margin if Numi pivot lands |
| Matcha ceremonial | $32 | $18 | $12.80 (40%) | Mizuba pivot keeps margin healthy |
| Matcha daily | $24 | $12 | $10.80 (45%) | Volume tier |
| Subscription coffee | $18/mo | $9.85 | $6.35 (35%) | Subscription typical |
| Subscription tea | $13/mo | $4.50 | $7.30 (56%) | Best-margin recurring |
| Subscription combo | $28/mo | $14.35 | $11.65 (42%) | Anchor SKU |
| Bundle discovery | $48 | $19.95 | $26.05 (54%) | Acquisition tool |
| Bundle gift | $66 | $32.20 | $30.80 (47%) | Holiday/seasonal |

All SKUs above min_margin_floor at MSRP. Floor breaches only triggered at >25% promotional discount per `scripts/catalog.py` floor logic.

---

## What changes in `scripts/catalog.py` if owner approves this proposal

- DROP: `lowcountry-house-blend-12oz`, `lowcountry-dark-roast-12oz`, `lowcountry-decaf-12oz`, `lowcountry-breakfast-tea-50ct`, `coastal-herbal-tea-50ct`, `coastal-green-tea-50ct`, `ceremonial-matcha-30ct` (Temecula matcha — replaced by Mizuba)
- ADD: 6 coffees, 5 teas, 2 matchas, 4 subscriptions, 3 bundles = 20 SKUs
- KEEP shape: same id/name/category/size/msrp/wholesale_cost/fulfillment_cost/min_margin_floor/tags/blurb keys
- EXTEND: add `vendor_source_sku` and `certifications` keys to each PRODUCTS entry — surface internally for compliance audit, never expose to customer

---

## Sources

- Temecula Coffee Roasters: [Shop](https://temeculacoffeeroasters.com/pages/shop-1) / [Fairtrade Collection](https://temeculacoffeeroasters.com/collections/fairtrade%C2%AE-products) / [Sumatra detail](https://temeculacoffeeroasters.com/products/fairtrade%C2%AE-sumatra-medium-dark-roast-organic) / [Tea Dropship](https://temeculacoffeeroasters.com/pages/tea-dropship) / [Matcha](https://temeculacoffeeroasters.com/products/matcha-ceremonial-matcha)
- Mizuba Tea Co.: [Yorokobi Organic Ceremonial](https://mizubatea.com/products/yorokobi-ceremonial-organic-matcha)
- Numi Organic Tea: [Fair Trade page](https://numitea.com/pages/fair-trade)
- Rishi Tea: [Wholesale](https://wholesale.rishi-tea.com/)
- Equator Coffees: [Fair Trade Organic](https://www.equatorcoffees.com/products/french-roast-fair-trade-organic-retail)
- Counter Culture: [Hologram](https://counterculturecoffee.com/products/12-oz-hologram) / [Slow Motion Decaf](https://counterculturecoffee.com/products/12-oz-slow-motion)
- Stumptown: [Hair Bender](https://www.stumptowncoffee.com/products/hair-bender)
- Blue Bottle: [Three Africas](https://bluebottlecoffee.com/us/eng/product/three-africas)
- Death Wish: [Walmart 16oz](https://www.walmart.com/ip/Death-Wish-Coffee-Organic-and-Fair-Trade-Dark-Roast-Ground-Coffee-16oz/120705196)
- Harney & Sons: [English Breakfast 50ct](https://www.harney.com/products/english-breakfast-50-sachet-bag) / [Earl Grey 50ct](https://www.harney.com/products/earl-grey-bag-of-50-sachets)
- Ippodo Tea: [Kan 30g via Kanso](https://kanso-tea.com/products/kan-by-ippodo-tea)
=======
### `coastal-discovery-bundle`
- **Composition**: Sample of 1 coffee (e.g., Peru) + 1 tea (e.g., Hibiscus Rooibos) + 1 matcha trial
- **Use case**: First-time customer "what does Coastal taste like?"
- **Competitor reference**: Temecula sample-pack $30; Equator FT-Organic set ~$45. Sample size: 2.
- **Customer-facing blurb**: The starter trio. Coffee, tea, matcha — three sips of the line in one box.

### `coastal-pantry-refill`
- **Composition**: 2x 12oz coffee + 2x 3oz tea — bulk-friendly
- **Use case**: Returning customer "stock up the pantry"
- **Customer-facing blurb**: The pantry box. Two coffees, two teas — the month's run in one ship.

### `coastal-gift-bundle`
- **Composition**: Curated gift box — 1x 12oz coffee (Lowcountry House Blend or Sumatra) + 1x 3oz tea + ceramic cup
- **Customer-facing blurb**: A gift the recipient will actually use. Coffee, tea, and a cup made for them.

---

## Two highest-priority owner decisions remaining

1. **Lowcountry House Blend base** — pick the Temecula SKU to private-label-rebrand. Recommendation: `TCR-FT-COLOMBIA-12OZ` (mid-acidity, caramel + milk chocolate, the most "house-cup" register of the six Fairtrade single-origins). Alternative: confirm with Temecula whether their existing house blends (Breakfast / Cowboy / Blonde / 6-Bean) are Fairtrade-eligible for private-label.
2. **Jasmine Green source** — Numi (sachets, $8.99 / 18ct, USDA Organic + Fairtrade dual-cert, easy to display in a tin) OR Rishi (loose-leaf, premium, supports the §11.3 5-gallon twine-wrapped jar visual). Recommendation: Rishi loose-leaf for the warehouse / counter visual story; supplement with Numi sachets for at-home convenience tier.

---

## Open follow-ups

- Confirm `TCR-FT-SUMATRA-12OZ` retail price ($19.49 vs $24.49 — Temecula collection vs detail page)
- Confirm Temecula's Breakfast Blend / Cowboy Blend / Blonde Blend / 6-Bean status (Fairtrade-eligible? Organic ingredient-level?) — opens a possible non-rebrand path for Lowcountry House Blend
- Confirm Temecula tea/matcha cert documentation if owner wants the full line under their cert (today: ingredient-level organic on 4 teas; whole-product cert NOT visible)
>>>>>>> Stashed changes
