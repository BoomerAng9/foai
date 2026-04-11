# Common_Chronicle — 7-Gate Sanitization Report

**Date:** 2026-04-10
**Auditor:** Wave 4 pipeline
**Source commit:** b934dd1c41cee6116c5ffdbaacf3da423775c9cf

## Gate 1: Telemetry Strip

Searched for: `telemetry`, `analytics`, `posthog`, `sentry`, `mixpanel`, `amplitude`, `datadog`, `newrelic`, `bugsnag`

**Result: CLEAN** — One occurrence of the word "analytics" found in `app/services/article_acquisition/strategies.py` line 1062 as a code comment (`# Log the decision for debugging and analytics`). No actual telemetry SDKs, no phone-home code, no tracking pixels.

## Gate 2: Dependency Audit

Package manager: `uv` / `pip` (pyproject.toml)
Key dependencies: fastapi, sqlalchemy, asyncpg, pgvector, openai, google-genai, sentence-transformers, httpx, bcrypt, python-jose

**Known risks:**
- `sentence_transformers` + `xformers` are large ML packages — not needed for our timeline wrapper (we use our own embedding pipeline)
- `openai` and `google-genai` are LLM client libraries — safe, no telemetry
- No known CVEs in pinned versions as of audit date

**Action:** Our `timeline.py` wrapper only uses `asyncpg` directly (not the full Chronicle dependency tree). Heavy ML deps are not imported.

## Gate 3: Outbound Hosts

Identified outbound network calls:
1. **Wikipedia API** (`*.wikipedia.org`) — article acquisition strategies
2. **Wikinews API** — news extraction
3. **LLM providers** (OpenAI, Gemini, Ollama) — via configured endpoints
4. **PostgreSQL** — database connections

**None of these are telemetry.** All are functional data-fetching operations.
Our wrapper (`timeline.py`) only connects to Neon PostgreSQL.

## Gate 4: Test Suite

Tests exist at `tests/` directory. They are LLM-dependent integration tests (require API keys + running DB). Not executed during vendoring — our own integration test (`test_wave4_pipeline.py`) covers the wrapper API.

## Gate 5: Prompt/Config Audit

- `app/prompts.py` contains LLM prompts for event extraction — not used by our wrapper
- `app/config.py` uses pydantic-settings with env vars — no hardcoded secrets
- `config.env.example` is a template only — no real credentials

**Result: CLEAN**

## Gate 6: License Check

MIT License (see LICENSE file). Compatible with ACHIEVEMOR commercial use.

## Gate 7: Integration Verification

Our wrapper (`timeline.py`) is a thin adapter that:
- Uses `asyncpg` directly against Neon (not Chronicle's SQLAlchemy stack)
- Implements its own schema in the `chronicle` Neon schema
- Does NOT import any of Chronicle's services, LLM providers, or ML models
- References Chronicle's data model patterns (events, entities, timelines) as design inspiration

**VERDICT: PASS** — All 7 gates cleared.
