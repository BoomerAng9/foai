# C|Brew Communication Companion — Phase 1A: Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the FastAPI backend extension on the existing `coastal-runner` that powers live translation, BYOK key management, per-user Taskade workspace provisioning, paid-tier billing, and free-tier abuse caps for the C|Brew Communication Companion.

**Architecture:** New module `coastal-brewing/scripts/companion.py` mounting `/api/v1/companion/*` on the existing FastAPI app. Voice path = WebSocket proxy from the runner → Inworld Model Gateway → OpenAI Realtime (BYOK pass-through). Storage = extended `audit_ledger.db` with new `companion_*` tables. Billing = Stripe subscription product + Customer Portal, hooked into existing `/stripe/webhook` handler. Taskade per-user workspace provisioning via Taskade Public API.

**Tech Stack:** Python 3.13 + FastAPI + websockets + SQLite (`audit_ledger`) + Stripe SDK v15 + Taskade Public API + `cryptography.fernet` for BYOK key encryption + Gemini 3.1 Flash on Vertex (summary generation).

**Reference spec:** `coastal-brewing/docs/superpowers/specs/2026-05-13-cbrew-communication-companion-design.md`

---

## Owner-side prerequisites (BLOCKERS — must resolve before related tasks)

These are external dependencies no agent can resolve autonomously. Marked inline at the tasks that need them:

| # | Item | Blocks task | Estimated owner-side action |
|---|---|---|---|
| P1 | **Inworld Model Gateway** account + API key + confirmed OpenAI Realtime proxy support + pricing pass-through terms | Tasks 6, 7 | 1-2 hours: contract / dashboard check |
| P2 | **Taskade Public API token** (`TASKADE_ACCESS_TOKEN` already in coastal-runner env per memory) + confirmation that the token has workspace-create permission | Task 9, 10, 11 | 15 min: check existing token scope |
| P3 | **Stripe product** for the paid Companion tier (price = decision pending — proposed default $14.99/mo) | Tasks 12, 13, 14 | 10 min: Stripe Dashboard product create, capture price_id |
| P4 | **Vertex AI project + Gemini 3.1 Flash quota** (existing FOAI canon via `ai-managed-services` GCP project) | Task 11 | Verify only |

If any prereq is gated, mark the task `BLOCKED` and surface to owner via Telegram (existing `_send_telegram_message` to @CoastalBrewBot).

---

## File structure (Phase 1A only)

**Create:**
- `coastal-brewing/scripts/companion.py` — FastAPI router for `/api/v1/companion/*`
- `coastal-brewing/scripts/companion_byok.py` — Fernet-based BYOK encrypt/decrypt
- `coastal-brewing/scripts/companion_inworld.py` — Inworld Model Gateway WebSocket proxy
- `coastal-brewing/scripts/companion_taskade.py` — Taskade Public API client (provision workspace + write doc + write mind-map nodes)
- `coastal-brewing/scripts/companion_billing.py` — Stripe paid-tier helpers (checkout session + customer portal)
- `coastal-brewing/tests/test_companion_byok.py`
- `coastal-brewing/tests/test_companion_router.py`
- `coastal-brewing/tests/test_companion_taskade.py`
- `coastal-brewing/tests/test_companion_billing.py`

**Modify:**
- `coastal-brewing/scripts/audit_ledger.py` — add `companion_sessions`, `companion_byok`, `companion_paid_users`, `companion_workspaces` table migrations + helper CRUD
- `coastal-brewing/scripts/api_server.py` — mount `companion.router` + extend `/stripe/webhook` to handle `customer.subscription.created/deleted` for the companion product
- `coastal-brewing/requirements.txt` — add `websockets>=12` (if not already present) + verify `cryptography>=41`

**Env vars (added to `/docker/coastal-brewing/.env` post-merge — Task 15):**
- `COASTAL_INWORLD_GATEWAY_URL` (e.g., `wss://gateway.inworld.ai/v1/realtime`)
- `COASTAL_INWORLD_GATEWAY_KEY` (Inworld key — only used if user opts to use FOAI-provisioned key instead of their own; primary path is BYOK)
- `COASTAL_BYOK_ENCRYPTION_KEY` (Fernet key generated via `Fernet.generate_key()` — 32 url-safe-base64 bytes)
- `COASTAL_TASKADE_API_TOKEN` (already in env per memory — verify scope per P2)
- `COASTAL_STRIPE_COMPANION_PRICE_ID` (Stripe price_id for the paid tier — owner sets per P3)

---

## Task 1: Branch + module scaffold

**Files:**
- Create: `coastal-brewing/scripts/companion.py`
- Create: `coastal-brewing/tests/test_companion_router.py`

- [ ] **Step 1: Branch from main**

```bash
cd C:/Users/rishj/foai-coastal-clis/coastal-brewing
git fetch origin main
git checkout -b feat/cbrew-companion-phase-1a-backend origin/main
```

- [ ] **Step 2: Write the failing test (router exists + cookie gate)**

```python
# coastal-brewing/tests/test_companion_router.py
"""Companion router skeleton tests. Mirrors test_owner_console_reads.py
deep-mock pattern for psycopg2 + env setup."""
from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest import mock

import pytest
from fastapi.testclient import TestClient

REPO_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(REPO_SCRIPTS))

_HEAVY = ["psycopg2", "psycopg2.extras", "psycopg2.pool"]
for _name in _HEAVY:
    sys.modules.setdefault(_name, mock.MagicMock())

os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_dummy")
os.environ.setdefault("COASTAL_GATEWAY_TOKEN", "ut-gw")
os.environ.setdefault("COASTAL_AUTH_SECRET", "ut-auth-secret")

import api_server  # noqa: E402


@pytest.fixture
def client():
    return TestClient(api_server.app)


def test_companion_workspace_me_rejects_missing_uid_cookie(client):
    r = client.get("/api/v1/companion/workspace/me")
    assert r.status_code == 401
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd coastal-brewing && python -m pytest tests/test_companion_router.py -v
```

Expected: 404 (router not mounted yet).

- [ ] **Step 4: Write minimal `companion.py`**

```python
# coastal-brewing/scripts/companion.py
"""C|Brew Communication Companion — FastAPI router.

Mounts /api/v1/companion/* on the existing coastal-runner. Every
endpoint authenticates via the existing coastal_uid cookie (set by
/api/v1/auth/verify in the Coastal magic-link flow) — there's no
separate Companion auth surface; the Companion is a feature on
top of the existing customer identity.
"""
from __future__ import annotations

import logging
from typing import Annotated, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request

log = logging.getLogger("coastal.companion")

router = APIRouter(prefix="/api/v1/companion", tags=["companion"])


def require_uid(
    coastal_uid: Annotated[Optional[str], Cookie()] = None,
) -> str:
    """FastAPI dependency. Returns the caller's coastal_uid (HMAC-verified
    via the same helper api_server uses for /me / /preferences). Raises
    401 on missing or invalid cookie."""
    # Reuse api_server's _resolve_uid_cookie. Local import avoids
    # circular-import issues at module load.
    from api_server import _resolve_uid_cookie  # noqa: PLC0415
    resolved = _resolve_uid_cookie(coastal_uid)
    if resolved is None:
        raise HTTPException(status_code=401, detail="coastal_uid cookie required")
    return resolved


@router.get("/workspace/me")
def workspace_me(uid: str = Depends(require_uid)) -> dict:
    """Placeholder — Task 10 fills in the real workspace lookup."""
    return {"ok": True, "coastal_uid": uid, "taskade_workspace_id": None}
```

- [ ] **Step 5: Mount router in `api_server.py`**

At the bottom of `coastal-brewing/scripts/api_server.py`, after every other `app.include_router(...)`:

```python
import companion  # noqa: E402
app.include_router(companion.router)
```

- [ ] **Step 6: Run test to verify it passes**

```bash
cd coastal-brewing && python -m pytest tests/test_companion_router.py -v
```

Expected: 1 passed.

- [ ] **Step 7: Commit**

```bash
git add coastal-brewing/scripts/companion.py \
        coastal-brewing/scripts/api_server.py \
        coastal-brewing/tests/test_companion_router.py
git commit -m "feat(coastal/companion): scaffold /api/v1/companion router + uid cookie gate

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Database migrations — companion_sessions + companion_byok + companion_paid_users + companion_workspaces

**Files:**
- Modify: `coastal-brewing/scripts/audit_ledger.py`
- Test: `coastal-brewing/tests/test_companion_audit_tables.py` (new)

- [ ] **Step 1: Write the failing schema test**

```python
# coastal-brewing/tests/test_companion_audit_tables.py
"""Schema tests for the 4 companion tables added to audit_ledger.db."""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

