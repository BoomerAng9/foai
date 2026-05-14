# INTAKE — ii-agent (Intelligent Internet's flagship agent runtime)

**Component:** `ii-agent`
**Source (candidate):** github.com/Intelligent-Internet/ii-agent (Apache 2.0 — to verify on clone)
**Status:** intake_complete (Step 1 of the open-source-agent-intake skill 16-step workflow)
**Composes into:** ACHEEVY Super App (runtime engine slice)
**Date:** 2026-05-14

---

## 1. Technical intent

Adapt ii-agent as the **agent loop + tool dispatch engine** inside the FOAI ACHEEVY Super App. ii-agent provides the underlying multi-step tool-use agent (Anthropic-style function calling + plan execution loop). The FOAI wrapper turns ii-agent into a callable tool under Chicken Hawk Gateway's `/run` action dispatch surface AND simultaneously uses ii-agent as the runtime engine behind ACHEEVY's intent classifier + work-order routing per the synthesis spec.

Two roles, one runtime:
- **As a callable tool** (Chicken Hawk → ii-agent action_type) — operators can dispatch arbitrary agent loops with custom tool sets per-mission
- **As ACHEEVY's executive engine** — ACHEEVY's intent classifier + dispatch logic runs through ii-agent's plan/execute loop at the FOAI gateway layer

## 2. Target architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  ACHEEVY (foai/acheevy/) — executive orchestrator                   │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  ii-agent runtime — agent loop + tool dispatch                 │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │  Tool registry (foai/registry/tools/*.yaml)              │  │ │
│  │  │  Includes: autoresearch, hermes_*, nemoclaw, sandbox_*   │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                            ▲                                          │
│                            │ uses                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  ii-commons — shared utilities (HTTP, schemas, types)           │ │
│  │  Common Ground Core — tenant routing, identity, policy primitives│ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                            ▲
                            │ dispatch via /run action_type
┌─────────────────────────────────────────────────────────────────────┐
│  Chicken Hawk Gateway (foai/chicken-hawk/gateway/main.py)            │
│  + NemoClaw verdict module                                            │
│  + magic-link auth + owner-tier binding                               │
└─────────────────────────────────────────────────────────────────────┘
```

**Adapter location:** `foai/integrations/ii-agent/adapter/` (Phase 4 Track A Step 4 — next PR)

**Layers:**
- UI: ii-agent's own web UI (TBD — defer exposure to internal owner-tier only)
- API: adapter wraps ii-agent's Python SDK behind `POST /invoke` + `POST /jobs` + `GET /jobs/:id` + `POST /jobs/:id/cancel` + `GET /health`
- Worker: ii-agent's existing async loop (no change)
- Scheduler: TBD (depends on ii-agent's native cron support)
- Storage: ii-agent's existing storage + ReMe overlay for FOAI-tier memory
- Secrets: model API keys via OpenRouter (`OPENROUTER_API_KEY`) per the OpenRouter-only canon
- Logs: structlog to `hermes_audit_ledger.ii_agent`
- Router: registered at `foai/registry/tools/ii-agent.yaml` for capability match + explicit `--use ii-agent` routing

## 3. Repository intake checklist

(To be completed in Phase 4 Track A Step 2 — repo clone PR)

- [ ] Clone github.com/Intelligent-Internet/ii-agent to `foai/integrations/ii-agent/upstream/`
- [ ] Confirm Apache 2.0 license + LICENSE file present
- [ ] Read README + identify stack (Python? Node? hybrid?)
- [ ] Identify package manager (uv / poetry / npm / pnpm)
- [ ] Inspect ports + default networking
- [ ] Inspect env vars + secrets handling
- [ ] Inspect API routes + UI routes
- [ ] Inspect worker / scheduler entrypoints
- [ ] Inspect model/provider requirements (Anthropic? OpenAI? OpenRouter?)
- [ ] Identify tests + run them
- [ ] Note any security risks (browser automation? code execution? file I/O scope?)

## 4. Deployment path

**Step-2 recommendation:** containerized service. Repeatable Docker Compose. Avoid local-developer-run unless smoke test reveals heavy dependencies.

**Step-7 production target:** Internal tool service — reachable only by Chicken Hawk Gateway + ACHEEVY runtime. Not publicly exposed; not on hawk.foai.cloud public surface.

Production substrate: AIMS Core VPS or `aims-vps`, Traefik routed at `acheevy-engine.foai.cloud` (internal-only, owner-tier-authenticated). Subject to inter-VPS WireGuard setup similar to aims-open-sandbox.

## 5. Exposure plan

| Surface | Target | Auth |
|---|---|---|
| Web UI | `https://acheevy.foai.cloud/admin/ii-agent/` | magic-link owner-tier only |
| Adapter API | `https://acheevy.foai.cloud/api/ii-agent/{invoke,health,jobs}` | Bearer `ACHEEVY_INTERNAL_API_KEY` (Chicken Hawk owns it) |
| Healthcheck | `https://acheevy.foai.cloud/api/ii-agent/health` | no auth |

Never publicly exposed agent UI. Never an unauthenticated invoke endpoint.

## 6. Wrapper contract

