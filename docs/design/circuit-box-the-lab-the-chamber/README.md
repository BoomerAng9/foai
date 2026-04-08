# Circuit Box / The Lab / The Chamber — Design Spec

> **Combined design spec, paged + expandable** — per Rish 2026-04-08: "Combine them into one. But in pages. Not locked. They can grow and they can expand."

This spec covers the three control surfaces of the A.I.M.S. ecosystem. They are **separate experiences** that share a **theme**, **navigation pattern**, and **design system**. Each lives on its own page in this spec; new pages can be added without restructuring the existing ones.

## Renames (canonical 2026-04-08)

| Old name | New name | Why |
|---|---|---|
| Model Garden | **The Lab** | Avoid copying Gemini's "Model Garden" naming |
| Workbench | **The Chamber** | Distinct, evocative — testing space |
| Circuit Box | (unchanged) | Already canonical |

Search-and-replace rule for codebase + memory + docs: `Model Garden` → `The Lab`, `Workbench` → `The Chamber`. Existing memory files referencing the old names are stale on those terms specifically.

## Pages

| # | Page | Purpose | Status |
|---|---|---|---|
| 1 | [`01-circuit-box.md`](./01-circuit-box.md) | Control center + admin console + absorbed settings panel | ✅ this PR |
| 2 | [`02-the-lab.md`](./02-the-lab.md) | Tile grid for tools/models (formerly Model Garden) | ✅ this PR |
| 3 | [`03-the-chamber.md`](./03-the-chamber.md) | Testing scenarios (formerly Workbench) | ✅ this PR |
| 4 | [`04-shared-design-system.md`](./04-shared-design-system.md) | agenticai.net theme, components, tokens | ✅ this PR |
| 5+ | (future) | Add new pages here as the ecosystem expands | — |

Each page is independently expandable. Add `05-data-lab.md`, `06-automation-studio.md`, `07-analytics-observatory.md`, etc. as new surfaces ship — never break the existing pages.

## Core principles (apply across all pages)

1. **Circuit Box absorbs the settings panel everywhere.** No `/settings` route. Settings are panels inside Circuit Box, gated by visibility flags. Admin can flip flags to expose / hide.
2. **The Lab tiles must carry full metadata.** Per `project_reasoning_stream_ui.md`: every tool/model tile shows Overview, Use Cases, Cost per LUC, Best Case, Suggested Alternatives, Tier Badges, Pillar Modifiers, "Try in The Chamber" button.
3. **Reasoning stream lives in PiP, not Circuit Box.** Per `project_reasoning_stream_ui.md`: agent reasoning streams to a detachable Picture-in-Picture side window. Circuit Box is control center only.
4. **Theme matches agenticai.net / cti.foai.cloud.** Dark navy/graphite background, gold/orange accents (ACHIEVEMOR signature). Industrial control-panel aesthetic. See `04-shared-design-system.md`.
5. **Design routing applies to The Lab.** When a user is browsing tools, design tasks default to the priority chain (C1 Thesys → Stitch MCP → Recraft → Ideogram → Gamma → Napkin → generic image gen). Per `project_design_routing.md`.
6. **Latest-only enforcement.** No superseded models render in The Lab. Per `@aims/pricing-matrix` `getLatestImageModels()` / `getLatestVideoModels()`.

## Cross-references

| Topic | Memory file |
|---|---|
| Reasoning stream UI (PiP, NOT Circuit Box) | `project_reasoning_stream_ui.md` |
| Design tool routing priority | `project_design_routing.md` |
| Circuit Box / The Lab / The Chamber renames | `project_circuit_box_lab_chamber_renames.md` |
| TPS_Report_Ang Pricing Overseer | `project_pricing_overseer_agent.md` |
| Grammar always-on + NTNTN file indexing | `project_grammar_always_on_ntntn.md` |
| Lil_Hawks persona (regional slang) | `project_lil_hawks_persona.md` |
| Voice library system | `project_voice_library_system.md` |
| AVVA NOON canon | `project_avva_noon_canon.md` |
| Chain of command | `project_chain_of_command.md` |
| HR PMO Office | `project_hr_pmo_office.md` |
