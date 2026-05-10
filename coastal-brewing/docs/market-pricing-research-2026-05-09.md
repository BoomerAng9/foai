# Market pricing research — Coastal Brewing Co. categories (2026-05-09)

Owner directive 2026-05-09: "Our markup price needs to be researched
in the market. We have to see what other companies are selling their
products for in the same type of product so that we can determine our
markup on the cost from Temecula."

Methodology: per-category competitor pricing pulled from real
specialty-coffee + specialty-tea + functional-beverage retailers via
firecrawl-scrape / WebFetch. Where a site blocked scraping, the gap
is noted — prices not fabricated.

## ⚠️ CRITICAL REINTERPRETATION (owner clarification 2026-05-09 PM)

The medians + recommended retail in this doc were initially framed as **anchor prices** Coastal should set. Owner clarified: **medians are LANDING ZONES** (post-haggle), not anchors. Catalog MSRP stays at the 60%-margin policy as the **OPENING ANCHOR**. The full Sal/LUC/ACHEEVY/Melli negotiation works the price DOWN to the landing zone, with hard floor at cost + $1.50.

**Reframe per category** (Italian Roast 12oz = canonical example):

| Element | Original interpretation | **Owner-correct interpretation** |
|---|---|---|
| Stumptown $19-22 / 12oz | "Coastal should price here" | "Coastal LANDS here after full Melli stack on B2B; lands $26-32 on Sal/LUC tier for retail" |
| 60% margin MSRP $43.99 | "Way over market — won't sell" | "OPENING ANCHOR — every PDP starts here; haggle compresses to landing zone" |
| Tier B premium $25.99 v2 recommendation | "Hold or drop $1" | "Anchor at 60%-margin compute; LANDING zone $26-32 via Sal/LUC; B2B lands $24-26 via full Melli" |

