# foai.audit_ledger + foai.coaching_notes schema

Canonical SQL schema for the FOAI audit ledger (Track B #93) and HRPMO coaching notes (Track D #95). Applied to the Neon Postgres instance backing the FOAI ecosystem.

## Tables

### `foai.audit_ledger`
One row per agent action. Written by every Boomer_Ang, Lil_Hawk, and Super Agent runtime through the Track B writer service. Read by:
- Phase 5 sync worker — mirrors unsynced rows to Taskade
- Phase 6 HRPMO loop — scores agents weekly on V.I.B.E. + KPI + Org Fit
- ACHEEVY analytics surfaces
- Forward-deploy receipt evidence sections

Key columns:
- `event_id` (UUID PK)
- `agent`, `action`, `payload` (JSONB) — the event itself
- `customer_uid` — PII (hashed before any cross-perimeter render)
- `timestamp_event` — when the action actually happened (NOT `created_at`, which is just insert time)
- `synced_to_taskade_at` — set by the sync worker on successful push; NULL until then
- `sync_attempt_count`, `last_sync_error` — backoff state for the sync worker

### `foai.coaching_notes`
One row per (agent × week) HRPMO cycle. Authored by Betty-Anne_Ang via AutoResearch dispatch. Approved by ACHEEVY via Telegram. Outcome measured the following cycle.

Key columns:
- `note_id` (UUID PK)
- `(agent_name, week_iso)` — UNIQUE
- `body_md` — the coaching recipe in markdown
- `skill_recipe_path` — filled after ACHEEVY approves; points at `foai/registry/skills/coaching/<agent>-cycle-<WW>.md`
- `taskade_project_id` — the hrpmo-cycles project the body was mirrored to
- `outcome` — `pending` / `improved` / `no_change` / `worsened` (set by next cycle's verification step)

## Apply

```bash
psql "$NEON_DATABASE_URL" -f audit_ledger.sql
```

Idempotent — safe to re-run. Uses `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS`.

## Permissions canon

Recommended role split:
- `foai_writer` — INSERT on `foai.audit_ledger`; INSERT + UPDATE on `foai.coaching_notes`. Used by Track B writer service.
- `foai_sync` — SELECT on `foai.audit_ledger`; UPDATE on `foai.audit_ledger.synced_to_taskade_at`, `sync_attempt_count`, `last_sync_error` only. Used by Phase 5 sync worker.
- `foai_hrpmo` — SELECT on both tables; INSERT on `foai.coaching_notes`; UPDATE on `foai.coaching_notes.approved_*` and `outcome*`. Used by Phase 6 HRPMO loop.
- `foai_admin` — full DDL + DML. Owner only.

DDL for the role split is NOT in `audit_ledger.sql` because Neon role names are deployment-specific. Owner runs the GRANT statements after picking role names.

## Dev / test path

For local development without Neon, the sync worker accepts a SQLite URL in `NEON_DATABASE_URL`. The DDL above uses Postgres types (`UUID`, `JSONB`, `TIMESTAMPTZ`, `gen_random_uuid()`) — SQLite tests mock these via SQLAlchemy abstractions in `tests/conftest.py`.