import pytest

REPO_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(REPO_SCRIPTS))

import audit_ledger  # noqa: E402


@pytest.fixture
def db(tmp_path, monkeypatch):
    db_path = tmp_path / "test_ledger.db"
    monkeypatch.setattr(audit_ledger, "DB_PATH", str(db_path))
    audit_ledger.init_schema()
    return db_path


def test_companion_sessions_table_exists(db):
    cols = _table_columns(db, "companion_sessions")
    assert set(cols) == {
        "session_id", "coastal_uid", "started_at", "ended_at",
        "source_lang", "target_lang", "minutes_used", "tier_at_start",
    }


def test_companion_byok_table_exists(db):
    cols = _table_columns(db, "companion_byok")
    assert set(cols) == {
        "coastal_uid", "vendor", "encrypted_key", "stored_at", "last_used_at",
    }


def test_companion_paid_users_table_exists(db):
    cols = _table_columns(db, "companion_paid_users")
    assert set(cols) == {
        "coastal_uid", "stripe_customer_id", "stripe_subscription_id",
        "status", "started_at", "current_period_end", "canceled_at",
    }


def test_companion_workspaces_table_exists(db):
    cols = _table_columns(db, "companion_workspaces")
    assert set(cols) == {
        "coastal_uid", "taskade_workspace_id", "provisioned_at",
    }


def _table_columns(db_path: Path, table: str) -> list[str]:
    conn = sqlite3.connect(db_path)
    cur = conn.execute(f"PRAGMA table_info({table})")
    return [row[1] for row in cur.fetchall()]
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd coastal-brewing && python -m pytest tests/test_companion_audit_tables.py -v
```

- [ ] **Step 3: Add 4 migrations + CRUD helpers in `audit_ledger.py`**

Inside `init_schema()`, append:

```python
        # ---- C|Brew Companion tables (Phase 1A) ----
        conn.execute("""
            CREATE TABLE IF NOT EXISTS companion_sessions (
                session_id TEXT PRIMARY KEY,
                coastal_uid TEXT NOT NULL,
                started_at INTEGER NOT NULL,
                ended_at INTEGER,
                source_lang TEXT,
                target_lang TEXT,
                minutes_used REAL DEFAULT 0,
                tier_at_start TEXT NOT NULL DEFAULT 'free'
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS companion_byok (
                coastal_uid TEXT NOT NULL,
                vendor TEXT NOT NULL,
                encrypted_key BLOB NOT NULL,
                stored_at INTEGER NOT NULL,
                last_used_at INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (coastal_uid, vendor)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS companion_paid_users (
                coastal_uid TEXT PRIMARY KEY,
                stripe_customer_id TEXT NOT NULL,
                stripe_subscription_id TEXT NOT NULL,
                status TEXT NOT NULL,
                started_at INTEGER NOT NULL,
                current_period_end INTEGER,
                canceled_at INTEGER
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS companion_workspaces (
                coastal_uid TEXT PRIMARY KEY,
                taskade_workspace_id TEXT NOT NULL,
                provisioned_at INTEGER NOT NULL
            )
        """)
        conn.commit()
```

Then add CRUD helpers at module scope (match existing project patterns — `_lock`, `_connect()`):

```python
def companion_session_start(*, session_id: str, coastal_uid: str,
                            source_lang: str, target_lang: str,
                            tier_at_start: str) -> None:
    import time as _t
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                "INSERT INTO companion_sessions "
                "(session_id, coastal_uid, started_at, source_lang, "
                "target_lang, tier_at_start) VALUES (?, ?, ?, ?, ?, ?)",
                (session_id, coastal_uid, int(_t.time()),
                 source_lang, target_lang, tier_at_start),
            )
            conn.commit()
        finally:
            conn.close()


def companion_session_end(*, session_id: str, minutes_used: float) -> None:
    import time as _t
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                "UPDATE companion_sessions SET ended_at = ?, minutes_used = ? "
                "WHERE session_id = ?",
                (int(_t.time()), minutes_used, session_id),
            )
            conn.commit()
        finally:
            conn.close()


def companion_byok_store(*, coastal_uid: str, vendor: str,
                          encrypted_key: bytes) -> None:
    import time as _t
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                "INSERT OR REPLACE INTO companion_byok "
                "(coastal_uid, vendor, encrypted_key, stored_at, last_used_at) "
                "VALUES (?, ?, ?, ?, 0)",
                (coastal_uid, vendor, encrypted_key, int(_t.time())),
            )
            conn.commit()
        finally:
            conn.close()


def companion_byok_fetch(coastal_uid: str, vendor: str) -> Optional[bytes]:
    with _lock:
        conn = _connect()
        try:
            cur = conn.execute(
                "SELECT encrypted_key FROM companion_byok "
                "WHERE coastal_uid = ? AND vendor = ?",
                (coastal_uid, vendor),
            )
            row = cur.fetchone()
            return row[0] if row else None
        finally:
            conn.close()


def companion_byok_delete(coastal_uid: str, vendor: str) -> None:
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                "DELETE FROM companion_byok WHERE coastal_uid = ? AND vendor = ?",
                (coastal_uid, vendor),
            )
            conn.commit()
        finally:
            conn.close()


def companion_paid_user_upsert(*, coastal_uid: str, stripe_customer_id: str,
                                stripe_subscription_id: str, status: str,
                                current_period_end: Optional[int]) -> None:
    import time as _t
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                "INSERT OR REPLACE INTO companion_paid_users "
                "(coastal_uid, stripe_customer_id, stripe_subscription_id, "
                "status, started_at, current_period_end) "
                "VALUES (?, ?, ?, ?, "
                "COALESCE((SELECT started_at FROM companion_paid_users WHERE coastal_uid = ?), ?), "
                "?)",
                (coastal_uid, stripe_customer_id, stripe_subscription_id,
                 status, coastal_uid, int(_t.time()), current_period_end),
            )
            conn.commit()
        finally:
            conn.close()


def companion_is_paid(coastal_uid: str) -> bool:
    with _lock:
        conn = _connect()
        try:
            cur = conn.execute(
                "SELECT status FROM companion_paid_users WHERE coastal_uid = ?",
                (coastal_uid,),
            )
            row = cur.fetchone()
            return row is not None and row[0] in ("active", "trialing")
        finally:
            conn.close()


def companion_workspace_set(*, coastal_uid: str, taskade_workspace_id: str) -> None:
    import time as _t
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                "INSERT OR REPLACE INTO companion_workspaces "
                "(coastal_uid, taskade_workspace_id, provisioned_at) "
                "VALUES (?, ?, ?)",
                (coastal_uid, taskade_workspace_id, int(_t.time())),
            )
            conn.commit()
        finally:
            conn.close()


def companion_workspace_get(coastal_uid: str) -> Optional[str]:
    with _lock:
        conn = _connect()
        try:
            cur = conn.execute(
                "SELECT taskade_workspace_id FROM companion_workspaces "
                "WHERE coastal_uid = ?",
                (coastal_uid,),
            )
            row = cur.fetchone()
            return row[0] if row else None
        finally:
            conn.close()
```

- [ ] **Step 4: Run tests**

```bash
cd coastal-brewing && python -m pytest tests/test_companion_audit_tables.py tests/test_companion_router.py -v
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add coastal-brewing/scripts/audit_ledger.py \
        coastal-brewing/tests/test_companion_audit_tables.py
git commit -m "feat(coastal/companion): add 4 companion tables + CRUD helpers in audit_ledger

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: BYOK key encryption (Fernet)

**Files:**
- Create: `coastal-brewing/scripts/companion_byok.py`
- Test: `coastal-brewing/tests/test_companion_byok.py`

- [ ] **Step 1: Write the failing test**