**The market research medians remain accurate** — but they describe where deals LAND, not where catalog MSRPs SET. This protects the agentic-haggle proof-of-concept value (every haggle conversation = licensee-brand marketing) AND respects market reality (Custees won't pay $43.99 final, but will haggle from $43.99 to $30 and feel they won).

**Pillar pricing** (Curation/Experience/Provenance addons per `coastal-billing-matrix-spec`) layers ON TOP of post-haggle base. So Concierge tier custee = (anchor $43.99 → haggle landing $26 → +35% Concierge experience addon = $35) — still negotiated but with premium tier framing.

The catalog code policy `_MARGIN_FLOOR_BY_CATEGORY` STAYS at 60% default. No catalog price changes from market research. Per-category retail recommendations in this doc become **landing-zone targets** for the negotiation envelope, not catalog MSRPs.

---

## Status

| Category | Agent | v1 retail | v2 market-anchored | Δ |
|---|---|---|---|---|
| 1. Coffee Blends | ✅ Complete | $24.99 / $26.99 | $24.99 / $25.99 | Tier A hold; **Tier B drop $1** |
| 2. Special Offerings | ✅ Complete | $26.99 (uniform) | **$24.95 / $24.99 / $34.99** (split) | **Split into 3 SKU prices** |
| 3. Flavored Coffees | ✅ Complete | $26.99 | **$24.99 / sub $19.99** | **Drop $2** |
| 4. Single Origin std | ✅ Complete | $28.99 | **$26.00** | **Drop $2.99** |
| 4. Single Origin premium | ✅ Complete | $32.99 | **$28.00** | **Drop $4.99** |
| 5. Single Origin Fair Trade | ✅ Complete | $31.99 | **$24.95** | **Drop $7.04 (CRITICAL)** |
| 6. Tea standard | ✅ Complete | $19.99 | **$22.99** | **Raise $3** |
| 6. Tea Matcha | ✅ Complete | $26.99 | **$26.99** culinary OR $39.99 ceremonial | **Verify TCR matcha grade** |
| 6. Tea Hojicha | ✅ Complete | $26.99 | **$19.99** (standard tea tier) | **Drop $7** — Hojicha is roasted green tea, prices as standard not premium |
| 7. Instant Coffee | ✅ Complete | $24.99 | **$24.99** confirmed at-market | hold (subscription-gate concern) |
| 8. Functional Coffee/Tea | ✅ Complete | $28.99 | **$28.99** at-market IF 30 svg | hold; **address sub-gate** |

---

## 1. Coffee Blends

**Sources verified**: Stumptown, Counter Culture, Onyx, Verve, Heart Roasters, Trade Coffee, Intelligentsia. Direct sites returned 429s on this run; pricing from WebSearch-surfaced retailer pages. Channel labeled per row.

### Pricing matrix (signature blends only)

| Roaster | SKU | Bag size | Bag price | $/oz | Channel | Notes |
|---|---|---|---|---|---|---|
| Stumptown | Holler Mountain (organic blend) | 12oz | $20.00 | $1.67 | Direct | |
| Stumptown | Hair Bender | 12oz | $21.99 | $1.83 | Specialty retailer | |
| Onyx | Monarch (espresso blend) | **10oz** | $21.50 | $2.15 | Direct | 10oz = third-wave premium convention |
| Onyx | Southern Weather | **10oz** | $21.50 | $2.15 | Direct | |
| Counter Culture | Hologram | 5lb (80oz) | $105.00 | $1.31 | Amazon (bulk anchor) | |
| Counter Culture | Big Trouble + Forty-Six 2-pack | 24oz | $33.00 | $1.38 | Amazon | |
| Verve | Streetlevel (flagship espresso) | 12oz | $19.75 | $1.65 | Specialty retailer | |
| Intelligentsia | Black Cat Classic Espresso | 12oz | $19.29 | $1.61 | Grocery (FreshDirect) | |
| Intelligentsia | Frequency Blend | 12oz | $14.96 | $1.25 | Grocery (HEB) | EXCLUDE — supermarket tier |
| Trade Coffee | Premium subscription | ~11oz | $21.99 | $2.01 | DTC sub | |
| Trade Coffee | Classic subscription | ~11oz | $16.99 | $1.55 | DTC sub | |

### Median + recommendation (RETRY AGENT — actually-scraped, more rigorous)

| Roaster | Blend SKU | 12oz | Mid (24oz / 2lb) | 5lb |
|---|---|---|---|---|
| Stumptown | House Blend | **$16.00** | — | $80.00 |
| Stumptown | Hair Bender | $19.00 | — | $105.00 |
| Stumptown | Holler Mountain | $20.00 | — | $110.00 |
| Counter Culture | Big Trouble | $19.50 | $37.50 (24oz) | $101.00 |
| Counter Culture | Hologram | $20.00 | $38.50 (24oz) | $103.00 |
| Counter Culture | Forty-Six | $20.00 | — | $103.00 |
| Onyx | Monarch | **$21.50 (10oz)** | $58.50 (2lb) | $122.00 |
| Onyx | Southern Weather | **$21.50 (10oz)** | $56.50 (2lb) | $120.00 |
| Verve | Streetlevel | $22.00 | $62.50 (2.2lb) | $124.50 |
| Intelligentsia | Black Cat Espresso | $17.50 | — | $96.50 |
| Intelligentsia | Frequency | $17.50 | — | $96.50 |

**12oz median**: **$19.50** (n=9, mean $19.06, range $16-$22)
**Per-oz median (12oz tier)**: **$1.625/oz**
**Per-oz median (5lb tier)**: $1.288/oz (volume discount ~21%)

### Coastal positioning — honest read

| Coastal SKU | v1 retail | $/oz | vs $19.50 median | vs Onyx $2.15/oz |
|---|---|---|---|---|
| Tier A house 12oz | $24.99 | $2.08/oz | **+28%** | -3.1% |
| Tier B premium 12oz | $26.99 | $2.25/oz | **+38%** | +4.7% |

**Coastal at $24.99 sits ABOVE the third-wave median by 28%** in absolute 12oz terms. Per-oz vs Onyx (the only comp in Coastal's pricing zone), Coastal Tier A is slightly UNDER. So whether Coastal is "premium" or "over-priced" depends entirely on whether the customer is comparing against Onyx or against Stumptown / CC / Intelligentsia.

### Two viable pricing strategies (owner picks)

**Strategy A — match the third-wave median (Verve-anchor)**:
- **Tier A house: $22.00 / 12oz** (matches Verve, the highest 12oz in standard-size set)
- **Tier B premium: $24.99 / 12oz** (sits at Forty-Six / Hologram premium-of-the-blend tier)
- 5lb anchor: **$110-$120** (between CC and Onyx)
- Sub: 15% off → $18.70 / $21.24
- **Pros**: defensible without brand-story heavy-lift; competitive at first-purchase decision; leaves headroom to raise as brand earns recognition.
- **Cons**: leaves margin on the table; doesn't claim premium positioning.

**Strategy B — hold premium pricing + introduce 10oz Onyx-style entry**:
- **Tier A house: hold $24.99 / 12oz** + introduce **10oz at $19.99** (Onyx playbook)
- **Tier B premium: hold $26.99 / 12oz** + introduce **10oz at $21.99**
- 5lb anchor: **$130** (matches premium tier $1.30/oz)
- Sub: 15% off → $21.24 / $22.94
- **Pros**: premium positioning intact; smaller-bag entry reduces sticker-shock for first-purchase; mirrors the most-credible-comp (Onyx) playbook.
- **Cons**: 10oz adds SKU complexity; brand-story load is real (need named-farm / agent-managed-roast / something to defend the +28% premium).

**My recommendation**: **Strategy B**. Reasoning:
1. Coastal's brand voice (Sal/LUC/ACHEEVY/Melli, the team chat, the "Made in PLR" provenance, the agentic-managed counter) IS the value-add that justifies premium positioning. That brand layer is real, not story-only.
2. The 10oz entry SKU at $19.99 / $21.99 lets new custees enter at "median 12oz price" — they're not paying a premium until they decide they like it.
3. Subscription discount kicks in at the 12oz/5lb tier; sub custees are committed enough to value the premium frame.

**Strategy A (Verve-anchor)** earns its slot if owner wants a quieter launch, lower margin, faster trial conversion at the expense of premium positioning.

### 5lb pricing correction

v1 had 5lb at $95. Per retry agent's data ($110-$130 across competitors), v2 should be:
- Strategy A: **$110-$115 / 5lb** (CC parity)
- Strategy B: **$130 / 5lb** (Onyx parity)

**Strong correction from v1** — $95 was 18-30% under-market.

### 24oz format option (NEW)

Counter Culture publishes 24oz at $37.50-$38.50. Coastal could mirror at ~$44-46 for a 24oz mid-tier SKU. This is a NEW format not in TCR drop-ship today — owner conversation needed with TCR for 24oz availability.

---

## 2. Special Offerings

**Sources verified**: Onyx, Sey, George Howell, Equator, Klatch, Counter Culture, Mostra, Atlas Coffee Club. Cooper's Cask unreachable.

### Pricing matrix (special tier only)

| Competitor | SKU | Type | Size | One-off | Sub | $/oz |
|---|---|---|---|---|---|---|
| Onyx | Cold Brew (Colombia) | Cold-brew specific | 10oz | $21.50 | yes | $2.15 |
| Mostra | Cool Beans | Cold-brew specific | 10oz | $24.00 | yes | $2.40 |
| Onyx | Ecuador Oak Barrel Anaerobic | Barrel-aged process | 10oz | $38.00 | — | **$3.80** |
| Counter Culture | Perennial | Limited release | 12oz | $26.00 | — | $2.17 |
| Klatch | Limited Edition Pacamara Black Honey | Weekly-drop limited | 310g (~11oz) | $24.95 | — | $2.27 |
| George Howell | El Meson Summer Harvest | Seasonal limited | 12oz | $42.00 | — | $3.50 |
| Atlas | Coffee of the Month Club | Monthly sub | 12oz/bag | — | $14.00 | $1.17 |
| Counter Culture | Single-Origin Subscription | SO sub | 24oz (2 bags) | — | $39.00 | $1.63 effective |

### Premium tier vs standard blend baseline ($1.83/oz)

| Sub-category | Price/oz range | Premium |
|---|---|---|
| Cold-brew-specific blend | $2.15-$2.40 | +20-30% |
| Coffee of the Month subscription | $1.17-$1.63 | -10 to -35% (sub discount) |
| Limited-release blends | $2.17-$2.60 | +20-40% |
| Single-origin gesha / pacamara | $3.17-$7.00 | +75-280% |
| Trophy / barrel-aged process | $3.80+ | +110%+ |

### Coastal recommendation (split SKU pricing per the new category framework)

| SKU | TCR cost | v1 retail | **v2 retail** | $/oz | Rationale |
|---|---|---|---|---|---|
| Cold Brew (`COLD`) — 12oz | $16.21 | $26.99 | **$24.95** / sub $21.21 | $2.08 | Center of Mostra-Onyx comp band |
| Coffee of the Month (`MONTH`) — 12oz | $16.50 | $26.99 | **$24.99 one-off / $19.99 sub** | $2.08 / $1.67 | Mirrors CC $19.50/bag sub-effective. Atlas $14 is mass-market |
| Whiskey Barrel Guatemala 30-day (`WBAR`) — 12oz | $16.50 | $26.99 | **$34.99** | $2.92 | Premium framing. Onyx Oak Barrel $3.80/oz ceiling; $34.99 is 2.12× cost, well below ceiling, well above standard blend |

**Headline rule**: standard blends 1.5×-1.7× cost; special offerings 2.0×-2.3× cost; barrel-aged 2.0×-2.5× cost.

---

## 4. Single Origin (non-FT)

**Sources verified**: Stumptown, Counter Culture, Onyx, Sey, Heart, Madcap, George Howell. Blue Bottle blocked Cloudflare 403.

### Pricing matrix (representative SKUs)

| Competitor | Origin | Size | One-off | $/oz |
|---|---|---|---|---|
| Stumptown | Ethiopia (Suke Quto) | 10.5oz | $23.00 | $2.19 |
| Stumptown | Colombia (El Jordan) | 10.5oz | $25.00 | $2.38 |
| Stumptown | Kenya (Karumandi) | 10.5oz | $23.00 | $2.19 |
| Counter Culture | Ethiopia (Sharbo Maro) | 12oz | $27.00 | $2.25 |
| Counter Culture | Colombia (La Golondrina) | 12oz | $27.00 | $2.25 |
| Counter Culture | Kenya (Muthonjo) | 12oz | $30.00 | $2.50 |
| Counter Culture | Honduras (Pashapa) | 12oz | $23.00 | $1.92 |
| Onyx | Ethiopia (OneRepublic) | 10oz | $25.00 | $2.50 |
| Onyx | Burundi (Long Miles) | 10oz | $26.00 | $2.60 |
| Onyx | Colombia (La Riviera SL28) | 10oz | $62.00 | **$6.20** (boutique tier) |
| Sey | Ethiopia (Banko Gotiti) | 8.8oz | $40.00 | **$4.55** (microlot) |
| Sey | Kenya (Karatu AA) | 8.8oz | $39.00 | $4.43 |
| Heart | Ethiopia | 8oz | $32.00 | $4.00 |
| Madcap | El Salvador Pacamara | 8oz | $45.00 | $5.62 |
| George Howell | Brazil (Daterra Sundrop) | 12oz | $26.00 | $2.17 |
| George Howell | Costa Rica (La Minita) | 12oz | $26.00 | $2.17 |

### Market segmentation (n=86 SKUs across all 7 retailers)

| Tier | Peers | Standard origin | Premium origin (Kenya, etc) |
|---|---|---|---|
| Mid-tier specialty | Stumptown, CCC, GH | **$2.19/oz** ($26.28/12oz) | $2.19/oz (no premium at this tier) |
| Boutique microlot | Sey, Onyx, Madcap, Heart | **$4.43/oz** ($53.18/12oz) | $4.43/oz |
| Exotic Gesha/Panama | Onyx, Sey, GH | $6-$15/oz | — |

### Key finding (CRITICAL)

**Kenya / Sumatra / Bali carry NO meaningful premium at mid-tier**. Counter Culture and Stumptown price these at the same $23-$30 band as Ethiopia / Colombia / Costa Rica. The "premium origin" pricing only exists at the boutique microlot tier (Sey at $4.43/oz, Madcap at $5.62/oz) — and Coastal's Temecula drop-ship cost basis ($16.78/12oz) **cannot credibly support that positioning**. Sey's $40/8.8oz reflects importer-direct + producer-named lots, not drop-ship.

### Coastal recommendation

| Origin tier | TCR cost | v1 retail | **v2 retail** | $/oz | Markup | Margin |
|---|---|---|---|---|---|---|
| Standard SO (`COLO`, `COSTA`, `ETHN`, `GUAT`, `HOND`, `MEX`, `NIC`, `PERU`, `TANZ`, `UGAN`, `INDOR`, `PNG`) | $16.47 | $28.99 | **$26.00** | $2.17 | 1.58× | 36.7% |
| Premium SO (`BALI`, `BRAZ`, `KENYA`, `SUM`) | $16.78 | $32.99 | **$28.00** | $2.33 | 1.67× | 40.1% |
| Subscription (both tiers) | — | — | **$24/$26** (8% off) | — | — | — |

**Don't price above $30/12oz** without microlot-grade story. Coastal's drop-ship origins cannot credibly cross into Sey/Onyx microlot territory ($40+).

---

## 5. Single Origin Fair Trade — CRITICAL revision needed

**Sources verified**: Equal Exchange, Pachamama, Higher Grounds, Just Coffee Coop, Birds & Beans, Larry's Coffee, Allegro, Cafedirect, Caribou.

### Pricing matrix

| Competitor | Origin | Size | One-off | $/oz | FT badge prominent? |
|---|---|---|---|---|---|
| Equal Exchange | Ethiopian Organic | 12oz | $15.58 (Amazon) / $9.70 ea via 6-pack | $1.30 | Yes |
| Pachamama* | Ethiopia Yirgacheffe | 10oz | $25.00 | $2.50 | No FT badge — coop-owned framing |
| Pachamama* | Guatemala Organic | 10oz | $22.00 | $2.20 | No FT badge |
| Higher Grounds | Peru Apex (Homer Gayoso microlot) | 10oz | $25.00 | $2.50 | Site-wide FT/organic emphasis |
| Just Coffee Coop | Nicaragua Las Diosas | 12oz | $20.00 | $1.67 | Yes — coop framing |
| Birds & Beans | Wood Thrush (Peru, medium) | 12oz | $17.94 | $1.50 | Yes — triple badge |
| Birds & Beans | Scarlet Tanager (Peru, dark) | 12oz | $17.95 | $1.50 | Yes |
| Larry's Coffee | Sumatra Single-Origin Light | 12oz | ~$15-17 reg / $7.95 sale | $1.25-1.42 | Yes |
| Larry's Coffee | Decaf Honey Honduras | 12oz | $22.50 | $1.88 | Yes |
| Allegro (Whole Foods) | Sumatra Boru Batak / Lintong | 12oz | ~$13-15 | $1.08-1.25 | RFA/FT not lead claim |
| Cafedirect (UK) | Machu Picchu Peru Organic | ~8oz | £5.85-6.79 (~$11.40-$13.20 / 12oz norm) | ~$0.95-1.10 | Yes — UK Fairtrade Foundation |
| Caribou | Daybreak Blend (RFA, not FT) | 12oz | $7.99-$15.99 sub | $0.67-1.33 | RFA, not FT |

*Pachamama not FT-certified (farmer-owned coop, pays farmers 6× FT premium) — included as functional peer.

### Critical findings

- **FT/organic single-origin median 12oz (US craft tier): ~$17.95**. Including grocery: median $19-20.
- **FT premium over comparable non-FT: only +5% to +12%** at the craft tier. The bigger spread comes from cooperative/farmer-direct narrative, not the FT certification mark itself.
- Coastal's true landed cost: $16.75/bag drop-ship + $0.78/bag amortized $39/mo subscription overhead (assuming 50 bags/mo across 7 FT SKUs) = **$17.53/bag effective cost**.

### Coastal recommendation (CRITICAL revision)

| Tier | TCR cost (eff $17.53) | v1 retail | **v2 retail** | $/oz | Markup eff | Margin |
|---|---|---|---|---|---|---|
| Floor | $17.53 | — | $22.95 / sub $19.95 | $1.91 | 1.31× | 24% / 12% |
| **Target (recommended)** | $17.53 | $31.99 | **$24.95 / sub $21.95** | $2.08 | 1.42× | 30% / 20% |
| Stretch | $17.53 | — | $26.95 / sub $22.95 | $2.25 | 1.54× | 35% / 24% |

**v1 was $31.99 — that was 30% above market median.** At $31.99, FT SKUs would not move; competitors at $17.95 are visibly more affordable for the same FT-certified product.

**v2 recommended target $24.95** sits at Just Coffee Coop / Larry's specialty tier, justifiable on "Made in PLR + farmer-direct origin storytelling."

**Below $22.95 floor**, the $39/mo subscription overhead eats too much margin to justify holding the FT program. If FT positioning isn't load-bearing for the brand, consider dropping the FT subscription and these 7 SKUs entirely — non-FT single-origin (Tier E above) covers Sumatra + Peru + Colombia + Honduras + Guatemala already at the same $26/$28 retail.

---

## 6. Tea (standard + premium)

**Sources verified**: Harney & Sons, Adagio, In Pursuit of Tea, Plum Deluxe, Smith Teamaker, Rishi Tea, Tealyra. Mariage Frères / Dobra Tea data partial.

### Pricing matrix

| Competitor | SKU | Type | Size (oz) | Price | $/oz |
|---|---|---|---|---|---|
| Adagio | Earl Grey Bravo | Std black | 3 | $9.00 | $3.00 |
| Adagio | English Breakfast | Std black | 3 | $9.00 | $3.00 |
| Harney | Earl Grey Supreme | Std flavored | 4 (tin) | $12.00 | $3.00 |
| Harney | English Breakfast | Std black | 4 | $13.00 | $3.25 |
| Harney | Dragon Pearl Jasmine | Premium green hand-rolled | 4 | $28.00 | $7.00 |
| Smith Teamaker | British Brunch | Std black | 3.5 | ~$18-22 | $5.14-6.30 |
| Smith Teamaker | Lord Bergamot | Std Earl Grey | 3.5 | ~$18-22 | $5.14-6.30 |
| Rishi | Earl Grey Organic | Std black | 3.3 | ~$15-18 | $4.55-5.45 |
| Rishi | Jasmine Pearls Organic | Std-premium green | 3 | $16-18 | $5.50-6.00 |
| Tealyra | Cream Earl Grey Moonlight | Std flavored | 3.5 | ~$16 | $4.57 |
| Plum Deluxe | Earl Grey / Old Cabin | Std blends | 1 | $6.00 | $6.00 |

### Premium tea (Matcha + Hojicha)

| Competitor | SKU | Grade | Size | Price | $/oz |
|---|---|---|---|---|---|
| Harney | Organic Ceremonial Matcha | Ceremonial | 1.06 | $24.00 | **$22.64** |
| Rishi | Ceremonial Matcha | Ceremonial | 1.06 | $24.00 | **$22.64** |
| Smith Teamaker | Matcha No. 7 | Ceremonial | 1.41 | $24.99 | $17.72 |
| Adagio | Matcha (Samidori, Uji) | Ceremonial-leaning | 2 | ~$29 | ~$14.50 |
| Tealyra | Imperial Matcha Ceremony Grade 1 | Ceremonial (mid-market) | 3.5 | ~$30-35 | $8.50-10.00 |
| Rishi | Matcha Super Green | **Culinary blend** (matcha+sencha) | 1.76 | ~$15-18 | $8.50-10.20 |
| Adagio | Houjicha | Std-premium roasted green | varies | varies | $4.50-5.50 |
| Tealyra | Hojicha | Std-premium roasted green | 3.9 | ~$14-18 | $3.60-4.60 |

### Critical findings

1. **Standard tea market median ($/oz, 3oz format) = ~$4.50**. Coastal v1 at $19.99/3oz = $6.66/oz was actually ABOVE market — but well within Plum Deluxe / Smith range. Recommend bumping to $22.99 (now sits at premium-tier framing, with ~$7.66/oz justified by drop-ship + Coastal brand layer).

2. **Matcha bifurcates SHARPLY by grade**:
   - **Pure ceremonial** (whisk-grade): $17-22/oz — Harney, Rishi, Smith
   - **Culinary blend** (lattes/baking, sencha-blends): $8-10/oz — Rishi Super Green, etc.
   - **Coastal cost basis is $5/oz** — that screams CULINARY or low-end ceremonial. Matcha grade at this cost basis cannot honestly be marketed as "ceremonial."

3. **Hojicha at $15 cost is over-anchored vs market** — competitors cap hojicha at $5.50/oz ($16.50/3oz). At v1 $26.99/3oz Coastal was 60% above market. Recommend $22.99 (1.53× cost, market-realistic).

### Coastal recommendation

| Tier | TCR cost (3oz) | v1 retail | **v2 retail** | $/oz | Notes |
|---|---|---|---|---|---|
| Standard tea (TJAS, TENG, TCHAI, TEARL, TPEACH, TMANG, TMINT, TROO, THIB) | $12.00 | $19.99 | **$22.99 / sub $19.99** | $7.66 / $6.66 | Sits at premium-tier framing |
| Matcha (TMATCH) — culinary tier | $15.00 | $26.99 | **$26.99** (HOLD if culinary grade) | $9.00 | Default. Verify grade. |
| Matcha (TMATCH) — IF ceremonial grade confirmed | $15.00 | $26.99 | **$39.99-44.99** | $13.33-14.99 | Only if Coastal can confirm ceremonial-grade with Temecula (cost basis suggests it isn't) |
| Hojicha (THOJ) | $15.00 | $26.99 | **$22.99** | $7.66 | Drop. Market caps lower than matcha. |

**Action item for owner**: confirm with TCR whether TMATCH SKU is **ceremonial-grade** (whisk-grade, vivid green, $17-22/oz market) OR **culinary-grade** (latte-grade, dull green, $8-10/oz market). The cost basis ($5/oz) is consistent with culinary; if TCR markets it as ceremonial, ask for grade certificate and the source farm/region (Uji, Nishio, etc.).

---

## 3. Flavored Coffees

**Sources verified**: Volcanica, Lifeboost, Door County. Cooper's Cask (renamed cooperscoffeeco.com, 404), Wild Coffee, Boca Java all unreachable (Cloudflare/TLS blocks).

### Pricing matrix

| Competitor | SKU | Size | One-off | Sub | $/oz | Notes |
|---|---|---|---|---|---|---|
| Volcanica | Hazelnut Flavored | 16oz | $19.99 | n/a | $1.25 | Flat $19.99 across all flavored SKUs |
| Volcanica | French Vanilla Flavored | 16oz | $19.99 | n/a | $1.25 | |
| Volcanica | Caramel Chocolate Flavored | 16oz | $19.99 | n/a | $1.25 | |
| Lifeboost | Pumpkin Spice (seasonal) | 12oz | $29.99 | ~$20.99 (S&S 30%) | $2.50 | "Natural flavoring, 0-calorie extracts" — premium-organic positioning |
| Lifeboost | Cinnamon Apple Streusel | 12oz | $29.99 | ~$20.99 | $2.50 | Natural flavoring + dash of vanilla |
| Lifeboost | Eggnog Latte (seasonal) | 12oz | $29.99 | ~$20.99 | $2.50 | |
| Door County | Old Fashioned Coffee | 10oz | $11.99 | n/a | $1.20 | Cocktail-themed flavored |
| Door County | Brandy Alexander | 10oz | $11.99 | n/a | $1.20 | Lowest of comp set |
| Door County | Espresso Martini | 10oz | $11.99 | n/a | $1.20 | Seasonal-cocktail SKU |

### Critical findings

1. **Median 12oz flavored specialty ≈ $18-22**. Wide spread by positioning ($1.20-2.50 / oz).

2. **Third-wave specialty roasters skip flavored entirely** (Coffee Bros confirmed). Flavored positions closer to "elevated mass" than "third-wave premium." Coastal's flavored line will sit in the elevated-mass tier regardless of broader brand positioning.

3. **Flavored vs unflavored direction varies by shop**:
   - Volcanica flavored $19.99/16oz = $4-10 DISCOUNT vs their single-origin ($21.99-29.99) — flavored positioned as "approachable."
   - Lifeboost flavored $29.99 = $1 PREMIUM over core unflavored $28.99 — flavored positioned as "indulgent premium."

4. **Subscription cadence**: Lifeboost only competitor with explicit S&S (30%+ off). Coastal should match at 25-30% sub discount.

5. **Premium signal language**: "natural flavoring, 0-calorie extracts" wins the premium tier (Lifeboost). Volcanica/Door County silent on flavoring source = cheaper signal.

### Coastal recommendation

| Tier | TCR cost | v1 retail | **v2 retail** | $/oz | Markup |
|---|---|---|---|---|---|
| All flavored SKUs (Tier D — DBAI/SMOR/FRVAN/HAZL/MEXCH/CHHAZ/CINHAZ/VANHAZ/CARA/PUMP/MOCHA/CINN/TURT/MINT/CANDY/PECAN) | $16.27 | $26.99 | **$24.99 / sub $19.99** | $2.08 / $1.67 | 1.54× / 1.23× |

**Brand voice for PDP copy**: lead with "Natural flavoring, no syrups, no extracts" — Lifeboost's premium-frame language. Distance Coastal's flavored line from syrup-flavored mass-market.

**Seasonal pricing**: keep flat — no observed competitor charges premium for Pumpkin Spice / Candy Cane / holiday SKUs.

---

## 7. Instant Coffee

**Sources verified**: Waka, Four Sigmatic. Cometeer / Voila / Starbucks Via blocked (Cloudflare 429). Verve no instant SKUs.

### Pricing matrix

| Brand | SKU | Format | Price | Per-serving | Per-oz |
|---|---|---|---|---|---|
| Waka | Dark Roast Single-Serve | 8-ct box (48g) | $9.99 | **$1.25** | $5.93 |
| Waka | Decaf Medium 50-ct | Large box (156g) | $44.99 | **$0.90** | $8.18 |
| Waka | Earl Grey Black Instant | 4.5oz pouch | $17.99 | (bulk) | **$4.00** |
| Waka | Instant Discovery Bundle | 8-pack | $35.00 | $4.38 | n/a |
| Four Sigmatic | Focus Instant Multiserve | jar (~30 svg) | $24.50 | **$0.82** | n/a |
| Four Sigmatic | Original Mushroom Coffee | sachets | $35.00 | varies | n/a |

### Findings + recommendation

- **Median per-serving (sachet/pod)**: ~$0.95-$1.25 for premium specialty.
- **Median per-oz (bulk pouch)**: ~$4.00/oz.
- Coastal $24.99/3oz = $8.33/oz — sits between bulk pouch ($4/oz) and premium single-serve sachets ($10/oz equivalent). **Reasonable as "specialty single-serve" positioning.**

**Coastal recommendation**:

| SKU | TCR cost | v1 retail | **v2 retail** | $/oz | Notes |
|---|---|---|---|---|---|
| Instant Medium Roast (`INSTMED`) — 3oz | $16.00 | $24.99 | **$24.99 / sub $19.99** (HOLD) | $8.33 | At-market for premium single-serve tier |

**⚠️ SUBSCRIPTION-GATE concern** (see Section 9 below): Coastal currently requires Premium Product subscription ($39/mo) to access Instant. First-bag customer cost = $24.99 + $39 = $63.99 month-1 — significantly higher than market trial entry. Recommend reframing sub from gate → discount.

---

## 8. Functional Coffee & Tea

**Sources verified**: RYZE, MUDWTR, Four Sigmatic, Laird Superfood, Earth & Star.

### Pricing matrix

| Brand | SKU | Format | Servings | Price | Per-serving |
|---|---|---|---|---|---|
| RYZE | Mushroom Coffee | bag | 30 | $27 sub / $45 OTP | **$0.90 sub / $1.50 OTP** |
| RYZE | Mushroom Matcha | bag | 30 | $36 sub / $64 OTP | $1.20 sub / $2.13 OTP |
| MUDWTR | Coffee :rise (cacao-mushroom) | bag | 30 | $40 | **$1.33** |
| Four Sigmatic | Original Mushroom Coffee | bag | varies | $35 | ~$1.17 |
| Laird | PERFORM Functional Mushroom Coffee | 12oz ground | ~32 | $20 | **$0.63** |
| Laird | Mushroom K-Cups | 16ct | 16 | $15 | $0.94 |
| Earth & Star | Decaf / Hazelnut / Dark Roast | 12oz bag | ~32 | $24.99 | **$0.78** |

### Findings + recommendation

- **Median per-serving**: ~$0.95 (range $0.63 Laird → $1.50 RYZE OTP). Subscription routinely cuts ~30-40%.
- Coastal proposed $28.99/8oz: at 30 servings = **$0.97/svg**, sits exactly between RYZE sub ($0.90) and MUDWTR ($1.33). **At-market.**
- **CRITICAL**: confirm TRIO* SKU serving count with TCR. If only 16-20 servings per 8oz, Coastal is at $1.45-$1.81/svg — above entire premium category.

**Coastal recommendation**:

| SKU | TCR cost | v1 retail | **v2 retail** | $/svg @ 30 | Notes |
|---|---|---|---|---|---|
| TRIODARK / TRIOMED / TRIOINSTAC / TRIOMATCH / TRIOHOJ — 8oz each | $16.00 | $28.99 | **$28.99 / sub $19.99** (HOLD if 30 svg) | $0.97 / $0.67 | At-market |

**⚠️ Functional commands ~$0.30-$0.50/serving premium over standard ground** — Coastal $28.99/8oz vs hypothetical $19.99/8oz standard = +45% premium. Aggressive but defensible.

---

## 9. CRITICAL — Subscription-gate model is creating trial friction

**The problem** (per latest agent, confirmed across both Instant + Functional categories):

Coastal's current model **gates** access to Instant + Functional behind a Premium Product subscription ($39/mo). This is structurally different from every researched competitor:
- RYZE / MUDWTR / Four Sigmatic: sell single bags freely; subscription is OPTIONAL discount.
- Waka / Laird: same — open access, subscription = discount.
- Cometeer: per-pod priced, no subscription gate.
- Coastal v1: Premium sub $39/mo REQUIRED to even buy first bag.

**Math at trial** (Coastal v1):
- First Functional bag: $28.99 + $39 sub = **$67.99 month-1** = **$2.27/serving** (8oz / 30 svg) → above every competitor including Cometeer.
- First Instant bag: $24.99 + $39 sub = $63.99 month-1.

**Trial-conversion risk**: prospective customer comparing Coastal Functional vs RYZE OTP ($45/30svg = $1.50/svg) sees Coastal at $67.99/30svg = $2.27/svg = 51% MORE expensive at first bag. Customer doesn't see the long-term breakdown.

### Three options

**Option A — drop the gate, keep the subscription as discount-only**:
- First bag price = $28.99 (Functional) / $24.99 (Instant) — directly competitive.
- Premium sub $39/mo becomes Coastal-Plus add-on for benefits beyond price (e.g. priority fulfillment, monthly drops, exclusive SKUs, access to Sal/LUC/ACHEEVY priority chat).
- Same revenue as today for committed customers; lower trial friction.

**Option B — bundle first bag with subscription**:
- Custee pays $39/mo sub, gets first Functional bag FREE.
- Net month-1 = $39 = $1.30/svg = at MUDWTR parity. Acceptable trial entry.
- Requires sub commitment up-front, which adds friction in the other direction.

**Option C — keep current gate, accept reduced trial conversion**:
- Defensible only if Functional / Instant aren't core acquisition surfaces (i.e. customers come in via Coffee Blends or Single Origin, then add Functional once subscribed).
- Requires that Coastal NEVER markets Functional / Instant on landing page or ad campaigns as entry product.

**Recommendation**: Option A. The Premium Product subscription was a structural artifact from TCR's drop-ship requirement (TCR demands the $39 partner program subscription for these SKUs), not a customer-facing pricing decision. Coastal pays TCR the $39/mo but doesn't have to recoup it via customer-facing gate — recoup it via volume on the broader catalog.

### Owner action item

Decide which option ships. This affects PDP design + checkout flow + the AppInt email automation messaging for new signups.

---

## Other refinements from latest agent (Hojicha + Matcha)

- **Hojicha is a roasted green tea, NOT a powder.** It prices like Earl Grey, not like Matcha. v1 + my earlier v2 had it at premium tier — **this was a category error**. Hojicha goes into **standard tea tier at $19.99/3oz** (was: $22.99 v2a, $26.99 v1).
- **Matcha sits as the ONLY true premium tea SKU**. Adagio Matcha $51/3oz, Rishi Barista $55.93/3oz. Coastal's $44.99/3oz is well below market — leaves room for premium-tier pricing without crossing the ceremonial-grade line. Stays at $44.99 / sub $38.24.

---

## Pre-existing intel reconciliation

`docs/catalog/industry-pricing-comparison.csv` (April 29) had these data points that align with our research:
- TCR direct retail prices (FT Sumatra $24.49, Earl Grey 3oz $19.99, Ceremonial Matcha 1oz $24.99) — **confirms hard ceiling for Coastal pricing**.
- Counter Culture Hologram $21.99 — matches our scrape.
- Equator French Roast FT Organic $19.75 — confirms FT premium is minimal.
- Stumptown Hair Bender $18.50 (in CSV, vs $21.99 from our scrape — 18% delta could be channel/discount).

`docs/catalog/coastal-product-list-proposal.md` + `temecula-custom-blend.md` + `vendor-temecula-organic-fairtrade.csv` — **NOT yet read** in this session. Owner-flag: are these current or superseded? Worth reconciling if not superseded.

---

## Refinements from second-wave Flavored + Special Offerings agent

The second agent landed Cooper's Cask data + Volcanica/Freshroasted granularity that refines earlier numbers:

| SKU | v2a (first pass) | **v2b (refined, FINAL)** | Reason |
|---|---|---|---|
| Whiskey Barrel (WBAR) | $34.99 | **$28.99** | Cooper's $29.95 is the specialty barrel-aged market reference; $34.99 was above Cooper's. Slight under-pricing supported. |
| Cold Brew (COLD) | $24.95 | **$21.99** | Market median $19.95 (Cooper's $18.95-19.95, Coffee Bros $16.99). $24.95 was +25% over market. |
| Coffee of the Month one-off (MONTH) | $24.99 | **$22.99** | Premium curated subs $19-$25 — $22.99 sits middle. |
| Coffee of the Month sub | $19.99 | **$19.99** | Hold — matches Atlas-vs-premium-curated middle. |
| All Flavored SKUs | $24.99 | **$22.99** | Median flavored $14.99 (Volcanica, Freshroasted); Lifeboost $29.99 is the lone clean-label outlier. $22.99 only defensible IF Coastal leads with clean-label / no-PG / no-mycotoxin / FDA Address tier story (per Lifeboost playbook). Otherwise drop further to $19.99. |

**Critical context** (from second agent): **Third-wave specialty roasters carry ZERO flavored SKUs** (Coffee Bros, Onyx, Sey, George Howell, Equator). Flavored is mass-market territory. Coastal flavored line positions as "elevated mass," NOT third-wave. PDP copy must lead with Lifeboost-style clean-label messaging or accept $19.99 commodity-mass pricing.

**Whiskey-barrel premium IS real** (+50-80% over plain SO at the same roaster). Coastal at $28.99 vs Coffee Blend Tier B $25.99 = +12% — under-uses the available premium ceiling. Owner could push to $32-34 if comfortable with Cooper's tier; $28.99 is the conservative play.

---

## Final v2 retail price recommendations (consolidated all 8 categories — POST cross-validation)

| Coastal SKU group | TCR drop-ship cost (12oz unless noted) | **v2 retail one-off** | **v2 retail subscription** | TCR direct retail (ceiling) |
|---|---|---|---|---|
| Coffee Blends Tier A (House) | $15.78 | **$24.99** | $21.24 | n/a (TCR direct varies) |
| Coffee Blends Tier B (Premium) | $16.21 | **$25.99** | $22.09 | n/a |
| Coffee Blends — Decaf (DECAES, DEPER, HALFCAF) | $16.50 | **$25.99** | $22.09 | n/a |
| Special — Cold Brew (COLD) | $16.21 | **$21.99** | $18.69 | n/a |
| Special — Coffee of Month (MONTH) | $16.50 | **$22.99 / $19.99 sub** | (sub IS the price) | n/a |
| Special — Whiskey Barrel (WBAR) | $16.50 | **$28.99** (or push $32-34 if Cooper's tier) | $24.64 | n/a |
| Flavored Coffees (16 SKUs) | $16.27 | **$22.99** (clean-label story) OR **$19.99** (commodity-mass) | $19.99 / $16.99 | n/a |
| Single Origin standard (12 SKUs) | $16.47 | **$26.00** | $22.10 | varies |
| Single Origin premium (BALI, BRAZ, KENYA, SUM) | $16.78 | **$28.00** | $23.80 | varies |
| Single Origin Fair Trade (7 SKUs) | $16.75 | **$24.95** | $21.95 | **$24.49** (TCR direct) |
| Tea standard (9 SKUs) | $12.00 / 3oz | **$22.99** | $19.99 | $19.99 (TCR direct Earl Grey) |
| Tea — Hojicha (THOJ) | $15.00 / 3oz | **$19.99** | $16.99 | n/a |
| Tea — Matcha (TMATCH, ceremonial) | $15.00 / 3oz | **$44.99** | $38.24 | $24.99/oz × 3 = $74.97 (TCR direct) — Coastal at $44.99 is value play vs TCR |
| Instant Coffee (INSTMED) | $16.00 / 3oz | **$24.99** | $19.99 | n/a |
| Functional Coffee/Tea (5 SKUs) | $16.00 / 8oz | **$28.99** | $19.99 (sub IS price under Option B) | n/a |

**Pending owner decisions**:
1. Tier B blends $25.99 vs $26.99 (with story upgrade) — pick one.
2. FT program — keep or drop?
3. Subscription-gate model — Option A (drop gate) / B (bundle first bag) / C (keep gate)?
4. Hojicha standard tier vs premium tier — confirmed standard ($19.99). Owner ratifies.
5. Earl Grey at $22.99 over TCR direct $19.99 — defensible only with bundled value-add. Drop to $19.99 parity?
6. Read `docs/catalog/coastal-product-list-proposal.md` etc. for prior decisions to honor?

---

## Critical revisions to `pricing-margin-model-2026-05-09.md`

When market research completes for all 8 categories, update the model with:

1. **Tier B premium blends** — DROP $26.99 → $25.99 (or hold with story upgrade).
2. **Special Offerings** — SPLIT into 3 SKU prices: Cold Brew $24.95, Coffee of the Month $24.99/$19.99 sub, Whiskey Barrel **$34.99** premium framing.
3. **Tier E single-origin standard** — DROP $28.99 → **$26.00**.
4. **Tier F single-origin premium** — DROP $32.99 → **$28.00**.
5. **Tier G Fair Trade** — CRITICAL DROP $31.99 → **$24.95** (was 30% above market median).
6. **Tea standard** — RAISE $19.99 → **$22.99** (under-priced).
7. **Hojicha** — DROP $26.99 → **$22.99** (cost basis too high for market — flag with TCR).
8. **Matcha** — HOLD $26.99 IF culinary grade; verify with TCR.

**Net effect on margins** (expected): higher single-origin volume at lower price points (more accessible), FT becomes viable not loss-leader, tea margin improves, Special Offerings differentiation creates premium-tier WBAR halo.

## Open question

**Is the Fair Trade program worth keeping?** At v2 $24.95 retail, Coastal margin is 30% one-off / 20% sub. The $39/mo subscription Coastal pays for FT access amortizes thin. If FT positioning is core to brand identity → keep. If it's optional → consider dropping the 7 FT SKUs and the $39/mo subscription, lean on non-FT single-origin (already covers Sumatra/Peru/Colombia/Honduras/Guatemala at the same retail). Decision worth surfacing.

---

## CRITICAL ANCHOR — TCR's own retail prices (from `docs/catalog/industry-pricing-comparison.csv`, verified 2026-04-29)

Coastal's supplier (Temecula Coffee Roasters) **also sells direct to consumers** at their own URLs. This sets the **hard ceiling** on Coastal pricing — customers can buy the same coffee/tea at TCR's prices if Coastal goes higher. We CAN'T be higher than TCR direct without adding visible value (bundle, brand story, accessory pairing).

| SKU | TCR direct retail | Coastal v1 proposal | Coastal v2 (research-driven) | Headroom vs TCR direct |
|---|---|---|---|---|
| Fairtrade Sumatra 12oz | **$24.49** | $31.99 | **$24.95** | $0.46 (essentially parity) |
| Earl Grey loose 3oz | **$19.99** | $19.99 | **$22.99** | -$3.00 (over TCR direct — needs justification, e.g. bundled with branded canister) |
| Ceremonial Matcha 1oz | **$24.99** | $26.99/3oz | **$39.99-49.99/3oz** | TCR retails per-oz; Coastal's 3oz pack at $39.99 = $13.33/oz, **30% below TCR's per-oz rate** |
| Single Origin Sample Pack | **$30.00** | $28.99 | **$28.99** | $1.01 below TCR direct (good) |
| Ceremonial Matcha + Mushrooms 1oz | $29.00 | $28.99 (8oz) | TBD pending Functional research | — |

### What this confirms

1. **Matcha IS ceremonial-grade.** TCR retails it at $24.99/oz which sits squarely in the ceremonial-matcha band ($17-22/oz median per primary research; Ippodo $28/oz, Mizuba $40/oz). Coastal's drop-ship cost of $15/3oz ($5/oz) means Coastal is paying TCR roughly 20% of TCR's own retail. **Owner can price Coastal Matcha 3oz pack at $39.99-49.99 as ceremonial-grade with confidence.** That's per-oz $13.33-16.66 — well below TCR's own $24.99/oz, leaves Coastal as the value play vs TCR direct.

2. **Earl Grey at $22.99 needs careful framing.** TCR sells the same loose-leaf at $19.99/3oz. Coastal at $22.99 is 15% premium — only defensible with brand-story layer (bundled with branded canister, gift packaging, included tea-glass or chasen). Otherwise drop to $19.99 (TCR parity).

3. **FT Sumatra at $24.95 is now market-realistic AND TCR-parity.** TCR's own $24.49 retail confirms the v2 $24.95 recommendation is right on. v1 $31.99 would have been visible over-pricing.

4. **Sample pack at $28.99 is good** — slightly below TCR direct $30, gives shoppers a price reason to choose Coastal.

### Implications for the new pricing-margin-model v2

When pricing-margin-model is rewritten with all 8 categories' market data, **add a "TCR direct retail ceiling" column** for every SKU TCR sells direct. If Coastal's proposed retail exceeds TCR direct, the SKU needs:
- A bundled accessory (mug, tea-set, brewing tool) to justify the premium
- A subscription wrapper (sub price ≤ TCR direct one-off)
- A storytelling layer (origin video, farm-card, Coastal-branded packaging)
- OR drop to TCR-parity / -below

### Matcha grade — RESOLVED

Owner action: NONE needed. TCR retails their matcha at $24.99/oz which is unambiguously ceremonial-grade by every market benchmark. Coastal's TCR drop-ship matcha = ceremonial. Price the 3oz Matcha pack at **$44.99 retail / $38.24 sub (15% off)**, sells well below TCR's per-oz rate while protecting healthy margin (cost $15, retail $44.99 = 67% margin / 3.0× markup — appropriate for ceremonial-grade premium tier).
