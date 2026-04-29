# Coastal Brewing Co. — Proposed Product List (v3)

**Drafted by**: Sqwaadrun research lane + inline finish
**Date**: 2026-04-29 (v3 — names locked from canonical reference image)
**Authority**: Owner directives 2026-04-29 (multiple turns):
- Single Organic OR Fairtrade cert acceptable
- Coastal MSRPs deferred — competitor reference price bands only
- Temecula primary; Lowcountry House Blend retired as a name
- **Canonical product names locked from `Coffee Shop Sal_Ang.png`**: flagship coffee = "Coastal Blend"; tea umbrella = "Lowcountry Tea"; matcha = "Coastal Brewing Co Matcha"; chai = "Coastal Chai"

**Sources**: `vendor-temecula-organic-fairtrade.csv` + `industry-pricing-comparison.csv` + `temecula-custom-blend.md` + `~/foai/coastal-brewing/design.md` §11.1.1 (canonical product names)

---

## v3 changes from v2

- **Renamed flagship**: `lowcountry-house-blend-12oz` → `coastal-blend-12oz` (canonical name from packaging in `Coffee Shop Sal_Ang.png` — *Coastal Blend / Whole Bean Coffee / Jasmine, Key Lime, Cocoa*)
- **Tea umbrella**: SKUs now ship as `lowcountry-tea-<variant>` (e.g., `lowcountry-tea-jasmine-green`, `lowcountry-tea-english-breakfast`) — matches the tin packaging convention
- **Chai promoted**: separate SKU + distinct visual (darker tin), no longer grouped with the cream Lowcountry Tea tins
- **Matcha named**: `coastal-matcha-ceremonial-30g` — matches the tin label "COASTAL BREWING CO / MATCHA / CEREMONIAL GRADE"

---

## SKU summary (v3)

| Category | Source vendor | Coastal SKUs |
|---|---|---|
| **Coastal Blend** flagship coffee (private-label rebrand) | Temecula | 1 |
| Coffee — Fairtrade single-origin | Temecula (verified) | 5 (excludes the Sumatra anchor — see below) |
| Coffee — Coastal Sumatra Fairtrade (anchor SKU) | Temecula | 1 |
| Lowcountry Tea — variants (Organic ingredient-level) | Temecula (verified, 4 variants) + Numi/Rishi (Jasmine Green) | 5 |
| Coastal Matcha — Ceremonial Grade | Mizuba Yorokobi | 1 |
| Coastal Chai — Spiced Black Tea (separate dark tin) | Temecula | 1 |
| Subscriptions | Composed | 3 |
| Bundles | Composed | 3 |
| **Total** | — | **20** |

---

## Coffee SKUs

### `coastal-blend-12oz` ⭐ flagship (canonical name from packaging)

- **Name**: Coastal Blend
- **Category**: coffee · house blend · whole bean · medium roast
- **Size**: 12oz (340g)
- **Flavor notes**: **Jasmine, Key Lime, Cocoa** (per the canonical bag in `Coffee Shop Sal_Ang.png`)
- **Vendor source SKU**: Temecula private-label rebrand — base SKU TBD per owner
  - Owner rejected `TCR-FT-COLOMBIA-12OZ` as the recommended base 2026-04-29
  - Open: which Temecula SKU best fits the *Jasmine, Key Lime, Cocoa* tasting profile? Candidates to research: Temecula's existing house blends (Breakfast Blend, Cowboy Blend, Blonde Blend, 6-Bean Espresso) and confirm Fairtrade eligibility for private-label
  - OR Coastal contacts Temecula sales to discuss a true custom recipe matching those notes
