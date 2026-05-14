# INTAKE — ii-researcher (Intelligent Internet's research-specialized agent)

**Component:** `ii-researcher`
**Source (candidate):** github.com/Intelligent-Internet/ii-researcher (Apache 2.0 — to verify on clone)
**Status:** intake_complete (Step 1)
**Composes into:** ACHEEVY Super App (deep research workflow slice)
**Date:** 2026-05-14

---

## 1. Technical intent

Adapt ii-researcher as the **deep-research specialist agent** inside the ACHEEVY Super App. Where ii-agent is generic (multi-step tool dispatch), ii-researcher is research-tuned (source validation, citation tracking, multi-source synthesis, conflict resolution). It sits as a peer to ii-agent under ACHEEVY's intent classifier: research-classed work orders route to ii-researcher; general agent-loop work orders route to ii-agent.

Two invocation paths:
- **Direct tool call** (Chicken Hawk → `ii_researcher` action_type) — explicit research mission
- **ACHEEVY auto-route** — intent classifier identifies a research-shaped task + dispatches

## 2. Target architecture

```
ACHEEVY (intent classifier)
  ├─ research-classed intent → ii-researcher
  │   ├─ source gathering (web + Sqwaadrun + AutoResearch)
  │   ├─ citation validation
  │   ├─ multi-source synthesis
  │   └─ confidence scoring
  └─ general agent-loop intent → ii-agent (separate adapter)
```

Adapter location: `foai/integrations/ii-researcher/adapter/` (next PR)

## 3. Repository intake checklist

- [ ] Clone github.com/Intelligent-Internet/ii-researcher to `foai/integrations/ii-researcher/upstream/`
- [ ] Confirm Apache 2.0 license
- [ ] Read README + identify stack
- [ ] Identify package manager
- [ ] Inspect ports + networking + env vars + API/UI routes
- [ ] Inspect model/provider requirements (likely shares OpenRouter via ii-agent + ii-commons)
- [ ] Identify tests + run them
- [ ] Note any security risks (web scraping scope, browser automation if any)

## 4. Deployment path

Containerized service via Docker Compose. Internal-only; reachable only by ACHEEVY runtime + Chicken Hawk Gateway. Production target: AIMS Core VPS, same network as ii-agent.

## 5. Exposure plan

| Surface | Target | Auth |
|---|---|---|
| Adapter API | `https://acheevy.foai.cloud/api/ii-researcher/{invoke,health,jobs}` | Bearer `ACHEEVY_INTERNAL_API_KEY` |
| Healthcheck | `https://acheevy.foai.cloud/api/ii-researcher/health` | no auth |

No public UI. Owner-tier admin access through Circuit Box's Research mode tab.

## 6. Wrapper contract

```json
{
  "tool_name": "ii_researcher",
  "task_type": "research",
  "input_schema": {
    "type": "object",
    "properties": {
      "research_question": { "type": "string" },
      "source_requirements": {
        "type": "object",
        "properties": {
          "min_sources": { "type": "integer", "default": 3 },
          "min_recency_days": { "type": "integer", "default": 90 },
          "domain_allowlist": { "type": "array", "items": { "type": "string" } },
          "domain_denylist": { "type": "array", "items": { "type": "string" } }
        }
      },
      "max_depth_minutes": { "type": "integer", "default": 15 },
      "tenant": { "type": "string" }
    },
    "required": ["research_question"]
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "research_brief": { "type": "string" },
      "citation_table": { "type": "array", "items": { "type": "object" } },
      "confidence_score": { "type": "number", "minimum": 0, "maximum": 1 },
      "unresolved_questions": { "type": "array", "items": { "type": "string" } },
      "source_conflict_log": { "type": "array", "items": { "type": "object" } },
      "audit_ledger_row_id": { "type": "string" }
    },
    "required": ["research_brief", "citation_table", "confidence_score", "audit_ledger_row_id"]
  },
  "auth_required": true,
  "timeout_seconds": 900,
  "requires_human_approval": false,
  "side_effect_level": "read_only",
  "callback_url_supported": true
}
```

## 7. Router integration

**Capability tags:** `research`, `source_validation`, `citation_tracking`, `multi_source_synthesis`

**Routing rules:**
- Explicit `--use ii-researcher` → direct route
- Intent classifier match: "research X" / "find sources" / "verify the claim that..." / "what does the literature say" / etc → capability route
- Auto-chain with `autoresearch` when the question touches model / vendor / OSS drift
- Auto-chain with `sqwaadrun_scrape` when sources require deep web scraping

**Fallback chain:** `ii-researcher → autoresearch (single-vendor scan only) → manual_research_queue`

## 8. Automation integration

- Cron: disabled by default. Lane B (Greg-framework opportunity scout per memory) could schedule weekly ii-researcher runs once stable.
- Heartbeat: 60s ping; 3-consecutive-failure alert.
- Queue: foai/task-queue rows (Phase 3 dependency).
- Retry: 2 attempts with 30s / 180s backoff on transient 5xx.
- Kill switch: tool registry `enabled: false`.
- Approval threshold: research costs > $3 per run → owner approval.

## 9. Security gates

- Sandbox: ii-researcher in dedicated container, no filesystem outside `/workspace/research-outputs/`
- Outbound network: web sources + autoresearch + sqwaadrun + Hermes only; deny everything else
- Source allowlist enforced at adapter layer (input_schema validation)
- Sacred Separation copy filter runs on the research_brief output before returning
- Audit log: every research run rows to `hermes_audit_ledger.ii_researcher`
- Prompt-injection defense: scraped source content sanitized via the `sanitize()` helper from autoresearch (`foai/runtime/hermes/autoresearch/sources/_common.py`)

## 10. Coding-agent prompt template

```text
You are integrating ii-researcher into the ACHEEVY Super App.

Tasks: same 10-step shape as the ii-agent intake (clone / readme / docker compose / .env / smoke / adapter / tests / registry status bump / proof bundle / PR). Reuse the ii-agent adapter scaffold where possible — both are Intelligent Internet projects and likely share base structure via ii-commons.

Acceptance:
- docker compose up succeeds from a clean checkout
- /health returns ok
- /invoke executes a sample research question against a known source set and returns structured citation_table + confidence_score
- Sacred Separation filter applied to research_brief output
- PROOF_BUNDLE.md produced
```

## 11. Acceptance criteria

Promotion `intake_complete → sandbox_verified` requires:
- [ ] Upstream cloned + license confirmed
- [ ] Local Docker Compose runs clean
- [ ] /health returns 200
- [ ] /invoke returns valid citation_table + confidence_score on a benchmark question
- [ ] Tests pass
- [ ] No secrets committed
- [ ] Source allowlist enforced at adapter validation
- [ ] Sacred Separation filter operational on output
- [ ] PROOF_BUNDLE.md produced
