# @aims/tie-matrix

Canonical Talent & Innovation Engine (TIE) matrix. Single source of truth for grade bands, verticals, tier labels, Prime sub-tags, and versatility bonuses across the A.I.M.S. ecosystem.

**TIE is cross-vertical.** One numeric scale (0–107+), six verticals (SPORTS, WORKFORCE, STUDENT, CONTRACTOR, FOUNDER, CREATIVE). Grade cutoffs and pillar weights (40/30/30) are shared. Labels, context strings, and projections are vertical-specific and routed through `getVerticalTierLabel()`.

Mirrors the partition/compartment pattern of `@aims/pricing-matrix`: `types` → `schema` (Zod) → `loader` (seed + cache) → `queries` → `seed-*`.

## Usage

```ts
import { buildTIEResult, assertVertical } from '@aims/tie-matrix';

const result = buildTIEResult({
  vertical: 'SPORTS',
  performance: 88,
  attributes: 76,
  intangibles: 82,
  bonus: 5, // two-way versatility
});

assertVertical(result, 'SPORTS', 'draft-board-page');
```

## Public API

- `getMatrix()` / `reloadMatrix()` — load & cache
- `getGradeForScore(score)` / `getGradeColor(score)` / `getGradeBandByTier(tier)`
- `getVerticalConfig(vertical)` / `getVerticalTierLabel(tier, vertical)`
- `getPrimeSubTag(tag)` / `getVersatilityBonus(flex)` / `versatilityBonusValue(flex)`
- `formatGradeDisplay(score, primeSubTags?)`
- `assertVertical(result, expected, context)` — routing boundary enforcement
- `buildTIEResult({ vertical, performance, attributes, intangibles, bonus?, primeSubTags? })`

## Wire-up

Consumer project tsconfig path alias:

```json
"paths": {
  "@aims/tie-matrix": ["../aims-tools/tie-matrix/src/index.ts"],
  "@aims/tie-matrix/*": ["../aims-tools/tie-matrix/src/*"]
}
```

## Invariants

1. Every `TIEResult` MUST be stamped with a `vertical` field.
2. Every routing boundary MUST call `assertVertical()` before consuming.
3. Sports rankings NEVER appear in workforce surfaces (and vice versa).
4. Pillar weights (40/30/30) live only in `queries.ts::buildTIEResult`. Engines provide pillar inputs; they DO NOT apply weights themselves.
5. Grade cutoffs live only in `seed-grades.ts`.
6. Vertical labels live only in `seed-verticals.ts`.
