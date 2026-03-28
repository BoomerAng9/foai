# ACHEEVY Design System Rules — For AI Code Agents

**Version:** 2.0.0  
**Date:** 2026-03-02  
**Authority:** OPUS_4_6_BRAND_DESIGN_BIBLE.md  
**Stack:** React 19 + TailwindCSS 4 + Framer Motion 12 + shadcn/ui (new-york) + CSS Custom Properties  
**Token Source:** `frontend/src/app/design-tokens.css`

---

## 0. Golden Rule

> **Never use a hardcoded hex value. Always use a CSS custom property from the token system.**

If a token doesn't exist for your use case, propose a new token in `design-tokens.css` before writing the component.

---

## 1. Color Rules

### 1.1 Brand Palette — Gold is Rare

| Token | When to Use |
|-------|-------------|
| `var(--acheevy-gold-500)` / `#D4AF37` | **One** primary CTA per view only. Gold = ACHEEVY authority. |
| `var(--acheevy-gold-400)` | Hover states, gradient endpoints |
| `var(--acheevy-gold-300)` | Soft highlights, focus rings |
| `var(--acheevy-gold-600)` | Pressed/active states |
| `var(--acheevy-amber-500)` | Secondary warmth, gradient midpoints |
| `var(--acheevy-flame-400)` | Energy accent, notifications |

**Rule:** Gold appears sparingly. If you add gold to >2 elements in the same view, you're overusing it.

### 1.2 Surface Hierarchy

Use semantic tokens, not primitive values:

```
Body background   → var(--bg-base)           #0C0A09
Cards / panels    → var(--bg-raised)          #1C1917
Overlays / modals → var(--bg-overlay)         #292524
Popovers          → var(--bg-elevated)        #44403C
Glass cards       → var(--bg-glass)           rgba(28,25,23,0.6)
Brand highlights  → var(--bg-brand)           var(--acheevy-gold-500)
```

### 1.3 Text Hierarchy

```
Headings / primary   → var(--text-primary)     #FAFAF9
Body text            → var(--text-secondary)    #D6D3D1
Captions / meta      → var(--text-tertiary)     #A8A29E
Disabled             → var(--text-disabled)      #78716C
Brand accent text    → var(--text-brand)         var(--acheevy-gold-400)
Links                → var(--text-link)          var(--acheevy-gold-300)
Text on gold bg      → var(--text-on-brand)      #0C0A09
```

### 1.4 Signal Colors (Status)

| State | Token | Hex |
|-------|-------|-----|
| Success / Online | `var(--status-success)` | `#10B981` |
| Warning | `var(--status-warning)` | `#F59E0B` |
| Error / Offline | `var(--status-error)` | `#EF4444` |
| Info | `var(--status-info)` | `#3B82F6` |

### 1.5 Agent State Colors

| State | Token | Usage |
|-------|-------|-------|
| Thinking | `var(--agent-thinking)` | Shimmer bar, pulse dot |
| Executing | `var(--agent-executing)` | Tool call cards |
| Streaming | `var(--agent-streaming)` | Cursor blink, text appear |
| Complete | `var(--agent-complete)` | Checkmark, fade |
| Error | `var(--agent-error)` | Alert badge |

---

## 2. Typography Rules

### 2.1 Font Stack (from Brand Bible)

| Role | CSS Variable | Family |
|------|-------------|--------|
| Interface | `--font-sans` | Inter |
| Data/Display | `--font-doto` | Doto |
| Human Touch | `--font-marker` | Permanent Marker |
| Warmth | `--font-caveat` | Caveat Brush |
| Friendly | `--font-patrick` | Patrick Hand SC |

### 2.2 Scale (Major Third — ratio 1.250)

```
--text-xs:   0.64rem   (10.2px)  — Metadata, timestamps
--text-sm:   0.8rem    (12.8px)  — Secondary, chips
--text-base: 1rem      (16px)    — Body text
--text-lg:   1.25rem   (20px)    — Subheadings
--text-xl:   1.563rem  (25px)    — Section headings
--text-2xl:  1.953rem  (31.25px) — Page titles
--text-3xl:  2.441rem  (39px)    — Hero text
```

