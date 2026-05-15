# Taskade Sync Worker (Track C, #94)

Reads new rows from Neon `foai.audit_ledger` and mirrors them to Taskade as date-bucketed HTML wiki entries. One project per day under workspace "The Future of AI" → folder `audit-ledger-mirror`.

## Architecture

```
   Neon Postgres                Taskade adapter             Taskade SaaS
foai.audit_ledger    →  POST /invoke audit_event.render_html  →  api.taskade.com
       ↓                                ↓                          ↓
WHERE synced_to_taskade_at  →  POST /invoke project.create_or_update  →  workspace.folder.project
       IS NULL
       ↓
UPDATE synced_to_taskade_at = NOW()
```

## Sacred Separation

Customer UIDs are SHA-256 hashed with `TASKADE_PII_SALT` at the WORKER layer before being passed to the adapter (defense in depth — the adapter also hashes at `client_tier`, but raw UIDs should never leave the worker process). Agent names, model names, and provider names are redacted by the adapter's `audit_event.render_html` capability.

## Run

Production: container on myclaw-vps in the Chicken Hawk Docker network. The adapter must be reachable at `http://taskade-adapter:8000`.

Local dev (from `foai/services/taskade_sync_worker/`):
```bash
cp .env.example .env
# Edit .env — point NEON_DATABASE_URL at a dev Neon DB or a local SQLite
docker compose up --build taskade-sync-worker
```

## Tests

```bash
# From foai/ repo root so the `services.taskade_sync_worker` package resolves
pip install -r services/taskade_sync_worker/requirements.txt
PYTHONPATH=. pytest services/taskade_sync_worker/tests/ -v
```

Tests use SQLite in-memory + monkeypatched adapter. The repo CI's "Python Runtime Tests" job runs from `runtime/` and does not currently execute these tests — extending CI to cover `services/` is a separate cleanup PR.

## Owner-blocking before production

- `NEON_DATABASE_URL` from openclaw vault (`Neon_FOAI_Audit_Ledger_URL`)
- `TASKADE_ADAPTER_BEARER` from openclaw (`Taskade_Adapter_Inbound_Bearer`)
- `TASKADE_PII_SALT` from openclaw (`Taskade_PII_Salt`)
- `TASKADE_DEFAULT_WORKSPACE_ID` + `TASKADE_AUDIT_LEDGER_FOLDER_ID` captured after SAML setup
- Track B (#93) schema applied to Neon — see `schema/audit_ledger.sql`
- Telegram notifier URL + bearer for Chicken Hawk fallback alerts

## Failure modes covered

- Adapter unreachable → row stays unsynced, sync_attempt_count++, last_sync_error recorded
- 5 consecutive failures → Telegram alert via Chicken Hawk notifier; loop continues next cycle
- Bad payload (HTML injection in audit_event) → adapter sanitizes via bleach before render
- Worker crash → systemd / docker restart=unless-stopped picks up; idempotent thanks to `WHERE synced_to_taskade_at IS NULL`
- Duplicate run on same row → `synced_to_taskade_at IS NULL` predicate prevents re-render
