# FOAI Registry

The declarative metadata layer for the FOAI humanless agentic organization.

This directory is the **executable manifestation** of the 25-section blueprint at `iCloudDrive/.../FOAI Project/specs/foai-humanless-org/2026-05-14-practical-manifestation.md`. Every agent, department, tool, and workflow that operates inside FOAI has a declarative YAML card here. The card is the contract: Chicken Hawk Gateway reads the agent card at dispatch time, the tool registry reads tool entries at routing time, ACHEEVY reads department charters when assigning work.

## Layout

```
foai/registry/
├── README.md                       ← this file
├── schemas/                        ← canonical YAML schemas (the contracts)
│   ├── agent-operating-card.yaml   ← per-agent metadata (role / tools / inputs / outputs / approval triggers)
│   ├── department-charter.yaml     ← per-department metadata (purpose / leader / teams / standard outputs)
│   └── tool-registry-entry.yaml    ← per-tool metadata (endpoint / auth / capabilities / side-effect level)
├── agents/                         ← one card per agent
│   ├── ACHEEVY.yaml                ← example template (the executive orchestrator)
│   ├── Sal_Ang.yaml                ← (TODO Phase 1 cycle 2 — bulk migrate the other 44)
│   └── ...
├── departments/                    ← one charter per department
│   ├── Office_of_the_CDO.yaml      ← example template (Iller_Ang home)
│   └── ...
├── tools/                          ← one entry per Approved-Adapter-status tool
│   ├── autoresearch.yaml           ← example template (the first wired tool)
│   └── ...
└── workflows/                      ← one YAML per canonical mission shape
    ├── (TODO Phase 3 cycle — research_mission / build_mission / publish_mission / deploy_mission / report_mission / dispatch_mission)
    └── ...
```

## Schema canon

All three schemas in `schemas/` are derived from:
- The owner directive 2026-05-14 (25-section blueprint, §12 agent / §13 department / §9 tool)
- The just-extracted **Open Source Agent Intake skill** at `~/.claude/skills/open-source-agent-intake/SKILL.md` (16-step intake standard) + `references/tool-registry-schema.md`

Updates to any schema must:
1. Bump the `schema_version` field in the schema's frontmatter
2. Update all existing cards to satisfy the new schema OR mark migration debt as a TODO
3. Note the canon change in the corresponding memory file (`reference_foai_registry_canon_<date>.md`)

## How Chicken Hawk Gateway consumes this registry

At dispatch time:
1. ACHEEVY receives an intent + classifies it
2. ACHEEVY looks up candidate Boomer_Angs in `agents/` based on capability match
3. For each candidate, checks `allowed_tools` and `denied_tools` against the proposed action
4. For each `allowed_tool`, looks up `tools/<tool>.yaml` for endpoint + auth + side-effect level
5. NemoClaw verdict consults `tools/<tool>.yaml.side_effect_level` to decide BLOCKED / REQUIRES_OWNER_APPROVAL / ALLOWED_WITHOUT_APPROVAL
6. Dispatch fires; receipt records which agent + tool + verdict

The registry is the **source of truth.** Agent personas, tool wirings, and department structures live HERE — not scattered across code.

## Status

This is the **Phase 1 kickoff** (per the synthesis spec). What this PR ships:

- All 3 schemas (Agent Operating Card / Department Charter / Tool Registry Entry)
- 1 example Agent Operating Card (ACHEEVY)
- 1 example Department Charter (Office of the CDO)
- 1 example Tool Registry Entry (AutoResearch)
- This README

What Phase 1 still owes (defer-able, doesn't block Phase 2):

- 12 more Boomer_Ang cards (Sal / LUC / Melli / Marcus / Iller / Code / Edu / Scout / Content / Ops / Biz / Publish)
- 11 Customer Lil_Hawk cards
- 19 Sqwaadrun Hawk cards
- 3 Super Agent runtime cards (Chicken Hawk / NemoClaw / Hermes)
- Department charters for: Office of the CTO, Office of the CMO, Office of the CFO, Sett (when ratified), Roo's, Cyber Hawks
- Tool entries for: NemoClaw policy module, Hermes Agent service, aims-open-sandbox, Print_Press daemon, Sqwaadrun fleet (each)
- 6 canonical workflow YAMLs (research / build / publish / deploy / report / dispatch missions)
- NemoClaw policy generalization (universal 5-level side-effect taxonomy replacing the Coastal-specific action-type list)

Each defer-able item gets one PR per item or per small group, processed through the Open Source Agent Intake skill discipline.

## Predecessor work

- Synthesis spec — `iCloudDrive/.../FOAI Project/specs/foai-humanless-org/2026-05-14-practical-manifestation.md`
- Open Source Agent Intake skill — `~/.claude/skills/open-source-agent-intake/SKILL.md` (installed globally this PR)
- Owner 25-section blueprint — see `iCloudDrive/.../FOAI Project/specs/foai-humanless-org/`
- Circuit Box v1 spec — `iCloudDrive/.../FOAI Project/specs/circuit-box/2026-05-14-v1-design.md`
