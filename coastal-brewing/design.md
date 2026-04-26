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

*Owner red-line welcomed. Component rebuild waits on sign-off.*
