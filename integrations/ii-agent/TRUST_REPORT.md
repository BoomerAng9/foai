# TRUST_REPORT — ii-agent

**Component:** `ii-agent`
**Companion artifact:** `INTAKE.md` (this directory)
**Skill canon:** Open Source Agent Intake skill v2 (~/.claude/skills/open-source-agent-intake/SKILL.md §2 + §9)
**Schema:** Tool Registry v1.2.0 `trust` object — see `foai/registry/tools/ii-agent.yaml` (forthcoming retrofit)
**Date:** 2026-05-14
**Status:** **APPROVED_SANDBOX_ONLY** — quarantine-eligible; promotion to APPROVED_FOR_INTAKE requires the scan executions below.

---

## Repo identity

| Field | Value |
|---|---|
| Upstream | `github.com/Intelligent-Internet/ii-agent` |
| Branch / tag inspected | `main` (TBD — pin specific tag before clone) |
| Commit hash | **deferred** — captured at clone time in Phase 4A Step-2 |
| License | Apache 2.0 (per upstream README — verify on clone) |
| Upstream org | Intelligent Internet (II) — same org behind ii-researcher, II-Commons |
| Fork status | Not yet forked; clone-only inspection during quarantine |

## Freshness

| Field | Value |
|---|---|
| `freshness_status` | **unknown** — captured at clone time |
| Last commit date | deferred |
| Last release | deferred |
| Maintainer activity | deferred |
| CI status (upstream) | deferred |
| Unresolved critical issues | deferred |

## License

`license_status: approved` (Apache 2.0 is on FOAI's allowlist for embedded reuse + forked adaptation. Re-confirm on clone in case upstream relicensed.)

## Dependency health

| Tool | Status |
|---|---|
| OSV-Scanner against `requirements.txt` / `pyproject.toml` / lockfile | **deferred** — sandbox not yet stood up |
| `pip-audit` | deferred |
| SBOM (CycloneDX) | deferred — SBOM generation pending CI scaffold |
| OpenSSF Scorecard | deferred |

## Security scan

| Tool | Status |
|---|---|
| Semgrep / CodeQL SAST | deferred |
| Gitleaks / TruffleHog secret scan | deferred |
| Trivy container/filesystem scan | deferred |
| Dangerous GitHub Actions audit | deferred |

## Malware / spyware review

| Check | Status |
|---|---|
| Pre/post/build install scripts inspection | deferred |
| Obfuscated JS / encoded payloads / unexpected binaries | deferred |
| curl/wget remote execution patterns | deferred |
| Reverse shell / command execution pathways | deferred |
| Persistence (cron, startup, background daemons) | deferred |
| Credential harvesting / keychain / clipboard / env-dump | deferred |
| Unknown telemetry or outbound calls | deferred |
| Typosquatting / dependency confusion / unpinned deps | deferred |

`malware_spyware_status: unknown` until quarantine sandbox observation completes.

## Runtime / network behavior (sandbox observation)

| Check | Status |
|---|---|
| Outbound network log (tcpdump / mitmproxy, 1h sandbox run) | deferred |
| Endpoint allowlist documented | deferred |
| Runtime permissions enumerated (file / network / device) | deferred |
| Data access scope (what files / env vars / secrets read) | deferred |

## Data access (what ii-agent sees when wrapped)

- Model API keys via OpenRouter (`OPENROUTER_API_KEY`) per OpenRouter-only canon — passed by adapter, not committed
- FOAI tool registry entries (read-only at runtime via adapter)
- Per-mission tool inputs from Chicken Hawk dispatch (job-scoped, not persistent)
- ReMe overlay (long-term memory) — namespaced per agent persona at adapter boundary
- **No direct access** to: Coastal SQLite audit_ledger, openclaw vault, customer PII, Stripe/Mercury tokens

## Tool / API permissions

- ii-agent has **its own tool registry** internally. FOAI adapter MUST restrict the runtime tool surface to only those tools FOAI explicitly enables per mission (`allowed_tools` from the calling agent's Operating Card). Default-deny on tools not in the FOAI registry.

## Known risks

1. **Multi-tool agent loop with model-driven dispatch** = inherent prompt-injection surface. Mitigation: NemoClaw verdict gate on every external action; sandbox runtime; least-privilege model credentials.
2. **Plan-execute loop can spawn arbitrary tool chains.** Mitigation: max-runtime cap (`timeout_seconds: 600`, `max_runtime_seconds: 1800`); cost cap from `risk_limits`; mandatory audit-ledger write per loop iteration.
3. **Upstream maintenance velocity unknown.** If `freshness_status` resolves to `stale` or `abandoned`, recommend forking + pinning a verified commit before any production use.

## Required patches before promotion

- [ ] Pin specific commit hash (no `main` tracking after intake)
- [ ] Wire FOAI tool registry as ii-agent's tool source (deny ii-agent's built-in tools at adapter boundary)
- [ ] Wire NemoClaw verdict middleware between agent loop and every tool invocation
- [ ] Wire audit-ledger writer (per-iteration logging to `foai.audit_ledger`)
- [ ] Disable any built-in scheduler / cron / autonomous mode (FOAI scheduler is canonical)

## FOAI placement recommendation

`foai_owner_layer: infrastructure` — ii-agent is the runtime engine behind ACHEEVY's executive loop and the callable agent-loop tool exposed to Chicken Hawk. It is not itself an agent; it is the engine FOAI agents run on.

`authority_path: ["ACHEEVY"]` for executive-engine role; `["ACHEEVY", "Chicken Hawk"]` for callable-tool role.

## Approval status

**APPROVED_SANDBOX_ONLY** — quarantine clone + scan sweep is Phase 4A Step-2 of the OSS intake plan (#91). Promotion to `APPROVED_FOR_INTAKE` requires:

1. All "deferred" rows above resolved with executed scan output
2. Adapter built per v2 skill §6 (GET /health, POST /invoke, POST /jobs, GET /jobs/:id, POST /jobs/:id/cancel)
3. PROOF_BUNDLE.md populated with sandbox URL, healthcheck output, sample invoke output, scan reports
4. ACHEEVY sign-off on the proof bundle

## Status log

| Date | From → To | Note |
|---|---|---|
| 2026-05-14 | — → APPROVED_SANDBOX_ONLY | Retrofit scaffold (Phase 0c per Taskade integration plan). Scans deferred to Phase 4A Step-2. |
