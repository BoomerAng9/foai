# Coastal Brewing Co. — Design System (v3)
*Extracted from owner reference images · 2026-04-26*

> **Source of truth.** This document supersedes every prior `design.md` iteration. The system is extracted directly from owner-provided reference renders:
> - `~/iCloudPhotos/Photos/5EF45A1C-A6D2-47A6-B96F-9F320BE2740B.png` — light theme (lowcountry editorial)
> - `~/iCloudPhotos/Photos/14E0C2DC-B01D-4564-B03D-A5F8166BDF49.png` — dark theme (Coastal hero, primary surface)
> - `~/iCloudPhotos/Photos/Sal_Ang.png` — Sal_Ang (sales lead, Boomer_Ang) — coastal pop-up market scene
> - `~/iCloudPhotos/Photos/Melli in office.png` — Melli Capensi (marketing lead, Honey Badger / The Sett) — branded office scene

---

## 1. The thesis

Coastal Brewing Co. has **two complementary themes** that share a single discipline: **photography is the visual hero, type stays out of the way, color is mostly absent.**

| Theme | Surface | Mood |
|---|---|---|
| **Dark** (primary) | `brewing.foai.cloud` hero, product detail, chat shells | Confident, monochrome, photography-led. The "Nothing-tech meets specialty coffee" register. |
| **Light** (alternate) | Editorial / about / lowcountry storytelling pages | Warm, illustrative, line-art lowcountry. The "Field Notes by way of Acme Studios" register. |

**What both themes share:**
- Product photography does the heavy lifting (no decorative gradients, no stylized borders).
- Type is small, confident, and direct. No flourish, no pull-quotes, no marketing fluff.
- Section labels are short and declarative with terminal periods — *"The lineup."*, *"The commitment."*, *"Brewed for the Lowcountry."*
- Lowcountry visual signature appears subtly: a tropical **palm tree** silhouette anchors the bottom-right corner of the dark theme; the light theme uses **wood stork** line illustrations in the right margin (often with a palm tree in the same vignette). The wood stork (*Mycteria americana*) is the brand's signature bird — the only stork native to North America, with strong Lowcountry / coastal-Georgia / coastal-Carolina presence. **Never** call it an egret, crane, or heron.
- Footer signs the brand: *"powered by ACHIEVEMOR"* (dark) and *"Made in PLR."* (light, verbatim brand stamp — preserve as-is, do not expand).

---

## 2. Color palette

### Dark theme (primary)

| Token | Hex | Usage |
|---|---|---|
| `--background` | **#0a0a0a** | Page background — deep matte black, slightly warm |
| `--foreground` | **#e8e6e0** | Primary text — off-white, never pure white |
| `--muted` | **#a09c92** | Secondary text, captions |
| `--muted-strong` | **#6a665d** | Tertiary text, footer rules |
| `--border` | **#1a1816** | Hairline rules between sections |
| `--surface` | **#0f0e0d** | Card / commitment-grid cell background |
| `--accent` | **#c0a572** | Reserved — used **only** in places where a single highlight is unavoidable (the "subscription handshake" link in the dark hero, for example). Default: don't use. |

### Light theme (alternate)

| Token | Hex | Usage |
|---|---|---|
| `--background` | **#f3efe6** | Page background — warm cream, the lowcountry floor |
| `--foreground` | **#1a1612** | Primary text — near-black with warm cast |
| `--muted` | **#6a665d** | Secondary text, captions |
| `--border` | **#d8d2c4** | Hairline rules |
| `--surface` | **#ffffff** | Card/product backdrop (cream → white card on cream page) |
| `--accent-sage` | **#6b8e4e** | Sage green — used **sparingly**, only on matcha-related elements |

### Color rules
- **No copper or amber accent.** Earlier design iterations used `hsl(25 60% 45%)` — that has been retired. Coastal's palette is monochrome warm.
- **Sage green is the only chromatic accent allowed**, and it appears only when matcha is the subject (light theme) or when a single tonal contrast is needed (dark theme uses warm taupe `#c0a572` for the equivalent role).
- **Photography provides all the color.** The product shots — coffee bean browns, tea black, matcha green — give the page its palette. UI tokens stay out of the way.

---

## 3. Typography

### The grotesk (dark theme primary)
- **Headline**: tight modern sans, geometric, low-contrast.
  - **Default**: `Inter` (free, Google Fonts) — weight 600 for headlines, 400 for body
  - **Preferred when licensed**: `Geist`, `Söhne`, or `PP Neue Montreal`
  - **Tracking**: `-0.02em` on display sizes
  - **Sizing**: 56–80px desktop hero (`clamp(40px, 7vw, 80px)`), 18–22px body