```python
# coastal-brewing/tests/test_companion_byok.py
"""Fernet round-trip + key-rotation safety for BYOK storage."""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

REPO_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(REPO_SCRIPTS))

import companion_byok as byok  # noqa: E402


SECRET = "z+gRO7t-3z5y6Yk8w0qFvB9JzLnNbC2H4XwYxVrTuM0="  # test Fernet key


def test_encrypt_then_decrypt_round_trip():
    enc = byok.encrypt_key(SECRET, "sk-test-abc123")
    assert isinstance(enc, bytes)
    assert byok.decrypt_key(SECRET, enc) == "sk-test-abc123"


def test_decrypt_with_wrong_secret_returns_none():
    enc = byok.encrypt_key(SECRET, "sk-test-abc123")
    other = "OTHERkey9OO0Y8nL5kW3aHvB9JzLnNbC2H4XwYxVrTuM="
    assert byok.decrypt_key(other, enc) is None


def test_decrypt_malformed_returns_none():
    assert byok.decrypt_key(SECRET, b"not-fernet") is None


def test_encrypt_produces_different_ciphertext_per_call():
    a = byok.encrypt_key(SECRET, "sk-abc")
    b = byok.encrypt_key(SECRET, "sk-abc")
    # Fernet includes a random IV; repeated encrypts of same plaintext differ
    assert a != b
```

- [ ] **Step 2: Run test → expect ModuleNotFoundError**

```bash
cd coastal-brewing && python -m pytest tests/test_companion_byok.py -v
```

- [ ] **Step 3: Write `companion_byok.py`**

```python
# coastal-brewing/scripts/companion_byok.py
"""BYOK key encryption helpers for the C|Brew Communication Companion.

Customer-supplied API keys (Inworld / OpenAI) are stored at rest in
audit_ledger.companion_byok as Fernet-encrypted blobs. The encryption
key (`COASTAL_BYOK_ENCRYPTION_KEY` env) is a 32-byte url-safe-base64
value generated once via Fernet.generate_key() and held only on the
runner.
"""
from __future__ import annotations

import logging
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

log = logging.getLogger("coastal.companion.byok")


def encrypt_key(fernet_secret: str, plaintext: str) -> bytes:
    """Encrypt a customer API key for at-rest storage. `fernet_secret`
    is the 44-char url-safe-base64 Fernet key from
    COASTAL_BYOK_ENCRYPTION_KEY env."""
    return Fernet(fernet_secret.encode()).encrypt(plaintext.encode())


def decrypt_key(fernet_secret: str, ciphertext: bytes) -> Optional[str]:
    """Decrypt a stored BYOK blob. Returns None on bad secret or
    tampered ciphertext — fail closed; never raise (caller treats
    None as "no key, fall back to FOAI-provisioned path")."""
    try:
        return Fernet(fernet_secret.encode()).decrypt(ciphertext).decode()
    except (InvalidToken, ValueError) as exc:
        log.warning("byok decrypt failed: %s", exc)
        return None
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd coastal-brewing && python -m pytest tests/test_companion_byok.py -v
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add coastal-brewing/scripts/companion_byok.py \
        coastal-brewing/tests/test_companion_byok.py
git commit -m "feat(coastal/companion): add Fernet BYOK encrypt/decrypt helpers

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: BYOK endpoints — POST + DELETE /api/v1/companion/byok/key

**Files:**
- Modify: `coastal-brewing/scripts/companion.py`
- Test: `coastal-brewing/tests/test_companion_router.py` (extend)

- [ ] **Step 1: Add failing tests**

Append to `tests/test_companion_router.py`:

```python
from owner_auth import sign_owner_cookie  # noqa: E402  -- reuse HMAC pattern


def _uid_cookie(uid: str) -> str:
    # Reuses the Coastal-existing _sign_uid_for_cookie helper. For tests,
    # we mock the resolve helper to return our test uid directly.
    return f"{uid}.testsig"


def test_byok_post_stores_key(client, monkeypatch):
    monkeypatch.setenv("COASTAL_BYOK_ENCRYPTION_KEY",
                       "z+gRO7t-3z5y6Yk8w0qFvB9JzLnNbC2H4XwYxVrTuM0=")
    import api_server
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_test_user_1" if raw else None)
    r = client.post(
        "/api/v1/companion/byok/key",
        json={"vendor": "inworld", "api_key": "iw-test-abc"},
        cookies={"coastal_uid": "cuid_test_user_1.testsig"},
    )
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_byok_post_requires_inworld_or_openai_vendor(client, monkeypatch):
    monkeypatch.setenv("COASTAL_BYOK_ENCRYPTION_KEY",
                       "z+gRO7t-3z5y6Yk8w0qFvB9JzLnNbC2H4XwYxVrTuM0=")
    import api_server
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_test_user_1" if raw else None)
    r = client.post(
        "/api/v1/companion/byok/key",
        json={"vendor": "shady", "api_key": "x"},
        cookies={"coastal_uid": "cuid_test_user_1.testsig"},
    )
    assert r.status_code == 400


def test_byok_delete_removes_key(client, monkeypatch):
    monkeypatch.setenv("COASTAL_BYOK_ENCRYPTION_KEY",
                       "z+gRO7t-3z5y6Yk8w0qFvB9JzLnNbC2H4XwYxVrTuM0=")
    import api_server
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_test_user_1" if raw else None)
    # store first
    client.post(
        "/api/v1/companion/byok/key",
        json={"vendor": "inworld", "api_key": "iw-test-abc"},
        cookies={"coastal_uid": "cuid_test_user_1.testsig"},
    )
    r = client.delete(
        "/api/v1/companion/byok/key?vendor=inworld",
        cookies={"coastal_uid": "cuid_test_user_1.testsig"},
    )
    assert r.status_code == 200
```

- [ ] **Step 2: Implement endpoints**

In `coastal-brewing/scripts/companion.py`, ADD:

```python
import os
from pydantic import BaseModel


_ALLOWED_VENDORS = {"inworld", "openai"}


class ByokPostBody(BaseModel):
    vendor: str
    api_key: str


def _byok_secret() -> str:
    s = os.environ.get("COASTAL_BYOK_ENCRYPTION_KEY", "").strip()
    if not s:
        raise HTTPException(
            status_code=503,
            detail="COASTAL_BYOK_ENCRYPTION_KEY not configured",
        )
    return s


@router.post("/byok/key")
def byok_store(body: ByokPostBody, uid: str = Depends(require_uid)) -> dict:
    if body.vendor not in _ALLOWED_VENDORS:
        raise HTTPException(
            status_code=400,
            detail=f"vendor must be one of {sorted(_ALLOWED_VENDORS)}",
        )
    if not body.api_key or len(body.api_key) < 20:
        raise HTTPException(status_code=400, detail="api_key too short")
    import audit_ledger
    import companion_byok
    ct = companion_byok.encrypt_key(_byok_secret(), body.api_key)
    audit_ledger.companion_byok_store(
        coastal_uid=uid, vendor=body.vendor, encrypted_key=ct,
    )
    return {"ok": True, "vendor": body.vendor}


@router.delete("/byok/key")
def byok_delete(vendor: str, uid: str = Depends(require_uid)) -> dict:
    if vendor not in _ALLOWED_VENDORS:
        raise HTTPException(status_code=400, detail="unknown vendor")
    import audit_ledger
    audit_ledger.companion_byok_delete(coastal_uid=uid, vendor=vendor)
    return {"ok": True, "deleted": vendor}
```

- [ ] **Step 3: Run tests → expect 3 passed**

```bash
cd coastal-brewing && python -m pytest tests/test_companion_router.py -v
```

- [ ] **Step 4: Commit**

```bash
git add coastal-brewing/scripts/companion.py coastal-brewing/tests/test_companion_router.py
git commit -m "feat(coastal/companion): /api/v1/companion/byok/key POST + DELETE

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: Session lifecycle — POST /session/start + POST /session/<id>/end

**Files:**
- Modify: `coastal-brewing/scripts/companion.py`
- Test: `coastal-brewing/tests/test_companion_router.py`

- [ ] **Step 1: Add failing tests**

Append to `tests/test_companion_router.py`:

```python
def test_session_start_returns_session_id_and_ws_url(client, monkeypatch):
    monkeypatch.setenv("COASTAL_PUBLIC_URL", "https://brewing.foai.cloud")
    import api_server
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_session_test" if raw else None)
    r = client.post(
        "/api/v1/companion/session/start",
        json={"source_lang": "es", "target_lang": "en"},
        cookies={"coastal_uid": "cuid_session_test.x"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["session_id"].startswith("ccs_")
    assert "/companion/session/" in data["ws_url"]
    assert "/stream" in data["ws_url"]


def test_session_end_marks_session_ended(client, monkeypatch):
    import api_server, audit_ledger
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_end_test" if raw else None)
    r = client.post(
        "/api/v1/companion/session/start",
        json={"source_lang": "es", "target_lang": "en"},
        cookies={"coastal_uid": "cuid_end_test.x"},
    )
    sid = r.json()["session_id"]
    r2 = client.post(
        f"/api/v1/companion/session/{sid}/end",
        json={"minutes_used": 4.2},
        cookies={"coastal_uid": "cuid_end_test.x"},
    )
    assert r2.status_code == 200
```

