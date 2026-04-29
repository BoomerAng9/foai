# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Chicken Hawk is the customer-facing AI surface for ACHIEVEMOR. Two services work together:

- **`gateway/`** — FastAPI machine API at `https://hawk.foai.cloud/{run,check,audit,chat,health,...}`. Owns intent routing, NemoClaw policy gating, magic-link auth, audit-chain receipts, public-chat (anonymous customer LLM), and Lil_Hawk dispatch.
- **`hawk-ui/`** — Next.js 14 web surface at `https://hawk.foai.cloud/`, `/about`, `/login`, `/tools/*`. Customer hero chat + owner-tier Tool Chest. Talks to the gateway via `/api/gateway/:path*` rewrites.

Traefik on myclaw-vps splits routing on the same host: gateway gets the API path-prefixes at priority 200, hawk-ui catches everything else at priority 10. See `hawk-ui/DEPLOY.md` for the exact rules.

There's also `hawk3d/` (a separate Next.js + Three.js fleet visualization) — it predates hawk-ui and is not on the customer-facing path. Don't conflate the two.

## Org hierarchy (keep canonical)

```
User → ACHEEVY (Digital CEO) → Chicken Hawk (this repo) → 11 Lil_Hawks
                              ↳ Boomer_Angs (peers, not children of CH)
```

Chicken Hawk *cannot* command Boomer_Angs. Only ACHEEVY speaks to users; CH is one tier below. **Customer-facing copy never names "Boomer_Ang", "Lil_Hawk", or any internal agent.** See `~/.claude/projects/C--Users-rishj/memory/feedback_owner_brief_is_not_customer_copy.md`.

The 11 Lil_Hawks live in `config/lil_hawks.yml` and are enumerated in `gateway/router.py`'s `HawkRole` enum. Endpoints + persona descriptions stay in those two places — keep them in sync.

## Access-tier canon (load-bearing rule)

Two tiers, no middle ground. Memorialized in `~/.claude/projects/C--Users-rishj/memory/feedback_ch_access_tier_canon.md`:

- **Public / anonymous** — `/` and `POST /api/public/chat` only. Persona-prepended LLM round-trip with hard-coded refusals against jailbreak / prompt-injection / data-mining prompts. NO tool access, NO file reads, NO audit chain, NO Lil_Hawk dispatch.
- **Owner-bound session** — magic-link from `/login` issues a session cookie bound to `OWNER_EMAIL`. Tool Chest, `/run`, `/check`, `/audit/{id}`, `/hawks`, `/risk-events`, scheduled jobs, eventual Obsidian + Spinner voice all require this tier.

Operator-with-shared-secret (Bearer `GATEWAY_SECRET`) is machine-to-machine — used by Coastal-runner et al. — NOT automatically owner-tier.

## Gateway architecture

`gateway/main.py` is the FastAPI entrypoint. Notable modules:

| File | Owns |
|---|---|
| `main.py` | App factory, routes, in-memory `_RUN_LEDGER` for receipts, `require_auth` dep |
| `router.py` | LLM-driven intent classification → Lil_Hawk dispatch (DeerFlow 2.0 orchestration) |
| `nemoclaw.py` | Policy gate — `/check`, `/risk-event`, `/risk-events`. Risk tags: legal, money, health, certification, customer_payment_data, supplier_change, final_public |
| `auth.py` | Magic-link auth — `/login`, `/login/verify`, `/me`, `/logout`. Owner-only via `OWNER_EMAIL` |
| `public_chat.py` | `POST /api/public/chat` — anonymous, rate-limited, persona-prepended, calls LiteLLM via OpenAI SDK |
| `event_bus.py` | SSE for `/api/chicken-hawk/live-plan` |
| `memory_bridge.py` | ReMe sidecar adapter (long-term memory) |
| `reme_store.py` | ReMe store backend |
| `squad_agentscope.py` | AgentScope multi-agent fan-out (toggle: `SQUAD_BACKEND=agentscope|asyncio`) |
| `notifier.py` | Channel notifier (Telegram, etc.) |
| `config.py` | Pydantic settings + the **`chicken_hawk_persona_prompt`** (hardened against extraction) |

The `/run` action handler (in `main.py`) is the canonical contract every FOAI project uses: `POST /run {"action": "<verb>", "payload": {...}}` → 200 allow / 202 escalate / 403 deny, receipt always written to `_RUN_LEDGER`.

## hawk-ui architecture

Next.js 14 standalone build. Talks to the gateway through `next.config.mjs` rewrites:
- `/api/public/chat` → gateway's public-chat (anonymous)
- `/api/gateway/:path*` → gateway internal docker `http://hawk-gateway:8000/:path*` (forwards cookies for owner-tier auth)

**Brand palette** comes from `~/.claude/projects/C--Users-rishj/memory/reference_foai_ecosystem_brand_palette.md` — gold `#E8A020` + cyan `#00f0ff` on slate `#0a0c10`, diagonal gold→cyan gradient signature, Inter font. Do **not** import Bolt's ray-gradient hero or glow-pill announcement patterns — they're the consistency-breakers.

The chat input has two voice paths:
- **Web Speech API** (browser-native, anonymous-ok) — wired today
- **Spinner** (Inworld Realtime) — owner-only, scaffolded but inactive until Inworld credentials land

## Common commands

### Gateway

