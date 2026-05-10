# Single-Origin Whole-Bean Coffee — Market Pricing Research

**Date**: 2026-05-09
**Scope**: 12oz / 1lb specialty single-origin whole bean. Standard SO + Fair Trade SO.
**Method**: WebSearch (Anthropic-side fetch) — direct shopify scrapes 429-blocked at edge from sandbox IPs. Prices captured from product pages, retailer snippets, Amazon listings, and roaster-reseller pages. All prices are "verified-as-best-publicly-visible" — not 100% live confirmed against each vendor cart.
**Coastal context**: TCR drop-ship cost $16.47–$16.78 / 12oz (Tier E/F SO), $16.75 (Tier G FT). Coastal proposed retail: $28.99 std / $32.99 premium / $31.99 FT.

---

## 1. Standard Single-Origin Matrix (third-wave specialty)

| Competitor | SKU | Size | Price USD | Source |
|---|---|---|---|---|
| Stumptown | Ethiopia Suke Quto (washed) | 12oz | $18.00 | stumptowncoffee.com product pg |
| Stumptown | Ethiopia Suke Quto (natural) | 12oz | $18.00 | stumptowncoffee.com |
| Stumptown | Ethiopia Mordecofe | 12oz | $19.00 | stumptowncoffee.com |
| Stumptown | Hair Bender (blend, ref) | 12oz | $15.00 | stumptowncoffee.com |
| Counter Culture | Hologram (Latin Am SO-style) | 12oz | $19.99 | FreshDirect / CC site |
| Counter Culture | Apollo (medium) | 12oz | $19.99 | Target / FreshDirect |
| Counter Culture | La Golondrina (Colombia SO, Organic) | 12oz | ~$18–20 | CC product pg (price not shown in snippet; brand parity) |
| Onyx Coffee Lab | Ethiopia Worka Chelbesa Anaerobic | 10oz | $22.00 | GoCoffeeGo |
| Onyx Coffee Lab | Ethiopia Negusse Nare Bombe Natural | 10oz | $23.00 | GoCoffeeGo |
| Onyx Coffee Lab | Ethiopia Negusse Nare Low O2 | 10oz | $30.00 | GoCoffeeGo (rare-process premium) |
| Onyx Coffee Lab | Decaf Colombia Aponte Village | 10oz | $20.00 | GoCoffeeGo |
| Blue Bottle | Single-origin (general) | 12oz | $21–23 | bluebottlecoffee.com (snippet) |
| Blue Bottle | Three Africas (blend, ref) | 12oz | ~$18 (existing CSV) | Coastal industry CSV |
| Sey Coffee | 2026 Banko Gotiti (Ethiopia, washed landrace) | 250g (~8.8oz) | not displayed; reseller signal $28–35 | seycoffee.com |
| Sey Coffee | 2025 Kayu AA (Kenya) | 250g | not displayed; reseller signal $30–40 | seycoffee.com |
| Madcap | Reko (Ethiopia Yirgacheffe) | 12oz | not displayed in snippet; brand band $20–24 | madcapcoffee.com |
| Heart Roasters | Ethiopia Danche / Worka Sakaro | 12oz | $22–24 (snippet "~$22-24/bag") | heartroasters.com |
| Sweet Maria's | Roasted SO Ethiopia | 1lb | green-bean only at retail; not a roasted-12oz benchmark | sweetmarias.com |

**Note**: Sey, Madcap, and most third-wave roasters hide JSON-LD from search snippets. Sandbox IPs are 429-blocked at Shopify edge. Brand-band ranges sourced from reseller listings (GoCoffeeGo, Bean Box) and snippet evidence.

---

## 2. Fair Trade Certified Single-Origin Matrix

