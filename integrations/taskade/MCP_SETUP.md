# MCP_SETUP — Taskade MCP server wiring

Phase 7 of the Taskade integration plan. Wires the upstream `@taskade/mcp-server` npm package into the Chicken Hawk gateway's MCP registry (`foai/chicken-hawk/gateway/mcp-servers.json`) so owner-tier sessions can reach Taskade through MCP rather than only REST.

**Companion artifacts:**
- `INTAKE.md` (this directory) — section 11 covers MCP-specific security controls
- `TRUST_REPORT.md` (this directory) — `@taskade/mcp-server` dependency audit + outbound network observation lives here
- `mcp-servers.json` at `foai/chicken-hawk/gateway/` — the registry entry

**Status:** scaffolded. Production enablement gated on the sandbox observation below.

---

## Why this matters

MCP exposes Taskade as a typed-tool surface that owner-tier callers (the FOAI owner via Claude Desktop / Cursor / Chicken Hawk owner-session UI) can invoke directly without going through the REST adapter. The REST adapter is still the primary path for service-to-service calls (sync worker, HRPMO loop, Coastal companion); MCP is the owner-convenience path.

Sacred Separation: MCP exposure is **owner-tier only**. Public `/api/public/chat` MUST NOT route to any MCP server. This is enforced at three layers:
1. Chicken Hawk gateway access-tier canon (per `~/foai/chicken-hawk/CLAUDE.md`)
2. `mcp-servers.json._routing_rules.public_chat.mcp_enabled: false`
3. Router unit test that any anonymous-session MCP attempt returns 403

## Quarantine sandbox observation (BEFORE production enablement)

```
Container: ephemeral, no FOAI Docker network access (--network=bridge or none)
Token:     ephemeral test Taskade workspace token (NOT The Future of AI scope)
Duration:  60 minutes of synthetic capability drive
Observers: tcpdump on container veth + mitmproxy intercept of HTTPS + filesystem
           access trace (strace -f -e trace=open,openat,read,write)
Drive:     synthetic MCP Inspector or Claude Desktop owner-tier MCP client
           hitting every documented capability at least once
```

Acceptance criteria for `APPROVED_FOR_INTAKE` promotion:

- [ ] **Outbound network** — all DNS lookups + HTTPS endpoints must terminate at `*.taskade.com` only. Any other outbound = halt and document in `TRUST_REPORT.md §runtime/network`.
- [ ] **Filesystem reads** — limited to package files + `TASKADE_API_KEY` env. No reads outside `/usr/local/lib/node_modules/`, `/tmp/`, or the current working dir. No reads of `/etc/passwd`, `/etc/hostname`, `/proc/*`, browser profiles, or keychains.
- [ ] **Filesystem writes** — limited to `/tmp/` and the npx cache. No writes elsewhere.
- [ ] **Background processes** — none persistent. Container shutdown should be immediate when `kill` is sent; no orphaned children.
- [ ] **CPU + memory** — no unexpected spikes during idle. Memory growth bounded.
- [ ] **mitmproxy payload review** — every outbound request body sampled. No leakage of FOAI secrets beyond `TASKADE_API_KEY` (no env-dump pattern, no `os.environ` exfil).
- [ ] **Dependency tree** — `npm ls --all` output captured. Any unfamiliar dep is researched (typosquat check). All deps pin to specific versions.
- [ ] **Audit clean** — `npm audit` returns 0 critical, 0 high vulnerabilities at pinned version.

If ANY box above fails: `trust.status` stays `APPROVED_SANDBOX_ONLY`. Document the failure in `TRUST_REPORT.md` and escalate to owner via Telegram before any production enablement.

## Pin version (before production)

Edit `foai/chicken-hawk/gateway/mcp-servers.json` and replace `"@taskade/mcp-server@latest"` with a specific version like `"@taskade/mcp-server@1.2.3"`. Capture the version-pin commit hash in `PROOF_BUNDLE.md §1`.

## Token canon

Per Phase 3 of the integration plan:
- Stored in openclaw vault as `Taskade_Sync_Service_Token` (MixedCase)
- Passed to MCP server container as `TASKADE_API_KEY` (UPPERCASE)
- Scope: service-account, restricted to The Future of AI workspace if Taskade supports per-workspace tokens; document the gap in `TRUST_REPORT.md` if not

## Wiring into Chicken Hawk gateway

The gateway must load `mcp-servers.json` at startup, register each server with the MCP runtime, and gate invocation by session tier (owner-tier only). Implementation hooks (not in this PR):

- `foai/chicken-hawk/gateway/mcp_loader.py` — parses `mcp-servers.json`, spawns subprocesses for each `mcpServers.<name>` entry.
- `foai/chicken-hawk/gateway/router.py` — add `mcp_dispatch(tool_name, params, session)` that checks session tier before forwarding.
- `foai/chicken-hawk/gateway/main.py` — wire a new route `POST /api/owner/mcp/{server}/{capability}` with `require_owner` dependency.

Those hooks are deferred to a follow-on PR — this PR only ships the canonical config + setup doc + sandbox observation plan.

## Tests (forthcoming with the wiring PR)

- `tests/test_mcp_loader.py` — parses the config, validates schema, refuses to start with `latest` pin in production env
- `tests/test_router_mcp_dispatch.py` — owner-tier session reaches the MCP path; anonymous session returns 403
- `tests/test_mcp_sandbox_observation.py` — runs `@taskade/mcp-server` in subprocess + verifies outbound DNS allowlist (integration test, owner-runnable)

## Quick reference

| Question | Answer |
|---|---|
| Can I run this in production today? | No — sandbox observation must complete + version must be pinned + token must be minted. |
| Can I run it in dev / sandbox? | Yes — the JSON config supports `@taskade/mcp-server@latest` and the gateway loader (forthcoming) treats sandbox as the default mode. |
| Will public callers ever see Taskade through MCP? | No. Access-tier canon enforces owner-tier-only at three layers. |
| What happens if the MCP server crashes mid-session? | Subprocess restart with exponential backoff. Chicken Hawk router falls back to REST adapter for the same capability. |
| What if `@taskade/mcp-server` rotates breaking changes? | Pinned version protects us. Owner gets Telegram alert when a new version diverges in capability shape via the freshness-watch job (separate cadence). |
