# TRUST_REPORT — Taskade

**Component:** `taskade`
**Companion artifact:** `INTAKE.md` (this directory)
**Skill canon:** Open Source Agent Intake skill v2 (~/.claude/skills/open-source-agent-intake/SKILL.md §2 + §9)
**Schema:** Tool Registry v1.2.0 `trust` object — see `foai/registry/tools/taskade.yaml`
**Date:** 2026-05-14
**Status:** **APPROVED_SANDBOX_ONLY** — adapter / sync worker / HRPMO loop / MCP wiring may build against quarantine workspace; promotion to `APPROVED_FOR_INTAKE` requires the gate executions below.

---

## Repo identity

| Field | Value |
|---|---|
| Vendor | Taskade Inc. |
| Type | Commercial SaaS — NOT an OSS repo |
| Upstream API | `https://www.taskade.com/api/v1` (REST v1) |
| Upstream MCP shim | `https://github.com/taskade/mcp-server` → npm `@taskade/mcp-server` |
| Plan in scope | AppSumo Tier 3 Legacy LTD — owner: asg@achievemor.io |
| Organization in scope | "The Future of A.I." (default workspace = "The Future of AI") |
| Sub-workspace | "ACHIEVEMOR Lead Gen Project" |
| Existing API token | "Deploy" (created 2026-04-14, Org admin scope) |
| New API token (Phase 3) | "Sync Service" (TBD — owner mints in Taskade Settings → API) |

## Freshness

| Field | Value |
|---|---|
| `freshness_status` | **current** |
| Last platform release | MCP v2 Hosted GA — October 2025 |
| MCP shim last update | TBD (verify on npm view before pinning in Phase 4) |
| Vendor status | active, well-funded SaaS (Series A+, public roadmap) |

## License

| Field | Value |
|---|---|
| `license_status` | **approved** |
| Taskade ToS | Permits programmatic API access on AppSumo Tier 3 Legacy LTD; commercial use OK |
| `@taskade/mcp-server` package | **MIT** (verify on npm before pinning) |
| Redistribution | FOAI does not redistribute Taskade; we consume their API — license obligations are usage compliance, not redistribution |
| Genesis app cloning (Phase 8) | Each clone provisions a NEW Taskade Org under the consultancy client's account — license obligations transfer to the client, FOAI documents this in the consultancy SOW |

## Dependency health (`@taskade/mcp-server` npm package)

| Tool | Status | Notes |
|---|---|---|
| `npm view @taskade/mcp-server` | **deferred** — Phase 4 trust gate | Capture: latest version, last publish date, maintainer count, weekly downloads |
| `npm audit` against pinned version | **deferred** | Run inside quarantine container; record any CVEs |
| `npm ls --all` dep tree dump | **deferred** | Look for: unpinned transitive deps, deps with known supply-chain history (chalk / colors / etc), typo-squatted package names |
| OSV-Scanner against package-lock.json | **deferred** | Cross-check `npm audit` output |
| SBOM (CycloneDX) | **deferred** | Generate via `@cyclonedx/cyclonedx-npm` |
| OpenSSF Scorecard against github.com/taskade/mcp-server | **deferred** |

## Security scan

| Tool | Status |
|---|---|
| Semgrep / CodeQL against `@taskade/mcp-server` source (if shipped with source on GitHub) | **deferred** |
| Gitleaks / TruffleHog against published npm tarball | **deferred** |
| Trivy filesystem scan against MCP container image | **deferred** |
| Dangerous GitHub Actions in taskade/mcp-server (token scopes, secret exfil paths) | **deferred** |

## Malware / spyware review

