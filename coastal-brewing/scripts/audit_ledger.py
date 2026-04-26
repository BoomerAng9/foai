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
import os
import pathlib
import sqlite3
import threading
from datetime import datetime, timezone
from typing import Any, Optional

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


def is_available() -> bool:
    return SCHEMA_PATH.exists()
