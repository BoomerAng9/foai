"""SQLite AuditLedger adapter for Coastal Brewing.

Initializes the schema on import and provides write helpers for /run and /approve.
Pure synchronous SQLite — single-writer pattern, fine for runner-scale traffic.
Future: swap to Postgres adapter behind same surface when production load justifies it.

Renamed from hermes_db.py on 2026-04-26 to free the "Hermes" name in the FOAI
namespace for the canonical Hermes Agent (NousResearch). This module is the
service-level audit ledger; it is NOT the Hermes Agent.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import pathlib
import sqlite3
import threading
from datetime import datetime, timezone
from typing import Any, Optional

log = logging.getLogger(__name__)

GENESIS_HASH = "GENESIS"

ROOT = pathlib.Path(__file__).resolve().parents[1]
DB_PATH_DEFAULT = ROOT / "audit_ledger" / "coastal_brewing.db"
SCHEMA_PATH = ROOT / "memory" / "audit_ledger_schema.sql"


def _resolve_db_path() -> pathlib.Path:
    url = os.environ.get("DATABASE_URL", "")
    if url.startswith("sqlite:///"):
        rel = url[len("sqlite:///"):]
        return ROOT / rel
    return DB_PATH_DEFAULT


DB_PATH = _resolve_db_path()
_lock = threading.Lock()
_initialized = False


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), timeout=10, isolation_level=None)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _migrate(conn: sqlite3.Connection) -> None:
    """Idempotent migrations on top of the kit's base schema."""
    cols = {r[1] for r in conn.execute("PRAGMA table_info(task_packets)").fetchall()}
    if "risk_tags" not in cols:
        conn.execute("ALTER TABLE task_packets ADD COLUMN risk_tags TEXT")

    # risk_events: NO FK — denied actions never write a task_packet, so a referential
    # constraint blocks legitimate writes. Migrate any legacy FK'd version to unconstrained.
    legacy_sql = conn.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='risk_events'"
    ).fetchone()
    if legacy_sql and legacy_sql[0] and "FOREIGN KEY" in legacy_sql[0]:
        conn.execute("ALTER TABLE risk_events RENAME TO risk_events_legacy")
        conn.execute(
            """CREATE TABLE risk_events (
                event_id TEXT PRIMARY KEY,
                task_id TEXT,
                created_at TEXT NOT NULL,
                severity TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                actor TEXT,
                metadata TEXT
            )"""
        )
        conn.execute(
            "INSERT INTO risk_events (event_id, task_id, created_at, severity, category, description, actor, metadata) "
            "SELECT event_id, task_id, created_at, severity, category, description, actor, metadata FROM risk_events_legacy"
        )
        conn.execute("DROP TABLE risk_events_legacy")
    else:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS risk_events (
                event_id TEXT PRIMARY KEY,
                task_id TEXT,
                created_at TEXT NOT NULL,
                severity TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                actor TEXT,
                metadata TEXT
            )"""
        )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_risk_events_task ON risk_events(task_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_risk_events_severity ON risk_events(severity, created_at)")

    # used_tokens (added 2026-05-12 PM): single-use magic-link replay guard.
    # `jti` is the unique nonce the signer embeds in each token. First valid
    # /auth/verify call inserts the row; replays hit the PRIMARY KEY
    # constraint and are rejected at the helper layer. `exp_unix` is the
    # token's own TTL — purge_expired_tokens() can drop rows older than
    # that to keep the table compact.
    conn.execute(
        """CREATE TABLE IF NOT EXISTS used_tokens (
            jti TEXT PRIMARY KEY,
            email TEXT,
            used_at TEXT NOT NULL,
            exp_unix INTEGER NOT NULL
        )"""
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_used_tokens_exp ON used_tokens(exp_unix)")

    # owner_passkeys (added 2026-05-12): WebAuthn credential storage for owner 2FA.
    # One row per owner email. Stores the passkey credential_id + public_key for
    # assertion verification on magic-link login. sign_count is the signature
    # counter (cloned_authenticator replay protection).
    conn.execute(
        """CREATE TABLE IF NOT EXISTS owner_passkeys (
            email TEXT PRIMARY KEY,
            credential_id BLOB NOT NULL,
            public_key BLOB NOT NULL,
            sign_count INTEGER NOT NULL DEFAULT 0,
            registered_at INTEGER NOT NULL,
            last_used_at INTEGER NOT NULL DEFAULT 0
        )"""
    )

    # companion_* tables (added 2026-05-13): Communication Companion Phase 1A.
    # companion_sessions: one row per translation/companion session.
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
    # companion_byok: BYOK encrypted API keys per (coastal_uid, vendor).
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
    # companion_paid_users: Stripe subscription state for companion paid tier.
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
    # companion_workspaces: Taskade workspace provisioning record.
    conn.execute("""
        CREATE TABLE IF NOT EXISTS companion_workspaces (
            coastal_uid TEXT PRIMARY KEY,
            taskade_workspace_id TEXT NOT NULL,
            provisioned_at INTEGER NOT NULL
        )
    """)


def init_schema() -> None:
    global _initialized
    with _lock:
        if _initialized:
            return
        if not SCHEMA_PATH.exists():
            return
        conn = _connect()
        try:
            conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
            _migrate(conn)
        finally:
            conn.close()
        _initialized = True


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _canonical_json(payload: dict) -> str:
    """Stable, reproducible JSON encoding for hashing.

    sort_keys + tight separators + ASCII-only ensures that byte-for-byte
    identical input always produces identical output across Python builds.
    """
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def _chain_append(conn: sqlite3.Connection, source_table: str,
                  source_id: str, payload: dict) -> str:
    """Append one entry to the global audit_chain.

    Each entry's `entry_hash = SHA256(prev_hash || payload_hash || source_table
    || source_id || created_at)`. Mutating any historical row invalidates
    every subsequent entry. Caller must already hold the audit lock.
    Returns the new entry_hash.
    """
    canonical = _canonical_json(payload)
    payload_hash = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    prev_row = conn.execute(
        "SELECT entry_hash FROM audit_chain ORDER BY chain_id DESC LIMIT 1"
    ).fetchone()
    prev_hash = prev_row[0] if prev_row else GENESIS_HASH
    created_at = _utc_now()
    seed = f"{prev_hash}|{payload_hash}|{source_table}|{source_id}|{created_at}"
    entry_hash = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    conn.execute(
        """INSERT INTO audit_chain
           (created_at, source_table, source_id, payload_hash, prev_hash, entry_hash)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (created_at, source_table, source_id, payload_hash, prev_hash, entry_hash),
    )
    return entry_hash


def verify_chain() -> dict:
    """Walk the chain start→end. Return {ok, chain_length, broken_at}.

    Re-derives every entry's hash from its declared prev_hash + payload_hash.
    Any tampered row breaks the chain. broken_at is the chain_id of the
    first entry whose hash doesn't match expectations.
    """
    init_schema()
    with _lock:
        conn = _connect()
        try:
            rows = conn.execute(
                """SELECT chain_id, source_table, source_id, payload_hash,
                          prev_hash, entry_hash, created_at
                   FROM audit_chain ORDER BY chain_id ASC"""
            ).fetchall()
        finally:
            conn.close()

    if not rows:
        return {"ok": True, "chain_length": 0, "broken_at": None}

    expected_prev = GENESIS_HASH
    for r in rows:
        chain_id, st, sid, ph, prev, eh, ca = r
        if prev != expected_prev:
            return {"ok": False, "chain_length": len(rows), "broken_at": chain_id,
                    "reason": "prev_hash mismatch"}
        seed = f"{prev}|{ph}|{st}|{sid}|{ca}"
        recomputed = hashlib.sha256(seed.encode("utf-8")).hexdigest()
        if eh != recomputed:
            return {"ok": False, "chain_length": len(rows), "broken_at": chain_id,
                    "reason": "entry_hash mismatch"}
        expected_prev = eh
    return {"ok": True, "chain_length": len(rows), "broken_at": None}


def _risk_level_from_tags(tags: list[str]) -> str:
    """Map risk_tags list to the legacy risk_level enum the kit schema uses."""
    high_tags = {"legal", "money", "certification", "health", "fda", "final_public",
                 "supplier_change", "ad_spend", "contract", "customer_payment_data"}
    if any(t in high_tags for t in tags):
        return "high"
    return "low"


def insert_task_packet(packet: dict, decision: dict, receipt_path: Optional[str]) -> None:
    init_schema()
    risk_tags = packet.get("risk_tags") or []
    task_id = packet.get("task_id") or f"unknown_{int(datetime.now().timestamp())}"
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                """INSERT OR REPLACE INTO task_packets
                   (task_id, created_at, owner_goal, department, task_type,
                    route, risk_level, approval_required, status, receipt_path, risk_tags)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    task_id,
                    _utc_now(),
                    packet.get("owner_goal") or "",
                    packet.get("department") or "unspecified",
                    packet.get("task_type") or "unknown",
                    decision.get("route") or "unknown",
                    _risk_level_from_tags(risk_tags),
                    1 if decision.get("approval_required") else 0,
                    "routed",
                    receipt_path or "",
                    json.dumps(risk_tags),
                ),
            )
            _chain_append(conn, "task_packets", task_id, {
                "task_id": task_id,
                "owner_goal": packet.get("owner_goal") or "",
                "department": packet.get("department") or "unspecified",
                "task_type": packet.get("task_type") or "unknown",
                "route": decision.get("route") or "unknown",
                "risk_tags": risk_tags,
                "approval_required": bool(decision.get("approval_required")),
            })
        finally:
            conn.close()


def insert_research_receipt(task_id: str, ticket_path: str,
                            research_topic: str = "",
                            source_count: int = 0,
                            confidence: str = "pending",
                            allowed_claims: str = "",
                            rejected_claims: str = "") -> None:
    init_schema()
    receipt_id = f"rsrch_{task_id}"
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                """INSERT OR REPLACE INTO research_receipts
                   (receipt_id, task_id, created_at, research_topic,
                    source_count, confidence, allowed_claims, rejected_claims, receipt_path)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    receipt_id, task_id, _utc_now(), research_topic,
                    source_count, confidence, allowed_claims, rejected_claims, ticket_path,
                ),
            )
            _chain_append(conn, "research_receipts", receipt_id, {
                "receipt_id": receipt_id, "task_id": task_id,
                "research_topic": research_topic, "source_count": source_count,
                "confidence": confidence, "allowed_claims": allowed_claims,
                "rejected_claims": rejected_claims,
            })
        finally:
            conn.close()


def insert_model_call_receipt(task_id: str, route: str, provider: str,
                              model: Optional[str] = None,
                              prompt_summary: str = "",
                              output_summary: str = "",
                              success: bool = True,
                              error: Optional[str] = None) -> None:
    init_schema()
    receipt_id = f"mcall_{task_id}_{int(datetime.now().timestamp() * 1000)}"
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                """INSERT INTO model_call_receipts
                   (receipt_id, task_id, created_at, provider, model,
                    route, prompt_summary, output_summary, success, error)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    receipt_id, task_id, _utc_now(), provider, model or "",
                    route, prompt_summary, output_summary, 1 if success else 0, error or "",
                ),
            )
            _chain_append(conn, "model_call_receipts", receipt_id, {
                "receipt_id": receipt_id, "task_id": task_id, "provider": provider,
                "model": model or "", "route": route,
                "prompt_summary": prompt_summary, "output_summary": output_summary,
                "success": bool(success), "error": error or "",
            })
        finally:
            conn.close()


def insert_risk_event(severity: str, category: str, description: str,
                      task_id: Optional[str] = None,
                      actor: Optional[str] = None,
                      metadata: Optional[dict[str, Any]] = None) -> str:
    init_schema()
    event_id = f"risk_{int(datetime.now().timestamp() * 1000)}"
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                """INSERT INTO risk_events
                   (event_id, task_id, created_at, severity, category,
                    description, actor, metadata)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    event_id, task_id, _utc_now(), severity, category,
                    description, actor or "", json.dumps(metadata or {}),
                ),
            )
            _chain_append(conn, "risk_events", event_id, {
                "event_id": event_id, "task_id": task_id, "severity": severity,
                "category": category, "description": description,
                "actor": actor or "", "metadata": metadata or {},
            })
        finally:
            conn.close()
    return event_id


def insert_action_receipt(task_id: str, executor: str, action_type: str,
                          destination: str = "",
                          status: str = "pending",
                          result_summary: str = "") -> None:
    init_schema()
    action_id = f"act_{task_id}_{int(datetime.now().timestamp() * 1000)}"
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                """INSERT INTO action_receipts
                   (action_id, task_id, created_at, executor,
                    action_type, destination, status, result_summary)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    action_id, task_id, _utc_now(), executor,
                    action_type, destination, status, result_summary,
                ),
            )
            _chain_append(conn, "action_receipts", action_id, {
                "action_id": action_id, "task_id": task_id, "executor": executor,
                "action_type": action_type, "destination": destination,
                "status": status, "result_summary": result_summary,
            })
        finally:
            conn.close()


def query_audit_trail(task_id: str) -> dict:
    """Return all rows across all 5 tables for a given task_id — full audit chain."""
    init_schema()
    with _lock:
        conn = _connect()
        conn.row_factory = sqlite3.Row
        try:
            return {
                "task_packet": [dict(r) for r in conn.execute(
                    "SELECT * FROM task_packets WHERE task_id = ?", (task_id,)
                ).fetchall()],
                "model_call_receipts": [dict(r) for r in conn.execute(
                    "SELECT * FROM model_call_receipts WHERE task_id = ? ORDER BY created_at", (task_id,)
                ).fetchall()],
                "research_receipts": [dict(r) for r in conn.execute(
                    "SELECT * FROM research_receipts WHERE task_id = ? ORDER BY created_at", (task_id,)
                ).fetchall()],
                "approval_receipts": [dict(r) for r in conn.execute(
                    "SELECT * FROM approval_receipts WHERE task_id = ? ORDER BY created_at", (task_id,)
                ).fetchall()],
                "action_receipts": [dict(r) for r in conn.execute(
                    "SELECT * FROM action_receipts WHERE task_id = ? ORDER BY created_at", (task_id,)
                ).fetchall()],
                "risk_events": [dict(r) for r in conn.execute(
                    "SELECT * FROM risk_events WHERE task_id = ? ORDER BY created_at", (task_id,)
                ).fetchall()],
            }
        finally:
            conn.close()


def insert_approval_decision(approval_id: str, task_id: str, decision: str,
                             decided_by: str, note: Optional[str],
                             requested_action: str = "",
                             risk_tags: Optional[list[str]] = None) -> None:
    init_schema()
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                """INSERT OR REPLACE INTO approval_receipts
                   (approval_id, task_id, created_at, requested_action,
                    risk_tags, decision, decided_by, notes)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    approval_id, task_id, _utc_now(), requested_action,
                    json.dumps(risk_tags or []), decision, decided_by, note or "",
                ),
            )
            _chain_append(conn, "approval_receipts", approval_id, {
                "approval_id": approval_id, "task_id": task_id,
                "requested_action": requested_action, "risk_tags": risk_tags or [],
                "decision": decision, "decided_by": decided_by, "notes": note or "",
            })
        finally:
            conn.close()


def query_task_packets(limit: int = 50) -> list[dict]:
    init_schema()
    with _lock:
        conn = _connect()
        conn.row_factory = sqlite3.Row
        try:
            rows = conn.execute(
                "SELECT * FROM task_packets ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()


def query_recent_action_receipts(
    action_type: str,
    since_iso: str,
    executor_substr: Optional[str] = None,
    summary_substr: Optional[str] = None,
    limit: int = 100,
) -> list[dict]:
    """Cross-check helper for tier-coupon abuse prevention.

    Returns action_receipts rows matching action_type AND created_at >=
    since_iso, optionally further filtered by executor substring (e.g.
    a custee:<id> prefix) AND result_summary substring (used to scan
    for an email_hash or shipping-address-hash without exact-equality on
    a free-text field).
    """
    init_schema()
    with _lock:
        conn = _connect()
        conn.row_factory = sqlite3.Row
        try:
            sql_parts = ["SELECT * FROM action_receipts WHERE action_type = ? AND created_at >= ?"]
            args: list = [action_type, since_iso]
            if executor_substr:
                sql_parts.append("AND executor LIKE ?")
                args.append(f"%{executor_substr}%")
            if summary_substr:
                sql_parts.append("AND result_summary LIKE ?")
                args.append(f"%{summary_substr}%")
            sql_parts.append("ORDER BY created_at DESC LIMIT ?")
            args.append(limit)
            rows = conn.execute(" ".join(sql_parts), tuple(args)).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()


def is_available() -> bool:
    return SCHEMA_PATH.exists()


# ─────────────────────────────────────────────────────────────────────
# used_tokens — single-use magic-link replay guard (2026-05-12)
# ─────────────────────────────────────────────────────────────────────
# The signer embeds a unique `jti` in every magic-link token. The
# verifier records the jti in this table on first valid use. Replays
# hit the PRIMARY KEY constraint and `mark_token_used` returns False —
# signalling the verifier to reject. Without this, a leaked token
# (browser history, access log) is replayable for the full 30-min TTL.

def mark_token_used(*, jti: str, email: Optional[str], exp_unix: int) -> bool:
    """Atomically record a token's first use.

    Returns True if this is the first time `jti` has been recorded
    (caller proceeds with verification). Returns False if the row
    already exists (replay attempt — caller must reject).
    """
    init_schema()
    with _lock:
        conn = _connect()
        try:
            try:
                conn.execute(
                    "INSERT INTO used_tokens (jti, email, used_at, exp_unix) VALUES (?, ?, ?, ?)",
                    (jti, email or "", _utc_now(), int(exp_unix)),
                )
                return True
            except sqlite3.IntegrityError:
                # PRIMARY KEY conflict — jti already used. Replay.
                return False
        finally:
            conn.close()


def purge_expired_tokens(*, older_than_unix: int) -> int:
    """Drop rows whose token expiry is older than the threshold.

    Called opportunistically (e.g., on each successful verify) to keep
    the table compact. Returns the number of rows deleted.
    """
    init_schema()
    with _lock:
        conn = _connect()
        try:
            cur = conn.execute(
                "DELETE FROM used_tokens WHERE exp_unix < ?",
                (int(older_than_unix),),
            )
            return int(cur.rowcount or 0)
        finally:
            conn.close()


# ─────────────────────────────────────────────────────────────────────
# owner_passkeys — WebAuthn 2FA credentials per owner (2026-05-12)
# ─────────────────────────────────────────────────────────────────────
# One passkey per owner email. Stores credential_id + public_key for
# WebAuthn assertion verification on magic-link login. sign_count
# is the signature counter (cloned_authenticator replay protection).


def register_owner_passkey(
    *, email: str, credential_id: bytes, public_key: bytes, sign_count: int = 0,
) -> None:
    """Store a newly-registered WebAuthn passkey for an owner.

    Overwrites any existing passkey for the email (one per email).
    registered_at is set to now; last_used_at is 0 until first assertion.
    """
    import time as _t
    init_schema()
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                "INSERT OR REPLACE INTO owner_passkeys "
                "(email, credential_id, public_key, sign_count, registered_at, last_used_at) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (email, credential_id, public_key, sign_count, int(_t.time()), 0),
            )
        finally:
            conn.close()


def fetch_owner_passkey(email: str) -> dict | None:
    """Retrieve a registered passkey for assertion verification.

    Returns {email, credential_id, public_key, sign_count, registered_at,
    last_used_at} or None if not found.
    """
    init_schema()
    with _lock:
        conn = _connect()
        conn.row_factory = sqlite3.Row
        try:
            cur = conn.execute(
                "SELECT email, credential_id, public_key, sign_count, registered_at, last_used_at "
                "FROM owner_passkeys WHERE email = ?",
                (email,),
            )
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            conn.close()


def bump_owner_passkey_sign_count(email: str, new_count: int) -> None:
    """Update sign_count and last_used_at after a successful assertion.

    Called after each verified WebAuthn assertion to increment the
    signature counter (cloned_authenticator replay prevention) and
    record the assertion timestamp.
    """
    import time as _t
    init_schema()
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                "UPDATE owner_passkeys SET sign_count = ?, last_used_at = ? WHERE email = ?",
                (new_count, int(_t.time()), email),
            )
        finally:
            conn.close()


def delete_owner_passkey(email: str) -> None:
    """Remove a passkey registration (e.g., owner revokes or re-enrolls).

    Idempotent: no-op if the passkey doesn't exist.
    """
    init_schema()
    with _lock:
        conn = _connect()
        try:
            conn.execute("DELETE FROM owner_passkeys WHERE email = ?", (email,))
        finally:
            conn.close()


# ─────────────────────────────────────────────────────────────────────
# recent_events — owner activity feed (2026-05-13)
# ─────────────────────────────────────────────────────────────────────

def record_event(*, event_type: str, payload: dict[str, Any]) -> str:
    """Generic audit event writer.

    Writes a risk_event row with severity="low", category=event_type,
    description=JSON-serialised payload, actor extracted from payload["email"]
    if present. Returns the generated event_id.

    This thin wrapper lets call sites (e.g. owner_console.py) emit
    structured audit entries without coupling to the low-level
    insert_risk_event signature.
    """
    actor = payload.get("email") or ""
    description = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return insert_risk_event(
        severity="low",
        category=event_type,
        description=description,
        actor=actor,
        metadata=payload,
    )


def recent_events(*, limit: int = 50, since_unix: float = 0.0) -> list[dict]:
    """Return recent audit activity ordered newest-first.

    Unions three primary signal tables: task_packets, action_receipts,
    risk_events. Each row is normalised to:
        {event_type, ts, payload}
    where `ts` is a unix float derived from the ISO created_at column.

    Args:
        limit: max rows to return (applied after union + sort).
        since_unix: if non-zero, exclude rows with ts <= since_unix
                    (cursor-based pagination).
    """
    init_schema()
    with _lock:
        conn = _connect()
        conn.row_factory = sqlite3.Row
        try:
            # Unified query: normalise ts via strftime epoch conversion.
            sql = """
                SELECT
                    'task_packet' AS event_type,
                    task_id       AS source_id,
                    created_at,
                    CAST(strftime('%s', created_at) AS REAL) AS ts,
                    json_object(
                        'task_id',   task_id,
                        'goal',      owner_goal,
                        'dept',      department,
                        'task_type', task_type,
                        'route',     route,
                        'risk',      risk_level,
                        'status',    status
                    ) AS payload
                FROM task_packets
                WHERE (? = 0 OR CAST(strftime('%s', created_at) AS REAL) > ?)

                UNION ALL

                SELECT
                    'action_receipt' AS event_type,
                    action_id        AS source_id,
                    created_at,
                    CAST(strftime('%s', created_at) AS REAL) AS ts,
                    json_object(
                        'action_id',  action_id,
                        'task_id',    task_id,
                        'executor',   executor,
                        'type',       action_type,
                        'status',     status,
                        'summary',    result_summary
                    ) AS payload
                FROM action_receipts
                WHERE (? = 0 OR CAST(strftime('%s', created_at) AS REAL) > ?)

                UNION ALL

                SELECT
                    'risk_event' AS event_type,
                    event_id     AS source_id,
                    created_at,
                    CAST(strftime('%s', created_at) AS REAL) AS ts,
                    json_object(
                        'event_id',   event_id,
                        'task_id',    task_id,
                        'severity',   severity,
                        'category',   category,
                        'actor',      actor,
                        'description',description
                    ) AS payload
                FROM risk_events
                WHERE (? = 0 OR CAST(strftime('%s', created_at) AS REAL) > ?)

                ORDER BY ts DESC
                LIMIT ?
            """
            cutoff = float(since_unix)
            rows = conn.execute(
                sql,
                (cutoff, cutoff, cutoff, cutoff, cutoff, cutoff, int(limit)),
            ).fetchall()
            out = []
            for r in rows:
                raw = dict(r)
                # payload stored as JSON string by json_object()
                payload_raw = raw.get("payload") or "{}"
                try:
                    payload = json.loads(payload_raw)
                except (json.JSONDecodeError, TypeError):
                    payload = {"raw": payload_raw}
                out.append({
                    "event_type": raw["event_type"],
                    "ts": raw["ts"] or 0.0,
                    "created_at": raw["created_at"],
                    "source_id": raw["source_id"],
                    "payload": payload,
                })
            return out
        finally:
            conn.close()


# ---------------------------------------------------------------------------
# NemoClaw queue helpers (added for owner_console /nemoclaw endpoints)
# ---------------------------------------------------------------------------

def list_pending_tasks(limit: int = 50) -> list[dict]:
    """Return task_packets where approval_required=1 AND status='routed'.

    These are the tasks awaiting owner sign-off.  Returns a list of dicts
    with the columns that exist in the actual task_packets schema.
    """
    init_schema()
    with _lock:
        conn = _connect()
        conn.row_factory = sqlite3.Row
        try:
            rows = conn.execute(
                """SELECT task_id, created_at, owner_goal, department,
                          task_type, route, risk_level, risk_tags, status
                   FROM task_packets
                   WHERE approval_required = 1 AND status = 'routed'
                   ORDER BY created_at DESC
                   LIMIT ?""",
                (limit,),
            ).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()


def set_task_status(task_id: str, new_status: str, *, actor: str = "") -> bool:  # noqa: ARG001
    """Update task_packets.status.  Returns True if a row was updated.

    NOTE: task_packets has no decided_by/decided_at columns — decided-by
    metadata is stored in approval_receipts via insert_approval_decision.
    The `actor` kwarg is accepted for call-site symmetry but is not persisted
    on this table.
    """
    init_schema()
    with _lock:
        conn = _connect()
        try:
            cur = conn.execute(
                "UPDATE task_packets SET status = ? WHERE task_id = ?",
                (new_status, task_id),
            )
            conn.commit()
            return cur.rowcount > 0
        finally:
            conn.close()


# ---------------------------------------------------------------------------
# Paginated audit event queries (added for /api/v1/owner/audit endpoint)
# ---------------------------------------------------------------------------

# Whitelist of allowed table names for query_events. Never interpolate user
# input directly into SQL; always check against this set first.
_ALLOWED_TABLES = {
    "task_packets",
    "action_receipts",
    "risk_events",
    "used_tokens",
    "owner_passkeys",
    "approval_decisions",
}


def query_events(
    *,
    table: str | None = None,
    since: float | None = None,
    until: float | None = None,
    offset: int = 0,
    limit: int = 50,
) -> list[dict]:
    """Read paginated rows from one or more audit tables.

    If `table` is specified and is in the whitelist, query that specific table.
    If `table` is None, UNION across task_packets, action_receipts, and
    risk_events (same tables as recent_events()).

    Args:
        table: Optional table name (must be in _ALLOWED_TABLES). Defaults to None
               (UNION across primary tables).
        since: Optional unix-timestamp lower bound (inclusive: ts >= since).
        until: Optional unix-timestamp upper bound (inclusive: ts <= until).
        offset: Row offset for pagination (0-based).
        limit: Max rows to return. Clamped to 1-200.

    Returns:
        List of dicts with keys: event_type, ts, created_at, source_id, payload.
    """
    init_schema()
    offset = max(0, int(offset))
    limit = max(1, min(int(limit), 200))

    # Validate table whitelist
    if table is not None and table not in _ALLOWED_TABLES:
        log.warning("query_events: rejected table=%r (not in whitelist)", table)
        return []

    with _lock:
        conn = _connect()
        conn.row_factory = sqlite3.Row
        try:
            # Build the WHERE clause for timestamp filtering
            # Each table has a created_at column in ISO format.
            timestamp_where = ""
            params: list[Any] = []

            if since is not None or until is not None:
                conditions = []
                if since is not None:
                    conditions.append("CAST(strftime('%s', created_at) AS REAL) >= ?")
                    params.append(float(since))
                if until is not None:
                    conditions.append("CAST(strftime('%s', created_at) AS REAL) <= ?")
                    params.append(float(until))
                if conditions:
                    timestamp_where = "WHERE " + " AND ".join(conditions)

            if table is not None:
                # Query a single table
                # Build column list and payload structure for each table type
                if table == "task_packets":
                    sql = f"""
                        SELECT
                            'task_packet' AS event_type,
                            task_id AS source_id,
                            created_at,
                            CAST(strftime('%s', created_at) AS REAL) AS ts,
                            json_object(
                                'task_id', task_id,
                                'goal', owner_goal,
                                'dept', department,
                                'task_type', task_type,
                                'route', route,
                                'risk', risk_level,
                                'status', status
                            ) AS payload
                        FROM task_packets
                        {timestamp_where}
                        ORDER BY ts DESC
                        LIMIT ? OFFSET ?
                    """
                    params.extend([int(limit), int(offset)])
                elif table == "action_receipts":
                    sql = f"""
                        SELECT
                            'action_receipt' AS event_type,
                            action_id AS source_id,
                            created_at,
                            CAST(strftime('%s', created_at) AS REAL) AS ts,
                            json_object(
                                'action_id', action_id,
                                'task_id', task_id,
                                'executor', executor,
                                'type', action_type,
                                'status', status,
                                'summary', result_summary
                            ) AS payload
                        FROM action_receipts
                        {timestamp_where}
                        ORDER BY ts DESC
                        LIMIT ? OFFSET ?
                    """
                    params.extend([int(limit), int(offset)])
                elif table == "risk_events":
                    sql = f"""
                        SELECT
                            'risk_event' AS event_type,
                            event_id AS source_id,
                            created_at,
                            CAST(strftime('%s', created_at) AS REAL) AS ts,
                            json_object(
                                'event_id', event_id,
                                'task_id', task_id,
                                'severity', severity,
                                'category', category,
                                'actor', actor,
                                'description', description
                            ) AS payload
                        FROM risk_events
                        {timestamp_where}
                        ORDER BY ts DESC
                        LIMIT ? OFFSET ?
                    """
                    params.extend([int(limit), int(offset)])
                elif table == "used_tokens":
                    sql = f"""
                        SELECT
                            'used_token' AS event_type,
                            jti AS source_id,
                            created_at,
                            CAST(strftime('%s', created_at) AS REAL) AS ts,
                            json_object(
                                'jti', jti,
                                'email', email,
                                'exp_unix', exp_unix
                            ) AS payload
                        FROM used_tokens
                        {timestamp_where}
                        ORDER BY ts DESC
                        LIMIT ? OFFSET ?
                    """
                    params.extend([int(limit), int(offset)])
                elif table == "owner_passkeys":
                    sql = f"""
                        SELECT
                            'owner_passkey' AS event_type,
                            credential_id AS source_id,
                            created_at,
                            CAST(strftime('%s', created_at) AS REAL) AS ts,
                            json_object(
                                'credential_id', credential_id,
                                'owner_email', owner_email,
                                'public_key', public_key
                            ) AS payload
                        FROM owner_passkeys
                        {timestamp_where}
                        ORDER BY ts DESC
                        LIMIT ? OFFSET ?
                    """
                    params.extend([int(limit), int(offset)])
                elif table == "approval_decisions":
                    sql = f"""
                        SELECT
                            'approval_decision' AS event_type,
                            task_id AS source_id,
                            created_at,
                            CAST(strftime('%s', created_at) AS REAL) AS ts,
                            json_object(
                                'task_id', task_id,
                                'decision', decision,
                                'reason', reason
                            ) AS payload
                        FROM approval_decisions
                        {timestamp_where}
                        ORDER BY ts DESC
                        LIMIT ? OFFSET ?
                    """
                    params.extend([int(limit), int(offset)])
                else:
                    return []
            else:
                # UNION across task_packets, action_receipts, risk_events
                # Replicate the pattern from recent_events() but with OFFSET support
                sql = f"""
                    SELECT
                        'task_packet' AS event_type,
                        task_id AS source_id,
                        created_at,
                        CAST(strftime('%s', created_at) AS REAL) AS ts,
                        json_object(
                            'task_id', task_id,
                            'goal', owner_goal,
                            'dept', department,
                            'task_type', task_type,
                            'route', route,
                            'risk', risk_level,
                            'status', status
                        ) AS payload
                    FROM task_packets
                    {timestamp_where}

                    UNION ALL

                    SELECT
                        'action_receipt' AS event_type,
                        action_id AS source_id,
                        created_at,
                        CAST(strftime('%s', created_at) AS REAL) AS ts,
                        json_object(
                            'action_id', action_id,
                            'task_id', task_id,
                            'executor', executor,
                            'type', action_type,
                            'status', status,
                            'summary', result_summary
                        ) AS payload
                    FROM action_receipts
                    {timestamp_where}

                    UNION ALL

                    SELECT
                        'risk_event' AS event_type,
                        event_id AS source_id,
                        created_at,
                        CAST(strftime('%s', created_at) AS REAL) AS ts,
                        json_object(
                            'event_id', event_id,
                            'task_id', task_id,
                            'severity', severity,
                            'category', category,
                            'actor', actor,
                            'description', description
                        ) AS payload
                    FROM risk_events
                    {timestamp_where}

                    ORDER BY ts DESC
                    LIMIT ? OFFSET ?
                """
                # For UNION queries, the WHERE clause is replicated for each table
                # so we need to duplicate the params for each table's WHERE clause
                if since is not None or until is not None:
                    # 3 tables, so multiply params by 3
                    where_params = params.copy()
                    params = where_params + where_params + where_params
                params.extend([int(limit), int(offset)])

            rows = conn.execute(sql, params).fetchall()
            out = []
            for r in rows:
                raw = dict(r)
                payload_raw = raw.get("payload") or "{}"
                try:
                    payload = json.loads(payload_raw)
                except (json.JSONDecodeError, TypeError):
                    payload = {"raw": payload_raw}
                out.append({
                    "event_type": raw["event_type"],
                    "ts": raw["ts"] or 0.0,
                    "created_at": raw["created_at"],
                    "source_id": raw["source_id"],
                    "payload": payload,
                })
            return out
        finally:
            conn.close()


def count_events(
    *,
    table: str | None = None,
    since: float | None = None,
    until: float | None = None,
) -> int:
    """Return the count of events matching the same filter as query_events.

    Args:
        table: Optional table name (must be in _ALLOWED_TABLES).
        since: Optional unix-timestamp lower bound (inclusive).
        until: Optional unix-timestamp upper bound (inclusive).

    Returns:
        Total count of matching rows.
    """
    init_schema()

    # Validate table whitelist
    if table is not None and table not in _ALLOWED_TABLES:
        log.warning("count_events: rejected table=%r (not in whitelist)", table)
        return 0

    with _lock:
        conn = _connect()
        try:
            # Build the WHERE clause for timestamp filtering
            timestamp_where = ""
            params: list[Any] = []

            if since is not None or until is not None:
                conditions = []
                if since is not None:
                    conditions.append("CAST(strftime('%s', created_at) AS REAL) >= ?")
                    params.append(float(since))
                if until is not None:
                    conditions.append("CAST(strftime('%s', created_at) AS REAL) <= ?")
                    params.append(float(until))
                if conditions:
                    timestamp_where = "WHERE " + " AND ".join(conditions)

            if table is not None:
                # Count a single table
                sql = f"SELECT COUNT(*) AS cnt FROM {table} {timestamp_where}"
            else:
                # Count across the 3 primary audit tables
                sql = f"""
                    SELECT (
                        (SELECT COUNT(*) FROM task_packets {timestamp_where}) +
                        (SELECT COUNT(*) FROM action_receipts {timestamp_where}) +
                        (SELECT COUNT(*) FROM risk_events {timestamp_where})
                    ) AS cnt
                """
                # For subqueries, we need to repeat the where params for each table
                if since is not None or until is not None:
                    where_params = params.copy()
                    params = where_params + where_params + where_params

            row = conn.execute(sql, params).fetchone()
            return row[0] if row else 0
        finally:
            conn.close()


# ─────────────────────────────────────────────────────────────────────
# companion_* CRUD helpers (added 2026-05-13): Communication Companion Phase 1A
# ─────────────────────────────────────────────────────────────────────


def companion_session_start(*, session_id: str, coastal_uid: str,
                             source_lang: str, target_lang: str,
                             tier_at_start: str) -> None:
    """Open a new companion session row."""
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
    """Close a companion session — record ended_at and minutes_used."""
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


def companion_session_fetch(session_id: str) -> dict | None:
    """Return a companion session row as a dict, or None if not found."""
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


def companion_byok_store(*, coastal_uid: str, vendor: str,
                          encrypted_key: bytes) -> None:
    """Upsert an encrypted BYOK key for (coastal_uid, vendor)."""
    init_schema()
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


def companion_byok_fetch(coastal_uid: str, vendor: str) -> bytes | None:
    """Return the encrypted BYOK key for (coastal_uid, vendor), or None."""
    init_schema()
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
    """Remove a BYOK key row. Idempotent."""
    init_schema()
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
                                current_period_end: int | None) -> None:
    """Insert or update a companion paid-user record.

    Preserves the original started_at on update via COALESCE subquery.
    """
    import time as _t
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                "INSERT OR REPLACE INTO companion_paid_users "
                "(coastal_uid, stripe_customer_id, stripe_subscription_id, "
                "status, started_at, current_period_end) "
                "VALUES (?, ?, ?, ?, "
                "COALESCE((SELECT started_at FROM companion_paid_users "
                "WHERE coastal_uid = ?), ?), ?)",
                (coastal_uid, stripe_customer_id, stripe_subscription_id,
                 status, coastal_uid, int(_t.time()), current_period_end),
            )
            conn.commit()
        finally:
            conn.close()


def companion_is_paid(coastal_uid: str) -> bool:
    """Return True if the uid has an active or trialing companion subscription."""
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
    """Upsert the Taskade workspace ID for a coastal_uid."""
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


def companion_workspace_get(coastal_uid: str) -> str | None:
    """Return the Taskade workspace ID for a coastal_uid, or None."""
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