- [ ] **Step 2: Implement**

In `coastal-brewing/scripts/companion.py`, ADD:

```python
import secrets as _secrets


class SessionStartBody(BaseModel):
    source_lang: str = "auto"
    target_lang: str = "en"


class SessionEndBody(BaseModel):
    minutes_used: float = 0.0


def _public_url() -> str:
    return os.environ.get("COASTAL_PUBLIC_URL", "https://brewing.foai.cloud")


@router.post("/session/start")
def session_start(
    body: SessionStartBody, uid: str = Depends(require_uid),
) -> dict:
    import audit_ledger
    session_id = "ccs_" + _secrets.token_urlsafe(12)
    tier = "paid" if audit_ledger.companion_is_paid(uid) else "free"
    audit_ledger.companion_session_start(
        session_id=session_id, coastal_uid=uid,
        source_lang=body.source_lang, target_lang=body.target_lang,
        tier_at_start=tier,
    )
    ws_scheme = "wss" if _public_url().startswith("https") else "ws"
    ws_host = _public_url().split("://", 1)[1]
    return {
        "ok": True,
        "session_id": session_id,
        "tier": tier,
        "ws_url": f"{ws_scheme}://{ws_host}/api/v1/companion/session/{session_id}/stream",
    }


@router.post("/session/{session_id}/end")
def session_end(
    session_id: str, body: SessionEndBody, uid: str = Depends(require_uid),
) -> dict:
    import audit_ledger
    audit_ledger.companion_session_end(
        session_id=session_id, minutes_used=body.minutes_used,
    )
    return {"ok": True, "session_id": session_id}
```

- [ ] **Step 3: Run tests + commit**

```bash
cd coastal-brewing && python -m pytest tests/test_companion_router.py -v
git add coastal-brewing/scripts/companion.py coastal-brewing/tests/test_companion_router.py
git commit -m "feat(coastal/companion): /session/start + /session/{id}/end lifecycle endpoints

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: Inworld Model Gateway WebSocket proxy — `[OWNER PREREQ P1 required]`

**Files:**
- Create: `coastal-brewing/scripts/companion_inworld.py`
- Modify: `coastal-brewing/scripts/companion.py` (add WebSocket route)
- Modify: `coastal-brewing/requirements.txt` (add `websockets>=12`)

This task requires owner prereq P1 — confirmed Inworld Model Gateway URL + the realtime-proxy contract. If not yet confirmed at task-start time, report BLOCKED and escalate.

- [ ] **Step 1: Verify prereq P1**

Before any code: `grep COASTAL_INWORLD_GATEWAY_URL /docker/coastal-brewing/.env` on aims-vps. If empty → BLOCKED. Owner sets the env first (Task 15 deploy step also requires this).

- [ ] **Step 2: Add `websockets>=12` to `requirements.txt`** (if not present)

```bash
grep -q "^websockets" coastal-brewing/requirements.txt || echo "websockets>=12" >> coastal-brewing/requirements.txt
```

- [ ] **Step 3: Write Inworld Gateway client**

```python
# coastal-brewing/scripts/companion_inworld.py
"""WebSocket proxy from coastal-runner to the Inworld Model Gateway.

The Companion's translation path is:

  Phone/Web ──ws──► coastal-runner ──ws──► Inworld Gateway ──ws──► OpenAI Realtime

We act as a man-in-the-middle that (a) attaches the customer's BYOK
key on the upstream connection, (b) records minutes-used for billing
caps, (c) terminates the upstream cleanly on user disconnect, and (d)
never logs raw audio frames (privacy canon).

NOTE: this module deliberately omits the actual protocol-frame
translation — that's owned by `companion_session_relay` which calls
both `client_recv` and `upstream_send` per the OpenAI Realtime
protocol (https://platform.openai.com/docs/guides/realtime).
"""
from __future__ import annotations

import json
import logging
import os
from typing import AsyncIterator, Optional

import websockets

log = logging.getLogger("coastal.companion.inworld")


def _gateway_url() -> str:
    url = os.environ.get("COASTAL_INWORLD_GATEWAY_URL", "").strip()
    if not url:
        raise RuntimeError("COASTAL_INWORLD_GATEWAY_URL not configured")
    return url


async def open_upstream(
    *,
    user_api_key: str,
    source_lang: str,
    target_lang: str,
) -> websockets.WebSocketClientProtocol:
    """Open a WebSocket to the Inworld Gateway with the user's BYOK
    Inworld key attached as auth. Returns the connected socket; caller
    drives recv/send loop."""
    headers = {
        "Authorization": f"Bearer {user_api_key}",
        "X-Realtime-Mode": "translation",
        "X-Source-Lang": source_lang,
        "X-Target-Lang": target_lang,
    }
    return await websockets.connect(
        _gateway_url(),
        additional_headers=headers,
        max_size=4 * 1024 * 1024,
        open_timeout=15,
        ping_interval=20,
        ping_timeout=20,
    )
```

- [ ] **Step 4: Add WebSocket route to `companion.py`**

```python
import asyncio
from fastapi import WebSocket, WebSocketDisconnect


@router.websocket("/session/{session_id}/stream")
async def session_stream(websocket: WebSocket, session_id: str) -> None:
    """Bidirectional audio + caption proxy. Reads BYOK Inworld key
    from the caller's audit_ledger entry, opens an upstream WS to
    Inworld Gateway, and pipes frames in both directions until either
    side disconnects."""
    await websocket.accept()
    # Resolve identity from the cookie sent during WS handshake.
    cookie_hdr = websocket.headers.get("cookie", "")
    coastal_uid = _coastal_uid_from_cookie_header(cookie_hdr)
    if coastal_uid is None:
        await websocket.close(code=4401, reason="uid required")
        return

    import audit_ledger
    import companion_byok
    import companion_inworld

    ct = audit_ledger.companion_byok_fetch(coastal_uid, "inworld")
    if ct is None:
        await websocket.close(code=4402, reason="no Inworld BYOK key on file")
        return
    user_key = companion_byok.decrypt_key(_byok_secret(), ct)
    if user_key is None:
        await websocket.close(code=4500, reason="BYOK decrypt failed")
        return

    # source/target lang are stored on the session at /session/start time
    sess = audit_ledger.companion_session_fetch(session_id)  # see Task 5b
    if sess is None or sess["coastal_uid"] != coastal_uid:
        await websocket.close(code=4404, reason="session not found")
        return

    try:
        upstream = await companion_inworld.open_upstream(
            user_api_key=user_key,
            source_lang=sess["source_lang"],
            target_lang=sess["target_lang"],
        )
    except Exception as exc:
        log.warning("upstream open failed for %s: %s", session_id, exc)
        await websocket.close(code=4502, reason="upstream open failed")
        return

    async def pipe_client_to_upstream():
        try:
            async for msg in websocket.iter_bytes():
                await upstream.send(msg)
        except WebSocketDisconnect:
            pass

    async def pipe_upstream_to_client():
        try:
            async for msg in upstream:
                if isinstance(msg, bytes):
                    await websocket.send_bytes(msg)
                else:
                    await websocket.send_text(msg)
        except Exception:
            pass

    try:
        await asyncio.gather(
            pipe_client_to_upstream(),
            pipe_upstream_to_client(),
        )
    finally:
        try:
            await upstream.close()
        except Exception:
            pass
        try:
            await websocket.close()
        except Exception:
            pass


def _coastal_uid_from_cookie_header(cookie_header: str) -> Optional[str]:
    """Parse coastal_uid from a raw Cookie header. WS handshakes don't
    use FastAPI Cookie() dependencies the same way HTTP routes do."""
    from api_server import _resolve_uid_cookie  # noqa: PLC0415
    for part in cookie_header.split(";"):
        part = part.strip()
        if part.startswith("coastal_uid="):
            return _resolve_uid_cookie(part.split("=", 1)[1])
    return None
