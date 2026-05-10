# Coastal Brewing Co. — Product Categories Spec (2026-05-09)

Owner directive 2026-05-09: differentiate product lines into distinct
categories. Each category gets its own visual identity (photography,
color, typography, packaging treatment). No shared visuals between
categories. Markup must be market-anchored (researched, not invented).

## The 8 categories

Mapped from the TCR XLSX `iCloudDrive/.../03-supplier-tcr/TCR Q1 2026 Drop Ship Pricing.xlsx`,
verified against `scripts/data/temecula-q1-2026-pricing.json`.

| # | Category | TCR SKUs (count) | Sub-buckets |
|---|---|---|---|
| 1 | **Coffee Blends** | 15 | House blends (Italian, French, 6Bean, Christmas, Medium, Cowboy, Breakfast) + Premium blends (BB+, African, Max Caf, Blonde, Kopi Safari) + Decaf family (Decaf Espresso, Decaf, Half Caf) |
| 2 | **Special Offerings** | 3 | Whiskey Barrel-aged, Cold Brew, Coffee of the Month |
| 3 | **Flavored Coffees** | 16 | Dubai Chocolate, S'mores, French Vanilla, Hazelnut, Mexican Chocolate, Chocolate Hazelnut, Cinnamon Hazelnut, Vanilla Hazelnut, Caramel, Pumpkin Spice, Mocha, Cinnamon Roll, Turtle, Mint, Candy Cane, Pecan Pie |
| 4 | **Single Origin** | 12 | Bali, Brazil, Colombia, Costa Rica, Ethiopia (Natural), Guatemala, Honduras, Robusta (Indonesia), Kenya, Mexico, Nicaragua, Papua New Guinea, Peru, Sumatra, Tanzania, Uganda |
| 5 | **Single Origin Fair Trade** | 7 | Sumatra FT, Peru FT, Decaf Peru FT, Decaf Espresso FT, Guatemala FT, Honduras FT, Colombia FT |
| 6 | **Tea** | 11 | Standard (Jasmine, English Breakfast, Masala Chai, Earl Gray, Peach Paradise, Mango Treat, Moroccan Mint, Apple Cider Rooibos, Hibiscus Berry) + Premium (Hojicha, Matcha) |
| 7 | **Instant Coffee** | 1 | Instant Medium Roast |
| 8 | **Functional Coffee & Tea** | 5 | Coffee w/ Mushrooms (Dark, Medium, Instant), Matcha w/ Mushrooms, Hojicha w/ Mushrooms |

**Total SKUs**: 70 across 8 categories (before bundles, sample packs,
K-cup formats, accessories).

## Format extensions (not categories — these are format options across categories)

- **Sample Packs** — bundle format for Blends / Single Origin / Flavored. 6 × 2oz drip bags in custom-label pouch. $18 dropship / $14 bulk.
- **K-cups (Single Use Cups)** — alternate format for select Blends + Single Origins. $14.50 / $11 for 12-pack; $39 / $32 for 48-pack on select SKUs.
- **Sizes** within each category: 12oz / 1lb / 2lb / 5lb (whole bean or ground) for coffee; 3oz for most teas.

## Visual identity framework (per category)

Each category gets its own visual lane. Iller_Ang owns production. The
brief below is the design spec the storefront / PDP / marketing
creative must follow.

### 1. Coffee Blends — "The Counter Standard"

| Element | Treatment |
|---|---|
| **Primary palette** | Warm copper #C8732B (coastal amber) + deep navy #0F2A44 + cream #F3EFE6 |
| **Photography** | Counter-shot composition. Bag at 3/4 angle on dark wood with brass accents. Steam from a small cup in soft focus. Warm side-light. |
| **Typography** | Body: Coastal serif (high contrast). Accent: monospace SKU label "ITALY DARK" / "6BEAN" — small caps, letter-spaced. |
| **Packaging mock** | Matte black bag, copper foil "Coastal Brewing Co." wordmark, blend-name in serif. Shadow under bag is hard-edged (counter under spotlight). |
| **Storefront grid background** | Cream parchment #F3EFE6 |
| **Hero word for category** | "Reach for the bag you know." |

### 2. Special Offerings — "Limited & Considered"

| Element | Treatment |
|---|---|
| **Primary palette** | Whiskey amber #8B4513 + bottle green #1F4D3F + bone white #F5F1E8 |
| **Photography** | Moody. Single overhead beam light. Bag with whiskey glass / cold-brew growler / calendar-month tear sheet beside it. Dark background. |
| **Typography** | Larger serif for the offering name; tiny tab marker "LIMITED" or "MONTH XII" in monospace amber. |
| **Packaging mock** | Same matte black bag but with a wax-seal-style label badge ("WHISKEY BARREL — 30 DAY AGE") — hand-stamped feel. |
| **Storefront grid background** | Deep charcoal #1A1612 |
| **Hero word for category** | "Not for every day." |

### 3. Flavored Coffees — "Café Counter"

