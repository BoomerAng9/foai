# Chicken Hawk Tool Chest — Scope (revised for hawk.foai.cloud)

**Status:** Draft, pending owner approval of 4 decision points.
**Date:** 2026-04-26
**Target domain:** `https://hawk.foai.cloud` (existing — already routed via Traefik to `chicken-hawk-hawk-gateway-1:8000` on myclaw-vps).
**Supersedes:** earlier draft that targeted a new `ch.foai.cloud` (corrected by owner — reuse existing subdomain).

---

## 0. What changed from the prior draft

| Item | Prior draft (ch.foai.cloud) | Revised (hawk.foai.cloud) |
|---|---|---|
| Subdomain | New A-record needed (owner action ≈5 min) | **Already exists**, points to `31.97.133.29` (myclaw-vps), Traefik `Host(\`hawk.foai.cloud\`)` rule already on `chicken-hawk-hawk-gateway-1` |
| TLS cert | New issue via Let's Encrypt | **Already issued** via Traefik `letsencrypt` certresolver |
| Owner decision points | 5 | **4** (DNS dropped) |
| Container topology | New `ch-tool-chest` container | **None** — augment the existing FastAPI gateway with static-file routes |
| Risk profile | Higher (new ingress, new TLS, new container) | Lower (in-place augmentation, fully reversible via single PR revert) |

---

## 1. Existing surface at hawk.foai.cloud (audit results)

Live FastAPI app (`/app/main.py` inside `chicken-hawk-hawk-gateway-1`):

| Method + Path | Auth | Purpose |
|---|---|---|
| `GET /health` | open | liveness probe |
| `GET /internal/health` | open | structured health |
| `POST /chat` | bearer | DeerFlow 2.0 chat handler |
| `GET /hawks` | bearer | Lil_Hawk roster |
| `POST /run` | bearer | NemoClaw-gated dispatch (Coastal contract) |
| `GET /audit/{task_id}` | bearer | tamper-evident receipt chain |
| `GET /api/chicken-hawk/live-plan` | bearer | live task plan |
| `POST /login`, `POST /login/verify`, `GET /me`, `GET /logout` | varies | magic-link auth (auth.py router) |
| `POST /check`, `POST /risk-event`, `GET /risk-events` | bearer | NemoClaw policy (nemoclaw.py router) |

**Reserved by existing routes — Tool Chest must NOT shadow:** `/health`, `/internal/health`, `/chat`, `/hawks`, `/run`, `/audit/{task_id}`, `/api/chicken-hawk/live-plan`, `/login`, `/login/verify`, `/me`, `/logout`, `/check`, `/risk-event`, `/risk-events`.

**Free for Tool Chest:** `/` (currently 404), `/tools/*`, `/static/*`, `/ui/*`.

---

## 2. Route map for the Tool Chest GUI

### 2.1 Customer surface (public, persona-fronted)

| Path | Behavior |
|---|---|
| `GET /` | Serves `customer_chat.html` — minimal CH-persona chat UI. Calls `POST /chat` under the hood. Customer never sees the words "Hermes Agent", "NemoClaw", or "Autoresearch". |
| `GET /static/customer/*` | CSS / JS / images for the customer chat |

### 2.2 Operator surface (role-gated, behind `require_auth`)

| Path | Backed by | Purpose |
|---|---|---|
| `GET /tools` | (new) `tools_index.html` | Tool Chest landing — links to the four panels |
| `GET /tools/autoresearch` | (new) | Karpathy autoresearch panel — list active experiments, kept-vs-reverted history, val_bpb deltas. **Read-only until Karpathy autoresearch is actually deployed.** |
| `GET /tools/nemoclaw` | wraps `/check`, `/risk-events` | Policy panel — verdict tester, risk-event feed, blocked/allowed action catalog |
| `GET /tools/hermes` | wraps existing Hermes container API | Hermes Agent control panel — channel status, message-thread browser, skill registry view |
| `GET /tools/lil-hawks` | wraps `/hawks` | Lil_Hawk roster — spawn / inspect / retire |
| `GET /tools/cron` | (new) | Scheduled-jobs view — read-only Wave 1; CH owns scheduling in Wave 2 |
| `GET /tools/audit` | wraps `/audit/{task_id}`, `/audit/integrity-check` | Tamper-evident chain browser + integrity check button |
| `GET /static/tools/*` | static | Tool Chest CSS / JS |

