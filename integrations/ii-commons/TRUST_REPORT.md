# TRUST_REPORT — ii-commons

**Component:** `ii-commons`
**Companion artifact:** `INTAKE.md` (this directory)
**Skill canon:** Open Source Agent Intake skill v2 (~/.claude/skills/open-source-agent-intake/SKILL.md §2 + §9)
**Schema:** Tool Registry v1.2.0 `trust` object — see `foai/registry/tools/ii-commons.yaml` (forthcoming retrofit)
**Date:** 2026-05-14
**Status:** **APPROVED_SANDBOX_ONLY** — quarantine-eligible; promotion to APPROVED_FOR_INTAKE requires the scan executions below.

---

## Repo identity

| Field | Value |
|---|---|
| Upstream | `github.com/Intelligent-Internet/II-Commons` |
| Branch / tag inspected | `main` (TBD — pin specific tag before clone) |
| Commit hash | **deferred** — captured at clone time in Phase 4A Step-2 |
| License | Apache 2.0 (per upstream README — verify on clone) |
| Upstream org | Intelligent Internet (II) |
| Fork status | Not yet forked; clone-only inspection during quarantine |
| Role | **Shared utility library**, NOT a runtime — types / schemas / HTTP helpers / RAG primitives consumed by ii-agent + ii-researcher |

## Freshness

`freshness_status: unknown` — deferred until clone.

## License

`license_status: approved` (Apache 2.0 — re-confirm on clone.)

## Dependency health

ii-commons is the shared dependency surface FOR the other II tools. Its dep tree dictates the effective dep surface of ii-agent + ii-researcher. Treat its pyproject / package.json as the canonical lockfile of record.

| Tool | Status |
|---|---|
| OSV-Scanner against ii-commons lockfile | **deferred** |
| Transitive dep audit (ii-agent + ii-researcher consume these — must be clean) | **deferred** |
| SBOM (CycloneDX) | deferred |
| OpenSSF Scorecard | deferred |

## Security scan

Semgrep / CodeQL SAST / Gitleaks / TruffleHog / Trivy / dangerous-GHA audit — all **deferred**.

## Malware / spyware review

Same checks as ii-agent — all **deferred**. `malware_spyware_status: unknown`.

**Library-specific concerns:**
- Any embedded credentials in test fixtures (Gitleaks)
- Any vendored binaries that aren't checked into upstream (file-tree audit)
- Any post-install scripts that run on `pip install` / `npm install` (preinstall/postinstall hooks)

## Runtime / network behavior

ii-commons is a **library**, not a service. Most code runs in-process inside ii-agent / ii-researcher / FOAI adapters. Network behavior comes from the HTTP-client primitives it exposes; those should never call out on their own — only when invoked by a runtime that passes a URL.

| Check | Status |
|---|---|
| In-process import audit (any side-effects on import?) | deferred |
| Default HTTP timeout / retry behavior documented | deferred |
| Any background thread / daemon spawned by library imports | deferred |

## Data access

ii-commons sees whatever data the calling runtime hands it. **No direct data access of its own.** Trust posture inherits from the caller's NemoClaw verdict.

## Tool / API permissions

N/A — library, no tools of its own.

## Known risks

1. **Single point of failure for II stack.** A compromised ii-commons affects ii-agent AND ii-researcher simultaneously. Trust gate here is high-leverage.
2. **Transitive dep blast radius.** If ii-commons pulls a vulnerable dep, both downstream tools inherit it. SBOM + OSV-Scanner are critical.
3. **Library import side effects.** Some Python libs register signal handlers / monkey-patch on import. Verify ii-commons imports are pure.

## Required patches before promotion

- [ ] Pin specific commit hash
- [ ] Audit `__init__.py` files for import side effects
- [ ] Generate SBOM (CycloneDX) and store at `foai/integrations/ii-commons/SBOM.cdx.json`
- [ ] Confirm ii-agent + ii-researcher both pin to the same ii-commons commit (no version drift)
- [ ] Document any monkey-patches / global state mutations in INTAKE.md

## FOAI placement recommendation

`foai_owner_layer: infrastructure` — shared utility library, no runtime authority.

`authority_path: []` — libraries don't have agents reporting to them; they are consumed by agents.

## Approval status

**APPROVED_SANDBOX_ONLY** — same gate as ii-agent / ii-researcher. Promotion criteria identical, scoped to library-specific scans (SBOM, import-side-effect audit, transitive-dep clean).

## Status log

| Date | From → To | Note |
|---|---|---|
| 2026-05-14 | — → APPROVED_SANDBOX_ONLY | Retrofit scaffold (Phase 0c per Taskade integration plan). Scans deferred to Phase 4A Step-2. |
