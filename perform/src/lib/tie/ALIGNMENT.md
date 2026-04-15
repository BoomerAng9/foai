# TIE Alignment Contract

Every Per|Form page that displays a player grade must obey this contract so the same `player_id` can never render two different badges on two different pages.

## The primitives

| Layer | Module | Purpose |
|---|---|---|
| Engine | `@aims/tie-matrix` | Canonical cross-vertical grading. Never fork. |
| DB resolver | `@/lib/tie/resolve-player-grade` | `row → {band, label, score, vertical}`. Handles numeric `grade` OR canonical `tie_tier`. |
| Client fetch | `@/lib/api/players` | `fetchPlayers`, `fetchRanked`, `fetchByPosition`. Single call site. |
| Component | `@/components/tie/PlayerGradeDisplay` | Takes a row, renders canonical badge. **Pages should use this.** |
| Component (low-level) | `@/components/tie/GradeDisplay` | Takes a raw score. Use when you only have a number. |
| Colors | `@/lib/ui/positions` | `POSITION_GROUPS`, `positionColor`, `normalizePosition`. |
| CSS vars | `globals.css` | `--pf-navy`, `--pf-red`, `--pos-qb`…`--pos-s`. |

## Do

- Fetch players through `fetchPlayers()` / `fetchRanked()` / `fetchByPosition()`.
- Render grades through `<PlayerGradeDisplay player={row} />`.
- Render position colors through `positionColor(p.position)`.
- Write `tie_tier` with canonical TIETier values (`PRIME`, `A_PLUS`, …, `C`).

## Don't

- Don't inline `fetch('/api/players?...')` — use the helper.
- Don't hand-roll grade pills. No `if (score >= 90)` ladders in pages.
- Don't invent `tie_tier` strings (`ELITE`, `BLUE CHIP`, `STARTER`). Legacy rows with those values fall through to the "C" fallback — regrade them via `/api/grade/recalculate`.
- Don't define `POS_COLORS` in a page. Import from `@/lib/ui/positions`.
- Don't hardcode `#0B1E3F` / `#D40028`. Use `var(--pf-navy)` / `var(--pf-red)`.

## Canonical flow

```
DB row (perform_players)
  ├── grade (numeric, authoritative)
  ├── tie_tier (canonical TIETier, written by /api/grade/recalculate)
  └── vertical (default SPORTS)
       │
       ▼
resolvePlayerGrade(row)
       │
       ▼
{ band, label, score, vertical }
       │
       ▼
<GradeDisplay score=... vertical=... />
```

If a page displays a tier that doesn't match `resolvePlayerGrade(row).band.tier` for the same `row`, that page has a bug. The helper is the single source of truth.