| Check | Status |
|---|---|
| Pre/post/build install scripts in `@taskade/mcp-server` | **deferred** — explicitly inspect package.json `scripts` block |
| Obfuscated JS / minified files in tarball | **deferred** |
| `curl` / `wget` remote execution in build steps | **deferred** |
| Reverse shell / shell-exec pathways | **deferred** |
| Persistence (cron, startup, background daemon) | **deferred** — MCP server is stdio-based, no daemon expected, verify |
| Credential harvesting / keychain / clipboard / env-dump | **deferred** — outbound network observation will catch any unexpected env or file read |
| Unknown telemetry calls | **deferred** — outbound network sandbox observation |
| Typosquat check on dep names | **deferred** — `npm ls` cross-reference against known good list |

`malware_spyware_status: review_required` until quarantine sandbox observation complete.

## Runtime / network behavior (sandbox observation plan)

Container quarantine setup (Phase 1 / Phase 4 trust gate execution):

```
1. Create ephemeral Taskade workspace (NOT The Future of AI) — owner provides test workspace ID
2. Run `@taskade/mcp-server` inside Docker container with:
   - --network bridge (no FOAI Docker network access)
   - tcpdump capturing all outbound on container's veth
   - mitmproxy intercepting HTTPS (with mitmproxy cert installed in container)
   - TASKADE_API_KEY scoped to test workspace only
3. Drive MCP server through full capability surface from MCP Inspector or
   Claude Desktop owner-tier MCP client
4. Capture for 1 hour
5. Log all outbound endpoints: should be limited to *.taskade.com
   Any other outbound = FLAG, halt promotion
6. Log all DNS queries (should match outbound HTTPS)
7. Log all filesystem reads (should be limited to package files + TASKADE_API_KEY env)
8. Capture full mitmproxy session — review for unexpected payload shapes
9. Attach all logs + capture to PROOF_BUNDLE.md
```

| Check | Status |
|---|---|
| Outbound endpoint enumeration | **deferred** — sandbox run |
| Endpoint allowlist documented | **deferred** |
| Runtime permissions (file / network / device) | **deferred** |
| Background process inspection | **deferred** |

## Data access (what Taskade sees when wired)

| Data | Path | Hashed/Redacted? |
|---|---|---|
| Audit event payload | sync worker → adapter `audit_event.render_html` → Taskade project HTML | Customer UIDs SHA-256 + TASKADE_PII_SALT; agent names → role descriptors at client_tier; model/provider names NEVER passed |
| HRPMO V.I.B.E. scores | HRPMO loop → adapter `coaching_note.append` → Taskade hrpmo-cycles project | Agent names at OWNER tier (this is the HR-PMO surface — owner needs raw names); rendered for owner only, never for client_tier consumers |
| Owner Google Workspace email | SAML SSO authn flow | Standard SAML attribute — Taskade gets owner's primary email from Google |
| Coastal customer UID (existing companion integration) | `companion_taskade.py` → workspace_id mapping | Already hashed in coastal-brewing/scripts/audit_ledger.py at write-time |
| Stripe / Mercury / model credentials | **NEVER** — adapter never passes these | N/A |
| Customer-facing supplier names | **NEVER** — Coastal canon: anonymize to "specialty-grade roastery partner" | Enforced at audit-event rendering layer |

## Tool / API permissions

`Taskade_Deploy_API_Token` (existing): Org admin — can create/read/update/delete workspaces, projects, tasks, agents, automations across the entire Org.

`Taskade_Sync_Service_Token` (new, Phase 3): TBD scope:
- **If Taskade supports per-workspace tokens:** restrict to The Future of AI workspace, folder=audit-ledger-mirror only
- **If Taskade does NOT support per-workspace tokens:** full-Org scope (document this as a gap; mitigate by restricting at adapter logic — sync worker only ever writes to one folder)

Recommendation: NEVER use `Taskade_Deploy_API_Token` from the sync worker. Reserve Deploy token for explicit owner-initiated provisioning (Genesis clone factory in Phase 8). Sync worker uses Sync Service token.

## Known risks

