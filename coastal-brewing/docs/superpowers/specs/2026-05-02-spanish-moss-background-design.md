# Spanish Moss Background Layer — Design Spec

- **Date:** 2026-05-02
- **Phase:** Phase 4 (Coastal web visual canon)
- **Scope:** Sitewide visual extension to `web/components/coastal-ascii-bg.tsx`
- **Status:** Approved by owner 2026-05-02. Pending implementation plan.

## Goal

Add Spanish moss to the existing typographic background of `brewing.foai.cloud` so the page reads as authentically Lowcountry without competing with content. Moss is one more whisper-quiet ambient layer alongside storks, palms, and waves — not a focal element.

## Constraints (locked during brainstorm 2026-05-02)

| Decision | Locked value | Source |
|---|---|---|
| Scope | Sitewide via existing `CoastalAsciiBackground` component | Owner Q1 = A |
| Treatment | ASCII strands (base) + SVG cluster accents (mix) | Owner Q2 = D |
| Density | ~6-10 ASCII strands + 2-3 SVG clusters | Owner Q3 = A |
| Opacity | `text-foreground/[0.085]` (matches existing storks/palms/waves) | Owner Q3 = A |
| Animation | Gentle sway with palms, ±2px range | Owner Q3 = A |
| Mobile | Same density (decorative, clipping acceptable) | Owner Q3 = A |
| New files | None | Brainstorm Q1 = A (extend existing component) |
| New deps | None (framer-motion already present) | Brainstorm Q1 = A |

## Architecture

Extend `web/components/coastal-ascii-bg.tsx` with two new render layers stacked between the existing storks layer and the existing palms layer. No new components, no new files, no new dependencies.

**DOM stacking order, top → bottom:**

1. Storks (highest — fly horizontally across) — UNCHANGED
2. **Moss SVG clusters** — NEW (2-3 organic accents)
3. **Moss ASCII strands** — NEW (8 vertical hangs)
4. Palms (corners, bottom) — UNCHANGED
5. Waves (bottom edge) — UNCHANGED

The stacking order is intentional: storks fly *over* moss to reinforce a canopy depth illusion (storks are above the trees; moss hangs *from* the trees).

## Visual spec

### ASCII strands

- **Character set:** Braille single-dot characters — `⠁ ⠂ ⠄ ⠈ ⠐ ⠠ ⡀ ⢀`. These render as small irregular dots that read as hanging fibers when stacked vertically with line-height tightening between glyphs.
- **Strand composition:** Each strand is a vertical stack of 6-12 Braille chars from the set above. **All values are hardcoded at module scope** — no `Math.random()` at render time, because the component renders during Next.js SSR and any non-deterministic value would cause a hydration mismatch between server and client. The strand-data array is a fixed `const` declared at the top of `coastal-ascii-bg.tsx` alongside `storks` and `palms`.
- **Count:** 8 strands.
- **Horizontal distribution:** 8 hardcoded `left:` percentages chosen by hand to read organically (no even spacing, no grid). Concrete values: `4%, 13%, 27%, 39%, 52%, 64%, 78%, 92%`.
- **Vertical anchor:** Each strand begins at `top: 0` and hangs downward. Longest strands reach ~120px; shortest ~60px. Lengths assigned in the strand-data array, varied per entry.
- **Per-strand variance (all hardcoded in the strand-data array):** char-stack content (which Braille glyphs in which order), strand length (6-12), font size (10-13px), sway-cycle duration (4-6s), sway start-delay (0-3s).
- **Font:** Inherits `font-mono` from parent.

### SVG cluster accents

- **Count:** 3.
- **Horizontal placement:** Hardcoded `left:` percentages — `18%, 52%, 81%`.
- **Vertical anchor:** `top: 0`, hanging down ~60px.
- **Shape:** A single reusable inline-SVG sub-component (defined once inside `coastal-ascii-bg.tsx`, rendered three times). The SVG contains three downward-tapering arcs that suggest a moss tuft — each arc is a quadratic bezier (`<path d="M ... Q ... ..." />`) with `fill="none"`, `stroke="currentColor"`, `strokeWidth="1"`. Exact path data left to the implementation plan; the constraint is "three nested arcs, organic, no fill, 1px stroke."
- **ViewBox:** `0 0 80 60` (80px × 60px logical units).
- **Color inheritance:** `stroke="currentColor"` so the SVG picks up the parent's `text-foreground/[0.085]` color.