- **Body**: same family, weight 400, regular tracking, 1.5–1.6 line height

### The serif (light theme primary)
- **Headline**: contemporary high-style serif, medium contrast, slight chunkiness.
  - **Default**: `Fraunces` (free, variable, Google Fonts) — weight 600, optical 144
  - **Preferred when licensed**: `Recoleta`, `Tiempos Headline`
  - **Tracking**: `-0.01em`
  - **Sizing**: 64–96px hero
- **Body**: `Inter` regular (same as dark theme — keeps body tone consistent across themes)

### The mono (utility, both themes)
- `JetBrains Mono` weight 400 — used **only** for: navigation eyebrows, footer copyright, prices, technical labels (e.g., `01 Coffee`, `02 Tea`)
- Tracked-out in small caps where used as a label: `text-[10px] uppercase tracking-[0.18em]`

### Type rules
- **Never mix Playfair Display.** Earlier iterations used Playfair as the dark headline — that's wrong for this brand. Playfair reads decorative; Coastal reads quiet-confident.
- Editorial pull statements appear *with periods*: "Brewed for the Lowcountry." not "Brewed for the Lowcountry"
- Filter pills and category labels are **lowercase**: `coffee · tea · matcha` not `COFFEE · TEA · MATCHA`
- Navigation labels and section eyebrows are **uppercase tracked-out small**: `LINEUP   COMMITMENT`

---

## 3.1. Wordmark & lockup

The Coastal Brewing wordmark is consistent across every surface — bag, tin, signage, nav, footer, character merch.

```
       ╱╲
      ╱  ╲    ← wood stork glyph (small, outlined)
     ╱____╲

   COASTAL    ← stacked, weight 600, tracking 0.18em, uppercase
   BREWING

       CO     ← tucked below or inline-right, smaller, same tracking
```

- **Glyph**: a minimalist outline of a wood stork standing or in flight — used as the brand mark.
- **Wordmark**: `COASTAL` stacked over `BREWING`, uppercase, condensed kerning.
- **Suffix**: `CO` rendered smaller and tucked below or inline (the "Co." abbreviation, never with a period in the wordmark itself — the period appears only in body copy: "Coastal Brewing Co.").
- **Color**: matches the surface (off-white on dark backgrounds, near-black on light backgrounds, brown-stamp tone on cream packaging). Never colored, never gradient.

The wordmark appears on:
- Top nav (left)
- Coffee bags (large, centered, brown-stamp on cream/kraft)
- Tea tins (centered, same hierarchy)
- Wooden hanging signs at pop-up locations (large, white-stamp on weathered wood — see Sal_Ang reference)
- Branded mugs, framed posters, notebook covers
- Footer (small, with social row)

---

## 3.2. Packaging

The product packaging is part of the design system and shows up in hero photography on both themes.

### Coffee bag (canonical)
- **Form**: square gusseted paper bag, kraft / cream / off-white tone
- **Print**: brown-stamp / dark-stamp wordmark — wood stork glyph above stacked `COASTAL / BREWING / CO`
- **Product line callout**: stamped below the wordmark, small caps tracked-out — `LOWCOUNTRY COFFEE` (House blend), variants for dark roast, decaf, single-origin
- **Sealing**: tin-tie top, no plastic window
- **Photography**: shown on dark wood surfaces with scattered coffee beans, atmospheric warm directional lighting (dark theme); on cream backgrounds with soft natural light (light theme)

### Tea tin (canonical)
- **Form**: cylindrical canister, two color variants — **cream** (default, matches bag) and **black** (alternate, used on light theme hero for contrast)
- **Print**: same wordmark hierarchy, with product line callout — `LOWCOUNTRY BLACK TEA`, variants for breakfast / herbal / green
- **Lid**: matched-color metal screw lid

### Matcha presentation (canonical)
- **Form**: small white ceramic bowl (chawan-style) holding bright green ceremonial-grade powder
- **Accessory**: bamboo whisk (*chasen*) shown alongside in hero photography
- **Packaging variant for shipped product**: small cylindrical tin (matching tea tin form, smaller scale) with `CEREMONIAL MATCHA` callout

