# FOAI Integrations

This directory holds the adapter wrappers + intake documents for every open-source agent application brought into the FOAI ecosystem as a callable tool. The discipline is the `open-source-agent-intake` skill installed globally at `~/.claude/skills/open-source-agent-intake/`.

## Current intakes

| Subdir | Source | Class | Status | INTAKE.md | Tool registry entry |
|---|---|---|---|---|---|
| `ii-agent/` | Intelligent-Internet/ii-agent | autonomous_agent_runtime | candidate | `ii-agent/INTAKE.md` | `foai/registry/tools/ii-agent.yaml` |
| `ii-researcher/` | Intelligent-Internet/ii-researcher | research_agent | candidate | `ii-researcher/INTAKE.md` | `foai/registry/tools/ii-researcher.yaml` |
| `ii-commons/` | Intelligent-Internet/ii-commons | shared_substrate | candidate | `ii-commons/INTAKE.md` | `foai/registry/tools/ii-commons.yaml` |
| `common-ground-core/` | common-ground/core | shared_substrate | candidate | `common-ground-core/INTAKE.md` | `foai/registry/tools/common-ground-core.yaml` |
| `autoresearch/` | foai/runtime/hermes/autoresearch/ (internal) | research_agent | approved_adapter | (already wired via PR #445; backfill INTAKE.md owed) | `foai/registry/tools/autoresearch.yaml` |

## The 4 components above compose ACHEEVY as a Super App

Per the owner directive 2026-05-14: **ACHEEVY is architected with ii-agent + ii-researcher + ii-commons + Common Ground Core.** This isn't a from-scratch build — it's the OSS stack assembled into the executive orchestrator. Each component below maps to a slice of ACHEEVY's behavior:

| ACHEEVY capability | OSS component | Role |
|---|---|---|
| Agent loop + tool dispatch | **ii-agent** | The runtime engine — multi-step tool use, function calling, plan execution |
| Deep research workflows | **ii-researcher** | Specialized research agent — source validation, citation tracking, multi-source synthesis |
| Shared utilities | **ii-commons** | Helpers used across ii-agent + ii-researcher (HTTP clients, schemas, shared types) |
| Cross-vertical state, identity, policy | **Common Ground Core** | The shared substrate — tenant routing, identity, per-vertical config primitives |

ACHEEVY's runtime at `foai/acheevy/` becomes the integration layer that wires these 4 components together + adds:
- FOAI-specific brand persona + voice (Inworld IVC clone, Nas reference set)
- Intent classifier tuned to the FOAI taxonomy (Deploy / Research / Build / Publish + custom verticals)
- Chicken Hawk Gateway dispatch (the actual routing to Boomer_Angs)
- Hermes audit_ledger writes (per blueprint §14)
- NemoClaw verdict consultation (per blueprint §11)
- Sacred Separation copy filter (no internal names ever leak to customer-facing output)

## Workflow per intake

Per the `open-source-agent-intake` skill, every component in this directory follows this sequence:

```
1. INTAKE.md ← THIS PR (current cycle)
   ↓
2. Clone + license review + repo inspection
   ↓
3. Local install + smoke test
   ↓
4. Adapter wrapper at /invoke + /health + /jobs/* endpoints
   ↓
5. Tool registry entry promoted from candidate → sandbox_verified → approved_adapter
   ↓
6. Chicken Hawk dispatcher wiring (routing rules)
   ↓
7. Scheduler / heartbeat / kill-switch hooks
   ↓
8. Security gates + dependency audit + secret handling
   ↓
9. Tests + PROOF_BUNDLE.md
   ↓
10. Owner-ready launch report
```

Each step gets one PR. Status field in the tool registry entry tracks the current step.

## What this PR ships

**Step 1 only — INTAKE.md scaffolds + candidate-status registry entries.** Per the skill:

> Do not claim completion unless all relevant acceptance criteria are demonstrated with actual evidence. If evidence is missing, state the integration state as: planned | intake complete | runs locally | ui exposed | api wrapped | router registered | staging validated | blocked.

This PR's status for all 4 new components: **intake_complete** (INTAKE.md written + scope mapped) but **NOT** runs_locally / ui_exposed / api_wrapped / router_registered. Those land in subsequent PRs.

## Skill canon reference

- Skill: `~/.claude/skills/open-source-agent-intake/SKILL.md`
- Tool registry schema: `~/.claude/skills/open-source-agent-intake/references/tool-registry-schema.md`
- Synthesis spec: `iCloudDrive/.../FOAI Project/specs/foai-humanless-org/2026-05-14-practical-manifestation.md`
