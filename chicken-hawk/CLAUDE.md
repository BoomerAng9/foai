# Chicken Hawk — Claude Code Project Instructions

## What This Repo Is

Chicken Hawk is the **sovereign AI operations gateway** — the tactical execution tier of
the ACHIEVEMOR platform. It receives dispatches from ACHEEVY (Digital CEO) and routes
them to a fleet of 11 specialist Lil_Hawks for hands-on execution.

## Org Hierarchy

```
User (human)
  └── ACHEEVY (Digital CEO) — acheevy.digital repo
        ├── PMO Departments → Boomer_Angs (strategic operators)
        └── Chicken Hawk (THIS REPO) — tactical commander
              ├── Lil_TRAE_Hawk (TRAE Agent) — heavy coding, repo-wide refactors
              ├── Lil_Coding_Hawk (OpenCode) — plan-first feature work
              ├── Lil_Agent_Hawk (Agent Zero) — OS/browser/CLI workflows
              ├── Lil_Flow_Hawk (n8n) — SaaS/CRM/payment automation
              ├── Lil_Sand_Hawk (OpenSandbox) — safe containerized code execution
              ├── Lil_Memory_Hawk (CoPaw/ReMe) — long-term RAG memory
              ├── Lil_Graph_Hawk (LangGraph) — stateful conditional workflows
              ├── Lil_Back_Hawk (InsForge) — backend scaffolding, auth, APIs
              ├── Lil_Viz_Hawk (SimStudio) — monitoring dashboards
              ├── Lil_Blend_Hawk (Blender 3D) — 3D modeling, rendering
              └── Lil_Deep_Hawk (DeerFlow 2.0) — SuperAgent, Squad mode
```

## Key Config Files

| File | Purpose |
|------|---------|
| `system-prompt/chicken-hawk.md` | Chicken Hawk system prompt — personality, routing rules |
| `config/lil_hawks.yml` | Lil_Hawk fleet registry — endpoints, ports, timeouts |
| `config/event-ctih.yml` | Example automation config (Coastal Talent Hack-A-Thon) |
| `config/event-notifications.yml` | Notification dispatch routing |
| `.ecosystem.json` | Ecosystem node definition — provides, consumes |
| `ecosystem.node.json` | AIMS ecosystem node config |

## Architecture

```
gateway/ (FastAPI)
  ├── main.py      — /chat, /health, /hawks endpoints
  ├── router.py    — LLM-based intent classification → Lil_Hawk routing
  └── config.py    — Pydantic settings, env vars

hawk3d/ (Next.js + Three.js)
  ├── src/app/     — 3D visualization pages
  ├── src/store/   — Zustand state (agent states, room positions)
  ├── src/components/
  │   ├── scene/   — 3D room rendering, agent sprites, topology
  │   ├── hud/     — HUD overlay, controls
  │   ├── panels/  — Activity feed, agent detail
  │   └── wizard/  — Setup wizard
  └── src/lib/     — Constants, gateway client, agent simulator
```

## Naming Conventions

- **Lil_Hawks**: `Lil_{Skill}_Hawk` — e.g., `Lil_Code_Hawk`, `Lil_Vuln_Hawk`
- **Never**: `Credential_Hawk` (missing `Lil_` prefix)
- **Chicken Hawk**: Always two words, always capitalized

## Development Rules

1. **Read before writing** — Always read existing files before modifying.
2. **Config over code** — Hawk definitions live in `config/lil_hawks.yml`, not hardcoded.
3. **Intent-first routing** — Classification is by LLM, not keyword matching. The router uses the system prompt to understand which hawk handles what.
4. **Review gate** — All outputs pass through `_review_gate()` in `router.py` before delivery.
5. **Evidence-driven** — Every response must be traceable (trace IDs).
6. **Never expose internals** — Internal URLs, fleet topology, and API keys are never in user-facing output.
7. **Match ACHEEVY patterns** — Chicken Hawk mirrors ACHEEVY's dispatch system at the tactical tier. When ACHEEVY adds governance capabilities, Chicken Hawk should have the execution equivalent.

## Skill Files

Read `.claude/skills/` before building features related to:
- `fleet-routing/SKILL.md` — How Chicken Hawk classifies intent and routes to Lil_Hawks
- `hawk-dispatch/SKILL.md` — Lil_Hawk selection, health checks, retry logic
- `squad-mode/SKILL.md` — Multi-hawk coordination via Lil_Deep_Hawk

## Adding a New Lil_Hawk

1. Add endpoint config to `config/lil_hawks.yml`
2. Add env var `{NAME}_HAWK_URL` to `.env.example`
3. Add to `HawkRole` enum in `gateway/router.py`
4. Add routing guidance to `system-prompt/chicken-hawk.md`
5. Add default agent entry in `hawk3d/src/store/hawkStore.ts`
6. Add room in `hawk3d/src/lib/constants.ts`

## Deployment

- **VPS-1 (Gateway)**: `docker-compose.gateway.yml` — gateway + hawk3d UI
- **VPS-2 (Fleet)**: `docker-compose.yml` — 11 Lil_Hawk services + PostgreSQL
- **Network**: Private Docker bridge (`hawk-net`) + Tailscale overlay