### Auxiliary branded objects (visible in character refs)
- Coastal Brewing branded ceramic mug (dark, with stork-mark wordmark)
- Coastal Brewing notebook (kraft cover, embossed stork glyph)
- Wooden hanging signage at pop-up market stalls (large stork glyph + `COASTAL / BREWING / CO`)
- Framed lighthouse / coastal-scene posters with the wordmark integrated
- Wireframe/design-sheet posters showing the coffee-bag layout (visible in Melli's office)

---

## 4. Layout & grid

- **Container max-width**: 1240px (slightly tighter than the typical 1400 — keeps editorial focus)
- **Container padding**: 24px mobile, 40px tablet, 64px desktop
- **Vertical rhythm**: 80–120px between major sections; never less than 64px
- **Hero ratio**: roughly 60/40 photography-to-text on the dark theme; 50/50 on the light
- **Generous negative space.** White space (or in dark theme: black space) IS the design. Don't fill it.

---

## 5. Sections inventory (extracted from reference images)

### Dark theme sequence (`brewing.foai.cloud` primary surface)

1. **Top nav** (sticky, transparent on hero, solidifies on scroll)
   - Left: `COASTAL BREWING` wordmark — small caps, tracked-out, weight 600
   - Right: `LINEUP   COMMITMENT   ☰` — small caps, tracked-out, weight 400

2. **Hero**
   - Filter pills row: `coffee · tea · matcha · /run-the-rest` — lowercase, pill-shape, hairline border
   - Headline: **"Nothing chemically, ever."** (≤4 words, declarative, terminal period)
   - Subhead: 2–3 sentence commitment paragraph — *"Small-batch coffee, whole-leaf tea, ceremonial matcha. Sourced through verified partners. Every public claim has a paper trail. Every cup is what the label says it is."*
   - Subscription affordance: small chip with magnifier icon — *"subscriptions open with verified supplier handshakes"*
   - Right column: full-bleed atmospheric product photograph (coffee bag + tea tin + matcha bowl on dark wooden surface, scattered beans, warm directional lighting)

3. **The lineup.** section
   - Section label `The lineup.` (font-display, weight 600, large)
   - Three numbered cards: `01 Coffee` `02 Tea` `03 Matcha`
   - Each card: product photo (square or 4:5) + name + 1-line description + "shop now →" link
   - Sample copy: `01 Coffee — House blend, dark roast, decaf. Small-lot sourcing. No flavorings. No fillers.`

4. **The commitment.** section
   - Section label `The commitment.` + 1-line subhead `What sets us, ring by ring, isn't soft. It isn't.`
   - **Six-column commitment grid**: `Sourcing · Claims · Health · Pricing · Returns · Data`
   - Each cell: small label + one-line policy posture (e.g., `Claims · Every public claim cites a verified Lot ID.`)

5. **Footer**
   - Three lines, monospace small:
     - `© 2026 Coastal Brewing.`
     - `Nothing chemically, ever.` (centered, brand slogan)
     - `powered by ACHIEVEMOR`
   - **Bottom-right corner**: tropical **palm tree** silhouette (fronded canopy, slim trunk — NOT a palmetto). Single line-art element, off-white at low opacity.

### Light theme sequence

1. **Top nav** — same shape as dark, smaller
2. **Hero**
   - Headline: **"Brewed for the Lowcountry."** (serif, generous size)
   - Subhead: `Thoughtfully sourced. Carefully crafted. For a slower, coastal way of life.`
   - **Right margin**: line-art illustration of **wood storks** (one to three birds, mid-flight or standing) over marsh-grass silhouette, often paired with a palm tree
   - Three product cards centered below: cream COFFEE bag, black TEA tin, white MATCHA bowl
3. **Four-feature row** with simple line icons:
   - `Thoughtfully sourced · Small-batch · Coastal state of mind · Made to be shared`
4. **Footer**
   - Left: `COASTAL BREWING` wordmark + social icons row
   - Center columns: SHOP / COMPANY / etc.
   - **Right**: lowcountry line illustration — **wood stork standing in marsh + palm tree** — with the verbatim brand stamp **"Made in PLR."** below the illustration. PLR is the canonical regional brand stamp; do not expand the abbreviation in any surface copy.

---

## 6. Voice (extracted from copy in both renders)

- **Short declarative sentences with terminal periods.**
- **Specific over evocative.** *"Sourced through verified partners. Every public claim has a paper trail. Every cup is what the label says it is."* — that's the register.
- **No marketing fluff.** No "elevate," no "experience," no "journey."
- **No exclamation marks.** Confidence, not enthusiasm.
- **Brand commitments stated as policy posture, not as marketing claims.** *"Every cup is what the label says it is"* is a contract sentence, not a slogan.
- **Numbers stay numerical**: `01 Coffee` not "1 Coffee" or "One Coffee".

---

## 7. Components affected (existing → required)

The current Next.js scaffold needs the following adjustments to match this system:

| Component | Current state | Action |
|---|---|---|
| `app/globals.css` | Dark theme uses HSL `25 60% 45%` (copper accent) | **Replace** with the palette in §2. Drop the copper. |
| `tailwind.config.ts` | `font-display: Playfair Display` | **Replace** — Inter for dark, Fraunces for light. Drop Playfair. |
| `components/hero.tsx` | Playfair headline, dual CTA, copper "Lowcountry small-batch" tag | **Rebuild** to match Dark Hero §5: filter pills + "Nothing chemically, ever." + subscription handshake chip + atmospheric right-side product photo |
| `components/team-ribbon.tsx` | Mono eyebrow + Playfair section title | **Restyle** — drop Playfair, use Inter weight 600 for the title. Body copy stays. |
| `components/footer.tsx` | 4-column grid with company/compliance/shop | **Restyle** to match the dark footer signature in §5: three centered lines (copyright · brand slogan · powered by ACHIEVEMOR), keeping the existing 4-column reference content as a section above. |
| `app/page.tsx` | Hero + TeamRibbon + Featured grid | **Insert** "The lineup." numbered section + "The commitment." six-column grid between TeamRibbon and existing featured grid. |
| `components/nav.tsx` | Multi-link nav | **Trim** to: wordmark left, `LINEUP   COMMITMENT   CHAT   CART` right, all small-cap tracked-out. |

---

## 8. What this design.md **explicitly retires**

The following are **not** the brand:

- ❌ Playfair Display anywhere on the dark theme
- ❌ Copper / amber chromatic accent on dark surfaces
- ❌ "Lowcountry · Small-batch · AI-managed" eyebrow tag (replaced by lowercase filter pills)
- ❌ Two-CTA hero shape ("Shop the brew" / "Talk to our team" stacked) — the dark hero is statement-led, not CTA-led; CTAs live further down
- ❌ Generic shadcn-default radius and border treatments — Coastal uses hairline borders only, sharp corners on cards
- ❌ Anything that reads as "AI startup tech brand." Coastal reads as a specialty coffee brand that happens to be AI-managed, not the inverse.

---

## 8.1 Character pack (Sal_Ang + Melli)

Coastal's two AI agents have canonical character images. Both are in-action, on-brand, in canonical environments — these are the reference assets for `<TeamCard/>` portraits, the `/team` page, future Live Look In sessions, and the Gemini agents CLI manifest builds.

### Sal_Ang — Sales lead (Boomer_Ang)
- **Reference**: `~/iCloudPhotos/Photos/Sal_Ang.png` (also copied to `~/foai/coastal-brewing/refs/characters/sal_ang.png`)
- **Setting**: outdoor coastal pop-up market stall — palm trees, water, golden-hour Lowcountry light
- **Identity markers**:
  - Tactical visor with **"SAL"** stamped in copper/orange (the Boomer_Ang ANG-patch convention from the canonical theming memory)
  - Black face mask
  - White linen long-sleeve shirt with subtle Coastal Brewing patch at chest
  - Locs / braided hair
  - Coastal pop-up apron / name badge
- **Pose**: pouring pour-over coffee from a metal kettle, focused on the cup, professional barista posture
- **Surroundings**: pour-over carafes, coffee grinder, ceramic dishes, scattered beans, tin canisters reading `COFFEE`, two large hanging wooden signs reading `COASTAL / BREWING / CO` with the wood stork glyph above
- **Aesthetic**: golden-hour, warm wood, neutrals, the "coastal artisan" register
- **Used for**: `/team` Sales card portrait, hero ribbon, chat avatar

### Melli Capensi — Marketing lead (Honey Badger, The Sett PMO head)
- **Reference**: `~/iCloudPhotos/Photos/Melli in office.png` (also copied to `~/foai/coastal-brewing/refs/characters/melli_in_office.png`)
- **Setting**: Coastal Brewing branded office / study, dark wood paneling, leather chair, warm lamp lighting — the "marketing director's office" register
- **Identity markers**:
  - Anthropomorphic **honey badger** (*Mellivora capensis*) — bipedal, fully articulate, per The Sett charter §6
  - Iridescent black-and-silver fur down the back (the canonical Mellivora capensis stripe)
  - Dark navy / black structured blazer with **NCO-style chevron rank insignia on the shoulder**
  - Coastal Brewing chest patch on the blazer
- **Pose**: seated at a wooden desk, writing in a notebook with one paw, laptop open in front, focused / in command
- **Surroundings**:
  - Desk: laptop, open notebook with pen, multiple Coastal Brewing coffee bags (cream/kraft) and tea tins, branded ceramic mug
  - Walls (left): framed Coastal Brewing brand posters — one showing what looks like a Sal_Ang pop-up scene
  - Walls (right): framed lighthouse / coastal-scene posters with the wordmark, plus design-sheet posters showing the coffee-bag layout in wireframe
  - Shelving: branded merchandise integrated tastefully
- **Aesthetic**: dark academia × specialty coffee × command-and-control office
- **Used for**: `/team` Marketing card portrait, brand voice signature, future Live Look In sessions, BARS-stanza banner backdrops

### Pairing notes
- The two characters represent the **two sides of the brand**: Sal in the field (customer-facing, product-in-hand, coastal-warm) and Melli in the war room (brand-strategy, audit trail, command structure).
- Both are equipped with Spinner per the canonical FOAI agent memory — but neither image needs to literally show Spinner; the Boomer_Ang character convention has the visor patch (Sal) and the chest patch (Melli) doing that signaling.
- When the Gemini agents CLI manifests are built, these reference images become the canonical visual identity assets for each agent's manifest.

---

## 9. Implementation order (when greenlit)

1. Update `globals.css` color tokens (§2)
2. Update `tailwind.config.ts` font stack (§3)
3. Add Inter + Fraunces + JetBrains Mono via Next.js `next/font` (replaces current Google Fonts `<link>` import)
4. Rebuild `components/hero.tsx` to match §5 dark hero
5. Add `components/lineup.tsx` (numbered 01/02/03 product cards)
6. Add `components/commitment.tsx` (six-column policy-posture grid)
7. Restyle `components/footer.tsx` to the three-line dark footer signature
8. Trim `components/nav.tsx`
9. Wire Sal_Ang + Melli character refs into `<TeamCard/>` portraits (replaces `mock-dark.png` placeholders)
10. Run `next build` to verify no regressions
11. **Future** (post-launch): Gemini agents CLI builds `sal_ang.agent.json` and `melli_capensi.agent.json` manifests, with the canonical reference images attached as visual identity assets

---

## 10. The promise of this document

Every design decision on this surface should trace back to one of the two reference images. If a future component cannot point to a specific cell in the dark or light render as its source, **it doesn't belong on Coastal Brewing Co.**

---

## 11. Brand canon — Sales-team cast + setting + wardrobe + product names (owner brief 2026-04-29)

Extends §1-§10. The earlier sections give the **dark/light theme system**; this section gives the **storefront-environment + cast visual canon** + **canonical product names** + **uniform detail spec**.

> **2026-04-29 owner correction:** "you changed it to match with the NURDSCODE and it looks dumb." The currently-deployed dark Coastal theme is RETIRED. The cream/parchment + sepia LIGHT register from the reference images is now the **PRIMARY** Coastal surface. Section 1 of this doc is superseded by §11.1 below. **Dark theme** demoted to admin-only / operator-only surfaces (NOT customer-facing).

### 11.0 Reference images (load-bearing — image gen always traces back here)

| Asset | Path | What it sets |
|---|---|---|
| Logo | `~/iCloudPhotos/Photos/Official coastal brewing co. logo.png` | Hand-drawn line-art stork in flight, stacked COASTAL/BREWING/CO. typography, dark sepia ink on parchment |
| Sal_Ang inside the location | `~/iCloudPhotos/Photos/Coffee Shop Sal_Ang.png` | The CANONICAL brand reference — setting + uniform detail + product naming + counter dressing for ALL cast images and product packaging |
| Black-male hair reference | `~/iCloudPhotos/Photos/IMG_1343.PNG` | Low Caesar with half-moon part — applies to every Black male cast member EXCEPT Sal_Ang (canonical braids) |

### 11.1 Setting palette (PRIMARY — supersedes §1 dark theme for customer surfaces)

Customer-facing Coastal surfaces (storefront, product pages, hero, chat) live in this register:

- **Light**: warm golden-hour, never harsh
- **Page background**: cream / parchment (`#f3efe6` per §2 light theme — that token graduates to PRIMARY)
- **Foreground / type**: near-black warm cast (`#1a1612`) — sepia-ink feel, never pure black
- **Surfaces**: cream / parchment / sepia ink / warm wood / copper accents
- **Type**: serif headlines (Fraunces) + Inter body — per §3 light theme
- **Botanical**: palm fronds outside; jasmine flowers in vases throughout the interior; cut jasmine branches beside the Jasmine Tea tins; large glass jars across the rafters filled with dried citrus fruits + cinnamon sticks
- **Materials**: burlap (coffee bags), twine (wrapped around tea jars), glass (5-gallon specialty-tea jars + rafter citrus jars), ceramic (cups), copper (long-spouted Ethiopian-style coffee pot)
- **Sage green** (`#6b8e4e` per §2) is the only chromatic accent allowed, and only on matcha-related elements

**Branded counter dressing (always present in any counter scene — verbatim from Sal-inside reference):**
  - **Coffee bag**: cream/parchment, stork glyph + stacked "COASTAL / BREWING / CO" + product name (e.g., "COASTAL BLEND") + flavor notes line (e.g., "JASMINE, KEY LIME, COCOA") + "WHOLE BEAN COFFEE" + net wt "12OZ (340G)"
  - **Tea/matcha tins** (small cylindrical, cream with brown band — except Chai which is darker):
    - "COASTAL BREWING CO / MATCHA / CEREMONIAL GRADE / NET WT. 2OZ (56G)"
    - "COASTAL BREWING CO / LOWCOUNTRY TEA / JASMINE GREEN / NET WT. 2OZ (56G)"
    - "COASTAL / CHAI / SPICED BLACK TEA / NET WT. 2.1OZ (56G)" (DARKER tin design — distinct from the cream tins)
  - **Ceramic cups**: small dark cups with white geometric (Ethiopian-style) patterns on a wooden tray
  - **Wooden sign**: "COFFEE. TEA. MATCHA. PURPOSE." (with stork glyph; periods are intentional)
  - **Banner above**: "COASTAL BREWING CO / Nothing chemically, ever." (with stork)
  - **Counter base wall**: large stork glyph + stacked "COASTAL BREWING CO / Nothing chemically, ever."
  - **Wicker baskets** below the counter
  - **Long-spouted copper Ethiopian-style coffee pot** (jebena style — Sal's canonical pour vessel)
  - **Pour-over carafes** + small espresso machine on the side
  - **Burlap coffee bag with stork stencil** at the floor by the counter
  - **Background**: marsh + palm tree + cloudy sky (location-dependent)

### 11.1.1 Canonical product names (LOCKED — these names ship verbatim on packaging)

| Product | Canonical name (on packaging) | Tin/bag color |
|---|---|---|
| Flagship coffee | **Coastal Blend** — *whole bean coffee* — *Jasmine, Key Lime, Cocoa* | Cream/parchment paper bag |
| Single-origin coffees | **Coastal [Origin] Fairtrade** (e.g., Coastal Colombia Fairtrade) | Cream/parchment paper bag |
| Matcha | **Coastal Brewing Co Matcha** — *Ceremonial Grade* | Cream cylindrical tin with brown band |
| Tea (umbrella sub-brand) | **Lowcountry Tea — [Variant]** (e.g., Jasmine Green) | Cream cylindrical tin with brown band |
| Chai (separate SKU, distinct visual) | **Coastal Chai** — *Spiced Black Tea* | Darker cylindrical tin (charcoal/dark brown) |

> "Lowcountry House Blend" is RETIRED as a SKU name — owner directive 2026-04-29: "No" to that name. The flagship coffee is **Coastal Blend** (verbatim from packaging).
>
> "Lowcountry Tea" is the umbrella sub-brand for the tea line, NOT a SKU on its own. Variants (Jasmine Green, English Breakfast, Hibiscus Berry, etc.) ship as "Lowcountry Tea — [Variant]".

### 11.2 Storefront locations (4 cities — atmosphere imagery, not real retail)

Each location keeps the §11.1 setting palette but gets locale-specific exterior cues:

| Location | Cues |
|---|---|
| **Bluffton Downtown** | Historic coastal village, low-rise cypress/cedar buildings, Spanish moss on live oaks, narrow brick walks, marsh peeking past the alley, bicycles + adirondack chairs |
| **Downtown Savannah** | Bull Street / Broughton Street, brick + ironwork balconies, garden squares with Spanish moss, gas-lamp fixtures, cobblestone gutter strips |
| **Downtown Charleston** | King Street / Market District, pastel rowhouses, palmetto trees, cobblestone streets, wrought-iron gates |
| **Beachfront Hilton Head** | Open coastal light, tropical palms, sandy sidewalks, ocean breeze (loose linen, fewer layers), more relaxed/outdoor seating |

Mood across all four: **cozy but bustling shopping boutique center**. Foot traffic visible but never crowded; the storefront is the warm anchor in a walkable scene.

### 11.3 Warehouse imagery

Same palette as §11.1, applied to the back-of-house:

- **Coffee bags**: realistic burlap (not exaggerated in size — hip-height stacks, not cartoonish) with COASTAL BREWING + stork stencil
- **Tea drums**: stainless steel with cream paper labels, banded in twine
- **5-gallon glass jars**: filled with whole-leaf specialty teas, rolled and wrapped in twine across the body, hand-tied bows; arranged on wooden shelving with chalkboard labels
- **Rafter glass jars**: above eye-line, filled with dried citrus slices (orange, lemon, grapefruit) and whole cinnamon sticks; backlit by the warm overhead lighting
- **Jasmine**: cut branches in tall glass vases on the floor beside the entrance; small bouquets at the work counters; specifically beside the Jasmine Tea tins on retail shelves
- **Lighting**: warm Edison bulbs / soft pendant fixtures; never sterile / never industrial-cold

### 11.4 Wardrobe canon (load-bearing — all cast images must comply)

#### Men (uniform = Sal_Ang's outfit, locked verbatim from `Coffee Shop Sal_Ang.png`)

- **Jacket**: cream / off-white linen long-sleeve work jacket, lightweight, soft drape, sleeves often rolled to mid-forearm; partially open at chest
- **Right-chest patch**: stacked **"COASTAL / BREWING / CO"** in dark sepia ink (matches the bag/tin packaging style — small, clean, no stork glyph here; the stork sits on the larger banner behind)
- **Left-chest "Made in PLR" badge**: small circular sepia-stamped badge worn over the heart, **above** the name badge; round emblem with stork glyph + "Made in PLR" text — preserve verbatim, do NOT expand "PLR"
- **Name badge**: small **black** rectangular badge with the cast member's name in **cream/light** lettering — worn on the LEFT chest, just below the "Made in PLR" badge (e.g., `SAL`, `MARCUS`, `HOLT`)
- **Visor / mask**: black tactical visor across the eyes with the cast member's name in **glowing orange LED-style block letters** centered (Sal's visor in the canonical image reads `SAL`); a black cloth mask covers the lower face below the visor
- **Shirt under jacket**: high-collar dark charcoal/black under-shirt — visible at the neck above the open jacket
- **Pants**: cream / khaki chinos (NOT dark — this is a 2026-04-29 correction from the prior dark-canvas spec; the canonical reference shows light cream chinos)
- **Belt**: brown leather belt
- **Watch**: gold-toned timepiece on the right wrist
- **Bracelet**: dark beaded bracelet on the right wrist (Sal's canonical detail; optional for other cast — set per persona)
- **Apron** (when at the bar — optional): cream linen, ribbon or buckle waist tie

#### Women (Southern Belle dresses + sun dresses)

- **Bar shift / formal-front**: Southern Belle dress — fitted bodice, modest neckline, knee-or-tea-length skirt, cap or short sleeves; cream/parchment base with subtle floral accents (jasmine motif allowed)
- **Open-air shift / Hilton Head / casual front**: sun dress — knee-length, light cotton, soft pastel or cream, simple silhouette
- **Apron** (when at the bar): same cream linen as men, ribbon-tied at waist
- **Coastal patch**: small embroidered stork-and-wordmark patch sewn onto apron chest pocket OR dress collar (subtle, not centered)

#### Hair (mandatory rules)

- **All women**, regardless of race or hair type: **French braids, shoulder length** (no longer, no shorter; no buns, no loose hair, no ponytails)
- **Men, by race**:
  - **Sal_Ang**: medium-thick locs / braids pulled back — *canonical exception, do not change*
  - **Other Black men** (Cou_Ang and any future Black male cast member): **low Caesar with half-moon part shaved into the side** (per `~/iCloudPhotos/Photos/IMG_1343.PNG` reference — short, even, low-fade, clean tapered hairline, the "C"-shaped half-moon curve carved at the left temple)
  - **White men**: short side-part / medium-length neatly combed / clean fade-to-side
  - **Asian men**: short textured cut, slight side sweep
  - **Latino men**: short tapered cut, neat finish
  - **Mixed-race men**: dealer's choice within the "groomed, professional, low-maintenance" register; never a man-bun, never long loose hair
- Beards across all men: clean-shaven OR closely-trimmed beard; no goatees, no full bushy beards

### 11.5 Cast visual specs (12 Sales-team Boomer_Angs + Bun_Ang)

Each cast member's full persona lives at `~/foai/aims-tools/voice-library/personas/<cast_id>.md`. The visual specs below are the **scene-and-portrait deltas per character** that combine with §11.1-§11.4 to render image-gen prompts.

| cast_id | gender / race | hair (per §11.4) | scene cue | apparel deltas |
|---|---|---|---|---|
| `sal_ang` | M / Black | locs/braids (canonical) | marsh-edge pop-up at golden hour, Ethiopian copper pot | name-mask `SAL`, jacket as canon |
| `hos_ang` | F / mixed | French braids, shoulder length | front-of-house counter, regulars walking in | sun dress (cream), apron, name-tag `LOU` |
| `bar_ang` | M / Black | low Caesar + half-moon part | pour-over station, percussive rhythm | name-mask `TATE`, jacket as canon |
| `con_ang` | F / Black | French braids, shoulder length | consultative cup-finder station | Southern Belle dress (cream), name-tag `WREN` |
| `tas_ang` | M / White | short side-part | tasting bar, gentleman pacing, comfortable silence | name-mask `HOLT`, jacket as canon |
| `tea_ang` | F / White | French braids, shoulder length | afternoon tea hour, Charleston debutante warmth | Southern Belle dress (parchment + jasmine accent), name-tag `ELIZA` |
| `cou_ang` | M / Black | **low Caesar + half-moon part (per IMG_1343.PNG)** | Savannah historic-district shop, deep regulars | name-mask `MARCUS`, jacket as canon |
| `gre_ang` | F / Black | French braids, shoulder length | morning shift, regulars-by-name | sun dress (cream), apron, name-tag `NAYA` |
| `har_ang` | M / White | short side-part, slightly polished | trans-Atlantic gentleman, harbor-view tasting | name-mask `PIP`, jacket as canon |
| `cur_ang` | F / White | French braids, shoulder length | finishing-school polish, harbor crowd | Southern Belle dress (parchment), name-tag `VI` |
| `reg_ang` | M / White | short side-part / clean fade-to-side | quick student-shift, Coastal Carolina U energy | name-mask `TREY`, jacket as canon |
| `mat_ang` | F / White | French braids, shoulder length | summer-break shift, UGA energy | sun dress (cream, light cotton), name-tag `MADS` |
| `bun_ang` | M / White | short side-part, slightly older register | back-office bundle math, Charleston/Mount-Pleasant origin | jacket as canon BUT no mask (back-office); HP-12C calculator visible on desk; name patch `LUC` |

### 11.6 Page-by-page scene placements

When the storefront site rebuilds (Wave 4 of the 2026-04-29 brief), each page gets specific cast-interaction scenes:

| Page | Scene |
|---|---|
| `/` (hero) | Sal_Ang at the marsh-edge pop-up, pouring from the copper pot — the canonical reference image |
| `/products` (lineup) | Warehouse interior: burlap coffee bags + tea drums + 5gal twine-wrapped jars + rafter citrus jars + jasmine vases. Hos_Ang walking through with a clipboard |
| `/about` | Storefront exterior in one of the four cities (cycle by visit, or pick Bluffton as primary); Sal + Marcus visible through the window |
| `/team` | Per-cast portraits using §11.5 visual specs (each character framed in their own scene cue) |
| `/chat` | Sal-style branded counter (the canonical reference scene), chat-input UI overlaid on the right |
| `/cart` | Cozy interior: warm wood, jasmine in vases, rafter citrus jars, Tea_Ang at the register with a Southern-Belle-ribbon-tied package |
| Storefront cycle | One image per city; rotate through hero or background imagery so a return visitor sees variation |

### 11.7 Image-generation provider

Per `feedback_gpt_image_2_standard.md` memory: **GPT Image 2.0** is the default for complex multi-text photorealism. All Coastal brand imagery generated through this pipeline uses GPT Image 2.0 unless owner specifies otherwise.

When a generated image violates §11.4 (wardrobe/hair) or §11.1 (setting palette), reject and re-spin — the canon is non-negotiable.

### 11.8 Anti-patterns (from this thread's CANT failures)

- Treating the Coastal site as inheriting the FOAI dark-admin palette (the AIMS-Light variant + cream-parchment cast is the canon; do not reach for FOAI gold-on-slate)
- Naming characters after dialect words ("Beratna" = Belter for "brother") or archetype labels ("Beau", "Belle"); see `feedback_character_names_must_be_real_not_register_labels.md`
- Inventing visual cues that aren't traceable to a §11.0 reference image
- Loose / different hair on women (canon = French braids, shoulder length, all races)
- Modern slang on customer surfaces (canon = warm Lowcountry / specialty-coffee register)

---

## 12. The promise of this document (consolidated)

Every design decision — color, type, wardrobe, scene, hair, prop — traces back to:
- §1-§10 reference images (dark theme + light theme + Sal/Melli portraits)
- §11.0 reference images (logo + Coffee Shop Sal_Ang + IMG_1343 hairstyle)

If a future component or generated image cannot point to a specific cell in those references as its source, **it doesn't belong on Coastal Brewing Co.**

---

*Owner red-line welcomed. Component rebuild waits on sign-off.*