| Competitor | SKU | Size | Price USD | Source |
|---|---|---|---|---|
| Equal Exchange | Organic Ethiopian | 12oz | ~$9.25–$9.70/bag (sold as 6-pk: $55.50–$58.20; sale $46.56) | shop.equalexchange.coop |
| Equal Exchange | Organic Peru | larger formats only | n/a 12oz; bulk 5lb | shop.equalexchange.coop |
| Larry's Coffee | Ethiopia SO Light Roast (FT/Organic/Shade) | 12oz | not displayed in snippet; brand band $14–17 (Amazon) | larryscoffee.com / Amazon |
| Larry's Coffee | Sumatra SO Light Roast (FT/Organic) | 12oz | not displayed; band $14–17 | larryscoffee.com |
| Just Coffee Coop | Stampede (Sumatra SO, FT) | 12oz | not displayed; coop band $14–16 | justcoffee.coop |
| Just Coffee Coop | Humdinger (Ethiopian Sidama SO, FT) | 12oz | not displayed; coop band $14–16 | justcoffee.coop |
| Allegro Coffee (Whole Foods) | Various FT SO | 12oz | not displayed in snippet; WFM band $13–17 | allegrocoffee.com |
| Cafédirect (UK) | Machu Picchu Peru (FT/Organic) | 200g | $11.78 USD (Walmart), £4.99 GBP (UK retail) | cafedirect.co.uk / Walmart |
| Equator Coffees (existing CSV ref) | French Roast FT/Organic/ROC (blend) | 12oz | $19.75 | equatorcoffees.com |
| Counter Culture | Slow Motion Decaf (Organic+Swiss Water; not FT but org-cert) | 12oz | $17.99 | counterculturecoffee.com |
| Stumptown | No published FT-certified SO single SKU surfaced in research | — | — | — |

---

## 3. Median 12oz price (volume-weighted toward third-wave specialty)