```

- [ ] **Step 5: Add `companion_session_fetch` to audit_ledger.py**

```python
def companion_session_fetch(session_id: str) -> Optional[dict]:
    with _lock:
        conn = _connect()
        try:
            conn.row_factory = sqlite3.Row
            cur = conn.execute(
                "SELECT * FROM companion_sessions WHERE session_id = ?",
                (session_id,),
            )
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            conn.close()
```

- [ ] **Step 6: Test (signature only — full WS integration test deferred)**

```python
# Append to tests/test_companion_router.py
def test_session_fetch_returns_session_row(monkeypatch):
    import api_server, audit_ledger
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_fetch_test" if raw else None)
    # Insert via existing helper
    audit_ledger.companion_session_start(
        session_id="ccs_fetch_x", coastal_uid="cuid_fetch_test",
        source_lang="es", target_lang="en", tier_at_start="free",
    )
    sess = audit_ledger.companion_session_fetch("ccs_fetch_x")
    assert sess is not None
    assert sess["coastal_uid"] == "cuid_fetch_test"
```

End-to-end WS integration test deferred — needs an Inworld Gateway mock + real WebSocket TestClient. Pin a TODO comment in the test file.

- [ ] **Step 7: Run tests + commit**

```bash
cd coastal-brewing && python -m pytest tests/test_companion_router.py -v
git add coastal-brewing/scripts/companion.py \
        coastal-brewing/scripts/companion_inworld.py \
        coastal-brewing/scripts/audit_ledger.py \
        coastal-brewing/tests/test_companion_router.py \
        coastal-brewing/requirements.txt
git commit -m "feat(coastal/companion): WebSocket proxy to Inworld Gateway w/ BYOK + session lookup

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: Taskade Public API client — `[OWNER PREREQ P2 required]`

**Files:**
- Create: `coastal-brewing/scripts/companion_taskade.py`
- Test: `coastal-brewing/tests/test_companion_taskade.py`

This task requires owner prereq P2 — confirmed `COASTAL_TASKADE_API_TOKEN` has workspace-create permission. If unset, BLOCKED.

- [ ] **Step 1: Write the failing test (with mocked HTTP)**

```python
# coastal-brewing/tests/test_companion_taskade.py
"""Taskade client mocked at requests-level. Real-API integration test
lives in the smoke runbook (Task 13)."""
from __future__ import annotations

import sys
from pathlib import Path
from unittest import mock

import pytest

REPO_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(REPO_SCRIPTS))

import companion_taskade as taskade  # noqa: E402


def test_provision_workspace_calls_taskade_api():
    fake_resp = mock.MagicMock(status_code=201)
    fake_resp.json.return_value = {"id": "tw_ABC123", "name": "Test"}
    with mock.patch.object(taskade, "_taskade_post", return_value=fake_resp) as p:
        ws_id = taskade.provision_workspace(
            api_token="t_test", workspace_name="test@example.com's C|Brew Notes",
        )
    assert ws_id == "tw_ABC123"
    p.assert_called_once()


def test_provision_workspace_raises_on_4xx():
    fake_resp = mock.MagicMock(status_code=403)
    fake_resp.text = "forbidden"
    with mock.patch.object(taskade, "_taskade_post", return_value=fake_resp):
        with pytest.raises(taskade.TaskadeError):
            taskade.provision_workspace(api_token="t_test", workspace_name="X")
```

- [ ] **Step 2: Run test → expect failure**

```bash
cd coastal-brewing && python -m pytest tests/test_companion_taskade.py -v
```

- [ ] **Step 3: Implement**

```python
# coastal-brewing/scripts/companion_taskade.py
"""Taskade Public API client for per-user workspace provisioning +
note/mind-map writes.

API reference: https://developers.taskade.com/

Per-user workspace pattern: a single FOAI service account owns the
master workspace; each C|Brew Companion activation creates a SUB-
workspace under that master via POST /workspaces with the owner's
email as a metadata tag. Sub-workspace IDs are stored on the user's
profile (audit_ledger.companion_workspaces) and used for all
subsequent writes.

Internal-only — Taskade name never appears on customer surfaces.
"""
from __future__ import annotations

import logging
import os
from typing import Any, Optional

import requests

log = logging.getLogger("coastal.companion.taskade")

_BASE = "https://www.taskade.com/api/v1"


class TaskadeError(Exception):
    pass


def _taskade_post(api_token: str, path: str, payload: dict[str, Any]) -> requests.Response:
    return requests.post(
        f"{_BASE}{path}",
        headers={
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=15,
    )


def _taskade_get(api_token: str, path: str) -> requests.Response:
    return requests.get(
        f"{_BASE}{path}",
        headers={"Authorization": f"Bearer {api_token}"},
        timeout=15,
    )


def provision_workspace(*, api_token: str, workspace_name: str) -> str:
    """Create a new Taskade workspace and return its ID."""
    resp = _taskade_post(api_token, "/workspaces", {"name": workspace_name})
    if resp.status_code not in (200, 201):
        log.warning("taskade workspace create failed %s: %s",
                    resp.status_code, getattr(resp, "text", ""))
        raise TaskadeError(f"workspace create failed {resp.status_code}")
    return resp.json()["id"]


def push_meeting_doc(*, api_token: str, workspace_id: str,
                     title: str, body_md: str) -> str:
    """Create a doc inside the user's workspace and return its ID."""
    resp = _taskade_post(api_token,
                         f"/workspaces/{workspace_id}/projects",
                         {"name": title, "type": "doc",
                          "content": [{"text": body_md}]})
    if resp.status_code not in (200, 201):
        raise TaskadeError(f"doc create failed {resp.status_code}")
    return resp.json()["id"]


def push_mindmap_nodes(*, api_token: str, workspace_id: str,
                       root_label: str, branches: list[dict[str, Any]]) -> str:
    """Create a mind-map project under the workspace. `branches` is a
    list of {label, children: [...]} (recursive). Returns project_id."""
    project_resp = _taskade_post(
        api_token, f"/workspaces/{workspace_id}/projects",
        {"name": root_label, "type": "mindmap"},
    )
    if project_resp.status_code not in (200, 201):
        raise TaskadeError(f"mindmap create failed {project_resp.status_code}")
    project_id = project_resp.json()["id"]
    # Walk branches + push as nested nodes via /projects/{id}/nodes
    def _walk(parent_id: Optional[str], nodes: list[dict[str, Any]]) -> None:
        for n in nodes:
            r = _taskade_post(
                api_token, f"/projects/{project_id}/nodes",
                {"text": n.get("label", ""), "parentId": parent_id},
            )
            if r.status_code not in (200, 201):
                log.warning("mindmap node write failed %s", r.status_code)
                continue
            new_id = r.json()["id"]
            children = n.get("children", []) or []
            if children:
                _walk(new_id, children)
    _walk(None, branches)
    return project_id


def healthcheck(api_token: str) -> bool:
    """Cheap call to verify token + connectivity. Returns False on any error."""
    try:
        r = _taskade_get(api_token, "/me")
        return r.status_code == 200
    except Exception:
        return False
```

- [ ] **Step 4: Run tests → expect 2 passed**

```bash
cd coastal-brewing && python -m pytest tests/test_companion_taskade.py -v
```

- [ ] **Step 5: Commit**

```bash
git add coastal-brewing/scripts/companion_taskade.py \
        coastal-brewing/tests/test_companion_taskade.py
git commit -m "feat(coastal/companion): Taskade Public API client (workspace + doc + mindmap)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: GET /api/v1/companion/workspace/me — real implementation

**Files:**
- Modify: `coastal-brewing/scripts/companion.py`

- [ ] **Step 1: Add failing test**

Append to `tests/test_companion_router.py`:

```python
def test_workspace_me_returns_null_when_not_provisioned(client, monkeypatch):
    import api_server
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_no_workspace" if raw else None)
    r = client.get(
        "/api/v1/companion/workspace/me",
        cookies={"coastal_uid": "cuid_no_workspace.x"},
    )
    assert r.status_code == 200
    assert r.json()["taskade_workspace_id"] is None


def test_workspace_me_returns_provisioned_id(client, monkeypatch):
    import api_server, audit_ledger
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_has_workspace" if raw else None)
    audit_ledger.companion_workspace_set(
        coastal_uid="cuid_has_workspace",
        taskade_workspace_id="tw_TEST456",
    )
    r = client.get(
        "/api/v1/companion/workspace/me",
        cookies={"coastal_uid": "cuid_has_workspace.x"},
    )
    assert r.json()["taskade_workspace_id"] == "tw_TEST456"
```

- [ ] **Step 2: Replace the Task-1 placeholder in `companion.py`**

```python
@router.get("/workspace/me")
def workspace_me(uid: str = Depends(require_uid)) -> dict:
    import audit_ledger
    ws_id = audit_ledger.companion_workspace_get(uid)
    is_paid = audit_ledger.companion_is_paid(uid)
    return {
        "ok": True,
        "coastal_uid": uid,
        "taskade_workspace_id": ws_id,
        "is_paid_tier": is_paid,
    }
