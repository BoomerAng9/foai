# @aims/ui-kit

Shared React component library for **Deploy by: ACHIEVEMOR** surfaces.
Components consume `@aims/brand-tokens` (#196) for the canonical
`#39FF14` neon / Permanent Marker / Geist Sans / two-card rule.

**Built with Open Mind discipline.** Every component passes through
Foster → Develop (three approaches: Conventional / Differentiated /
Experimental) → Hone + pre-mortem blacklist before any
`21st.dev Magic` call.

## Non-negotiable pre-mortem

Before generating any component, the result must NOT look like:

- Another SaaS landing page with gradient hero + feature grid
- Generic dashboard with cards + sparklines
- Default shadcn spacing / Inter / rounded-lg look
- A page that could belong to Vercel / Linear / any other AI SaaS

## Current inventory

| Component | File | Approach | Surfaces |
|---|---|---|---|
| `HomeHero` | `src/components/HomeHero.tsx` | Differentiated — asymmetric "manage" vs "guide" split, neon frame on hover, Permanent Marker wordmark spanning divider | foai.cloud, deploy.foai.cloud, perform.foai.cloud |
| `AcheevyNavShell` | `src/components/AcheevyNavShell.tsx` | Differentiated — nav split LEFT/RIGHT of the wordmark (not logo-left SaaS pattern), optional mode-pill row renders only when an engagement is live | All public surfaces |
| `RfpBamaramProgressTracker` | `src/components/RfpBamaramProgressTracker.tsx` | Differentiated — horizontal 10-dot rail with gate-status glyphs (✓ ⟳ ✗ ↑), neon ring on current, mono stage labels below, special BAMARAM! outline at stage 10 | Anywhere an engagement is surfaced — Charter detail, admin dashboards, PiP windows |
| `PickerAngBomRenderer` | `src/components/PickerAngBomRenderer.tsx` | Differentiated — card stack with Bebas Neue tool names, three-bar IIR micro-meters (neon dot on highest axis), outlined Security Addendum below. Operates only on customer-safe BoM — internal-only relabels arrive pre-scrubbed and render identically to named tools | Charter detail, Commercial Proposal surface, admin drill-down |

## Usage

```tsx
// In a Next.js / React app that already consumes @aims/brand-tokens
// Tailwind preset:
import { HomeHero } from '@aims/ui-kit/home-hero';

export default function Page() {
  return <HomeHero onManage={() => ...} onGuide={() => ...} />;
}
```

Consumer app must have the `@aims/brand-tokens/tailwind-preset` applied.
Fonts (`Permanent Marker`, `Geist Sans`) loaded per the brand-tokens README.

## Roadmap

Per the 2026-04-17 arbitration + session 2026-04-17 UI queue:

1. ✅ `HomeHero` — #198
2. ✅ `AcheevyNavShell` — #199
3. ⬜ `CharterDetailView` — 11-component Charter renderer
4. ✅ `RfpBamaramProgressTracker` — #200
5. ✅ `PickerAngBomRenderer` — this PR
6. ⬜ `MelaniumBalanceWidget` — customer platform currency
7. ⬜ `DigitalMaintenanceFeeLineItem` — generic Charter line
8. ⬜ `TeslaVortexPricingPicker` — 3-6-9 A.I.M.S. core
9. ⬜ `PerformSportsPricingSelector` — BMAC/Lite/Medium/Heavy/Superior
10. ⬜ `FiveUseCasesPack` — GROC-ranked card set
11. ⬜ `TermsOfServicePage` — Charter-aware legal
12. ⬜ `AcheevyChatKioskEntry` — mode-transition handler

## Cross-references

- `@aims/brand-tokens` — token source (#196)
- `@aims/contracts` — Charter/Ledger types (#191)
- `@aims/picker-ang` — BoM shape (#194)
- `@aims/melanium` — currency types (#192)
- `docs/canon/brand-standards.md` — enforcement rules
- `.claude/skills/open-mind` — the creation playbook this lives inside
