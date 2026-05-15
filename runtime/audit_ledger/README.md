# foai.audit_ledger writer library — Track B Phase 1

Library that every FOAI service uses to write rows to Neon `foai.audit_ledger`. Promoted from a per-service implementation into a shared module so reader (Phase 5 sync worker), writer (this), and HRPMO loop (Phase 6) all share one model definition.

Schema DDL lives at `services/taskade_sync_worker/schema/audit_ledger.sql` (idempotent — apply once per Neon instance).

## Usage

```python
from runtime.audit_ledger import write_event

event_id = write_event(
    agent="Iller_Ang",
    action="asset_generated",
    payload={"asset": "savannah_v3.mp4", "duration_s": 95},
    customer_uid="cust_alice",   # SHA-256 hashed with FOAI_PII_SALT before write
)
```

That's it. Engine + salt resolve from env on first call (module-level lazy singleton).

For tests + cross-service DI:

```python
from sqlalchemy import create_engine
from runtime.audit_ledger import AuditWriter
from runtime.audit_ledger.config import WriterSettings

engine = create_engine("sqlite:///:memory:")
writer = AuditWriter(engine, WriterSettings(FOAI_PII_SALT="test-salt"))
writer.init_schema_for_tests()
event_id = writer.write(agent="Test_Agent", action="test_action")
```

## Coastal-protection invariants (defense in depth)

Per standing memory `feedback_secure_coastal_in_all_ways_during_foai_work_2026_05_15`:

1. **`customer_uid` SHA-256 hashed with `FOAI_PII_SALT` before write** — raw customer UIDs never hit the DB. Fall-back: `TASKADE_PII_SALT` env if `FOAI_PII_SALT` not set (same physical salt for write-time + Taskade-render-time correlation).
2. **Fail-closed when salt is empty** — `write_event(..., customer_uid="x")` with `FOAI_PII_SALT=""` raises `ValueError`. Writer refuses to leak raw PII.
3. **Payload values under PII-pattern keys auto-hashed** — keys matching `customer_id`, `user_email`, `phone_number`, `stripe_customer`, `mercury_account`, `ssn`, etc. (case-insensitive) get their string values hashed in place. Nested dicts + lists walked recursively. See `redactors._PII_KEY_PATTERNS` for the full list.
4. **Agent + action canonicalized** — control chars stripped, length bounded (agent 128, action 256). Empty post-canon raises `ValueError`.
5. **No write surface for Coastal supplier name** — caller responsibility; the writer logs at `info` so accidental supplier leakage in `action` shows up in log review.

## Env config

| Var | Default | Purpose |
|---|---|---|
| `FOAI_AUDIT_LEDGER_URL` | `sqlite:///:memory:` | Neon Postgres URL for production; SQLite for tests |
| `NEON_DATABASE_URL` | — | Fall-back if `FOAI_AUDIT_LEDGER_URL` is default; shared with sync worker |
| `FOAI_PII_SALT` | `""` | 32-byte random per-deployment salt |
| `TASKADE_PII_SALT` | — | Fall-back salt name during env migration |

Production Neon role: SELECT denied; INSERT on `foai.audit_ledger` only. Reader (sync worker) + HRPMO loop have separate roles per `services/taskade_sync_worker/schema/README.md`.

## What this PR does NOT do

- Does NOT migrate Coastal's existing `coastal-brewing/scripts/audit_ledger.py` (SQLite-backed) to use this library. That is a Coastal-touching change and ships as a separate owner-gated PR per the Coastal-protection directive.
- Does NOT wire the Chicken Hawk gateway `/audit` endpoint to call this library. Same reasoning — separate gateway PR with its own test plan.
- Does NOT replace the in-memory `_RUN_LEDGER` in `chicken-hawk/gateway/main.py`. Separate gateway PR.

These deferred follow-on PRs unblock once owner confirms canonical Neon connection is provisioned + `FOAI_PII_SALT` minted.

## Tests

```bash
# From foai/ repo root
pip install -r runtime/audit_ledger/requirements.txt
PYTHONPATH=. pytest runtime/audit_ledger/tests/ -v
```

17 pytest cases: happy-path write + round trip, PII hashing, fail-closed-no-salt, payload PII auto-hash (nested dicts + lists), agent/action canonicalization (XSS/control-char strip), length bounds, empty-after-canon error, direct redactor unit tests.

The repo CI's "Python Runtime Tests" job runs from `runtime/` — **these tests SHOULD pick up automatically** (unlike the `services/` tests). Verify on first PR push.
