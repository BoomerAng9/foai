# INTAKE — Taskade (The Future of A.I. Organization)

**Component:** `taskade`
**Source:** Taskade Inc. (commercial SaaS) — REST API v1 + `@taskade/mcp-server` (MIT)
**FOAI Owner Layer:** `infrastructure`
**Authority Path:** ACHEEVY → Chicken Hawk → taskade_sync_worker
**Status:** intake_complete (Step 1 of v2 intake workflow; pre-adapter)
**Companion:** `TRUST_REPORT.md` (this directory), `foai/registry/tools/taskade.yaml`
**Date:** 2026-05-14

---

## 1. Technical intent

Promote Taskade from a Coastal-Brewing-only integration (`coastal-brewing/scripts/companion_taskade.py`) to a FOAI-level infrastructure tool that powers:

1. **The wiki / HTML mirror of `foai.audit_ledger`** (Neon Postgres → Taskade projects in workspace "The Future of AI" / folder `audit-ledger-mirror`). Every audit event surfaces as a date-bucketed daily project with renderable HTML.
2. **The HRPMO cycle artifact surface** for Betty-Anne_Ang's weekly performance reviews + AutoResearch-authored coaching skill-recipes. Lives in folder `hrpmo-cycles`, project `cycle-<YYYY-WW>`. Native Taskade Approve/Reject actions trigger Chicken Hawk webhooks.
3. **The consultancy CRM surface** — workspaces map to client pipelines (ACHIEVEMOR Lead Gen Project + future per-client Genesis clones).
4. **The white-label deployment template** — a canonical Org structure that can be cloned to a fresh Taskade Organization per consultancy client (Phase 8 of the integration plan).

Side-effect level is `external_actions` — Taskade is SaaS, mutates external workspace state. The Coastal companion integration that already runs in production is preserved and migrates to the canonical token name (`TASKADE_API_KEY`) as part of Phase 3.

## 2. FOAI placement

`foai_owner_layer: infrastructure`. Taskade is the substrate behind the audit-ledger mirror + HRPMO surface + consultancy CRM. It is not itself an agent; Boomer_Angs and Lil_Hawks consume it via the adapter.

| Layer | Reachable via | Authority chain |
|---|---|---|
| Sync worker (Phase 5) | docker network → taskade-adapter:8000 | ACHEEVY → Chicken Hawk → taskade_sync_worker |
| HRPMO loop (Phase 6) | docker network → taskade-adapter:8000 | ACHEEVY → Betty-Anne_Ang (Boomer_Ang) → adapter |
| Owner-tier MCP (Phase 7) | Claude Desktop / Cursor / Chicken Hawk gateway MCP route | owner-tier session only |
| Coastal companion (existing) | direct REST `https://www.taskade.com/api/v1` | passthrough — pre-existing, not adapter-routed |

## 3. Trust + freshness gate

See `TRUST_REPORT.md`. TL;DR: `APPROVED_SANDBOX_ONLY` pending `@taskade/mcp-server` dependency audit + outbound-network sandbox observation. License OK (Taskade ToS for AppSumo Tier 3 Legacy + MIT for MCP shim). Freshness `current` (active SaaS).

## 4. Target architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Taskade SaaS — The Future of A.I. Organization                      │
│  Default workspace: "The Future of AI" (canon, NOT changeable)       │
│  Sub-workspace: "ACHIEVEMOR Lead Gen Project" (lead pipeline)        │
│  SAML SSO: Google Workspace IDP (achievemor.io)                      │
└──────────────────────────────────────────────────────────────────────┘
                                ▲
                         REST v1 / MCP v2
                                │
┌──────────────────────────────────────────────────────────────────────┐
│  foai/integrations/taskade/adapter/  (FastAPI, Phase 4)              │
│  GET /health · POST /invoke · POST /jobs · GET /jobs/:id · cancel    │
│  Capability registry: workspace.* / project.* / task.* /             │
│                       audit_event.render_html / coaching_note.append │
└──────────────────────────────────────────────────────────────────────┘
                                ▲
            ┌───────────────────┼───────────────────┐
            │                   │                   │
