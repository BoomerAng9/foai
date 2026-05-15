# TRUST_REPORT — ii-researcher

**Component:** `ii-researcher`
**Companion artifact:** `INTAKE.md` (this directory)
**Skill canon:** Open Source Agent Intake skill v2 (~/.claude/skills/open-source-agent-intake/SKILL.md §2 + §9)
**Schema:** Tool Registry v1.2.0 `trust` object — see `foai/registry/tools/ii-researcher.yaml` (forthcoming retrofit)
**Date:** 2026-05-14
**Status:** **APPROVED_SANDBOX_ONLY** — quarantine-eligible; promotion to APPROVED_FOR_INTAKE requires the scan executions below.

---

## Repo identity

| Field | Value |
|---|---|
| Upstream | `github.com/Intelligent-Internet/ii-researcher` |
| Branch / tag inspected | `main` (TBD — pin specific tag before clone) |
| Commit hash | **deferred** — captured at clone time in Phase 4A Step-2 |
| License | Apache 2.0 (per upstream README — verify on clone) |
| Upstream org | Intelligent Internet (II) |
| Fork status | Not yet forked; clone-only inspection during quarantine |

## Freshness

`freshness_status: unknown` — all rows deferred until clone (last commit, last release, maintainer activity, CI status, unresolved critical issues).

## License

`license_status: approved` (Apache 2.0 — re-confirm on clone.)

## Dependency health

OSV-Scanner / pip-audit / SBOM (CycloneDX) / OpenSSF Scorecard — all **deferred**, sandbox not yet stood up.

## Security scan

Semgrep / CodeQL SAST / Gitleaks / TruffleHog / Trivy / dangerous-GHA audit — all **deferred**.

## Malware / spyware review

Pre/post/build script inspection / obfuscated payloads / curl-pipe / reverse shells / persistence / credential harvesting / unknown telemetry / typosquat / unpinned deps — all **deferred**. `malware_spyware_status: unknown`.

## Runtime / network behavior

ii-researcher does **outbound web search + content retrieval** by design — outbound network is its operating mode, not anomalous. Sandbox observation must distinguish: (a) intended search-API outbound calls, (b) intended retrieval to URLs in the user's research target list, (c) anything else (which is anomalous and must be flagged).

| Check | Status |
|---|---|
| Outbound network log (1h sandbox run with seeded research target) | deferred |
| Search-API endpoint allowlist (which providers it calls) | deferred — must enumerate before promotion |
| Retrieval URL filter (any allowlist/blocklist hooks) | deferred |
| Runtime permissions enumerated | deferred |
| Data access scope | deferred |

## Data access (what ii-researcher sees when wrapped)

- Search-provider API keys via OpenRouter or direct provider (Brave / Tavily / Serper / Perplexity — TBD per upstream defaults)
- Research target URLs (job-scoped, not persistent)
- Retrieval cache (ephemeral per sandbox; promote to ReMe overlay only after intake)
- **No direct access** to: customer PII, financial credentials, supplier names (Sacred Separation in any rendered output)

## Tool / API permissions

- Adapter MUST hash any customer-facing identifier before passing to ii-researcher search inputs (avoid customer-data leak to third-party search providers)
- Search-provider rate-limit and cost-per-query must be wired through NemoClaw `risk_limits.cost_per_query_cents` before allowing autonomous loops

## Known risks

1. **Third-party data egress** — every search query leaves the FOAI perimeter and lands at the search provider. Hash + redact customer identifiers BEFORE query construction.
2. **Retrieved-content prompt injection** — adversarial pages in the retrieval target can attempt prompt injection. Mitigation: retrieved content treated as data not instruction; system-prompt hardening at the wrapping ACHEEVY/Boomer_Ang layer.
3. **Cost runaway** — multi-iteration research loops can multiply API spend. Mitigation: `cost_per_query_cents` + `max_queries_per_loop` caps wired into adapter `risk_limits`.
4. **Search-provider terms-of-service** — must verify each search provider's ToS permits programmatic agent use (some providers ban autonomous agents on certain tiers).

## Required patches before promotion

- [ ] Pin specific commit hash
- [ ] Wire customer-identifier hasher at adapter input
- [ ] Wire NemoClaw `cost_per_query_cents` cap
- [ ] Wire NemoClaw `max_queries_per_loop` cap
- [ ] Verify search-provider ToS for each enabled provider
- [ ] Wire audit-ledger writer (per-query logging to `foai.audit_ledger` with hashed inputs)
- [ ] Disable upstream's default web-UI exposure; expose adapter only on internal Docker network

## FOAI placement recommendation

`foai_owner_layer: infrastructure` — research engine consumed by AutoResearch + Hermes Deep Think + Betty-Anne_Ang's HRPMO coaching loop. Not a standalone agent.

`authority_path: ["ACHEEVY", "Chicken Hawk", "research_lil_hawk"]`

## Approval status

**APPROVED_SANDBOX_ONLY** — same gate as ii-agent. Promotion to `APPROVED_FOR_INTAKE` requires:

1. All "deferred" rows resolved
2. Customer-identifier hasher live + tested
3. Search-provider ToS verified
4. Cost cap + query cap wired
5. PROOF_BUNDLE.md populated
6. ACHEEVY sign-off

## Status log

| Date | From → To | Note |
|---|---|---|
| 2026-05-14 | — → APPROVED_SANDBOX_ONLY | Retrofit scaffold (Phase 0c per Taskade integration plan). Scans deferred to Phase 4A Step-2. |