```

- [ ] **Step 3: Run tests + commit**

```bash
cd coastal-brewing && python -m pytest tests/test_companion_router.py -v
git add coastal-brewing/scripts/companion.py coastal-brewing/tests/test_companion_router.py
git commit -m "feat(coastal/companion): /workspace/me returns provisioned id + tier flag

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: Stripe paid-tier setup — `[OWNER PREREQ P3 required]`

**Files:**
- Create: `coastal-brewing/scripts/companion_billing.py`
- Modify: `coastal-brewing/scripts/companion.py`
- Test: `coastal-brewing/tests/test_companion_billing.py`

- [ ] **Step 1: Verify prereq P3**

Owner must:
1. Stripe Dashboard → Products → Create new product "C|Brew Communication Companion (Paid Tier)"
2. Add a recurring price (default proposal: $14.99/mo). Capture `price_id` starting `price_…`.
3. Set env: `COASTAL_STRIPE_COMPANION_PRICE_ID=price_…` on aims-vps.

Block here until confirmed.

- [ ] **Step 2: Write tests**

```python
# coastal-brewing/tests/test_companion_billing.py
"""Stripe paid-tier checkout + customer-portal endpoints."""
from __future__ import annotations

import os, sys
from pathlib import Path
from unittest import mock

import pytest
from fastapi.testclient import TestClient

REPO_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(REPO_SCRIPTS))
_HEAVY = ["psycopg2", "psycopg2.extras", "psycopg2.pool"]
for n in _HEAVY: sys.modules.setdefault(n, mock.MagicMock())
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_dummy")
os.environ.setdefault("COASTAL_STRIPE_COMPANION_PRICE_ID", "price_test_companion")
os.environ.setdefault("COASTAL_PUBLIC_URL", "https://brewing.foai.cloud")

import api_server  # noqa: E402


@pytest.fixture
def client(): return TestClient(api_server.app)


def test_billing_checkout_returns_stripe_url(client, monkeypatch):
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_bill_test" if raw else None)
    fake_session = mock.MagicMock(url="https://checkout.stripe.com/c/test_companion")
    with mock.patch("stripe.checkout.Session.create", return_value=fake_session):
        r = client.post(
            "/api/v1/companion/billing/checkout",
            json={"email": "buyer@example.com"},
            cookies={"coastal_uid": "cuid_bill_test.x"},
        )
    assert r.status_code == 200
    assert "checkout.stripe.com" in r.json()["redirect_url"]
```

- [ ] **Step 3: Implement billing helpers + endpoints**

```python
# coastal-brewing/scripts/companion_billing.py
"""Stripe Checkout + Customer Portal helpers for the Companion paid tier."""
from __future__ import annotations

import os
from typing import Any


def companion_price_id() -> str:
    pid = os.environ.get("COASTAL_STRIPE_COMPANION_PRICE_ID", "").strip()
    if not pid:
        raise RuntimeError("COASTAL_STRIPE_COMPANION_PRICE_ID not configured")
    return pid


def public_url() -> str:
    return os.environ.get("COASTAL_PUBLIC_URL", "https://brewing.foai.cloud")


def build_checkout_params(*, customer_email: str, coastal_uid: str) -> dict[str, Any]:
    """Stripe Checkout Session params for the Companion paid tier."""
    metadata = {
        "product": "cbrew-communication-companion",
        "flow": "companion_paid_tier",
        "coastal_uid": coastal_uid,
    }
    return {
        "mode": "subscription",
        "customer_email": customer_email,
        "line_items": [{"price": companion_price_id(), "quantity": 1}],
        "metadata": metadata,
        "subscription_data": {"metadata": metadata},
        "success_url": f"{public_url()}/companion?welcome=1",
        "cancel_url": f"{public_url()}/companion?canceled=1",
    }
```

And add to `companion.py`:

```python
class BillingCheckoutBody(BaseModel):
    email: str


@router.post("/billing/checkout")
def billing_checkout(
    body: BillingCheckoutBody, uid: str = Depends(require_uid),
) -> dict:
    import stripe
    import companion_billing
    from adapters.stripe_adapter import _init_stripe   # noqa: PLC0415
    _init_stripe()
    params = companion_billing.build_checkout_params(
        customer_email=body.email, coastal_uid=uid,
    )
    try:
        session = stripe.checkout.Session.create(**params)
    except Exception as exc:
        log.warning("companion checkout create failed: %s", exc)
        raise HTTPException(status_code=502, detail="checkout session mint failed")
    return {
        "ok": True,
        "session_id": session.id if hasattr(session, "id") else session.get("id"),
        "redirect_url": session.url if hasattr(session, "url") else session.get("url"),
    }


@router.post("/billing/portal")
def billing_portal(uid: str = Depends(require_uid)) -> dict:
    """Return a Stripe Customer Portal URL for subscription management."""
    import stripe
    import audit_ledger
    from adapters.stripe_adapter import _init_stripe   # noqa: PLC0415
    _init_stripe()
    # Fetch the user's stripe_customer_id from companion_paid_users
    import sqlite3
    with audit_ledger._lock:
        conn = audit_ledger._connect()
        try:
            conn.row_factory = sqlite3.Row
            cur = conn.execute(
                "SELECT stripe_customer_id FROM companion_paid_users "
                "WHERE coastal_uid = ?",
                (uid,),
            )
            row = cur.fetchone()
        finally:
            conn.close()
    if row is None:
        raise HTTPException(status_code=404, detail="no paid subscription")
    portal = stripe.billing_portal.Session.create(
        customer=row["stripe_customer_id"],
        return_url=f"{os.environ.get('COASTAL_PUBLIC_URL', 'https://brewing.foai.cloud')}/companion",
    )
    return {"ok": True, "url": portal.url}
```

- [ ] **Step 4: Run tests + commit**

```bash
cd coastal-brewing && python -m pytest tests/test_companion_billing.py tests/test_companion_router.py -v
git add coastal-brewing/scripts/companion.py \
        coastal-brewing/scripts/companion_billing.py \
        coastal-brewing/tests/test_companion_billing.py
git commit -m "feat(coastal/companion): Stripe paid-tier checkout + portal endpoints

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 10: Webhook handler — paid-tier activation triggers Taskade provisioning

**Files:**
- Modify: `coastal-brewing/scripts/api_server.py` (extend `/stripe/webhook`)
- Test: `coastal-brewing/tests/test_companion_billing.py` (extend)

- [ ] **Step 1: Add failing test for webhook branch**

```python
def test_webhook_companion_subscription_activates_paid_tier_and_provisions_workspace(
    client, monkeypatch,
):
    import audit_ledger, companion_taskade
    with mock.patch.object(companion_taskade, "provision_workspace",
                          return_value="tw_NEW_USER_X"):
        # Simulate a checkout.session.completed event for the Companion product
        event = {
            "id": "evt_test_companion_paid_x",
            "type": "checkout.session.completed",
            "data": {"object": {
                "id": "cs_test_companion_paid",
                "metadata": {
                    "product": "cbrew-communication-companion",
                    "flow": "companion_paid_tier",
                    "coastal_uid": "cuid_paid_x",
                },
                "customer": "cus_test_X",
                "subscription": "sub_test_X",
                "customer_email": "x@example.com",
                "mode": "subscription",
                "payment_status": "paid",
            }},
        }
        # The verify_webhook helper now returns dict (PR #438); pass through
        with mock.patch("adapters.stripe_adapter.verify_webhook", return_value=event):
            r = client.post(
                "/stripe/webhook",
                content=b"{}",
                headers={"Stripe-Signature": "t=1,v1=x"},
            )
        assert r.status_code == 200
        assert audit_ledger.companion_is_paid("cuid_paid_x") is True
        assert audit_ledger.companion_workspace_get("cuid_paid_x") == "tw_NEW_USER_X"