┌───────────┴────────┐ ┌────────┴─────────┐ ┌───────┴─────────┐
│ taskade-sync-worker│ │  HRPMO loop      │ │ Chicken Hawk    │
│ (Phase 5, Track C) │ │  (Phase 6, Track D)│ │ MCP route       │
│ reads foai.audit_  │ │  Betty-Anne_Ang   │ │ (Phase 7,       │
│ ledger every 5min  │ │  weekly cycle     │ │  owner-tier)    │
└────────────────────┘ └───────────────────┘ └─────────────────┘
            │                   │
            └───────┬───────────┘
                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Neon Postgres — foai.audit_ledger + foai.coaching_notes (Track B)   │
│  (#93 — schema + writer service; sync worker BLOCKED until landed)   │
└──────────────────────────────────────────────────────────────────────┘
```

## 5. Repository / vendor intake checklist

| Item | Status / Value |
|---|---|
| Vendor | Taskade Inc. |
| License (SaaS) | Taskade Terms of Service — allowed under AppSumo Tier 3 Legacy LTD |
| License (`@taskade/mcp-server`) | MIT (verify on npm before pinning) |
| Runtime language (adapter) | Python 3.12 + FastAPI |
| Runtime language (MCP shim) | Node 20+ (npx `@taskade/mcp-server`) |
| Default ports (adapter) | 8000 (internal Docker network only) |
| Default ports (MCP) | stdio — no port |
| Env vars | `TASKADE_API_KEY` (from `Taskade_Deploy_API_Token` for adapter), `TASKADE_SYNC_TOKEN` (from `Taskade_Sync_Service_Token` for sync worker), `TASKADE_PII_SALT` (per-deployment random salt for customer-UID hashing) |
| Storage | None at adapter level (stateless); audit-ledger mirror state lives in Neon `foai.audit_ledger.synced_to_taskade_at` |
| External integrations | Google Workspace SAML IDP (achievemor.io) |
| Known security posture | SaaS — Taskade's own SOC2 / data residency commitments apply; FOAI adds defense-in-depth via PII hashing + Sacred Separation rendering |

## 6. Deployment path

- **Quarantine sandbox (Phase 1 trust gate):** ephemeral test Taskade workspace + isolated container running `@taskade/mcp-server` under `tcpdump`/`mitmproxy` to enumerate outbound endpoints.
- **Local developer run (Phase 4):** adapter as FastAPI service on developer's machine, hits Taskade REST against a test workspace.
- **Internal service (Phase 4 production):** adapter container on myclaw-vps reachable only inside Chicken Hawk Docker network (`http://taskade-adapter:8000`), no public Traefik route.
- **Owner-tier MCP (Phase 7):** `@taskade/mcp-server` registered in `foai/chicken-hawk/gateway/mcp-servers.json`. Reachable only from owner-tier authenticated sessions.

## 7. Exposure plan

- **Public:** NEVER. Taskade UI is owner-tier (and per-client-tier once Genesis clones ship). No FOAI-public route to Taskade.
- **Owner-tier:** SAML SSO via Google Workspace at `https://www.taskade.com/login?org=the-future-of-ai`. Plus MCP exposure on Chicken Hawk gateway (Phase 7).
- **Service-to-service:** Adapter `/invoke` on internal Docker network only.

## 8. Wrapper contract (per v2 skill §6)

```json
{
  "tool_name": "taskade",
  "foai_owner_layer": "infrastructure",
  "task_type": "custom",
  "input_schema": "see capability registry — workspace.* / project.* / task.* / audit_event.render_html / coaching_note.append",
  "output_schema": "{ok, capability, result, error?}",
  "auth_required": true,
  "timeout_seconds": 120,
  "requires_owner_approval": false,
  "side_effect_level": "external_actions",
  "callback_url_supported": false,
  "cancel_supported": "best-effort — Taskade REST does not support cancel; adapter marks job cancelled_by_caller"
}
```

Adapter endpoints (forthcoming in Phase 4):
- `GET /health`
- `POST /invoke`
- `POST /jobs`
- `GET /jobs/:id`
- `POST /jobs/:id/cancel`

## 9. Router integration

- Tool registry entry at `foai/registry/tools/taskade.yaml` (this PR).
- Chicken Hawk router (`foai/chicken-hawk/gateway/router.py`) — `"taskade"` added to capability-match allow-list in Phase 4.
- Explicit-name routing: owner saying `"use taskade"` or any alias (`taskade_org`, `taskade_wiki`, `future_of_ai_org`) routes to this tool.
- Capability-match routing: tasks classified as `workflow_orchestration` + `business_objects=["audit_event_html" | "coaching_note" | "workspace" | "project" | "task"]` match this entry.
- Sacred Separation: any customer-facing string says "wiki" / "audit log" / "team coaching board" — never "Taskade".

## 10. Automation integration

- **Sync worker (Phase 5):** every 5min, async loop. Disabled at registry until adapter ships; cron config at service level.
- **HRPMO loop (Phase 6):** weekly Mondays 09:00 ET. Triggered by Betty-Anne_Ang Boomer_Ang. Approve/Reject buttons in Taskade trigger Chicken Hawk webhook (Phase 6b close-loop).
- **Owner approval:** NemoClaw verdict gate on `project.create`, `project.update`, `project.archive`, `task.add`, `task.update`, `task.complete`, `coaching_note.append` EXCEPT when called by pre-authorized service contexts (sync-worker + hrpmo-loop have NemoClaw allow-list entries added in Phase 5 + 6).
- **Kill switch:** `enabled: false` flag in registry entry — flipping to true requires PR review.

## 11. Security controls

- **Sandboxing:** `@taskade/mcp-server` runs in dedicated Docker container with no FOAI secrets except `TASKADE_API_KEY`. No filesystem write access outside `/tmp`. No outbound network except to `*.taskade.com` (Docker network policy).
- **Least privilege:** Adapter uses `Taskade_Sync_Service_Token` (scope-limited if Taskade supports per-workspace tokens). Falls back to `Taskade_Deploy_API_Token` only for explicit owner-approved provisioning ops (Genesis clone factory in Phase 8).
- **Secrets:** All tokens via `openclaw` vault, MixedCase canon. Never committed. `.env.example` placeholders only.
- **Allowlist:** Adapter outbound HTTP allowlist = `api.taskade.com` only.
- **Audit logs:** Every `/invoke` writes a `foai.audit_ledger.taskade` row with timestamp + capability + redacted params + result status.
- **Prompt-injection defenses:** `audit_event.render_html` capability sanitizes user-supplied audit-event payloads before HTML rendering (no `<script>` injection paths; treat all payload text as untrusted content).
- **PII hashing:** Customer UIDs in audit-event payloads SHA-256 hashed with `TASKADE_PII_SALT` before any Taskade outbound call. Salt rotated per-deployment.
- **Sacred Separation rendering:** Agent names mapped via `foai/integrations/taskade/role_descriptors.py` when `surface=client_tier`. Model + provider names NEVER rendered.

## 12. Coding-agent prompt template

```text
You are integrating Taskade (commercial SaaS) into FOAI as governed infrastructure for the audit-ledger HTML mirror, HRPMO cycle surface, consultancy CRM, and white-label Genesis-clone factory.

Repository/vendor: Taskade Inc. — REST v1 + @taskade/mcp-server (MIT)
Desired FOAI name: taskade
FOAI placement: infrastructure (authority_path: ACHEEVY → Chicken Hawk → taskade_sync_worker)
Primary capability: workflow_orchestration + audit + memory (HTML mirror surface)
Deployment target: internal-service (FastAPI adapter on Chicken Hawk Docker network)
UI requirement: Owner-tier only via Taskade native UI (SAML SSO via Google Workspace IDP, achievemor.io)
API requirement: POST /invoke endpoint per v2 skill §6 wrapper contract
Scheduler requirement: cron (sync worker every 5min, HRPMO loop weekly Monday 09:00 ET) — both at service level, not in tool registry
Model/provider requirements: NONE — Taskade Tier 3 Legacy has 0 monthly AI credits; FOAI gateway handles all AI inside FOAI perimeter (Sacred Separation: never expose model names in Taskade UI)
Secrets policy: Two tokens (Taskade_Deploy_API_Token + Taskade_Sync_Service_Token), MixedCase in openclaw vault, UPPERCASE in container envs. Never commit.

Tasks: per v2 skill 17-task workflow. See plan at C:\Users\rishj\.claude\plans\proud-roaming-steele.md sections Phase 1–8.

Acceptance criteria: per v2 skill — adapter health 200, /invoke returns structured JSON, router can dispatch by explicit name + capability match, sync worker idempotent + PII-hashed, HRPMO loop posts Approve/Reject to Taskade + receives webhook on action, Sacred Separation audit returns zero internal-name occurrences in any Taskade-rendered HTML.
```

## 13. Acceptance criteria

Per v2 skill §13 + Phase 1 trust gate checklist:

- [ ] `@taskade/mcp-server` npm package version pinned + `npm audit` + `npm ls --all` clean
- [ ] OSV-Scanner pass on `@taskade/mcp-server` package-lock
- [ ] Taskade REST API v1 rate limits documented (measured empirically in sandbox)
- [ ] Taskade Org admin scope verified for `Taskade_Deploy_API_Token` (create / read / update workspaces + projects + tasks; NOT delete unless separate token / fresh confirmation gate)
- [ ] Taskade webhook outbound IPs allowlisted if owner enables webhook-triggered sync
- [ ] PII boundary test: synthetic customer UID in audit_ledger row syncs to Taskade as SHA-256(uid + TASKADE_PII_SALT), never raw
- [ ] Sacred Separation test: rendered HTML in client-tier surface contains zero matches for any internal agent / tool / model / provider name (grep -iE)
- [ ] Adapter `GET /health` returns 200 with `taskade_api_reachable: true`
- [ ] Adapter `POST /invoke` executes a sample `workspace.list` and returns canonical workspaces "The Future of AI" + "ACHIEVEMOR Lead Gen Project"
- [ ] Router dispatch works for `"use taskade"` (explicit) and for `task_type=workflow_orchestration` + `business_objects=audit_event_html` (capability match)
- [ ] Sync worker round-trip: insert synthetic audit_ledger row → ≤5min → appears in Taskade audit-ledger-mirror folder as HTML with role descriptors not agent names
- [ ] PROOF_BUNDLE.md populated with all test outputs + sandbox network log + sample invoke output + scan reports
- [ ] ACHEEVY signs off on PROOF_BUNDLE.md before status promotes from `APPROVED_SANDBOX_ONLY` → `APPROVED_FOR_INTAKE`

## Open questions

1. **Taskade per-workspace token scoping** — verify in Phase 1 trust gate whether Taskade Settings → API → Create Token supports restricting to a single workspace. If NOT, the Sync Service token is full-Org scope; document the gap in TRUST_REPORT.md §tool/API permissions.
2. **Taskade webhook signing** — does Taskade sign outbound webhooks (e.g. for Approve/Reject buttons in HRPMO cycle projects)? If yes, capture the signing-secret canon name in openclaw vault (`Taskade_Webhook_Signing_Secret` MixedCase per Stripe/Mercury pattern). If no, fall back to bearer-token authentication on the inbound webhook endpoint.
3. **Taskade rate limits** — undocumented in public API docs. Phase 1 trust gate measures empirically; document in PROOF_BUNDLE.md so the sync worker's backoff config can be tuned realistically.