### 2.3 Rules

- Hand/marker fonts **never** for dense paragraphs
- Numbers (tokens, costs, timelines) → always Inter
- Doto → headlines and tech readouts only
- Patrick Hand → Workshop surfaces only
- All text must meet WCAG AA contrast (4.5:1 body, 3:1 large)

---

## 3. Spacing & Layout Rules

### 3.1 Spacing Scale (4px base)

```
--space-1:  0.25rem (4px)   — Tight inline gaps
--space-2:  0.5rem  (8px)   — Icon-to-text, compact padding
--space-3:  0.75rem (12px)  — Card internal (compact)
--space-4:  1rem    (16px)  — Standard padding
--space-5:  1.25rem (20px)  — Component gaps
--space-6:  1.5rem  (24px)  — Panel padding
--space-8:  2rem    (32px)  — Section separators
--space-10: 2.5rem  (40px)  — Page-level spacing
--space-12: 3rem    (48px)  — Large section gaps
--space-16: 4rem    (64px)  — Page margins (desktop)
```

### 3.2 Border Radii

```
--radius-sm:   0.375rem (6px)  — Chips, badges
--radius-md:   0.5rem   (8px)  — Buttons, inputs
--radius-lg:   0.75rem  (12px) — Cards
--radius-xl:   1rem     (16px) — Modals, dialogs
--radius-2xl:  1.5rem   (24px) — Hero sections
--radius-full: 9999px           — Circular elements
```

### 3.3 Fit-to-Screen (Non-Negotiable)

1. Every page loads centered with consistent padding
2. No primary content renders clipped off-screen on first paint
3. Header is visible **immediately** — no layout shift
4. Chat composer is always fully visible — send button never clipped
5. Scroll containers have bounded height — no infinite overflow

---

## 4. Component Variant Rules

### 4.1 Buttons

Use shadcn `<Button>` with these variants:

| Variant | When |
|---------|------|
| `brand` | Primary CTA — one per view max |
| `brand-outline` | Secondary prominence |
| `brand-ghost` | Tertiary / inline actions |
| `glass` | Actions on glass surfaces |
| `default` | Standard non-brand actions |
| `destructive` | Delete / danger actions |

### 4.2 Badges

| Variant | When |
|---------|------|
| `brand` | ACHEEVY / gold labeling |
| `success` `warning` `error` | Status indicators |
| `glass` | Labels on glass cards |
| `agent-thinking` `agent-executing` `agent-error` | Agent state |

### 4.3 Cards

- Use `<Card>` or `<GlassCard>` — never raw `<div>` with manual borders
- Glass cards: `bg-[var(--bg-glass)] backdrop-blur-md border-[var(--border-default)]`
- Premium cards: gold border on hover only
- Transitions: `transition-[border-color,box-shadow] duration-200`

### 4.4 Inputs

- Background: `var(--input-bg)`
- Border: `var(--input-border)` → focus: `var(--input-border-focus)`
- Ring: `var(--input-ring)`
- Placeholder: `var(--input-placeholder)`

---

## 5. Motion Rules

### 5.1 Duration Tokens

```
--transition-fast:     150ms  — Button press, toggle
--transition-normal:   200ms  — Standard transitions
--transition-slow:     300ms  — Panel expand/collapse
--transition-emphasis: 500ms  — Page transitions
```

### 5.2 Easing

```
--ease-default: cubic-bezier(0.4, 0, 0.2, 1)  — General purpose
--ease-in:      cubic-bezier(0.4, 0, 1, 1)     — Elements exiting
--ease-out:     cubic-bezier(0, 0, 0.2, 1)     — Elements entering
```

### 5.3 Rules

1. All animations are **state-driven** (no ad-hoc)
2. Prefer `opacity` + `transform` for GPU performance
3. Never animate layout + opacity + transform simultaneously
4. `prefers-reduced-motion` → instant or no transitions
5. Framer Motion for UI interactions; never CSS @keyframes for complex sequences

