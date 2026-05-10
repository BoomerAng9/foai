# Brand Standards — Deploy by: ACHIEVEMOR

Non-negotiable customer-facing brand rules. Locked by the 2026-04-17 Rish
arbitration. Enforcement tokens live in `aims-tools/brand-tokens/`.

## Wordmark

- **Exact form:** `Deploy by: ACHIEVEMOR` (capital D, lowercase by, colon,
  space, capital ACHIEVEMOR).
- **Font:** Permanent Marker. The ONLY place this face appears.
- **Never:** `Deploy: ACHIEVEMOR`, `deploy by achievemor`, `Deploy by
  Achievemor`, `DEPLOY by ACHIEVEMOR`.

## Primary neon

- **Hex:** `#39FF14`.
- **Named token:** `deploy-neon` (Tailwind) / `--deploy-neon-primary` (CSS var).
- Used for: primary CTAs, the `Deploy` wordmark highlight, active-state
  borders, focus rings.

## Body text

- **On dark backgrounds:** `#F5F7FA`.
- **Never dark-on-dark.** Forbidden pairs enforced in
  `DEPLOY_FORBIDDEN_PAIRS`.
- Inverse text (`#0B0D10`) is allowed ONLY on neon fills.

## Home page

- **Exactly two cards:**
  1. "Let ACHEEVY manage it"
  2. "Let ACHEEVY guide me"
- No other primary CTAs on the home surface. A/B tests and campaign
  variants go on sub-routes.

## Vendor-neutral copy

- No tool, provider, or model names in customer surfaces.
- Exception: **Per|Form sports pricing** may surface the Superior-tier
  Grok-4 note per `master-canon-pricing.md`.
- Anything from `@aims/tool-warehouse` with `internal_only = true`
  (currently Manus AI) must NEVER appear in customer copy. Use
  `filterForCustomerCopy(..., 'relabel')` which substitutes
  `External Tool Coordination`.

## Where it applies

| Surface | Apply? | Notes |
|---|---|---|
| `foai.cloud` public | YES | Full preset + two-card home |
| `deploy.foai.cloud` public | YES | Full preset |
| `cti.foai.cloud` admin | OPTIONAL | Internal surface — owner may keep agenticUI.net theme |
| `perform.foai.cloud` public | YES | Plus Superior-tier Grok-4 note |
| Marketing microsites | YES | |
| Circuit Box / The Lab / The Chamber (admin) | OPTIONAL | Internal |

## Migration plan

Each application migrates in its own PR so the brand diff is reviewable
in context. The order is:

1. `cti-hub` public-facing pages (plus Circuit Box keep-current option)
2. `perform` public surfaces
3. `aims-core/frontend` public
4. `the-deploy-platform/DEPLOY/apps/web` (customer entry)
5. Marketing microsites

No migration is a dependency of this brand-tokens PR. Token package is
opt-in; apps upgrade when ready.

## Canon references

- `docs/canon/master-canon-pricing.md` — wordmark + home rules source
- `docs/canon/Deploy-Unified-Command-Center.md` — UX inheritance
- Memory: `project_deploy_docs_arbitration_2026_04_17.md` §7