| Element | Treatment |
|---|---|
| **Primary palette** | Soft pastels — caramel #D2A679, mint #BFD8B8, cocoa #6B4F3A, vanilla cream #F0E7D8 (palette varies per flavor SKU) |
| **Photography** | Bright, sweet, café-counter feel. Bag with pastry / chocolate shaving / cinnamon stick / pumpkin slice as visual accent. White or pastel background. Top-down or bag-with-prop side-by-side. |
| **Typography** | Rounder serif (display weight) for flavor name. Whimsical accent ornaments (e.g. small icon of pastry next to S'MORES). |
| **Packaging mock** | Matte black bag with FLAVOR-COLOR foil accent strip across top (caramel for Caramel, mint for Mint, etc.) — at-a-glance differentiation per SKU on shelf. |
| **Storefront grid background** | Bright cream #FBF7EF |
| **Hero word for category** | "A little something extra in the cup." |

### 4. Single Origin — "From the Farm"

| Element | Treatment |
|---|---|
| **Primary palette** | Earth tones varying per origin — Ethiopian terracotta #C84B31, Colombian forest #3F5E3F, Kenyan ochre #B8860B, Peruvian ochre #A0522D. Default category-wide accent: deep moss #4F5D2F |
| **Photography** | Origin-context shots. Coffee cherries on the branch, drying patio, farmer's hand, farm-region landscape — paired with the Coastal bag. Documentary feel. Natural daylight. |
| **Typography** | Geographic serif. Origin name LARGE, region/elevation small below ("BALI · 1200-1500m elevation · MED-DARK"). |
| **Packaging mock** | Kraft-paper bag with ink-stamp origin badge + farm-region map illustration. Less polish than blends, more "third-wave specialty" feel. |
| **Storefront grid background** | Soft sand #EDE5D3 |
| **Hero word for category** | "Tasted at the source. Delivered to your counter." |

### 5. Single Origin Fair Trade — "Certified at the Root"

| Element | Treatment |
|---|---|
| **Primary palette** | Same earth tones as Single Origin BUT with an additional certification accent: **Fair Trade Certified blue-green #006D5B** + verification gold leaf #C9A227 |
| **Photography** | Same documentary style as Single Origin BUT every shot includes a visible FT certification mark / cooperative tag / farmer-as-stakeholder framing. Specifically humanizes the cooperative. |
| **Typography** | Same as Single Origin BUT with a "FAIR TRADE CERTIFIED" badge bar at top of every PDP and bag mock. Subscription-required notice in soft callout. |
| **Packaging mock** | Same kraft-paper as Single Origin BUT with an embossed Fair Trade seal in the upper-right corner. Bag's bottom band carries the cooperative name. |
| **Storefront grid background** | Soft sand #EDE5D3 + a top-right corner ribbon "FAIR TRADE CERTIFIED" |
| **Hero word for category** | "Every bag tracked back to the cooperative." |
| **Subscription-required note on PDP** | "Fair Trade single-origin coffees require an active Fair Trade Program subscription ($39/mo). When you add to cart, the subscription is bundled at checkout." |

### 6. Tea — "Quiet Hours"

| Element | Treatment |
|---|---|
| **Primary palette** | Sage #97A879 + porcelain white #F5F2E8 + tea-amber #B98856 + matcha green #6B8E4E (premium tea SKUs use matcha green as accent) |
| **Photography** | Quiet, contemplative. Loose tea in a hand-thrown ceramic dish. Steam from a glass cup. Window-light. Negative space. NOT busy. |
| **Typography** | Slightly different serif from coffee — softer (Garamond family vs Caslon family on coffee). Tea name in lower-case serif italic (visual distinction from coffee's all-caps treatment). |
| **Packaging mock** | Tin canister or kraft-paper sachet (NOT the matte black coffee bag — visually distinct format). Tea name on label in lowercase italic. |
| **Storefront grid background** | Off-white linen #F8F5EC |
| **Hero word for category** | "The slow brew." |

### 7. Instant Coffee — "When the Moment Won't Wait"

| Element | Treatment |
|---|---|
| **Primary palette** | High-contrast: charcoal #1A1612 + signal yellow #E8C547 + cream #F3EFE6 |
| **Photography** | Travel/commute context. Sachet stick or jar on a desk / camping stove / hotel-room table. Modern, energetic. NOT counter-shot. |
| **Typography** | Bolder, sans-serif accent (only place on the storefront where sans-serif appears) — visual signal "fast / functional / moment-of-need." |
| **Packaging mock** | Sachet stick OR small glass jar with charcoal label + yellow band. Distinct from the matte-black coffee bag. |
| **Storefront grid background** | Charcoal #1A1612 (dark theme — only category where this happens) |
| **Hero word for category** | "Same Coastal cup. No counter required." |
| **Subscription-required note on PDP** | "Instant Coffee requires an active Premium Product Subscription ($39/mo). Bundled at checkout." |

### 8. Functional Coffee & Tea — "Cup with Intent"

| Element | Treatment |
|---|---|
| **Primary palette** | Deep mushroom #5D4E37 + sage #97A879 + cream #F3EFE6 + adaptogen accent (warm rust #B85C38 for Coffee w/ Mushrooms; matcha green #6B8E4E for Matcha w/ Mushrooms) |
| **Photography** | Wellness-context. Brewed cup with a small dish of dried mushrooms / matcha powder / functional ingredient beside it. Soft natural light. Composition emphasizes "ingredient + cup." |
| **Typography** | Serif body + a small monospaced "FUNCTIONAL" tab marker. Ingredient list visible on PDP (e.g. "Lion's Mane, Cordyceps, Reishi"). |
| **Packaging mock** | Matte forest-green bag (distinct from coffee black). Forest-green + mushroom illustration on label. Subscription badge bottom-right. |
| **Storefront grid background** | Sage #DFE6D0 |
| **Hero word for category** | "What you brew can do more." |
| **Subscription-required note on PDP** | "Functional products require an active Functional Coffee subscription ($39/mo). Bundled at checkout. Read the Functional Products Page for usage guidance and limitations." |

## Storefront category landing pattern

Each category gets its own landing page at `/shop/{category-slug}`:
- `/shop/coffee-blends`
- `/shop/special-offerings`
- `/shop/flavored-coffees`
- `/shop/single-origin`
- `/shop/single-origin-fair-trade`
- `/shop/tea`
- `/shop/instant-coffee`
- `/shop/functional-coffee-tea`

Each landing page applies its category visual identity. Cross-category
navigation = the global nav, NOT in-page promo grids (don't dilute
each category's distinctness).

## Iller_Ang production work needed

| Asset | Per category | Total |
|---|---|---|
| Hero photography | 1 | 8 |
| PDP product shot per SKU | varies (1-16) | ~70 |
| Bag/packaging mock | 1 per category | 8 |
| Storefront grid tile | 1 per category | 8 |
| Lifestyle / context shot | 2-3 per category | ~20 |
| Bundle photography (cross-category) | per bundle | 8 |
| **Total deliverables** | | **~120 image assets** |

Pipeline per Iller_Ang canon: GPT Image 2.0 → Soul reference (when
character needed) → manual color grade → final ship.

## Market-research markup (next phase — see separate doc)

Owner directive: "Our markup price needs to be researched in the
market. We have to see what other companies are selling their products
for in the same type of product so that we can determine our markup on
the cost from Temecula."

Action: separate doc `market-pricing-research-2026-05-09.md` will
contain competitor-by-competitor pricing matrices per category, then
recompute Coastal retail prices anchored to market position (not the
arbitrary 1.6-2.0× markup I used in the v1 pricing model).

Competitors to research per category — initial target list:

| Category | Competitors |
|---|---|
| Coffee Blends | Stumptown, Counter Culture, Onyx Coffee Lab, Verve, Heart Roasters, Trade Coffee |
| Special Offerings | Onyx (limited drops), Sey Coffee (rare lots), George Howell, Equator (anniversary releases) |
| Flavored Coffees | Volcanica Coffee, Coffee Bros, Lifeboost, Wild Coffee, Cooper's Cask Coffee |
| Single Origin | Stumptown, Blue Bottle, Counter Culture, Sweet Maria's, Onyx, Sey, Madcap, Heart |
| Single Origin Fair Trade | Equal Exchange, Larry's Beans, Café Direct, Allegro Coffee Fair Trade lineup, Just Coffee Cooperative |
| Tea | Harney & Sons, Adagio Teas, In Pursuit of Tea, Plum Deluxe, Dobra Tea, Mariage Frères (entry tier) |
| Instant Coffee | Starbucks Via, Sudden Coffee, Waka, Verve Instant, Cometeer, Voila Coffee |
| Functional Coffee & Tea | Four Sigmatic, Ryze, MUDWTR, Laird Superfood, Cymbiotika, Earth & Star |

## Catalog code update needed (downstream of pricing ratification)

`scripts/catalog.py` currently has products with `category` field — but
the field doesn't match these 8 owner-named categories. Needs:
1. Add `category_slug` field per product mapping to one of 8 owner categories.
2. Add `category_visual_token` field for storefront rendering.
3. Add `subscription_required` flag for FT / Instant / Functional SKUs.

## Open question for owner (decaf placement)

Decafs (DECAES, DEPER, HALFCAF) — XLSX puts them adjacent to the
premium blends but BEFORE the "Special Offerings" header. I've folded
them into **Coffee Blends** (since they're blend-style, not single-
origin). If owner wants Decaf to be its own 9th category for shopper
search ergonomics, easy split.

## Pairings

- `pricing-margin-model-2026-05-09.md` (will be updated post-market-research)
- `market-pricing-research-2026-05-09.md` (next deliverable, this session)
- `bundle-proposals-2026-05-09.md` (cross-category bundles)
- Iller_Ang production briefs (downstream of category visual sign-off)