### 2.3 Backend additions (new FastAPI handlers, additive only)

```python
# main.py additions (≈40-50 lines)
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse

app.mount("/static", StaticFiles(directory="/app/static"), name="static")

@app.get("/", response_class=HTMLResponse, tags=["UI"])
def customer_chat():
    return FileResponse("/app/templates/customer_chat.html")

@app.get("/tools", response_class=HTMLResponse, tags=["UI"], dependencies=[Depends(require_auth)])
def tools_index():
    return FileResponse("/app/templates/tools_index.html")

# six more @app.get("/tools/<panel>") handlers, one per Tool Chest panel
```

Persistence: none required for Wave 1 — every panel reads through existing API endpoints. Wave 2 may add panel-specific state (e.g. saved Autoresearch experiment configs) once Karpathy autoresearch is deployed.

---

## 3. CH persona — customer-facing voice

The customer chat at `/` is fronted by a **Chicken Hawk persona system prompt** prepended to every `/chat` call. Customer never sees:

- Words: "Hermes Agent", "NemoClaw", "Autoresearch", "Lil_Hawk", "DeerFlow", "FastAPI", "container"
- Internal model names (Claude / GPT / Gemma / DeepSeek)
- Provider names (OpenRouter / Vast.ai / Anthropic)
- Internal cost / margin / pricing tier

Persona prompt is a **decision point** for the owner (§7).

---

## 4. Auth & access tiers

| Tier | Auth method | What they see |
|---|---|---|
| **Anonymous customer** | none | `/` only (chat). All other paths 401/404. |
| **Owner** | magic-link via `/login` (Telegram) → bearer cookie | `/`, `/tools`, all `/tools/*` panels, all existing API endpoints |
| **(Wave 2) Operator** | scoped bearer | TBD — likely all `/tools/*` panels except `/tools/cron` write actions |

For Wave 1, only the owner has Tool Chest access.

---

## 5. Implementation plan

| Step | What | Where | Effort |
|---|---|---|---|
| 5.1 | Add `templates/` + `static/` dirs to gateway image | `~/foai/chicken-hawk/gateway/` | 15 min |
| 5.2 | Write `customer_chat.html` (persona CH frontend, calls `/chat`) | `gateway/templates/customer_chat.html` | 1-2 hr (alpine.js + Tailwind, ≈300 lines) |
| 5.3 | Write `tools_index.html` + 6 panel templates | `gateway/templates/tools/*.html` | 3-4 hr |
| 5.4 | Wire FastAPI handlers + StaticFiles mount | `gateway/main.py` (additive, ≈50 lines) | 30 min |
| 5.5 | Add `CHICKEN_HAWK_PERSONA_PROMPT` env var, wire into `/chat` request builder | `gateway/main.py` + Dockerfile | 30 min |
| 5.6 | Local smoke test on myclaw-vps | `docker compose up -d --build` | 30 min |
| 5.7 | Post-deploy validation | `curl https://hawk.foai.cloud/` (200 HTML) + `curl /tools` (401 anon, 200 owner) | 15 min |