- **Certifications**: Fairtrade ✅ (inherits Temecula's cert under private-label per `temecula-custom-blend.md`)
- **Vendor retail**: $19.49 (matches Temecula FT collection band)
- **Competitor reference price band** (FT/Organic-leaning 12oz house blend):
  - Low: $18.00 (Blue Bottle Three Africas)
  - Median: $19.00 (Intelligentsia House Blend)
  - High: $21.99 (Counter Culture Hologram)
  - Sample size: 7 comps from `industry-pricing-comparison.csv`
- **Customer-facing blurb**: Coastal Blend — whole-bean Lowcountry coffee with notes of jasmine, key lime, and cocoa. The cup that earns the label "every cup is what the label says it is."
- **Pricing TBD note**: Coastal MSRP deferred per owner directive 2026-04-29.
- **Open question for owner**: should we research Temecula's 4 existing house blends for a Fairtrade-eligible match to *Jasmine, Key Lime, Cocoa*, OR commit to a custom-recipe sales conversation with Temecula?

### `coastal-colombia-fairtrade-12oz`
- **Name**: Coastal Colombia Fairtrade
- **Category**: coffee · single-origin · medium roast
- **Vendor source SKU**: TCR-FT-COLOMBIA-12OZ
- **Certifications**: Fairtrade ✅
- **Origin**: Tolima, Colombia
- **Flavor notes**: Caramel sweetness, citrus brightness, milk chocolate finish
- **Vendor retail**: $19.49
- **Competitor reference price band** (FT/Organic single-origin 12oz): low $18.00 (Blue Bottle) / median $19.75 (Equator, Verve) / high $24.49 (Temecula Sumatra direct). N=7.
- **Customer-facing blurb**: Bright Colombian Fairtrade — caramel and citrus, the cup that wakes the day up clean. Sourced through verified Tolima cooperatives.

### `coastal-guatemala-fairtrade-12oz`
- **Name**: Coastal Guatemala Fairtrade
- **Vendor source SKU**: TCR-FT-GUATEMALA-12OZ
- **Certifications**: Fairtrade ✅
- **Origin**: San Marcos, Guatemala
- **Flavor notes**: Clean cup, milk chocolate, soft fruit, balanced acidity
- **Vendor retail**: $19.49
- **Competitor reference price band**: Same as Colombia (N=7).
- **Customer-facing blurb**: A clean, honest Guatemalan medium — milk chocolate and soft fruit, the kind of cup that doesn't ask for attention but rewards it.

### `coastal-peru-fairtrade-12oz` ⭐ Clean Coffee Project
- **Name**: Coastal Peru Fairtrade — Clean Coffee Project
- **Vendor source SKU**: TCR-FT-PERU-12OZ
- **Certifications**: Fairtrade ✅ + **Eurofins lab-tested** (glyphosate-free, heavy-metals clean, mycotoxin clean) — sole Temecula product currently in the Clean Coffee Project
- **Origin**: Amazonas, Peru (1600-1800m)
- **Flavor notes**: Lemon, herbal, milk chocolate, medium acidity, smooth body
- **Vendor retail**: $19.49
- **Competitor reference price band**: Single-origin band (N=7). No comparable comp carries the lab-tested clean cert — outsized "every cup is what the label says it is" story.
- **Customer-facing blurb**: Lab-clean Peru. Glyphosate-free, heavy-metal-tested, mycotoxin-tested — the literal proof of "every cup is what the label says it is." Lemon and herbal lift over a smooth chocolate body.

### `coastal-peru-decaf-fairtrade-12oz`
- **Name**: Coastal Peru Decaf — Swiss Water Process
- **Vendor source SKU**: TCR-FT-PERU-DECAF-12OZ
- **Certifications**: Fairtrade ✅ + **Swiss Water Process** (chemical-free decaf — pairs with "nothing chemically, ever")
- **Origin**: Amazonas, Peru
- **Flavor notes**: Smooth body, mild chocolate, low acidity
- **Vendor retail**: $19.49
- **Competitor reference price band** (decaf 12oz): low $16.44 (Death Wish 16oz scaled) / median $17.99 (Counter Culture Slow Motion). N=2 (thin).
- **Customer-facing blurb**: Decaf without the chemicals. Swiss Water Process, Fairtrade Peru — the cup you can drink at 4pm without thinking twice.

### `coastal-honduras-fairtrade-12oz`
- **Name**: Coastal Honduras Fairtrade
- **Vendor source SKU**: TCR-FT-HONDURAS-12OZ
- **Certifications**: Fairtrade ✅
- **Origin**: Copán, Honduras
- **Flavor notes**: Cocoa, brown sugar, walnut, smooth body
- **Vendor retail**: $19.49
- **Competitor reference price band** (dark-roast 12oz): low $16.44 (Death Wish) / median $19.75 (Equator French Roast) / high $21.99 (Counter Culture Forty-Six). N=3.
- **Customer-facing blurb**: Cocoa and brown sugar from the Copán hills. The dark-roast complement to the Sumatra — a porch cup with patience.

### `coastal-sumatra-fairtrade-12oz` ⭐ anchor
- **Name**: Coastal Sumatra Fairtrade
- **Vendor source SKU**: TCR-FT-SUMATRA-12OZ
- **Certifications**: Fairtrade ✅ (Temecula CS confirmed organic cert is in-progress, not yet certified)
- **Origin**: Aceh / Takengon, Indonesia (1100-1600m, KBQB cooperative)
- **Flavor notes**: Dark chocolate, dried fruit, earthy, syrupy body, lingering finish
- **Vendor retail**: $19.49 (collection page) / $24.49 (detail page) — **flagged for owner verification with Temecula**
- **Competitor reference price band**: Single-origin 12oz band (N=7) skewed high.
- **Customer-facing blurb**: The slow-roast porch cup. Dark chocolate, dried fruit, syrupy body — the Sumatra that earns its place on the shelf.
- **Open question**: which Temecula retail price is canonical?

---

## Lowcountry Tea (umbrella sub-brand) — cylindrical cream tin with brown band

### `lowcountry-tea-jasmine-green-2oz` ⭐ jasmine motif anchor (per design.md §11)

- **Name on tin**: COASTAL BREWING CO / LOWCOUNTRY TEA / JASMINE GREEN / NET WT. 2OZ (56G)
- **Category**: tea · green · jasmine
- **Vendor source SKU**: TBD — Numi (sachets, dual-cert) OR Rishi (loose-leaf, premium) — Temecula's Jasmine doesn't qualify under cert filter
- **Certifications**: USDA Organic + Fairtrade (Numi) OR Organic + Direct Trade (Rishi)
- **Vendor retail**: Numi $8.99 / 18ct OR Rishi $60 / lb wholesale
- **Competitor reference price band** (jasmine green): low $8.99 (Numi 18ct) / high ~$30 / 3oz scaled from Rishi. N=2 (thin).
- **Customer-facing blurb**: Jasmine green, hand-paired with cut jasmine flowers. Tea that smells like the porch in May.
- **Note**: Brand canon §11 makes Jasmine Tea a load-bearing motif — cut jasmine branches placed beside this tin on the storefront. Owner picks Numi or Rishi.

### `lowcountry-tea-english-breakfast-2oz`
- **Name on tin**: COASTAL BREWING CO / LOWCOUNTRY TEA / ENGLISH BREAKFAST / NET WT. 2OZ (56G)
- **Vendor source SKU**: TCR-TEA-ENGLISHBREAKFAST-3OZ (note: vendor pack is 3oz; Coastal tin spec is 2oz — repackaged or quantity-adjusted)
- **Certifications**: Organic ingredient-level ✅ (Assam TGFOP + Ceylon OP + 2nd Flush Darjeeling)
- **Vendor retail**: $19.99
- **Competitor reference price band** (loose-leaf tea): Harney & Sons heritage band ($19.99 across line). N=3.
- **Customer-facing blurb**: Whole-leaf English Breakfast — Assam, Ceylon, Darjeeling. Strong, complete, no shortcut.

### `lowcountry-tea-moroccan-mint-2oz`
- **Name on tin**: COASTAL BREWING CO / LOWCOUNTRY TEA / MOROCCAN MINT / NET WT. 2OZ (56G)
- **Vendor source SKU**: TCR-TEA-MOROCCANMINT-3OZ
- **Certifications**: Organic ingredient-level ✅ (gunpowder green + spearmint + peppermint)
- **Vendor retail**: $19.99
- **Customer-facing blurb**: Green tea + mint, the way it's done from Marrakech to Charleston. Whole-leaf, organic, ready for sweet tea or hot pour.

### `lowcountry-tea-hibiscus-berry-2oz` ⭐ strongest organic story
- **Name on tin**: COASTAL BREWING CO / LOWCOUNTRY TEA / HIBISCUS BERRY / NET WT. 2OZ (56G)
- **Vendor source SKU**: TCR-TEA-HIBISCUSBERRYROOIBOS-3OZ
- **Certifications**: 7-organic-ingredient story (hibiscus, rosehips, orange peel, rooibos, blueberry, passionfruit, mango)
- **Vendor retail**: $19.99
- **Customer-facing blurb**: Caffeine-free hibiscus and rooibos with seven organic ingredients on the label. The afternoon cup that doesn't keep you up.

### `lowcountry-tea-masala-2oz` (variant of chai for the umbrella tin)
- **Note**: This SKU is the *unspiced* / *gentle* masala variant. The bolder Spiced Black Chai ships in a separate dark tin as `coastal-chai-2_1oz` below.
- **Name on tin**: COASTAL BREWING CO / LOWCOUNTRY TEA / MASALA / NET WT. 2OZ (56G)
- **Vendor source SKU**: TCR-TEA-MASALACHAI-3OZ
- **Certifications**: Organic ingredient-level ✅
- **Vendor retail**: $19.99

---

## Coastal Chai — separate dark tin (NOT in Lowcountry Tea umbrella)

### `coastal-chai-2_1oz`
- **Name on tin**: COASTAL / CHAI / SPICED BLACK TEA / NET WT. 2.1OZ (56G)
- **Tin design**: DARKER (charcoal / dark brown) — distinct from the cream Lowcountry Tea tins per the canonical reference image
- **Category**: tea · chai · spiced black
- **Vendor source SKU**: TCR-TEA-MASALACHAI-3OZ (or a stronger-spice variant from Temecula if available)
- **Certifications**: Organic ingredient-level ✅
- **Vendor retail**: $19.99
- **Competitor reference price band** (chai loose-leaf): Harney heritage band ($19.99 across line); David's Tea / Tazo around $7-10 (mass-tier, smaller pack). N=3.
- **Customer-facing blurb**: Coastal Chai — Assam black, cardamom, clove, ginger, cinnamon, black pepper, star anise. The cup that warms the porch in February.

---

## Coastal Brewing Co Matcha — separate cylindrical cream tin

### `coastal-matcha-ceremonial-30g`
- **Name on tin**: COASTAL BREWING CO / MATCHA / CEREMONIAL GRADE / NET WT. 2OZ (56G) — *note: vendor pack is 30g; Coastal tin spec is 2oz/56g if scaled, OR keep 30g and revise tin label*
- **Vendor source SKU**: `SECONDARY-MIZUBA-YOROKOBI-30G` (Temecula's matcha doesn't qualify)
- **Certifications**: JAS Organic + single-estate ✅
- **Origin**: Uji, Kyoto (single-estate)
- **Flavor notes**: Vibrant emerald, deep umami, no bitterness
- **Vendor retail**: $40.00 (30g)
- **Competitor reference price band** (ceremonial matcha 30g): low $24.99 (Temecula non-cert) / median $28 (Ippodo Kan) / high $40 (Mizuba). N=3.
- **Customer-facing blurb**: Ceremonial matcha from a single Uji estate. Stone-milled, vibrant, no bitter. Whisked the way it should be.
- **Open question**: confirm Coastal tin size — does the canonical reference image's 2oz/56g spec mean we repackage 30g into a larger tin, OR amend the label to "1oz (30g)"?

---

## Subscription SKUs

### `coastal-coffee-monthly`
- **Composition**: One 12oz coffee per month, customer chooses or rotates across the 7 coffee SKUs (Coastal Blend + 6 single-origins including Sumatra)
- **Competitor reference**: Atlas Coffee Club $14/month (mass); Trade Coffee $15-22/month (specialty). N=2.
- **Customer-facing blurb**: One whole-bean coffee a month. Pick yours, or let us rotate.

### `coastal-tea-monthly`
- **Composition**: One Lowcountry Tea tin per month (rotate across 5 variants) — does NOT include Coastal Chai (separate SKU on its own subscription if owner wants)
- **Customer-facing blurb**: One Lowcountry Tea a month. From English Breakfast to Jasmine Green.

### `coastal-combo-monthly`
- **Composition**: 1 coffee + 1 tea per month
- **Customer-facing blurb**: Coffee and tea, monthly. One subscription, one cancellation.

---

## Bundle SKUs

### `coastal-discovery-bundle`
- **Composition**: 1 Coastal Blend (12oz) + 1 Lowcountry Tea Jasmine Green + 1 Coastal Matcha trial size
- **Customer-facing blurb**: The starter trio. Coffee, tea, matcha — three sips of the line in one box.
- **Competitor reference**: Temecula sample-pack $30; Equator FT-Organic set ~$45. N=2.

### `coastal-pantry-refill`
- **Composition**: 2x 12oz coffee + 2x Lowcountry Tea + 1 Coastal Chai
- **Customer-facing blurb**: The pantry box. Two coffees, two teas, one chai — the month's run in one ship.

### `coastal-gift-bundle`
- **Composition**: 1 Coastal Blend (12oz) + 1 Lowcountry Tea Jasmine Green + 1 Coastal Brewing Co ceramic cup
- **Customer-facing blurb**: A gift the recipient will actually use. Coffee, tea, and a cup made for them.

---

## Three highest-priority owner decisions remaining

1. **Coastal Blend base recipe** — owner rejected Colombia FT as the rebrand base. Two paths: (A) research Temecula's existing 4 house blends (Breakfast / Cowboy / Blonde / 6-Bean) for Fairtrade eligibility and pick the closest to *Jasmine, Key Lime, Cocoa*, OR (B) initiate a custom-recipe sales conversation with Temecula to commission those exact tasting notes. Owner pick: A or B?
2. **Jasmine Green source** — Numi (sachets, dual-cert, easier to display in a tin) or Rishi (loose-leaf, premium, supports the §11.3 5-gallon twine-wrapped jar visual). Owner pick.
3. **Matcha tin sizing** — vendor pack is 30g; canonical tin label reads 2oz (56g). Repackage to 56g, OR correct label to 30g/1oz?

---

## Open follow-ups

- Confirm `TCR-FT-SUMATRA-12OZ` retail price ($19.49 vs $24.49)
- Coastal storefront UI — pivot from current dark theme (looks NURDSCODE-like per owner) to cream/parchment per design.md §11.1 PRIMARY directive
