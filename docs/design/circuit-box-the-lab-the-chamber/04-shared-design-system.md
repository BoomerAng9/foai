# Page 4 — Shared Design System

> Theme tokens, components, motion language, and usage rules across Circuit Box / The Lab / The Chamber.
> Theme matches agenticai.net / cti.foai.cloud per Rish 2026-04-08.

## Color tokens

```
--color-bg-deep        #0B1220   /* Deep navy, primary canvas */
--color-bg-panel       #0F1A2E   /* Panel surfaces */
--color-bg-elevated    #142340   /* Hover states, popovers */
--color-bg-overlay     rgba(11, 18, 32, 0.92)  /* Modal backdrops */

--color-accent-gold    #F5A623   /* Primary brand accent — borders, focus rings, CTAs */
--color-accent-orange  #F97316   /* Secondary brand accent — alerts, hover lift */
--color-accent-cyan    #22D3EE   /* Tertiary — info badges, links */

--color-text-primary   #E8EAF2   /* Body text */
--color-text-muted     #8590A6   /* Secondary text, metadata */
--color-text-dim       #525E7A   /* Tertiary, placeholders */

--color-border         #1F2D4A   /* Default panel borders */
--color-border-active  #F5A623   /* Active / focused borders */

--color-success        #22C55E
--color-warning        #EAB308
--color-error          #EF4444
--color-info           #3B82F6
```

These match the existing cti.foai.cloud theme. Per memory `feedback_landing_design.md`: "Dark bg, orange/gold accents, Deploy rocket logo, bold tagline."

## Typography

```
--font-display    "Inter Display", system-ui, sans-serif
--font-body       "Inter", system-ui, sans-serif
--font-mono       "JetBrains Mono", "Fira Code", monospace

--text-xs    11px / 16px
--text-sm    13px / 20px
--text-base  15px / 24px
--text-lg    18px / 28px
--text-xl    24px / 32px
--text-2xl   32px / 40px
--text-3xl   48px / 56px
```

## Spacing scale

```
--space-1   4px
--space-2   8px
--space-3   12px
--space-4   16px
--space-5   24px
--space-6   32px
--space-8   48px
--space-10  64px
--space-12  96px
```

## Radii

```
--radius-sm    4px    /* Inline pills */
--radius-md    8px    /* Buttons, inputs */
--radius-lg    12px   /* Tiles, panels */
--radius-xl    20px   /* Hero cards */
--radius-full  9999px /* Pills, avatars */
```

## Elevation / shadows

```
--shadow-panel    0 1px 0 rgba(255, 255, 255, 0.04) inset, 0 4px 12px rgba(0, 0, 0, 0.4)
--shadow-tile     0 8px 24px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(245, 166, 35, 0.1)
--shadow-tile-hover  0 16px 32px rgba(0, 0, 0, 0.6), 0 4px 12px rgba(245, 166, 35, 0.25)
--shadow-modal    0 24px 64px rgba(0, 0, 0, 0.7)
```

## Motion language

- **Hover lift**: 4px translateY, 200ms ease-out
- **Panel reveal**: opacity 0→1 + translateY 8px→0, 250ms ease-out
- **Modal**: scale 0.96→1 + opacity 0→1, 200ms cubic-bezier(0.16, 1, 0.3, 1)
- **Button press**: scale 0.97 for 80ms then back
- **Slow background pulse**: subtle gold accent pulse on alerts every 2s
- **Reduced motion**: respect `prefers-reduced-motion`, disable lifts + pulses

## Component vocabulary

### Panels
- Rounded `--radius-lg` corners
- Border `1px solid var(--color-border)`
- Background `var(--color-bg-panel)`
- Header strip with gold underline on the active panel

### Tiles (The Lab grid)
- NURD card style — corner highlights, slight 3D bevel
- Tier badge in top-right corner (color per tier)
- Title + provider in top-left
- Cost-per-LUC chip
- Description (2-line clamp)
- Bottom row: Try button + favorite star + alternatives chevron

### Buttons
- Primary: gold background, dark text, hover lift
- Secondary: transparent with gold border
- Ghost: text only with cyan underline on hover
- Danger: red background, white text
- Big red HALT button: pulse animation, double-confirm modal

### Input fields
- Background `var(--color-bg-elevated)`
- Border `1px solid var(--color-border)`
- Focus ring `2px solid var(--color-accent-gold)`
- Monospace font for API endpoint, JSON body, headers

### Badges
- Tier: small pill, color per tier (open-source = green, fast = cyan, standard = blue, premium = gold, flagship = orange)
- Status: dot + text (green = healthy, yellow = degraded, red = down)
- Latest: subtle "LATEST" gold pill in top-right of newest models

### Avatars (agent identification in PiP reasoning stream)
- Circular, 32px default
- Color border per agent class:
  - ACHEEVY = gold
  - Chicken Hawk = bronze
  - Boomer_Angs = navy
  - Lil_Hawks = grey
  - TPS_Report_Ang = silver (pencil-pusher)
  - Betty-Anne_Ang = warm orange (mom energy)
  - AVVA NOON = white (platform brain)

## Industrial control-panel aesthetic

Circuit Box specifically should feel like an industrial control panel:
- Rivet-style corner accents on panels
- Subtle metal-texture background overlay (very low opacity)
- "SECURE" lock icon in top-left
- "SYSTEM OPTIMAL" status pill
- Big red HALT button in top-right corner
- Toggle switches (real-looking) instead of checkboxes for on/off controls
- Rotary dial component for things like quota allocation sliders

## Accessibility rules

- Color contrast: 4.5:1 minimum body text, 3:1 minimum large text
- Focus rings always visible (gold) on every interactive element
- Keyboard navigation: full tab order, escape closes modals
- Screen reader labels on every icon-only button
- Reduced motion: respect user preference, no autoplay animations
- ARIA live regions on the bottom panel (event log) and right results panel
- Alt text on every image / tile thumbnail

## Don'ts

- ❌ Never copy Gemini's "Model Garden" naming — it's "The Lab"
- ❌ Never copy Gemini's color palette — gold/orange is our signature
- ❌ Never put settings in a separate `/settings` route — they live inside Circuit Box
- ❌ Never stream agent reasoning to Circuit Box — that's the PiP window's job
- ❌ Never show superseded models in The Lab — `isLatest=true` enforced by loader
- ❌ Never default to Gemini for design tasks — use the routing priority chain