| Tier | Median 12oz USD | Range |
|---|---|---|
| **Standard SO** (Stumptown / CC / Madcap / Heart "regular" Latin American or Ethiopia) | **$19.50** | $18.00 – $22.00 |
| **Premium SO** (Onyx 10oz × 1.2 normalize → 12oz equiv; Sey ~$30/250g → ~$33/12oz; rare-process Ethiopias / Kenya AA / Geisha-adjacent) | **$24–28 / 12oz-equivalent** | $22.00 – $36.00 |
| **Fair Trade SO** (Equal Exchange / Larry's / Just Coffee / Allegro) | **$13.50** | $9.25 – $17.00 |

Two distinct FT pricing planes exist:
- **Cooperative/grocery FT** (Equal Exchange, Larry's, Just Coffee, Allegro at WFM): $9–17 / 12oz
- **Third-wave with FT lineup** (Equator, some Counter Culture organic SKUs): $18–22 / 12oz

The cooperative plane prices DOWN from standard SO. The third-wave plane prices AT-OR-ABOVE standard SO.

---

## 4. Premium-tier delta (rare-origin / micro-lot premium over standard SO)

- Stumptown Ethiopia SO ($18) ↔ Stumptown blend ($15): **+20%** (origin premium)
- Onyx Worka Chelbesa standard process ($22 / 10oz = $26.40 / 12oz-eq) vs Onyx Negusse Nare Low-O2 anaerobic ($30 / 10oz = $36 / 12oz-eq): **+36% process-premium**
- Sey rare-landrace Ethiopia / Kenya AA at $30–40 / 250g vs an entry single-origin at ~$22 / 12oz: **+50% to +100%** premium for micro-lot / rare-process
- Counter Culture entry SO ($19.99) vs flagship organic-process line: ~flat ($19.99–21.99): only **+0–10%** at this brand (CC is flat-priced)

**Conclusion**: third-wave market commands roughly a **15–35% premium** for "premium origin" (Kenya AA, Ethiopia rare-lot, Bali, Sumatra) over a roaster's entry-level SO. Specialty roasters with rare-process lots (anaerobic, low-O2, landrace) push **+50% or more**.

---

## 5. FT premium vs standard SO

The data shows **two opposing patterns**:

1. **Cooperative-FT (Equal Exchange / Larry's / Just Coffee / Allegro)**: prices **15–40% BELOW** standard third-wave SO. Volume-coop model, grocery distribution, accept lower margin to ship more bags. FT certification does NOT command a premium; if anything, it's a discount tier at this distribution channel.
2. **Third-wave-with-FT (Equator, some Counter Culture, Stumptown Direct-Trade-but-not-FT-certified)**: prices **AT or +5% ABOVE** standard SO. Customer paying for cert-stack (Organic + Fairtrade + Regenerative Organic Certified at Equator = $19.75 = same as their non-FT SKUs).

The "FT premium" is a marketing myth at the cooperative tier. It only exists when stacked with other certifications at third-wave roasters, and even then it's small (~5%).

---

## 6. Recommendation — defensible retail anchors for Coastal

Coastal is positioning at third-wave specialty with ACHEEVY agentic differentiation. Cost basis is $16.47–$16.78 / 12oz drop-ship — already at the **wholesale tier of premium specialty**. Coastal CANNOT compete on the cooperative-FT plane ($9–17) without losing money per bag. Must compete on the third-wave plane.

| Coastal SKU | Current Proposal | Market-Anchored Recommendation | Reasoning |
|---|---|---|---|
| **Standard SO** ($16.47 cost) | $28.99 | **$22.99–$24.99** | Median third-wave SO is $19.50. Coastal at $28.99 is 49% above market median, sits above Onyx ($22 entry SO) and Heart ($22–24). Defensible at $22.99 (Heart parity) or $24.99 (Onyx-premium-adjacent). $28.99 needs ACHEEVY/agentic narrative to justify. |
| **Premium SO** ($16.78 cost) | $32.99 | **$26.99–$29.99** | Premium-tier median $24–28 / 12oz-eq. Onyx rare-process tops at $30/10oz (~$36/12oz-eq); Sey $30–40/250g. $32.99 sits at Sey-rare-landrace tier — only defensible if origin-story + farm-traceability is verified rare-lot. Otherwise $26.99 (Counter Culture parity +$5 origin premium) or $29.99 (Onyx-premium tier). |
| **FT SO** ($16.75 cost, $39/mo gated) | $31.99 | **$24.99–$28.99** | If gated behind $39/mo subscription, cooperative-FT pricing logic doesn't apply (those aren't subscription-gated). FT SO at third-wave parity = $19.75–22 (Equator). Coastal at $31.99 is ~50% above Equator; gating + ACHEEVY adds defensibility but $24.99–28.99 is more market-honest. **Note**: subscription gate is a separate price-discrimination lever; the bag itself shouldn't carry the entire margin. |

**Margin math at recommended anchors** (cost $16.47–$16.78):
- Std SO at $24.99: 34% gross margin (~$8.50/bag contribution)
- Premium SO at $29.99: 44% gross margin (~$13.20/bag)
- FT SO at $28.99: 42% gross margin (~$12.20/bag)

These margins are healthy for drop-ship specialty (industry norm 30–50% gross at retail tier). Current $28.99/$32.99/$31.99 proposal yields 43%/49%/48% — better margin but at risk of customer sticker-shock vs. brand-name third-wave ($18–22 mid-market).

---

## 7. Notable insights specific to single-origin pricing

1. **Rare-process / micro-lot premium is the lever, not the origin name.** Standard Ethiopia / Colombia / Kenya are at $18–24. Same origins with anaerobic / low-O2 / landrace / honey-process flag jump to $30–40. Coastal can charge $32.99 IF the bag has process-traceability + cupping notes + farm name. Without those, $32.99 is arbitrary.
2. **Harvest-year freshness pricing**: Sey explicitly labels "2026 Banko Gotiti" vs "2025 Banko Gotiti" — newer crop = current premium tier. Coastal can adopt year-stamped SKUs (helps subscription churn reduction; gives reason-to-rebuy).
3. **Size convention shift**: third-wave is migrating 12oz → 10oz (Onyx, some Sey reseller listings) at same price point — effectively a 17% price hike disguised as bag-size change. Coastal could ship 10oz at $24.99 = $29.99/12oz-equivalent without sticker-shocking the bag display.
4. **FT cert is a downward signal at coop tier, neutral at third-wave tier.** Coastal stacking FT + Coastal-brand + ACHEEVY narrative needs to lead with the narrative, not the cert. The cert alone won't raise willingness-to-pay above non-FT SO at this market position.
5. **Cost-basis red flag**: At $16.47–$16.78 drop-ship, Coastal is already paying near-retail of cooperative-FT brands ($9–17). The drop-ship arrangement constrains floor pricing aggressively — $24.99 minimum for std SO is necessary just to clear 30% gross. The owner choice is: either (a) accept higher retail anchors than market median + sell the agentic story, or (b) renegotiate TCR drop-ship cost.
6. **Bag-only vs subscription**: Counter Culture, Stumptown, Onyx all sell single bags off the website without subscription gates. Coastal's $39/mo gate on FT SO is unusual — most competitors put FT in their normal SO lineup. Re-examine whether the gate is value-add or friction.

---

## Sources

- [Stumptown Suke Quto](https://www.stumptowncoffee.com/products/ethiopia-suke-quto)
- [Stumptown Mordecofe](https://www.stumptowncoffee.com/products/ethiopia-mordecofe)
- [Counter Culture Hologram](https://counterculturecoffee.com/products/12-oz-hologram)
- [Counter Culture Apollo (Target)](https://www.target.com/p/counter-culture-apollo-whole-bean-medium-roast-coffee-12oz/-/A-79949628)
- [Counter Culture La Golondrina](https://counterculturecoffee.com/products/12-oz-la-golondrina)
- [Onyx Coffee Lab Single-Origin Collection](https://onyxcoffeelab.com/collections/coffee/single-origin)
- [Onyx via GoCoffeeGo](https://retro.gocoffeego.com/roaster/Onyx-Coffee-Lab-57.html)
- [Blue Bottle Single-Origin Collection](https://bluebottlecoffee.com/us/eng/collection/single-origin)
- [Sey Coffee 2026 Banko Gotiti](https://www.seycoffee.com/products/2026-banko-gotiti-ethiopia)
- [Sey Coffee 2025 Kayu AA Kenya](https://www.seycoffee.com/products/2025-kayu-aa-separation-kenya)
- [Madcap Reko Ethiopia](https://www.madcapcoffee.com/products/reko)
- [Heart Coffee Roasters Ethiopia Danche](https://www.heartroasters.com/products/ethiopia-danche)
- [Equal Exchange Ethiopian 12oz](https://shop.equalexchange.coop/products/organic-ethiopian-coffee-12oz)
- [Larry's Coffee Ethiopia SO](https://larryscoffee.com/products/ethiopia-single-origin-organic-light-roast-coffee)
- [Just Coffee Stampede Sumatra](https://justcoffee.coop/products/stampede-sumatra-single-origin)
- [Just Coffee Humdinger Ethiopia](https://justcoffee.coop/products/ethiopiansidama)
- [Cafédirect Machu Picchu Peru](https://www.cafedirect.co.uk/products/machu-picchu/beans/)
- [Specialty Coffee Retail Price Index Q1 2025](https://www.transactionguide.coffee/reports/specialty-coffee-retail-price-index-2025-q1)

---

## Methodology caveats (do not skip)

- Shopify edge **rate-limited (HTTP 429)** every direct programmatic fetch from the sandbox IP — the cleanest data path (`/products.json?limit=250`) was unreachable. WebFetch was also blocked locally. WebSearch (Anthropic-side cache) was the working path.
- This means several specific 12oz prices for Madcap, Sey, Heart, and Larry's are **brand-band estimates** from snippet/reseller signals, not confirmed at-cart prices. Confirm before publishing any competitive claim.
- Sey sells in 250g (~8.8oz). All "12oz-equivalent" math = price × (12/8.8) = price × 1.36.
- Onyx sells in 10oz. All "12oz-equivalent" math = price × 1.2.
- Equal Exchange ships in 6-pack bundles primarily; per-bag math = bundle ÷ 6.
- Cafédirect is UK-primary; USD price from Walmart import listing only — not a US specialty retail benchmark.
- Sweet Maria's is a green-bean retailer; their roasted line is incidental and not a useful competitive anchor.