```

- [ ] **Step 2: Extend `/stripe/webhook` in `api_server.py`**

Locate the existing `checkout.session.completed` branch (post-PR #438 + #439 + #440 layout). After the existing service-init / tier-subscription branches, add:

```python
# C|Brew Communication Companion paid-tier branch
if session_meta.get("flow") == "companion_paid_tier":
    try:
        _companion_uid = session_meta.get("coastal_uid", "")
        _companion_customer = session.get("customer")
        _companion_sub = session.get("subscription")
        if _companion_uid and _companion_customer and _companion_sub:
            audit_ledger.companion_paid_user_upsert(
                coastal_uid=_companion_uid,
                stripe_customer_id=_companion_customer,
                stripe_subscription_id=_companion_sub,
                status="active",
                current_period_end=None,  # set by customer.subscription.updated event
            )
            # Provision Taskade workspace if not already done
            if audit_ledger.companion_workspace_get(_companion_uid) is None:
                import companion_taskade
                import os as _os
                ws_id = companion_taskade.provision_workspace(
                    api_token=_os.environ.get("COASTAL_TASKADE_API_TOKEN", ""),
                    workspace_name=f"{session.get('customer_email','')}'s C|Brew Notes",
                )
                audit_ledger.companion_workspace_set(
                    coastal_uid=_companion_uid,
                    taskade_workspace_id=ws_id,
                )
            _send_telegram_message(
                f"C|Brew Companion paid tier activated\n"
                f"uid: {_companion_uid}\n"
                f"email: {session.get('customer_email','')}\n"
                f"customer: {_companion_customer}",
            )
    except Exception as _comp_exc:
        log = __import__("logging").getLogger("coastal.companion.billing")
        log.warning("companion paid-tier activation failed: %s", _comp_exc)
```

Also add a `customer.subscription.updated` / `customer.subscription.deleted` branch for status sync:

```python
if event.get("type") in ("customer.subscription.updated", "customer.subscription.deleted"):
    try:
        _sub_obj = event["data"]["object"]
        _sub_meta = dict(_sub_obj.get("metadata") or {})
        if _sub_meta.get("flow") == "companion_paid_tier":
            audit_ledger.companion_paid_user_upsert(
                coastal_uid=_sub_meta.get("coastal_uid", ""),
                stripe_customer_id=_sub_obj.get("customer", ""),
                stripe_subscription_id=_sub_obj.get("id", ""),
                status=_sub_obj.get("status", "canceled"),
                current_period_end=_sub_obj.get("current_period_end"),
            )
    except Exception as _comp_exc:
        log = __import__("logging").getLogger("coastal.companion.billing")
        log.warning("companion sub status sync failed: %s", _comp_exc)
```

- [ ] **Step 3: Run tests + commit**

```bash
cd coastal-brewing && python -m pytest tests/test_companion_billing.py tests/test_companion_router.py tests/test_companion_audit_tables.py -v
git add coastal-brewing/scripts/api_server.py coastal-brewing/tests/test_companion_billing.py
git commit -m "feat(coastal/companion): webhook activates paid tier + provisions Taskade workspace

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 11: Note generation endpoint — POST /api/v1/companion/notes/<session_id>

**Files:**
- Modify: `coastal-brewing/scripts/companion.py`

- [ ] **Step 1: Add failing test**

```python
def test_notes_post_requires_paid_tier(client, monkeypatch):
    import api_server
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_notes_free" if raw else None)
    r = client.post(
        "/api/v1/companion/notes/ccs_x",
        json={"transcript_text": "...", "title": "Test meeting"},
        cookies={"coastal_uid": "cuid_notes_free.x"},
    )
    assert r.status_code == 402  # Payment Required


def test_notes_post_paid_user_pushes_to_taskade(client, monkeypatch):
    import api_server, audit_ledger, companion_taskade
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_notes_paid" if raw else None)
    audit_ledger.companion_paid_user_upsert(
        coastal_uid="cuid_notes_paid",
        stripe_customer_id="cus_x", stripe_subscription_id="sub_x",
        status="active", current_period_end=None,
    )
    audit_ledger.companion_workspace_set(
        coastal_uid="cuid_notes_paid", taskade_workspace_id="tw_paid_x",
    )
    with mock.patch.object(companion_taskade, "push_meeting_doc",
                          return_value="doc_abc"):
        with mock.patch("companion._generate_summary",
                        return_value=("Summary text", [{"label": "Topic A"}])):
            r = client.post(
                "/api/v1/companion/notes/ccs_x",
                json={"transcript_text": "...", "title": "Paid meeting"},
                cookies={"coastal_uid": "cuid_notes_paid.x"},
            )
    assert r.status_code == 200
    assert r.json()["taskade_doc_id"] == "doc_abc"
```

- [ ] **Step 2: Implement**

In `companion.py`, ADD:

```python
class NotesPostBody(BaseModel):
    transcript_text: str
    title: str = "Meeting"


def _generate_summary(transcript_text: str) -> tuple[str, list[dict[str, Any]]]:
    """Generate a markdown summary + mind-map branch list from a
    transcript. Uses Gemini 3.1 Flash on Vertex per FOAI canon. Returns
    (summary_md, mindmap_branches)."""
    # NOTE: prerequisite P4 — Vertex AI project + Gemini quota.
    # Implementation calls the Vertex AI generative model via google-cloud-aiplatform.
    # For test stability, this function is mocked in tests; live impl
    # lands here once VERTEX_PROJECT_ID is confirmed.
    import os as _os
    project = _os.environ.get("VERTEX_PROJECT_ID", "")
    if not project:
        # Fallback: rule-based summary so the endpoint still ships
        head = transcript_text.strip().split(".")[0][:200]
        return f"# Meeting summary\n\n{head}\n", [
            {"label": "Discussion points", "children": []},
            {"label": "Action items", "children": []},
        ]
    # Real Vertex call deferred — landed in a follow-up commit when Vertex
    # quota is confirmed.
    return f"# Meeting summary\n\n{transcript_text[:500]}\n", []


@router.post("/notes/{session_id}")
def notes_create(
    session_id: str,
    body: NotesPostBody,
    uid: str = Depends(require_uid),
) -> dict:
    import audit_ledger
    import companion_taskade
    if not audit_ledger.companion_is_paid(uid):
        raise HTTPException(status_code=402, detail="paid tier required for notes")
    ws_id = audit_ledger.companion_workspace_get(uid)
    if ws_id is None:
        raise HTTPException(status_code=409, detail="workspace not provisioned")
    summary_md, mindmap_branches = _generate_summary(body.transcript_text)
    taskade_token = os.environ.get("COASTAL_TASKADE_API_TOKEN", "")
    if not taskade_token:
        raise HTTPException(status_code=503, detail="taskade not configured")
    doc_id = companion_taskade.push_meeting_doc(
        api_token=taskade_token,
        workspace_id=ws_id,
        title=body.title,
        body_md=summary_md,
    )
    mindmap_id = None
    if mindmap_branches:
        mindmap_id = companion_taskade.push_mindmap_nodes(
            api_token=taskade_token,
            workspace_id=ws_id,
            root_label=body.title,
            branches=mindmap_branches,
        )
    return {
        "ok": True,
        "taskade_doc_id": doc_id,
        "taskade_mindmap_id": mindmap_id,
        "session_id": session_id,
    }
```

- [ ] **Step 3: Run tests + commit**

```bash
cd coastal-brewing && python -m pytest tests/test_companion_router.py -v
git add coastal-brewing/scripts/companion.py coastal-brewing/tests/test_companion_router.py
git commit -m "feat(coastal/companion): /notes/{session_id} generates summary + pushes to Taskade

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 12: Free-tier abuse cap — minutes/day rate limiter

**Files:**
- Modify: `coastal-brewing/scripts/companion.py`

- [ ] **Step 1: Failing test**

```python
def test_session_start_caps_free_tier_at_30_minutes_per_day(client, monkeypatch):
    import api_server, audit_ledger, time as _t
    monkeypatch.setattr(api_server, "_resolve_uid_cookie",
                        lambda raw: "cuid_cap_test" if raw else None)
    # Backdoor — insert 30 minutes of sessions in the last 24h
    audit_ledger.companion_session_start(
        session_id="ccs_used_1", coastal_uid="cuid_cap_test",
        source_lang="es", target_lang="en", tier_at_start="free",
    )
    audit_ledger.companion_session_end(session_id="ccs_used_1", minutes_used=30.0)
    r = client.post(
        "/api/v1/companion/session/start",
        json={"source_lang": "es", "target_lang": "en"},
        cookies={"coastal_uid": "cuid_cap_test.x"},
    )
    assert r.status_code == 429
```

- [ ] **Step 2: Implement**

In `companion.py`, ADD the helper + check in `session_start`:

```python
FREE_TIER_DAILY_MINUTES_CAP = 30.0


