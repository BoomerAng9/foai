# PROOF_BUNDLE — Taskade

**Component:** `taskade`
**Skill canon:** Open Source Agent Intake skill v2 §9
**Companion:** `INTAKE.md`, `TRUST_REPORT.md`, `SAML_SSO_SETUP.md`
**Date opened:** 2026-05-14
**Status:** **scaffold only** — populated incrementally by Phases 4-7 of the Taskade integration plan.

---

This bundle accumulates the evidence required for the Taskade integration to advance from `APPROVED_SANDBOX_ONLY` → `APPROVED_FOR_INTAKE`. Each section is populated by the PR that produces the evidence.

## §1. Install log (Phase 4)

**Adapter service install:**
- [ ] `pip install -r foai/integrations/taskade/adapter/requirements.txt` clean output (capture in `evidence/adapter-install.log`)
- [ ] `docker build -t taskade-adapter:0.1.0 foai/integrations/taskade/adapter/` clean output
- [ ] `docker-compose up taskade-adapter` brings the service up healthy

**MCP server install (Phase 7):**
- [ ] `npm install -g @taskade/mcp-server@<pinned-version>` clean
- [ ] `npm audit` clean
- [ ] `npm ls --all` dep tree captured in `evidence/mcp-deps.txt`

## §2. Environment template (secrets redacted)

```
# foai/integrations/taskade/adapter/.env.example
TASKADE_API_KEY=<REDACTED_FROM_OPENCLAW:Taskade_Deploy_API_Token>
TASKADE_SYNC_TOKEN=<REDACTED_FROM_OPENCLAW:Taskade_Sync_Service_Token>
TASKADE_PII_SALT=<REDACTED_32_BYTES_RANDOM>
TASKADE_API_BASE=https://www.taskade.com/api/v1
TASKADE_DEFAULT_WORKSPACE_ID=<REDACTED>  # The Future of AI workspace ID
TASKADE_AUDIT_LEDGER_FOLDER_ID=<REDACTED>  # audit-ledger-mirror folder ID
TASKADE_HRPMO_FOLDER_ID=<REDACTED>  # hrpmo-cycles folder ID
ADAPTER_PORT=8000
LOG_LEVEL=info
SACRED_SEPARATION_SURFACE_DEFAULT=client_tier  # forces redaction by default
```

## §3. Service start command (Phase 4)

```bash
# Local dev
cd foai/integrations/taskade/adapter
uvicorn main:app --host 0.0.0.0 --port 8000

# Production (myclaw-vps Chicken Hawk Docker network)
docker compose -f /docker/chicken-hawk/docker-compose.yml up -d taskade-adapter
```

## §4. Exposed URLs

- Adapter: `http://taskade-adapter:8000` (Chicken Hawk Docker network only, no Traefik route)
- Taskade UI: `https://www.taskade.com/login?org=the-future-of-ai` (SAML SSO via Google Workspace)

## §5. Healthcheck (Phase 4 — to be captured)

Expected on populated bundle:

```
$ curl http://taskade-adapter:8000/health
{
  "ok": true,
  "taskade_api_reachable": true,
  "last_invoke_at": "2026-05-14T15:32:11Z",
  "version": "0.1.0",
  "trust_status": "APPROVED_SANDBOX_ONLY"
}
```

## §6. Sample invocation (Phase 4 — to be captured)

Expected on populated bundle:

```
$ curl -X POST http://taskade-adapter:8000/invoke \
    -H 'Content-Type: application/json' \
    -d '{"capability": "workspace.list", "params": {}}'

{
  "ok": true,
  "capability": "workspace.list",
  "result": {
    "workspaces": [
      {"id": "<wsid_1>", "name": "The Future of AI", "is_default": true},
      {"id": "<wsid_2>", "name": "ACHIEVEMOR Lead Gen Project", "is_default": false}
    ]
  }
}
```

## §7. Router registration diff (Phase 4 — to be captured)

