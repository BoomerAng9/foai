# Migration Spec — `deploy-api-gateway` Worker → Cloud Run

**Status**: Scoped (2026-04-15), not started.
**Estimated effort**: 2–3 focused sessions (~12–20 hours total).
**Blocker for Cloudflare decommission**: Yes — this is the last substantive Worker after `deploy-avatars` ships.

## Current state

`deploy-api-gateway` on Cloudflare Workers (account `Bpo@achievemor.io`, last modified 2025-12-12).
Stable for 4+ months, no active development.

## Route inventory (20 routes, 11 handler files)

| Category | Routes | Handler file | Cloudflare deps |
|----------|--------|--------------|------------------|
| **Voice** | `POST /api/voice/intake`, `GET /api/voice/config`, `POST /api/voice/scribe2` | `voice.ts` | KV (config cache), fetch to voice-relay |
| **Avatars** | `POST /api/avatars/upload`, `POST /api/avatars/moderate` | `upload.ts`, `moderate.ts` | ✅ **Already ported** to `services/avatars/` — drop from gateway |
| **Plugs** | `GET/POST /api/plugs`, `GET /api/plugs/:id` | `plugs.ts` | D1 (plug registry) |
| **Chronicle** | `POST /api/chronicle` | `chronicle.ts` | D1 (event log) |
| **Chat** | `POST /api/chat`, `GET /api/chat/models`, `POST /api/chat/stream` | `chat.ts` | Workers AI (multiple models), streaming |
| **Agents** | `GET /api/agents/catalog`, `POST /api/agents/execute`, `GET /api/ii-agents/catalog`, `POST /api/ii-agents/execute` | `agents.ts` | fetch to agent services |
| **Clarity** | `POST /api/clarity/start`, `POST /api/clarity/answer`, `GET /api/clarity/brief` | `clarity.ts` + `services/clarity/{types,questions,engine}.ts` | D1 (clarity sessions), Workers AI |
| **AI diagnostics** | `GET /api/ai/health`, `POST /api/ai/test` | `ai-test.ts` | Workers AI |
| **Infra** | `GET /health` | inline | — |

## Cloudflare → GCP service mapping

| Cloudflare resource | Replacement | Notes |
|---------------------|-------------|-------|
| **Workers AI** (chat models, image classification) | **Vertex AI** (`gemini-2.5-flash` for chat/stream, `textembedding-gecko` for embeddings). SafeSearch already handled in `services/avatars`. | Streaming via Vertex AI `streamGenerateContent` |
| **D1 SQLite** (plugs, chronicle, clarity sessions) | **Neon Postgres** (`performdb` or new `deploy_gateway_db`) | Schema port: run D1 `.schema` export, translate to Postgres DDL |
| **Workers KV** (voice config cache, session cache) | **In-memory LRU per instance** + Neon for persistence | Matches avatars service pattern |
| **Cloudflare AI Gateway** (if used) | None — call providers directly | Verify nothing depends on AI Gateway analytics |
| **Environment bindings** | Cloud Run env vars + Secret Manager | `SUPABASE_*`, any LLM keys |

## Session 1 (half-day) — Scaffolding + Voice + Plugs

1. Create `services/gateway/` sibling to `services/avatars/` (same Hono/Node20 stack)
2. Port `/api/voice/*` routes (3 endpoints) — simple proxy/config logic, no AI
3. Port `/api/plugs/*` routes — requires D1 schema export → Neon migration (`plugs` table)
4. Wire GCP Cloud Build trigger + Dockerfile
5. Exit criteria: voice + plugs working in Cloud Run staging revision

## Session 2 (full day) — Chat + Chronicle + Agents + AI diagnostics

1. Port chat handlers with Vertex AI streaming (non-trivial; streaming response shape differs from Workers AI)
2. Port chronicle (D1 → Neon `chronicle` table, append-only log)
3. Port agents/ii-agents catalog + execute (mostly fetch orchestration)
4. Port `/api/ai/health` + `/api/ai/test` against Vertex models
5. Exit criteria: all non-clarity routes live on Cloud Run staging

## Session 3 (full day) — Clarity engine + cutover

1. Port `services/clarity/{types,questions,engine}.ts` — this is a full reasoning subsystem, biggest risk area
2. D1 `clarity_sessions` → Neon, with same session resumption semantics
3. End-to-end test all 20 routes against staging
4. DNS cutover: point `api.deploy.foai.cloud/*` (or whichever Worker custom domain was used) to Cloud Run
5. Monitor 24-48h, then delete `deploy-api-gateway` Worker
6. Decide Cloudflare decommission (R2 bucket `aims-exports`, DNS, account deactivation)

## Risks / open questions

1. **D1 schema unknown** — need to `wrangler d1 execute --command '.schema'` against the bound D1 before Session 1
2. **Workers AI chat model inventory** — `/api/chat/models` returns a list; need to map each to a Vertex equivalent (or OpenRouter fallback per model policy)
3. **Streaming response compat** — Workers AI streams NDJSON; Vertex streams protobuf. Clients may need a small shim
4. **Clarity engine complexity** — ~700 lines in the bundled worker. Needs focused review to understand state machine before porting
5. **AI Gateway analytics dependency** — if team uses CF Analytics dashboard for chat usage, need replacement (BigQuery + Looker, or Sentry)

## Non-goals

- Do **not** rewrite the API shape. Port as-is. Any refactor is a follow-up after parity ships.
- Do **not** mix avatars back into this gateway. That's already a standalone service.

## Success criteria

- All 20 routes respond with matching contract against the same inputs
- P95 latency ≤ 1.25× Worker baseline (Cloud Run cold starts are the risk)
- Monthly GCP spend projected ≤ $40 (Cloud Run + Vertex + Neon) vs. Cloudflare Workers Paid
- `deploy-api-gateway` Worker deleted, Cloudflare account reviewed for final decommission
