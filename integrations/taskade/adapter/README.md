# Taskade Adapter

FOAI infrastructure adapter wrapping Taskade REST v1 behind the v2 Open Source Agent Intake skill §6 wrapper contract.

**Trust status:** `APPROVED_SANDBOX_ONLY` — see `../TRUST_REPORT.md`. Production promotion requires the trust-gate checklist in that file.

## Run locally

```bash
cp .env.example .env
# Edit .env with real values (NEVER commit .env)
docker compose up --build taskade-adapter

# Or without Docker:
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Smoke

```bash
# Health (no auth)
curl http://localhost:8000/health

# Workspace list (auth required)
curl -X POST http://localhost:8000/invoke \
  -H "Authorization: Bearer $ADAPTER_BEARER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"capability": "workspace.list", "params": {}}'

# Async job
curl -X POST http://localhost:8000/jobs \
  -H "Authorization: Bearer $ADAPTER_BEARER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"capability": "project.create", "params": {"workspace_id": "<ws>", "title": "Hello"}}'
# returns {"ok": true, "job_id": "...", "status": "queued"}
```

## Tests

```bash
pip install -r requirements.txt
pytest tests/ -v
```

Tests use `responses` to mock the Taskade upstream — no real API calls.

## Architecture

```
Chicken Hawk gateway  →  POST /invoke (Bearer ADAPTER_BEARER_SECRET)
                                ↓
                    main.py dispatcher  →  Pydantic-validates params via schemas.py
                                ↓
                    capabilities.py  →  TaskadeClient (Bearer TASKADE_API_KEY)
                                ↓
                            api.taskade.com/api/v1
```

Sacred Separation is applied in `role_descriptors.py` before any payload is rendered into Taskade — agent names → role descriptors at `client_tier`, model + provider names redacted.

## Files

- `main.py` — FastAPI app + dispatcher + job ledger
- `capabilities.py` — per-capability functions + TaskadeClient HTTP helper
- `schemas.py` — Pydantic input/output schemas
- `role_descriptors.py` — Sacred Separation enforcement
- `Dockerfile` — Python 3.12-slim, non-root user
- `docker-compose.yml` — local-dev compose; prod wiring is at `/docker/chicken-hawk/docker-compose.yml`
- `tests/` — pytest, mocked at `responses` level

## Open questions (carry to trust gate)

1. `project.archive` endpoint shape — POST `/projects/:id/archive` vs PUT `/projects/:id` with `archived: true`. Adapter tries POST first, falls back. Pin during Phase 1 trust gate.
2. Taskade rate limits — undocumented. Adapter does NOT yet implement backoff; sync worker (Phase 5) layers backoff on top.
3. Per-workspace token scoping — verify in Taskade Settings → API. If unsupported, the Sync Service token is full-Org scope; adapter logic restricts writes to canonical folder IDs.