1. **Tier 3 Legacy 0 AI credits → Taskade-native AI Agents unusable without Auto Top-Up.** Mitigation: keep all AI inside FOAI gateway (Vertex/Anthropic/OpenRouter via LiteLLM); Genesis app stub agents proxy to FOAI gateway webhooks, never use Taskade's native AI runtime. See Phase 9 of integration plan.
2. **Sacred Separation violation surface.** Taskade UI surfaces model + provider names natively (its AI Agent dropdown shows "Claude 4.6", "GPT-5.2", "Gemini 3.x"). FOAI never uses Taskade-native AI for this reason (above) — but human owner clicking through the UI MIGHT inadvertently configure a stub agent with a model name. Mitigation: Genesis manifest agents declared as "FOAI Gateway Webhook" type with no model selection in their JSON; clones inherit that structure.
3. **Default workspace cannot be changed post-config.** Owner has confirmed: "The Future of AI". Risk if owner ever wants to rename this workspace — Taskade may treat the rename as create-new-then-archive-old; verify behavior before any rename attempt.
4. **SAML cert rotation.** Google Workspace SAML signing cert has an expiry. When Google rotates, the cert pasted into Taskade SAML config becomes stale → SSO breaks. Mitigation: document the cert rotation procedure in `SAML_SSO_SETUP.md`; owner gets a Telegram reminder 60 days before cert expiry.
5. **MCP server supply-chain.** `@taskade/mcp-server` is npm-hosted. npm supply-chain incidents have happened (event-stream, ua-parser-js, etc). Pin to specific version + commit-hash check at install time; subscribe to GitHub Security Advisories for the upstream repo.
6. **Rate limits undocumented.** Taskade's REST API rate-limit policy is not in public docs as of 2026-05-14. Phase 1 trust gate measures empirically. Risk: sync worker triggering 429s under load → audit-ledger lag. Mitigation: exponential backoff + circuit breaker + Telegram alert on persistent 429.
7. **Data residency.** Owner / consultancy clients may have data-residency requirements (EU GDPR, US HIPAA). Taskade SaaS data residency policy must be reviewed before any client clone (Phase 8) onboards EU / healthcare clients. Currently no such client; flag for re-review when prospect surfaces.

## Required patches before APPROVED_FOR_INTAKE promotion

- [ ] `@taskade/mcp-server` pinned to specific version (no `^` / no `latest`)
- [ ] `npm audit` clean, OSV-Scanner clean
- [ ] Quarantine sandbox observation complete, outbound endpoint allowlist documented
- [ ] `Taskade_Sync_Service_Token` minted with smallest-possible scope; gap documented if Taskade lacks per-workspace tokens
- [ ] `TASKADE_PII_SALT` provisioned in openclaw vault (32-byte random)
- [ ] Adapter rate-limit measurement complete; sync worker backoff config tuned
- [ ] SAML cert rotation procedure documented in `SAML_SSO_SETUP.md`
- [ ] Sacred Separation grep audit clean: zero internal-name occurrences in any HTML rendered to client-tier surface
- [ ] Coastal companion integration retested against canonical token name (`TASKADE_API_KEY`) with both old `TASKADE_ACCESS_TOKEN` accepted during transition
- [ ] PROOF_BUNDLE.md populated and ACHEEVY-signed

## FOAI placement recommendation

`foai_owner_layer: infrastructure` — Taskade is substrate, not an agent.

`authority_path: ["ACHEEVY", "Chicken Hawk", "taskade_sync_worker"]` for the primary sync path; alternate paths exist for HRPMO (`ACHEEVY → Betty-Anne_Ang → taskade-adapter`) and owner-tier MCP (`owner → Chicken Hawk MCP → taskade`).

## Approval status

**APPROVED_SANDBOX_ONLY** as of 2026-05-14. Promotion to `APPROVED_FOR_INTAKE` requires all "Required patches" boxes above checked.

## Status log

| Date | From → To | Note |
|---|---|---|
| 2026-05-14 | — → APPROVED_SANDBOX_ONLY | Initial intake (PR β, Phase 1 of Taskade integration plan). Adapter / sync worker / HRPMO loop / MCP wiring may proceed against quarantine workspace. Production promotion gated on Required patches checklist. |