```bash
cd gateway
# Local dev (no docker)
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# In production, the gateway runs via /docker/chicken-hawk/docker-compose.yml
# on myclaw-vps. The compose `command` block re-installs deps on every start
# (intentional — keeps the bind-mount workflow fast).
```

The compose service is bind-mounted (`./gateway:/app`), so file edits take effect on `docker restart chicken-hawk-hawk-gateway-1`. No image rebuild needed for gateway changes.

### hawk-ui

```bash
cd hawk-ui
npm install
npm run dev          # http://localhost:3010
npm run build        # produces .next/standalone for Docker
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
```

Production hawk-ui IS image-built (Dockerfile multi-stage). Sync source then build the image:

```bash
# From local repo
tar --exclude='node_modules' --exclude='.next' -cf - hawk-ui | \
  ssh myclaw-vps 'cd /docker/chicken-hawk && tar -xf - && \
                  cd hawk-ui && docker build -t hawk-ui:0.1.x . && \
                  cd .. && docker compose up -d --force-recreate hawk-ui'
```

Healthcheck uses `wget` against `127.0.0.1:3010` (NOT localhost — IPv6 trap with Next.js standalone). Container needs `HOSTNAME=0.0.0.0` env so Next binds IPv4. Both already set in compose.

## Model gateway (LiteLLM)

CH gateway calls models through LiteLLM at `litellm.foai.cloud` on AIMS Core VPS. The canonical model registry is `OpenRouter-only` — every model name (`claude-haiku-4-5`, `claude-sonnet-4-6`, `openrouter-omnibus`) maps to an OpenRouter route. **Do not add direct Anthropic / OpenAI / Gemini provider blocks** — owner directive 2026-04-26.

LiteLLM key location is the openclaw secrets vault: `docker exec openclaw-sop5-openclaw-1 env | grep -i openrouter` on myclaw-vps. Variable name is mixed-case `Openrouter_API_Key` — case-sensitive grep can miss it.

The master key for inbound auth to LiteLLM must start with `sk-`. The chicken-hawk gateway's `LITELLM_API_KEY` env mirrors this.

## Deployment topology

- **myclaw-vps** (`hawk.foai.cloud`): Traefik + chicken-hawk-hawk-gateway-1 (FastAPI) + chicken-hawk-hawk-ui-1 (Next.js) + ReMe sidecar + openclaw-sop5 (secrets vault)
- **AIMS Core VPS** (`litellm.foai.cloud`, `commonground:7070`): LiteLLM v1.83.7+ + postgres sidecar, CommonGround, ii-agent overlay
- **aims-vps** (`brewing.foai.cloud`): Coastal Brewing pilot (the first Human-less Company)

`docker-compose.gateway.yml`, `docker-compose.yml`, `docker-compose.myclaw-prod.yml` are local-dev variants. The live production compose lives on myclaw-vps at `/docker/chicken-hawk/docker-compose.yml` — keep that file as the source of truth for production wiring.

## Adding a new Lil_Hawk

1. Add endpoint config to `config/lil_hawks.yml`
2. Add `{NAME}_HAWK_URL` env var to `.env.example` and the gateway compose
3. Add to `HawkRole` enum + endpoint in `gateway/router.py`
4. Add routing guidance in `system-prompt/chicken-hawk.md`
5. Add roster entry in `hawk-ui/app/tools/lil-hawks/page.tsx` `HAWK_DESCRIPTIONS`

## Skill files

`gateway/.claude/skills/` (read these before touching the related logic):
- `fleet-routing/SKILL.md` — intent classification
- `hawk-dispatch/SKILL.md` — Lil_Hawk selection, retries
- `squad-mode/SKILL.md` — multi-hawk fan-out via Lil_Deep_Hawk

## Hard rules (won't be obvious from the code)

1. **Read before writing.** No exceptions on production files.
2. **Config over code.** Lil_Hawk endpoints, hawk roles, event configs all live in `config/`.
3. **Intent-first routing.** The router uses LLM classification, not keyword matching.
4. **Review gate.** All `/chat` outputs pass through `_review_gate()` in `router.py` before delivery.
5. **Customer surfaces never name internals.** No "Lil_Hawk", "Boomer_Ang", "NemoClaw", model names, provider names, or container names in any string the public reads. Translate per `feedback_owner_brief_is_not_customer_copy.md`.
6. **Owner-tier checks bind to email.** A session holding `GATEWAY_SECRET` is *operator*, not owner. Owner-only routes (Tool Chest, Obsidian, scheduled jobs) verify `OWNER_EMAIL` match on the session cookie.
7. **Persona refusals return REFUSE_LINE verbatim.** Don't echo question structure, don't explain. See the prompt in `gateway/config.py:chicken_hawk_persona_prompt`.

## Where additional truth lives

- `~/CLAUDE.md` — ecosystem-wide context (FOAI repos, AIMS, deployment, agent hierarchy, model policy, secret pattern)
- `~/.claude/projects/C--Users-rishj/memory/MEMORY.md` — persistent cross-session canon (access tier, brand palette, owner brief vs customer copy, ecosystem stack inventory, etc.)
- `hawk-ui/DEPLOY.md` — the Path B Traefik priority-split, smoke tests, rollback steps
- `hawk-ui/OBSIDIAN_WIRING.md` — the owner-only Obsidian MCP wiring plan (gated on plugin install + API key)
- `hawk-ui/README.md` — surface map, brand language, env vars