```json
{
  "tool_name": "ii_agent",
  "task_type": "agent_loop",
  "input_schema": {
    "type": "object",
    "properties": {
      "intent": { "type": "string", "description": "Natural-language work order or system message" },
      "tools": { "type": "array", "items": { "type": "string" }, "description": "Tool registry entry names the agent may use during the loop" },
      "max_iterations": { "type": "integer", "default": 25 },
      "model": { "type": "string", "description": "Optional model override; defaults to OpenRouter-mapped Claude Opus 4.7" },
      "tenant": { "type": "string", "description": "Common Ground Core tenant id for state/identity routing" }
    },
    "required": ["intent"]
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "final_response": { "type": "string" },
      "trace": { "type": "array", "description": "Step-by-step tool calls + observations" },
      "tool_calls_count": { "type": "integer" },
      "iterations_used": { "type": "integer" },
      "cost_estimate_usd": { "type": "number" },
      "audit_ledger_row_id": { "type": "string" }
    },
    "required": ["final_response", "trace", "audit_ledger_row_id"]
  },
  "auth_required": true,
  "timeout_seconds": 600,
  "requires_human_approval": false,
  "side_effect_level": "writes_files",
  "callback_url_supported": true
}
```

## 7. Router integration

**Capability tags:** `agent_loop`, `tool_dispatch`, `workflow_orchestration`, `multi-step_reasoning`

**Routing rules:**
- Explicit `--use ii-agent` from owner prompt → direct route
- Intent classifier match on "run an agent loop" / "execute multi-step task" / "use tools to complete" / etc → capability route
- Default executor for any work order ACHEEVY decomposes into a multi-step plan

**Fallback chain:** `ii-agent → hermes_deep_think (eval-only fallback) → manual_review_queue`

## 8. Automation integration

- Cron: disabled by default. Owner enables specific routines in `foai/registry/agents/ACHEEVY.yaml` `memory_scope` if recurring patterns emerge.
- Heartbeat: every 60s ping `GET /health`; alert owner via Telegram on 3 consecutive failures.
- Queue: every invocation goes through the foai/task-queue (Phase 3 work) — disabled-by-default until task queue ships.
- Retry policy: 3 attempts with exponential backoff (10s / 60s / 300s) on transient HTTP 5xx; no retry on 4xx.
- Kill switch: `enabled: false` in `foai/registry/tools/ii-agent.yaml`.
- Human approval threshold: any single invocation projected to exceed $5 cost.

## 9. Security gates

- Sandbox: ii-agent runs in its own container; no host filesystem mount beyond `/workspace`
- Least privilege: dedicated container service account, no GCP IAM
- Secret handling: `.env.example` placeholders only; real secrets via openclaw vault → docker secret mount
- Allowlist: ii-agent's tool list is gated by ACHEEVY's allowed_tools card field — agent cannot invoke tools not in its allowlist even if the request asks for them
- Network policy: outbound to OpenRouter / Anthropic / Hermes / NemoClaw / Chicken Hawk only — blocked by default to anything else
- Audit logs: every invocation writes a row to `hermes_audit_ledger.ii_agent` with input + output + tool calls + cost
- Prompt-injection defense: ii-agent's output passes through ACHEEVY's Sacred Separation copy filter before reaching any customer-facing surface

## 10. Coding-agent prompt template

Use this for the Phase 4 Track A Step 2 PR:

```text
You are integrating ii-agent (github.com/Intelligent-Internet/ii-agent) into the FOAI ACHEEVY Super App as the agent loop + tool dispatch engine.

Tasks:
1. Clone github.com/Intelligent-Internet/ii-agent to foai/integrations/ii-agent/upstream/
2. Read LICENSE, README, package files; produce a one-page INTAKE-SUMMARY.md
3. Set up local Docker Compose at foai/integrations/ii-agent/docker-compose.yml
4. Configure env via foai/integrations/ii-agent/.env.example (placeholders only)
5. Smoke-test: `docker compose up -d`; verify health endpoint responds
6. Write adapter service at foai/integrations/ii-agent/adapter/ with the wrapper contract from INTAKE.md §6
7. Add tests at foai/integrations/ii-agent/adapter/tests/ for: healthcheck / invocation / invalid auth / malformed input / timeout / cancellation / Chicken-Hawk-routing / blocked unsafe action
8. Bump foai/registry/tools/ii-agent.yaml intake_status from `candidate` → `sandbox_verified`
9. Produce foai/integrations/ii-agent/PROOF_BUNDLE.md per the open-source-agent-intake skill canon
10. Open PR with the working compose + adapter + tests + proof bundle

Acceptance:
- docker compose up succeeds from a clean checkout
- /health returns ok
- /invoke executes a sample task and returns structured JSON matching output_schema
- All adapter tests pass
- PROOF_BUNDLE.md documents what works + remaining risks
```

## 11. Acceptance criteria

Before this tool can move from `intake_complete` → `sandbox_verified`:

- [ ] Upstream repo cloned + license confirmed Apache 2.0
- [ ] Local Docker Compose runs from a clean checkout
- [ ] Adapter `/health` returns 200
- [ ] Adapter `/invoke` executes a sample agent loop with mocked tools
- [ ] All adapter tests pass
- [ ] No secrets committed
- [ ] Unauthorized calls fail with 401
- [ ] Audit ledger row written for every invocation
- [ ] PROOF_BUNDLE.md produced
