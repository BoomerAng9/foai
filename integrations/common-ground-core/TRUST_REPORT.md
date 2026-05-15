# TRUST_REPORT — Common Ground Core

**Component:** `common-ground-core`
**Companion artifact:** `INTAKE.md` (this directory)
**Skill canon:** Open Source Agent Intake skill v2 (~/.claude/skills/open-source-agent-intake/SKILL.md §2 + §9)
**Schema:** Tool Registry v1.2.0 `trust` object — see `foai/registry/tools/common-ground-core.yaml` (forthcoming retrofit)
**Date:** 2026-05-14
**Status:** **NEEDS_PATCHING** — STEP-2 BLOCKER per the prior intake conclusion: owner must first confirm whether "Common Ground Core" refers to an OSS upstream repo OR an internal FOAI spec. Trust gate cannot run until source identity resolves.

---

## STEP-2 BLOCKER (carried over from INTAKE.md)

Per the original PR #449 intake notes: the upstream identity of "Common Ground Core" was not unambiguously established. Candidates:

1. **An OSS repo named "common-ground" or similar** — owner needs to provide the URL
2. **An internal FOAI spec** — describing tenant routing / identity / policy primitives, in which case "intake" doesn't apply; this becomes a build-from-spec task, not an OSS adoption
3. **A composite** — owner intends for FOAI to build a Common Ground Core service against a published interface spec, drawing on patterns from one or more OSS references

**Owner action required:** Confirm source identity. Until then, this component remains `NEEDS_PATCHING` (cannot enter sandbox without a clone target).

---

## If candidate 1 (OSS repo) — trust gate plan

All sections below apply once owner provides upstream URL:

| Field | Value |
|---|---|
| Upstream | **TBD — owner to confirm URL** |
| Branch / tag inspected | TBD |
| Commit hash | deferred |
| License | TBD (must be compatible with FOAI's Apache 2.0 / MIT allowlist) |
| Upstream org | TBD |
| Fork status | Not applicable until source confirmed |

Then run the same gate as ii-agent / ii-researcher / ii-commons: freshness, license, dependency, security scan, malware/spyware, runtime/network observation, data access enumeration, tool/API permissions.

## If candidate 2 (internal spec) — re-classify

- This is not an OSS intake. Move the work into `foai/services/common-ground/` as a new internal service with its own design spec.
- TRUST_REPORT.md becomes N/A — internal services use the standard FOAI design review + audit-ledger discipline, not the OSS intake gate.
- The placeholder INTAKE.md and this TRUST_REPORT.md should be marked superseded and the work re-tracked under `foai/services/common-ground/DESIGN.md`.

## If candidate 3 (composite build-from-spec) — hybrid

- Treat the spec as the canonical artifact (lives at `foai/services/common-ground/SPEC.md`)
- Treat any OSS references contributing patterns as separate intake entries (each gets its own INTAKE + TRUST_REPORT)
- The runtime artifact (`foai/services/common-ground/`) is an internal service; OSS references are `reference_only` placement

## Known risks (regardless of resolution path)

1. **Identity confusion blocks all downstream wiring.** ACHEEVY Super App composition (per `foai/registry/agents/ACHEEVY.yaml`'s `super_app_composition` field) lists `common-ground-core` as a dependency. If this stays unresolved, ACHEEVY's tenant/identity/policy substrate has no concrete backing.
2. **Tenant + identity + policy is high-leverage infrastructure.** Whichever path resolves, the resulting code must pass FOAI's strictest review — this is the trust root for multi-tenant work-order routing, white-label consultancy clones, and Sacred Separation enforcement.
3. **Premature wiring would create a load-bearing stub.** Until source resolves, no FOAI runtime code should import / depend on `common-ground-core` as if it exists.

## Required actions before promotion

- [ ] **OWNER:** Confirm which candidate (1 / 2 / 3) applies
- [ ] If candidate 1: provide upstream URL; trust gate executes
- [ ] If candidate 2: re-classify as internal service; archive these intake artifacts; create design spec
- [ ] If candidate 3: split into spec (internal) + OSS references; run intake per reference separately

## FOAI placement recommendation

`foai_owner_layer: infrastructure` (regardless of resolution path — this is substrate, not an agent).

`authority_path: ["ACHEEVY"]` for the resulting service.

## Approval status

**NEEDS_PATCHING** — blocked on owner source-identity confirmation. Once resolved, status transitions to `APPROVED_SANDBOX_ONLY` (for candidates 1 or 3) or N/A with archival (for candidate 2).

## Status log

| Date | From → To | Note |
|---|---|---|
| 2026-05-14 | — → NEEDS_PATCHING | Retrofit scaffold (Phase 0c per Taskade integration plan). STEP-2 BLOCKER carried over from PR #449 intake. |