---

## 6. Glass & Texture Rules

### 6.1 Glass Variants

| Variant | Blur | Background | Border |
|---------|------|------------|--------|
| Standard | `backdrop-blur-md` (12px) | `var(--bg-glass)` | `var(--border-default)` |
| Premium | `backdrop-blur-lg` (20px) | radial gold gradient 5% | `rgba(212,175,55,0.2)` |
| Auth | `backdrop-blur-xl` (32px) | radial white gradient | `var(--border-brand)` |

### 6.2 Texture Rules

- Noise overlay: 3% opacity max
- Gold glow: `0 0 40px rgba(212,175,55,0.06)` max
- No bright haze or bloom that obscures content
- Texture disabled for `prefers-reduced-motion` / `prefers-contrast`

---

## 7. Accessibility (Non-Negotiable)

1. **Contrast:** All text meets WCAG AA (4.5:1 body, 3:1 large text)
2. **Focus:** Every interactive element has visible `focus-visible` ring using `var(--border-focus)`
3. **ARIA:** Semantic roles on all custom interactive components
4. **Motion:** Respect `prefers-reduced-motion` — disable or reduce all animations
5. **Color:** Never convey meaning through color alone — always pair with icon or text
6. **Keyboard:** All functionality reachable via keyboard
7. **Screen readers:** Use `aria-label`, `aria-live`, `role` on status indicators

---

## 8. File Organization

```
frontend/src/
├── app/
│   ├── design-tokens.css      ← 3-layer token system (primitives → semantic → component)
│   ├── global.css             ← Imports tokens, Tailwind theme overrides
│   └── animations.css         ← Custom keyframe animations
├── components/
│   ├── ui/                    ← shadcn/ui primitives (button, badge, input, card, dialog, tooltip)
│   ├── agentic/               ← Agent-state UI (status-dot, glass-card, tool-card, etc.)
│   ├── acheevy/               ← Brand-specific (loader, dashboard, hero-3d, etc.)
│   └── agent/                 ← Chat interface components
```

---

## 9. Do / Don't Checklist

### DO:
- ✅ Use `var(--token-name)` for all colors, spacing, radii, shadows
- ✅ Use Tailwind arbitrary value syntax: `bg-[var(--bg-raised)]`
- ✅ Add `dark:` prefix when the token value differs in light mode
- ✅ Use `cn()` utility for conditional class merging
- ✅ Default to dark mode (ACHEEVY's primary surface)
- ✅ Add `transition-colors duration-200` on interactive elements
- ✅ Test with `prefers-reduced-motion: reduce`

### DON'T:
- ❌ Hardcode hex values (`#D4AF37`, `#1C1917` etc.)
- ❌ Use `style={{}}` inline — use Tailwind classes or CSS custom properties
- ❌ Add gold to >2 elements per view
- ❌ Use blank text prompts — always provide conversation starters
- ❌ Animate layout properties (width, height, top, left)
- ❌ Skip focus-visible styles
- ❌ Create new component files without checking if an agentic/ or ui/ variant exists

---

## 10. Token Layer Architecture

```
Layer 1 — Primitives (design-tokens.css :root)
  Raw palette values. Never reference directly in components.
  Example: --acheevy-gold-500: #D4AF37

Layer 2 — Semantic (design-tokens.css [data-theme])
  Contextual meaning mapped to primitives.
  Example: --text-brand: var(--acheevy-gold-400)

Layer 3 — Component (design-tokens.css component section)
  Per-component tokens mapping to semantic values.
  Example: --chat-user-bg: var(--acheevy-gold-500)
```

When building a new component:
1. Check Layer 3 for existing component tokens
2. If none exist, use Layer 2 semantic tokens
3. If a new semantic meaning is needed, add to Layer 2 first
4. **Never** reference Layer 1 primitives in component code

---

*This document is the code-facing companion to OPUS_4_6_BRAND_DESIGN_BIBLE.md. All AI code agents (Claude, Cursor, Copilot) must follow these rules when generating or modifying frontend code.*