**Total: ~7 hours** (well under Betty-Anne_Ang's "build" threshold).

**Single PR**: `feat: chicken-hawk tool chest GUI at hawk.foai.cloud`. Reverts in one click.

---

## 6. Risk register

| Risk | Probability | Mitigation |
|---|---|---|
| Static-file mount path conflicts with existing route | Low | Reserved-path table in §1 verified before mount |
| Persona prompt leaks internal terms via LLM hallucination | Med | Add post-processing scrub list; smoke test against 20 adversarial prompts |
| Tool Chest panel exposes data customer shouldn't see (e.g. `/tools/audit` returning all task_ids) | Med | All `/tools/*` routes gated by `require_auth`; default to 401 |
| Adding StaticFiles mount breaks existing FastAPI route resolution | Low | StaticFiles mounted on `/static` (specific prefix), not `/` — won't shadow API routes |
| Autoresearch panel ships before Karpathy autoresearch is deployed | High if not held | **Hard rule:** `/tools/autoresearch` returns "Coming soon" placeholder until Karpathy autoresearch lands |

---

## 7. Owner decision points (4 — DNS dropped)

| # | Decision | Default I'll pick if you don't reply | Why this needs you |
|---|---|---|---|
| **1** | **CH persona system prompt** — voice, register, what CH knows about itself | "I'm Chicken Hawk, your FOAI assistant. I get things done via owner-approval where it matters and act directly where it doesn't. Ask me anything." (1-paragraph minimum) | Customer-facing voice — you should own the brand register |
| **2** | **Customer default model** for `/chat` requests | `gpt-oss-20b` via Vast.ai if Step E is up; otherwise `claude-haiku-4-5` via LiteLLM | Cost / latency / quality tradeoff is yours |
| **3** | **Tool Chest access scope** — owner-only or role-tiered (Wave 1 vs Wave 2) | Owner-only for Wave 1 (simplest, lowest blast radius) | Affects auth complexity and timeline |
| **4** | **NemoClaw policy approval flow** — in-GUI button or Telegram-only | Telegram-only for Wave 1 (already wired); add in-GUI in Wave 2 once role-tiering exists | Affects whether `/tools/nemoclaw` has write actions |

---

## 8. Betty-Anne_Ang scope evaluation

| Layer | Score | Notes |
|---|---|---|
| **A — A.I.M.S. Org Fit Index** | +13/+18 | High Impact (customer-visible CH identity finally ships), Doable in <8 hr, Trustworthy (additive, reversible single PR) |
| **B — KPI/OKR** | 28/30 | Advances Wave 1 → Wave 2 transition; surfaces all three internal tools without leaking them; unblocks operator self-service |
| **C — V.I.B.E.** | **0.94** | Vision (clear), Integrity (no shortcuts), Bandwidth (~7 hr fits one session), Execution (single PR, single domain, no infra changes) |

**Verdict:** **Example Leader** — cleared. Two coaching notes:
1. Build the **persona-fronted customer chat first** (`/`) and ship before adding any operator tools — the customer surface is the load-bearing piece.
2. **Hold `/tools/autoresearch`** behind a "Coming soon" placeholder until Karpathy's autoresearch is actually deployed (don't pretend a panel works when its backend doesn't exist).

---

## 9. What this doesn't cover

- **Karpathy autoresearch deployment itself** — separate Wave 2 work item; the panel is a *viewer*, not the engine.
- **CH's own runtime** (Path A/B/C decision from `CHICKEN_HAWK_RUNTIME_VISION.md` §8) — Tool Chest doesn't require it; once CH runtime exists, Tool Chest panels swap their backend pointers from gateway routes to the CH runtime.
- **Customer-facing identity rollout to AOF Tier-Pro buyers** — Wave 1 = owner-only; multi-tenant comes in Wave 2.
- **Lil_Hawk spawn UI** — Wave 1 = read-only roster; spawn/retire write actions are Wave 2.

---

## End of scope

Awaiting owner sign-off on the 4 decision points (§7). Once signed off, single PR against `~/foai/chicken-hawk/gateway/`, ~7 hr build, deployable behind feature flag `TOOL_CHEST_ENABLED=true` for safe rollback.
