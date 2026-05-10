# @aims/brand-tokens

**Deploy by: ACHIEVEMOR** brand tokens + `agenticUI.net` theme source of
truth. Every customer-facing Deploy surface imports from here.

Locked by the 2026-04-17 Rish arbitration. Do not add tokens or change
existing values without a new arbitration entry — the brand is a
production-level signature, not a style variable bag.

## Non-negotiable rules

- **Wordmark:** `Deploy by: ACHIEVEMOR` (exact colon + space).
- **Display font:** Permanent Marker for the `Deploy` wordmark.
- **Primary neon:** `#39FF14`.
- **Body text on dark backgrounds:** `#F5F7FA`. Never dark text on dark fills.
- **Home page:** only two cards — "Let ACHEEVY manage it" + "Let ACHEEVY guide me".
- **Vendor-neutral UI copy** — no model / tool / provider names in customer surfaces. The only exception is the explicit Superior-tier Grok-4 disclosure on Per|Form sports pricing.

## What ships

- `src/colors.ts` — named color tokens + WCAG-safe pairs.
- `src/typography.ts` — font stacks + display size ramp.
- `src/css-variables.ts` — a string blob of `:root` custom properties
  ready to drop into `<style>`.
- `src/tailwind-preset.ts` — a Tailwind v4 preset extending the theme
  with all tokens.
- `src/index.ts` — barrel export.

Consumers:

```ts
// In a Tailwind v4 config:
import { deployBrandPreset } from '@aims/brand-tokens/tailwind-preset';
export default {
  presets: [deployBrandPreset],
  content: ['./src/**/*.{tsx,ts,jsx,js,html}'],
};
```

```tsx
// Inline CSS variables for a server-component root:
import { cssVariables } from '@aims/brand-tokens/css-variables';

<style dangerouslySetInnerHTML={{ __html: cssVariables }} />
```

```ts
// Programmatic access to raw tokens:
import { DEPLOY_COLORS, DEPLOY_FONTS } from '@aims/brand-tokens';
```

## Where this applies

| Surface | Required? | Notes |
|---|---|---|
| `foai.cloud` public site | YES | Apply preset + home-page two-card layout |
| `deploy.foai.cloud` public surface | YES | Same preset |
| `cti.foai.cloud` admin (internal) | OPTIONAL | Internal surfaces may keep current brand — owner discretion |
| `perform.foai.cloud` public | YES | Must also surface Superior-tier Grok-4 note |
| Marketing microsites | YES | Permanent Marker + `#39FF14` neon |
| Admin dashboards (Circuit Box, The Lab, The Chamber) | OPTIONAL | Internal |

## What this does NOT do

- **Does not migrate any existing app.** Theme + preset ship as a package
  exported from `@aims/brand-tokens`; application rewiring is a follow-up
  PR per-app so reviewers can review brand changes in context.
- **Does not change any current rendered surface.** Zero runtime impact
  until a consumer imports from here.
- **Does not change pricing or agent naming rules** — those live in
  `@aims/pricing-matrix` and `docs/canon/boomer_angs_unified_roster.md`.

## Canon references

- `docs/canon/master-canon-pricing.md` — brand syntax + home-page rules
- `docs/canon/Deploy-Unified-Command-Center.md` — theme inherited UX rules
- Memory: `project_deploy_docs_arbitration_2026_04_17.md` §7

## License

Internal ACHIEVEMOR package. Not distributed.