Diff against `foai/chicken-hawk/gateway/router.py` showing `"taskade"` added to capability-match allow-list.

## §8. Freshness report (Phase 1 trust gate — to be captured)

To be filled with: last `@taskade/mcp-server` publish date, last GitHub commit date, maintainer count, weekly downloads, open critical issues, time since last release.

## §9. Trust report (this file's sibling)

See `TRUST_REPORT.md`. Status as of 2026-05-14: `APPROVED_SANDBOX_ONLY`.

## §10. Malware / spyware review (Phase 1 trust gate — to be captured)

To be filled with: package.json `scripts` block contents, dependency-tree pre/post-install hook audit, obfuscated-content sweep result, dangerous-GHA audit result.

## §11. Dependency / security scan output (Phase 1 trust gate — to be captured)

To be filled with:
- `npm audit` output
- OSV-Scanner output
- Semgrep / CodeQL output if applicable (`@taskade/mcp-server` source is on GitHub)
- Trivy filesystem scan on the MCP container image
- Gitleaks / TruffleHog scan on the published npm tarball

## §12. Secret scan output (Phase 1 — to be captured)

Per FOAI canon: zero secrets committed; all tokens via openclaw vault. Confirmed by:
- `git log --all --full-history -- '*.env' '*.key' '*.pem' '*.token'` clean
- Gitleaks against entire branch clean

## §13. SBOM path (Phase 1 — to be captured)

CycloneDX JSON at `foai/integrations/taskade/SBOM.cdx.json` once Phase 1 trust gate runs `@cyclonedx/cyclonedx-npm`.

## §14. Negative tests (Phase 4 — to be captured)

- [ ] Unauthorized adapter call (no bearer token in `/invoke`) → 401
- [ ] Malformed input (missing `capability` field) → 422
- [ ] Capability not in registry → 404 with `unknown_capability` error
- [ ] Timeout (mock Taskade API hang) → 504 with `taskade_upstream_timeout` error
- [ ] Cancel after start → job state transitions to `cancelled_by_caller`
- [ ] Sync worker tries to write to a project outside `audit-ledger-mirror` folder → 403 (scope violation, alerted to Telegram)
- [ ] Prompt-injection payload in `audit_event.render_html` (e.g. `<script>alert(1)</script>` in payload text) → sanitized to `&lt;script&gt;...&lt;/script&gt;` in rendered HTML

## §15. Rollback notes

Per phase:

- **Phase 0 (this PR α and PR β):** Pure docs + schema bump. Rollback = revert PRs. No runtime impact.
- **Phase 4 (adapter):** `docker-compose stop taskade-adapter` removes the service. Chicken Hawk router falls back to `enabled: false` registry entry and won't dispatch. Coastal companion integration unaffected (independent code path).
- **Phase 5 (sync worker):** `docker-compose stop taskade-sync-worker` halts new writes. `foai.audit_ledger.synced_to_taskade_at` stays as-is; on restart, worker resumes from where it stopped (idempotent).
- **Phase 6 (HRPMO loop):** `docker-compose stop hrpmo-loop` halts cycle scheduling. In-flight Taskade Approve/Reject buttons stay valid; Chicken Hawk webhook still processes them. Next cycle simply doesn't fire.
- **Phase 7 (MCP):** Remove `"taskade"` entry from `mcp-servers.json`, restart Chicken Hawk gateway. Adapter unaffected.
- **Phase 8 (Genesis clone factory):** Per-client clones are isolated by design — rolling back the factory does not affect any already-provisioned client Orgs. Owner can manually revoke client tokens via Taskade if needed.

## §16. ACHEEVY sign-off

To be appended once §1-15 are populated:

```
Reviewed: <date>
Signatory: ACHEEVY
Verdict: <APPROVED_FOR_INTAKE | NEEDS_PATCHING | BLOCKED>
Telegram receipt: <message_id from owner-channel>
Notes: <free text>
```