### Color

- All strands and clusters inherit color from the parent's `text-foreground/[0.085]` Tailwind class. SVG strokes use `currentColor` so they pick up the same opacity-tinted foreground.
- No new color variables needed.

### Animation

- **Strands:** Each strand sways `±2px` horizontally with an ease-in-out cycle. Cycle duration varies per strand (4-6s), set per-entry in the hardcoded strand-data array. Stagger delays (0-3s, hardcoded per entry) prevent unison sway.
- **Clusters:** Same ±2px sway pattern, slightly slower (5-7s cycle, hardcoded per entry), creating subtle parallax depth between fibers and tufts.
- All animation uses framer-motion's `motion.div` (already imported in the component) — no new dependencies.
- All durations and delays are hardcoded — no `Math.random()` (see ASCII strands note re: SSR hydration).

## Coverage

- Moss is part of `<CoastalAsciiBackground />`, which is already mounted in `web/app/layout.tsx`. Therefore moss appears on every page (`/`, `/team`, `/partners`, `/products`, `/about`, `/chat`, `/contact`, `/merch`, `/order`, `/policies/*`, `/not-found`).
- `pointer-events: none` is inherited from the parent — moss does not intercept clicks.
- `aria-hidden="true"` is inherited — moss is invisible to screen readers (decorative).

## Mobile behavior

- No responsive breakpoint changes. Strand count and SVG cluster count stay constant across viewports.
- At narrow widths (<400px) the outermost strands (`left: 4%` and `left: 92%`) may visually clip — this is acceptable per owner directive (moss is decorative, partial render does not break the experience).
- No mobile-specific media queries required.

## Performance

- 8 strands + 3 clusters = 11 new `motion.div` elements.
- All animation runs on transform (GPU-composited), no layout thrash.
- Component is `pointer-events-none fixed inset-0 -z-10` — entirely below the page flow.
- No measurable performance impact expected.

## Accessibility

- Inherits `aria-hidden="true"` from the parent background container — moss is hidden from screen readers as decorative.
- No keyboard interaction (the parent has `pointer-events: none`).
- No motion preference handling required at this layer because the parent background already has the same animations without `prefers-reduced-motion` handling. If `prefers-reduced-motion` support is ever added, it should be applied to the entire `CoastalAsciiBackground` component at once, not per-layer.

## Out of scope

- No backend changes.
- No new tests (existing project has no visual-regression test infrastructure).
- No CMS integration.
- No A/B test or feature flag — moss ships unconditionally to all users.
- No motion-preference handling (matches the rest of the existing background — see Accessibility note above).
- No CLAUDE.md update — this spec is self-contained and the canon docs are not affected.

## Verification

Visual smoke-check on the four highest-traffic pages after deployment:

1. `https://brewing.foai.cloud/` — moss visible at top, storks fly OVER moss
2. `https://brewing.foai.cloud/team` — moss does not crowd the cast grid
3. `https://brewing.foai.cloud/partners` — moss reads as ambient, not a callout
4. `https://brewing.foai.cloud/products` — moss does not interfere with product cards

Each check confirms: (a) moss is visible at the top edge, (b) storks pass *over* moss, (c) sway is calm (not jarring), (d) opacity matches existing storks/palms/waves (no contrast jump).

## Implementation hand-off

The next step is to write an implementation plan (`writing-plans` skill). The plan should produce:

- One edit to `web/components/coastal-ascii-bg.tsx` adding the strand-data array, the SVG cluster sub-component, and the two new render layers in the correct stacking position.
- Local visual check (`pnpm dev` in `web/`).
- VPS deploy: `scp` the updated `coastal-ascii-bg.tsx` to `aims-vps:/docker/coastal-brewing/web/components/`, then `docker compose build coastal-web && docker compose up -d coastal-web`.
- Verification per the four-page smoke check above.

No other files change.