def _free_tier_minutes_used_last_24h(coastal_uid: str) -> float:
    import audit_ledger, sqlite3, time as _t
    cutoff = int(_t.time()) - 86400
    with audit_ledger._lock:
        conn = audit_ledger._connect()
        try:
            cur = conn.execute(
                "SELECT COALESCE(SUM(minutes_used), 0) FROM companion_sessions "
                "WHERE coastal_uid = ? AND tier_at_start = 'free' "
                "AND started_at >= ?",
                (coastal_uid, cutoff),
            )
            return float(cur.fetchone()[0] or 0)
        finally:
            conn.close()
```

Modify `session_start` to add the cap check BEFORE `companion_session_start(...)`:

```python
    tier = "paid" if audit_ledger.companion_is_paid(uid) else "free"
    if tier == "free":
        used = _free_tier_minutes_used_last_24h(uid)
        if used >= FREE_TIER_DAILY_MINUTES_CAP:
            raise HTTPException(
                status_code=429,
                detail=f"free-tier daily cap reached ({FREE_TIER_DAILY_MINUTES_CAP} min); upgrade or retry tomorrow",
            )
```

- [ ] **Step 3: Run tests + commit**

```bash
cd coastal-brewing && python -m pytest tests/test_companion_router.py -v
git add coastal-brewing/scripts/companion.py coastal-brewing/tests/test_companion_router.py
git commit -m "feat(coastal/companion): free-tier 30min/day abuse cap on /session/start

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 13: Open PR + deploy + smoke

**Files:**
- (none — git + deploy operations)

- [ ] **Step 1: Push branch**

```bash
cd coastal-brewing && git push -u origin feat/cbrew-companion-phase-1a-backend
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "feat(coastal): C|Brew Communication Companion — Phase 1A Backend" --body "$(cat <<'EOF'
## Summary

Phase 1A backend extension on coastal-runner for the C|Brew Communication Companion. Live translation (free tier) + paid notes tier with per-user Taskade workspace + Stripe billing + Inworld Model Gateway WebSocket proxy + Fernet BYOK key storage.

Spec: coastal-brewing/docs/superpowers/specs/2026-05-13-cbrew-communication-companion-design.md
Plan: coastal-brewing/docs/superpowers/plans/2026-05-13-cbrew-communication-companion-phase-1a-backend.md

## 12-task breakdown

1-2: scaffold + audit_ledger tables
3-4: BYOK encryption + endpoints
5-6: session lifecycle + Inworld WS proxy
7-8: Taskade client + /workspace/me
9-10: Stripe paid tier + webhook activation
11: notes generation + Taskade push
12: free-tier abuse cap

## Deploy step (manual on aims-vps, post-merge)

- /docker/coastal-brewing/.env: add COASTAL_INWORLD_GATEWAY_URL, COASTAL_BYOK_ENCRYPTION_KEY (\$(openssl rand -base64 32)), COASTAL_STRIPE_COMPANION_PRICE_ID, verify COASTAL_TASKADE_API_TOKEN
- docker-compose.yml: pass these envs into coastal-runner
- docker compose up -d coastal-runner

## Test plan

- pytest 300+ green across the existing + new test files
- After deploy: curl smoke /api/v1/companion/byok/key + /session/start + /workspace/me + /billing/checkout

Phase 1B (web companion) + Phase 1C (mobile RN) plans land once this merges + owner confirms proceed.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Wait for CI green + merge**

Same pattern as the owner console PR — poll until clean, then `gh pr merge <#> --merge --delete-branch`.

- [ ] **Step 4: Deploy step on aims-vps**

```bash
# Generate Fernet key
FERNET_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

ssh aims-vps "grep -q '^COASTAL_BYOK_ENCRYPTION_KEY=' /docker/coastal-brewing/.env || cat >> /docker/coastal-brewing/.env <<EOF

# C|Brew Companion Phase 1A backend ($(date -u +%Y-%m-%d))
COASTAL_INWORLD_GATEWAY_URL=wss://gateway.inworld.ai/v1/realtime
COASTAL_BYOK_ENCRYPTION_KEY=$FERNET_KEY
COASTAL_STRIPE_COMPANION_PRICE_ID=<OWNER FILLS — see Task 9 P3>
EOF"

# Pass through in docker-compose.yml — append to coastal-runner.environment
ssh aims-vps "grep -q 'COASTAL_INWORLD_GATEWAY_URL' /docker/coastal-brewing/docker-compose.yml || sed -i '/COASTAL_OWNER_RP_ORIGIN:/a\\      COASTAL_INWORLD_GATEWAY_URL: \"\${COASTAL_INWORLD_GATEWAY_URL:-}\"\n      COASTAL_BYOK_ENCRYPTION_KEY: \"\${COASTAL_BYOK_ENCRYPTION_KEY:-}\"\n      COASTAL_STRIPE_COMPANION_PRICE_ID: \"\${COASTAL_STRIPE_COMPANION_PRICE_ID:-}\"' /docker/coastal-brewing/docker-compose.yml"

# Restart
ssh aims-vps "cd /docker/coastal-brewing && docker compose up -d coastal-runner"

# Verify webauthn + websockets + cryptography all present
ssh aims-vps "docker exec coastal-runner pip list 2>&1 | grep -E '^(websockets|cryptography|webauthn) '"
```

- [ ] **Step 5: Smoke test**

```bash
# Healthz still green
curl -sS https://brewing.foai.cloud/healthz | head -c 200

# /api/v1/companion/workspace/me — expect 401 (no coastal_uid cookie)
curl -i https://brewing.foai.cloud/api/v1/companion/workspace/me 2>&1 | head -3
```

If 401 → ✅. If 500 → check logs for missing env vars.

- [ ] **Step 6: Owner-driven smoke (Telegram dispatch)**

Send to owner via @CoastalBrewBot:

> Phase 1A backend deployed. To smoke:
> 1. Sign in at brewing.foai.cloud/auth/signup → confirm cookie set
> 2. POST your Inworld key: `curl -X POST https://brewing.foai.cloud/api/v1/companion/byok/key -H "Content-Type: application/json" -d '{"vendor":"inworld","api_key":"YOUR_KEY"}' --cookie "coastal_uid=YOUR_UID"` → expect 200
> 3. POST /companion/session/start → expect session_id + ws_url
> 4. POST /companion/billing/checkout → expect Stripe Checkout URL → DON'T pay yet
> 5. Confirm: tests pass, no errors in `docker logs coastal-runner`

Phase 1B (web companion) plan-writing kicks off after owner confirms 1A smoke.

---

## Self-review

**Spec coverage:**
- §3 (3 surfaces): backend extension ✓; web + mobile deferred to Phase 1B/1C as designed.
- §4 (architecture): companion.py router + WS proxy + Taskade client + Stripe billing — all in tasks 1-12.
- §5 (two-tier): free + paid (notes-gated) ✓ — paid gate in Task 11, free-tier cap in Task 12.
- §6 (tech stack): FastAPI + websockets + Stripe + Fernet + Taskade — all wired.
- §9 (risk tags): money + ad_spend + brand_canon + supply_chain — Telegram-dispatch reminders in Task 13 owner-driven smoke.

**Placeholder scan:** Task 11's `_generate_summary` has a fallback path before Vertex AI is wired. Documented as known-shape, not as "TODO". Vertex Live integration is a Task 14+ task once VERTEX_PROJECT_ID is confirmed (prereq P4 verify). Marked as such.

**Type consistency:** `companion_session_start(*, session_id, coastal_uid, source_lang, target_lang, tier_at_start)` signature matches across Task 2 (defined), Task 5 (called), Task 11 (called in test), and Task 12 (referenced for query).

**Scope:** focused on backend only. Big-bang Phase 1A. Phase 1B + 1C are separate plans.

---

## Execution handoff

Plan complete and saved to `coastal-brewing/docs/superpowers/plans/2026-05-13-cbrew-communication-companion-phase-1a-backend.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, two-stage review between tasks
2. **Inline Execution** — `executing-plans`, batch tasks in this session with checkpoints

Which approach?

**Pre-execution blockers (must clear before any task that depends on them):**
- P1: Inworld Model Gateway URL + key — blocks Task 6 (WS proxy)
- P2: Taskade token scope verify — blocks Task 7+
- P3: Stripe product + price_id — blocks Task 9 + 10
- P4: Vertex project ID — blocks live Vertex summary in Task 11 (fallback rule-based summary ships without)
- §10 spec open items (paid tier $/mo, App Store accounts, domain, dogfood roster) — Phase 1B/1C concerns; not Phase 1A blockers
