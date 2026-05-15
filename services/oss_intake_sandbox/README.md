# OSS Intake quarantine sandbox CLI — Phase 4A Step-2 enablement (#91)

Reusable CLI that runs the **v2 Open Source Agent Intake skill** trust gate against a candidate OSS repo. Promotes a tool from `APPROVED_SANDBOX_ONLY` toward `APPROVED_FOR_INTAKE` by capturing the freshness audit, license, dependency vulnerabilities, secrets, SAST findings, filesystem vulns, and malware-pattern matches into the tool's `PROOF_BUNDLE.md`.

**Coastal-safe by topology** — no FOAI Docker network access, no openclaw vault, no Coastal credentials. Runs in any sandbox the owner chooses (gh Codespaces / local Docker / Vast.ai). Per memory `feedback_secure_coastal_in_all_ways_during_foai_work_2026_05_15`.

## Quick start

```bash
# From foai/ repo root:
PYTHONPATH=. python -m services.oss_intake_sandbox.run \
    --repo https://github.com/Intelligent-Internet/II-Commons \
    --commit <pinned-sha> \
    --tool-name ii-commons \
    --out ./.tmp/ii-commons-scan
```

Expected output:
- `./.tmp/ii-commons-scan/clone/` — shallow clone of the upstream repo at the pinned commit
- `./.tmp/ii-commons-scan/scans/` — `osv-scanner.json`, `gitleaks.json`, `sbom.cdx.json`, `semgrep.json`, `trivy.json`, `malware-pattern.json`
- `./.tmp/ii-commons-scan/summary.json` — overall structured summary
- `foai/integrations/ii-commons/PROOF_BUNDLE.md` — appended with a new dated run block

Exit code:
- `0` — all scans `pass` or `skipped`; safe to review for promotion
- `1` — at least one scan reported findings; manual review required
- `2` — at least one scan errored OR PROOF_BUNDLE.md missing

## Owner-blocking setup (one-time, per host)

The CLI invokes 5 external scan tools via subprocess. Each missing tool reports `skipped` in the run (the CLI does not fail). For a clean `APPROVED_FOR_INTAKE` promotion the v2 skill recommends at least OSV-Scanner + Gitleaks + syft all green.

### Install scan tools

| Tool | Install (macOS) | Install (Linux/WSL) | Install (Windows) |
|---|---|---|---|
| OSV-Scanner | `brew install osv-scanner` | `go install github.com/google/osv-scanner/cmd/osv-scanner@latest` | `scoop install osv-scanner` |
| Gitleaks | `brew install gitleaks` | `gh release download -R gitleaks/gitleaks` then unpack | `scoop install gitleaks` |
| syft (SBOM) | `brew install syft` | `curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh \| sh -s` | `scoop install syft` |
| Semgrep (optional, SAST) | `pipx install semgrep` | `pipx install semgrep` | `pipx install semgrep` |
| Trivy (optional, FS scan) | `brew install trivy` | `gh release download -R aquasecurity/trivy` then unpack | `scoop install trivy` |

Plus required:
- `git` (for clone)
- `gh` CLI authenticated (`gh auth status` returns logged in) — for freshness audit

### Install Python deps

```bash
pip install -r services/oss_intake_sandbox/requirements.txt
```

(Only `pytest` is in requirements; the runtime is dependency-free Python stdlib + subprocess invocations.)

## Per-tool reference invocations

```bash
# ii-commons (library — lightest; start here)
PYTHONPATH=. python -m services.oss_intake_sandbox.run \
    --repo https://github.com/Intelligent-Internet/II-Commons \
    --commit <pinned-sha> \
    --tool-name ii-commons \
    --out ./.tmp/ii-commons-scan

# ii-agent (runtime — multi-step agent loop)
PYTHONPATH=. python -m services.oss_intake_sandbox.run \
    --repo https://github.com/Intelligent-Internet/ii-agent \
    --commit <pinned-sha> \
    --tool-name ii-agent \
    --out ./.tmp/ii-agent-scan

# ii-researcher (search-driven research agent)
PYTHONPATH=. python -m services.oss_intake_sandbox.run \
    --repo https://github.com/Intelligent-Internet/ii-researcher \
    --commit <pinned-sha> \
    --tool-name ii-researcher \
    --out ./.tmp/ii-researcher-scan

# common-ground-core — DEFERRED (STEP-2 BLOCKER per
# foai/integrations/common-ground-core/TRUST_REPORT.md). Owner must
# confirm source identity before running this CLI against it.
```

## What this CLI does NOT do

- Does NOT execute the **1-hour synthetic capability drive** (the v2 skill §runtime/network observation step). That needs `tcpdump` + `mitmproxy` + manual MCP capability invocation against the running tool — owner-runnable, separate from this CLI
- Does NOT auto-promote `APPROVED_SANDBOX_ONLY → APPROVED_FOR_INTAKE`. After this CLI runs, owner reviews the PROOF_BUNDLE.md, signs off via ACHEEVY, and updates the TRUST_REPORT.md status manually
- Does NOT install missing scan tools (gracefully reports `skipped` instead)
- Does NOT touch the candidate tool's repo (read-only clone)
- Does NOT touch Coastal infrastructure

## Tests

```bash
# From foai/ repo root
PYTHONPATH=. pytest services/oss_intake_sandbox/tests/ -v
```

19 pytest cases:
- Scan wrappers: tool-not-installed → `skipped` (5 cases), happy-path pass (2 cases), findings detected (2 cases), error path (1 case), `run_all_scans` dispatch (1 case)
- Malware pattern scan: clean (1), catches curl-pipe-sh (1), catches preinstall script (1), skips `node_modules` (1)
- PROOF_BUNDLE.md: append a run block (1), idempotent replace by run_id (1), distinct run_ids stack (1), error when bundle missing (1)

## Architecture

```
run.py (CLI entry)
   ├── freshness.audit_repo(repo_url)        → FreshnessReport (gh api)
   ├── _clone_repo(repo, commit, dest)       → shallow clone + checkout
   ├── scans.run_all_scans(clone, out_dir)   → {scan_name: ScanResult}
   │     ├── run_osv_scanner   (deps)
   │     ├── run_gitleaks      (secrets)
   │     ├── run_syft          (SBOM)
   │     ├── run_semgrep       (SAST)
   │     ├── run_trivy         (FS vulns)
   │     └── run_malware_pattern_scan  (always runs — regex sweep)
   ├── proof_bundle.append_run_to_bundle(...)→ writes block to PROOF_BUNDLE.md
   └── summary.json                          → for downstream consumers
```

## Verification (FOAI internal)

After this PR merges + owner runs the CLI:

1. PROOF_BUNDLE.md for the target tool gains a new run block with freshness + 6 scan results
2. TRUST_REPORT.md is candidate for `APPROVED_FOR_INTAKE` if all required scans green
3. If any scan errors or finds high-severity issues → halt; review per the v2 skill anti-pattern guard

## Related canon

- Skill: `~/.claude/skills/open-source-agent-intake/SKILL.md` (v2, refreshed 2026-05-14 from owner's Agentic Organization.zip)
- Schema: `foai/registry/schemas/tool-registry-entry.yaml` v1.2.0 — `trust` object format
- Memory: `feedback_secure_coastal_in_all_ways_during_foai_work_2026_05_15` — Coastal Protection (this CLI is Coastal-safe by topology)
- Memory: `feedback_thesys_openclaw_os_is_reference_not_adoption_2026_05_14` — reference-not-adoption posture
- Memory: `feedback_warehouse_listings_are_not_canon_2026_05_14` — discipline: don't assert canon without scan evidence
