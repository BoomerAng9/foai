# @aims/tool-warehouse

**The canonical Tool Warehouse.** Replaces the outdated Tool Warehouse v4
markdown doc (archived in `docs/canon/`) with live Neon-backed inventory.

Target count per 2026-04-17 arbitration: **325 tools** across **9 tiers**.
Picker_Ang scans this warehouse at RFP→BAMARAM Step 3 (Commercial
Proposal) to produce the Bill of Materials + Security Addendum.

## The 9 tiers

| Tier | Ordinal | Category | Target count |
|---|---|---|---|
| Orchestration | 1 | CEO Layer | 4 |
| Integration | 2 | Autonomous agents + content | 4 |
| Plug Factory | 3 | Build execution | 3 |
| Voice SDKs | 4 | STT / TTS / agents | 5 |
| Agent Frameworks | 5 | Used BY Buildsmith | 7 |
| SmelterOS Foundry | 6 | InfinityLM core + House of ANG | 4 |
| Persistence | 7 | Databases | 3 |
| Security | 8 | Secrets + scanners | 2 |
| External Integrations | 9 | Everything else | 293 |

## Scope of this PR

- `migrations/001_init.up.sql` — `tools` table with the 9-tier enum + the
  `internal_only` boolean flag + full metadata JSONB column.
- `src/schema.ts` — zod types matching the column shapes.
- `src/seed-tools.ts` — initial curated rows:
  - **NEW integrations** from 2026-04-17 arbitration: Suna AI (HIGH,
    Apache 2.0), RTRVR AI (MEDIUM, FREE, local browser), Rytr AI (LOW,
    freemium fallback).
  - **Manus AI** flagged `internal_only = true` per the standing memory
    rule (`feedback_manus_reference_internal_only.md`). Never surface in
    customer copy.
  - **17 House of ANG specialists** as canonical tools, mapped to the
    SmelterOS Foundry tier — Research_Ang (ii-researcher), Code_Ang
    (ii-agent), Multi_Ang (CommonGround), Chronicle_Ang (Common_Chronicle),
    and the 13 Tier 2/3 specialists.
  - **Plug Factory trio** — Buildsmith, Picker_Ang (this ships in PR 4),
    House of ANG aggregator.
- `src/enforcement.ts` — `isInternalOnly()`, `assertNotSurfaceable()`,
  `filterForCustomerCopy()` helpers that implement the "never leak Manus
  / internal tools" rule at build time.
- `src/queries.ts` — `getToolById`, `getToolsByTier`, `searchTools`,
  `upsertTool`, `listTools`, `countByTier`.
- `src/client.ts` — postgres wrapper, same pattern as `@aims/contracts`.

## What this does NOT do

- Does NOT seed all 325 tools. Only the structurally-important rows +
  every NEW addition from the arbitration. The remaining 293 External
  Integrations land in a separate data-only PR.
- Does NOT wire Picker_Ang to the warehouse — that's PR 4.
- Does NOT implement the archived v4 `Melanium Ingot` fields on tools
  (per-tool cost model is handled by `@aims/pricing-matrix`, not here).

## Environment

Reads connection in order:
`WAREHOUSE_DATABASE_URL` → `NEON_DATABASE_URL` → `DATABASE_URL`.

## internal_only rule

Any tool with `internal_only: true` must NEVER appear in:
- Charter rows
- Customer-facing UI copy
- Marketing pages
- ACHEEVY's user-facing responses
- Picker_Ang BoM output that is surfaced to the customer

`enforcement.assertNotSurfaceable(toolId, context)` throws with a
`CustomerCopyLeakError` if an internal-only tool is about to be rendered
in a customer context. Use this at every Charter write + UI render call
site.

## Cross-references

- `docs/canon/Deploy-Unified-Command-Center.md` — tier taxonomy reference
- `docs/canon/House-of-ANG-v1.1_CORRECTED.md` — 17 specialists with
  canonical `Xxx_Ang` underscore names
- `.claude/projects/C--Users-rishj/memory/feedback_manus_reference_internal_only.md`
  — the standing Manus rule
- `.claude/projects/C--Users-rishj/memory/project_deploy_docs_arbitration_2026_04_17.md`
  — the arbitration that locks 325 tools + NEW integrations + House of ANG roster
