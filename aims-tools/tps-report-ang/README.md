# @aims/tps-report-ang

TPS_Report_Ang — A.I.M.S. Pricing Overseer Node service.

> Renamed from TPS_Ang on 2026-04-08 per Rish.

## Who is TPS_Report_Ang

A real pencil pusher under Boomer_CFO. Where Betty-Anne_Ang is the union-rep mom of the HR PMO Office, TPS_Report_Ang is the accountant who actually likes accounting. Detail-obsessed, methodical, paperwork-loving. Calm, precise, never alarmist but never silent when a number drifts.

**Class:** `boomer_ang`
**Department:** CFO
**Reports to:** Boomer_CFO → ACHEEVY → AVVA NOON
**Evaluated by:** Betty-Anne_Ang
**Backing LLM:** Free-tier via OpenRouter (zero cost to user for price discussions)

## What TPS_Report_Ang does

1. **Prompt-to-plan** — recommend the right plan from a free-text prompt
2. **What-if simulator** — try different combos (Frequency × Group × Pillars × Tools)
3. **Visualize** — surface the canonical pricing matrix as filterable rows
4. **Explain** — human-readable explanation of any pricing matrix row
5. **Token balance** (stub) — Lil_Hawk fee-watcher team monitoring
6. **LUC assist** — pre-action cost transparency
7. **Vendor fee-drop monitoring** — auto-suggest re-route when a cheaper equivalent appears
8. **Financial transaction audit** — anomaly detection
9. **Commercial aiPLUG cost planning** — per-aiPLUG cost projection
10. **@SPEAKLY skill** — navigate users to the answer (Live Translation + AI Meeting Notes inherited via Genspark 4.0)

## The Lil_Hawk team

TPS_Report_Ang commands a dedicated squad of Lil_Hawks under the CFO department (peer to Sqwaadrun in structure, different mission). Their sole job is incremental fee tracking + token monitoring + LUC assist + financial audit. To be seeded in a follow-up migration once their canonical names are decided (likely `lil_ledger_hawk`, `lil_burn_hawk`, `lil_tariff_hawk`).

## HTTP routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Service health |
| GET | `/api/pricing/health` | Agent health + capabilities |
| POST | `/api/pricing/prompt-to-plan` | Recommend plan from prompt |
| POST | `/api/pricing/what-if` | Simulate a different combo |
| GET | `/api/pricing/visualize` | Filterable matrix view (?sector, ?tier, ?preferDesign) |
| GET | `/api/pricing/explain/:rowId` | Human explanation of a row |
| GET | `/api/pricing/balance/:userId` | Token balance + burn rate (stub) |

## Environment

| Var | Default | Purpose |
|---|---|---|
| `TPS_REPORT_ANG_PORT` | `7800` | HTTP listen port |
| `TPS_REPORT_ANG_CORS_ORIGIN` | `*` | CORS origin (tighten in prod) |

## Run locally

```bash
cd aims-tools/tps-report-ang
npm install
npm run dev          # tsx watch mode
# or
npm run start        # node --experimental-strip-types
```

## Examples

### Prompt-to-plan

```bash
curl -X POST http://localhost:7800/api/pricing/prompt-to-plan \
  -H "Content-Type: application/json" \
  -d '{"prompt":"I want to build a coding agent for my 10-person startup with autonomous long runs"}'
```

### What-if

```bash
curl -X POST http://localhost:7800/api/pricing/what-if \
  -H "Content-Type: application/json" \
  -d '{
    "frequency":"6-month",
    "group":"team",
    "toolIds":["claude-sonnet-4.5","gemini-3-flash","glm-5.1"],
    "taskMix":{"code-generation":0.7,"multi-agent":0.3},
    "pillars":{"confidence":"verified","security":"professional"}
  }'
```

### Visualize design tools only

```bash
curl 'http://localhost:7800/api/pricing/visualize?preferDesign=true'
```

### Explain GLM-5.1

```bash
curl http://localhost:7800/api/pricing/explain/glm-5.1
```

## Architecture

```
HTTP request
    │
    ▼
Express app (server.ts)
    │
    ▼
Routes (routes/pricing.ts) — Zod validation + thin handlers
    │
    ▼
Pricing Overseer service (services/pricing-overseer.ts) — pure functions
    │
    ▼
@aims/pricing-matrix queries — getMatrix, getRowById, getDesignToolsByPriority, ...
    │
    ▼
In-memory seed loader (Phase 1) or Neon-backed loader (Phase 2 once PR #76 lands)
```

The pure service layer (`services/pricing-overseer.ts`) has **no Express dependency**. The same functions are reusable from:
- This HTTP service
- An MCP tool wrapping for Port Authority (future)
- Direct imports inside SmelterOS (future)
- A CLI for offline simulation (future)

## Roster migration

PMO migration `003_rename_tps_to_tps_report_ang.up.sql` (in `aims-tools/aims-pmo/migrations/`) renames the agent_roster row from `tps_ang` to `tps_report_ang`, migrates any existing missions/evaluations/promotions to the new id, and drops the old row. Idempotent on `ON CONFLICT DO UPDATE`.

## Status

| Feature | Status |
|---|---|
| HTTP service skeleton | ✅ this PR |
| Pricing matrix integration (sync seed loader) | ✅ this PR |
| Roster migration (TPS_Ang → TPS_Report_Ang) | ✅ this PR |
| Prompt-to-plan (heuristic) | ✅ this PR |
| What-if simulator | ✅ this PR |
| Visualize | ✅ this PR |
| Explain | ✅ this PR |
| Token balance | 🟡 stub — needs billing tables |
| Lil_Hawk fee-watcher team | 🟡 stub — needs roster expansion |
| @SPEAKLY skill wiring | 🟡 stub — needs Speakly client |
| Async Neon-backed matrix (after PR #76) | ⏳ follow-up |
| MCP tool wrapping for Port Authority | ⏳ follow-up |
| LLM-driven prompt-to-plan (replace heuristic) | ⏳ follow-up |
