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
| `MelaniumBalanceWidget` | `src/components/MelaniumBalanceWidget.tsx` | Differentiated — three-band vertical card (Bebas Neue balance + mono Earned/Spent + canonical Savings Plan explainer). Neon only on balance number. No fintech icons, no gradient, no arrows | Customer account surfaces, Charter sidebars |
| `DigitalMaintenanceFeeLineItem` | `src/components/DigitalMaintenanceFeeLineItem.tsx` | Differentiated — mono flex-row, label left + amount right, optional canonical explainer beneath, optional inline (info) affordance. No borders, no icon, no stripe — stacks into host receipt surface | Charter Quote/PO cost summary, invoices, transaction receipts |
| `CharterDetailView` | `src/components/CharterDetailView.tsx` | Differentiated — 60/40 record-cover grid. Left: 11 sections in canonical order with Bebas Neue section numbers. Right: sticky metadata + pinned tracker + optional Melanium widget. BAMARAM signal flips the right rail's top edge neon. Dog-foods every prior component | The customer-facing engagement artifact — Charter pages across every surface |
| `TeslaVortexPricingPicker` | `src/components/TeslaVortexPricingPicker.tsx` | Differentiated — three-zone vortex: Frequency (3/6/9 Bebas Neue cards with Axis-of-Balance label) × V.I.B.E. Group chips × 3 Pillars (Confidence Shield / Convenience Boost / Security Vault) stacking. Neon-top summary strip shows monthly total + pillar stack %. Enterprise flips to CUSTOM quote flow | A.I.M.S. core pricing pages — aimanagedsolutions.cloud, onboarding, upgrade flows |
| `PerformSportsPricingSelector` | `src/components/PerformSportsPricingSelector.tsx` | Differentiated — 5 tiers (BMAC / Lite / Medium / Heavy / Superior) in a horizontal row with progressive visual weight. No "Most Popular" badge on any tier. Superior surfaces the canonical "Grok-4 · latest-resolved" note — the ONE vendor-name exception per master-canon-pricing.md | Per\|Form sports surfaces — perform.foai.cloud pricing pages, upgrade flows |
| `FiveUseCasesPack` | `src/components/FiveUseCasesPack.tsx` | Differentiated — expandable card stack. Each collapsed card shows Bebas Neue title + purpose + GROC micro-bars (mirrors IIR pattern from BomRenderer for kit consistency). Expanded reveals how-to-implement steps + usage bands (high/med/low) + KPIs + risks | Charter detail Step 6, Purchase Order deliverable, plug gallery show-pages |
| `TermsOfServicePage` | `src/components/TermsOfServicePage.tsx` | Differentiated — two-column layout mirroring CharterDetailView: sticky section nav left, numbered sections right, acceptance block with attestation checkbox + signer name/role. Binds the attestation-not-ingestion-policing canon via production-layer attestation copy | foai.cloud/terms, deploy.foai.cloud/terms, perform.foai.cloud/terms, aimanagedsolutions.cloud/terms |

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
3. ✅ `CharterDetailView` — this PR
4. ✅ `RfpBamaramProgressTracker` — #200
5. ✅ `PickerAngBomRenderer` — #201
6. ✅ `MelaniumBalanceWidget` — #202
7. ✅ `DigitalMaintenanceFeeLineItem` — #203
8. ✅ `TeslaVortexPricingPicker` — #205
9. ✅ `PerformSportsPricingSelector` — #206
10. ✅ `FiveUseCasesPack` — #207
11. ✅ `TermsOfServicePage` — this PR
12. ⬜ `AcheevyChatKioskEntry` — mode-transition handler

## Cross-references

- `@aims/brand-tokens` — token source (#196)
- `@aims/contracts` — Charter/Ledger types (#191)
- `@aims/picker-ang` — BoM shape (#194)
- `@aims/melanium` — currency types (#192)
- `docs/canon/brand-standards.md` — enforcement rules
- `.claude/skills/open-mind` — the creation playbook this lives inside
