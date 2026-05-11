"""Lil_Mercury_Hawk — Mercury Banking + Invoicing API wrapper.

Token-disciplined per the agentic-cli factory pattern: returns ≤500-token
slim JSON projections to the calling agent; raw payloads go to a local
SQLite mirror at `~/.cache/agentic-cli/mercury/mercury.db`.

Auth: reads `MERCURY_API_TOKEN` from environment. Token is never echoed to
stdout, never logged, never serialized to a result. The self-test only
reports the count of accounts visible, not the account details themselves.

API base: https://api.mercury.com/api/v1
Docs: https://docs.mercury.com/reference
Auth header: `Authorization: Bearer secret-token:<token>` — the `secret-token:`
prefix IS part of the bearer value per Mercury's OpenAPI spec.

Mercury Banking API — accounts / transactions / treasury (read-side, no
sensitive ops surfaced in this Hawk).
Mercury Invoicing API — invoice mint + status read. REQUIRES PAID Mercury
plan; calls return 402/403 on free tier.

Print Press wraps this Hawk to fire subscription invoices on the 3-6-9
cadence.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import sqlite3
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

logger = logging.getLogger("lil_mercury_hawk")

MERCURY_BASE = "https://api.mercury.com/api/v1"
TOKEN_ENV_CANDIDATES = (
    # Owner's actual naming (verified 2026-05-11 on aims-vps):
    "Mercury_API_Token",       # PRIMARY — owner's case + format
    "Mercury_API_Token2",      # failover slot 2 (no underscore before number)
    "Mercury_API_Token3",      # failover slot 3
    # Mercury docs / canonical alternates kept for cross-vertical reuse:
    "MERCURY_API_TOKEN",
    "MERCURY_API_TOKEN_1",
    "MERCURY_API_TOKEN_2",
    "MERCURY_API_TOKEN_3",
    "MERCURY_API_KEY",
    "MERCURY_API_KEY_1",
    "MERCURY_API_KEY_2",
    "MERCURY_API_KEY_3",
    "MERCURY_TOKEN",
    "COASTAL_MERCURY_TOKEN",
)

WEBHOOK_SECRET_ENV_CANDIDATES = (
    # Owner canon (matches Mercury_API_Token naming pattern — verified 2026-05-11):
    "Mercury_Webhook_Token",
    "Mercury_Webhook_Token2",
    "Mercury_Webhook_Token3",
    # Alt naming (Mercury UI labels the field "Signing Secret"):
    "Mercury_Webhook_Secret",
    "Mercury_Webhook_Secret2",
    "Mercury_Webhook_Secret3",
    "MERCURY_WEBHOOK_SECRET",
    "MERCURY_WEBHOOK_SECRET_1",
    "MERCURY_WEBHOOK_SECRET_2",
    "MERCURY_WEBHOOK_SECRET_3",
    "COASTAL_MERCURY_WEBHOOK_SECRET",
)

CACHE_DIR = Path(os.environ.get("LIL_HAWK_CACHE_DIR", str(Path.home() / ".cache" / "agentic-cli" / "mercury")))
CACHE_DB = CACHE_DIR / "mercury.db"

DEFAULT_TIMEOUT_SECONDS = 15


class MercuryNotConfigured(RuntimeError):
    """Raised when MERCURY_API_TOKEN (or alt) is not set in the environment."""


class MercuryAPIError(RuntimeError):
    """Raised for non-2xx Mercury API responses. Never includes the token."""

    def __init__(self, status: int, body_excerpt: str) -> None:
        super().__init__(f"Mercury API HTTP {status}: {body_excerpt[:200]}")
        self.status = status


_BEARER_PREFIX_STRIP = ("Bearer ", "bearer ")


def _resolve_token() -> str:
    """Return the Mercury API token from environment. Tries canonical name
    first, then alts. Raises MercuryNotConfigured if none set.

    Token is never logged; only the env var NAME that matched is logged.

    PRESERVES the `secret-token:` prefix — per Mercury's OpenAPI spec, the
    full string including that prefix IS the bearer value. Only strips the
    `Bearer ` prefix in case someone pastes the full header form.
    Auto-adds `secret-token:` if the user pasted the raw token without it.
    """
    for name in TOKEN_ENV_CANDIDATES:
        val = os.environ.get(name)
        if not val:
            continue
        # Strip "Bearer " if present (user pasted the full header form)
        for prefix in _BEARER_PREFIX_STRIP:
            if val.startswith(prefix):
                val = val[len(prefix):]
                break
        val = val.strip()
        if not val:
            continue
        # Auto-add secret-token: prefix if missing (raw token paste)
        if not val.startswith("secret-token:"):
            val = "secret-token:" + val
        logger.debug("Mercury token loaded from env var %s", name)
        return val
    raise MercuryNotConfigured(
        f"None of {TOKEN_ENV_CANDIDATES} are set. Add one to the runner env."
    )


def _ensure_cache() -> sqlite3.Connection:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(CACHE_DB))
    conn.execute(
        """CREATE TABLE IF NOT EXISTS api_calls (
            ts TEXT NOT NULL,
            method TEXT NOT NULL,
            path TEXT NOT NULL,
            status INTEGER,
            response_excerpt TEXT
        )"""
    )
    conn.commit()
    return conn


def _request(method: str, path: str, body: dict | None = None,
             timeout: int = DEFAULT_TIMEOUT_SECONDS) -> dict:
    """Single Mercury API call. Returns the parsed JSON response or raises."""
    token = _resolve_token()  # token never enters this function's logs
    url = f"{MERCURY_BASE}{path}"
    payload = None
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "User-Agent": "lil_mercury_hawk/1.0",
    }
    if body is not None:
        payload = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310
            raw = resp.read()
            data = json.loads(raw) if raw else {}
            _log_call(method, path, resp.status, str(data)[:300])
            return data
    except urllib.error.HTTPError as e:
        body_excerpt = ""
        try:
            body_excerpt = e.read().decode("utf-8", errors="replace")[:200]
        except Exception:  # noqa: BLE001
            pass
        _log_call(method, path, e.code, body_excerpt[:300])
        raise MercuryAPIError(e.code, body_excerpt) from e


def _log_call(method: str, path: str, status: int | None, excerpt: str) -> None:
    try:
        conn = _ensure_cache()
        ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        conn.execute(
            "INSERT INTO api_calls VALUES (?, ?, ?, ?, ?)",
            (ts, method, path, status, excerpt),
        )
        conn.commit()
        conn.close()
    except Exception:  # noqa: BLE001 — cache failure must never block the call
        pass


# ─── Public surface (token-disciplined projections) ────────────────────


def self_test() -> dict:
    """Smoke-test the Mercury connection. Calls GET /accounts and returns
    a slim summary that NEVER includes account numbers, balances, or names.

    Returns:
        {"ok": True, "account_count": N, "token_var": "<env-var-name>"}
        or
        {"ok": False, "reason": "<short reason>", "token_var": None}
    """
    try:
        token_var = next(
            (n for n in TOKEN_ENV_CANDIDATES if os.environ.get(n)), None
        )
        if not token_var:
            return {"ok": False, "reason": "MERCURY_API_TOKEN not set in env",
                    "token_var": None}
        resp = _request("GET", "/accounts")
        accounts = resp.get("accounts", []) if isinstance(resp, dict) else []
        return {
            "ok": True,
            "account_count": len(accounts),
            "token_var": token_var,
        }
    except MercuryAPIError as e:
        return {"ok": False, "reason": f"HTTP {e.status}", "token_var": token_var}
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "reason": str(e)[:120], "token_var": token_var}


def list_accounts_summary() -> list[dict]:
    """Slim projection — id + nickname only, never the routing or account number."""
    resp = _request("GET", "/accounts")
    accounts = resp.get("accounts", []) if isinstance(resp, dict) else []
    return [
        {"id": a.get("id"), "nickname": a.get("nickname"), "kind": a.get("kind")}
        for a in accounts
    ]


def mint_invoice(
    *,
    customer_email: str,
    line_items: list[dict],
    due_date: str | None = None,
    notes: str | None = None,
) -> dict:
    """Mint a Mercury invoice. Requires Mercury paid plan.

    Args:
        customer_email: recipient's email
        line_items: list of {"description": str, "quantity": int, "unit_price_cents": int}
        due_date: ISO 8601 date string, optional
        notes: invoice-level note, optional

    Returns slim projection:
        {"invoice_id": str, "pay_link": str, "status": str, "total_cents": int}
    """
    total_cents = sum(
        int(li.get("quantity", 1)) * int(li.get("unit_price_cents", 0))
        for li in line_items
    )
    body = {
        "recipient_email": customer_email,
        "line_items": line_items,
        "total_cents": total_cents,
    }
    if due_date:
        body["due_date"] = due_date
    if notes:
        body["notes"] = notes
    resp = _request("POST", "/invoicing/invoice", body=body)
    return {
        "invoice_id": resp.get("id"),
        "pay_link": resp.get("pay_link") or resp.get("hosted_pay_url"),
        "status": resp.get("status"),
        "total_cents": resp.get("total_cents") or total_cents,
    }


def _resolve_webhook_secret() -> str | None:
    """Return Mercury webhook secret from environment, or None if unset.
    Unlike _resolve_token, this does NOT raise — webhook endpoints translate
    a missing secret into a 503 rather than crashing the process. Secret is
    never logged; only the env var NAME that matched is logged.
    """
    for name in WEBHOOK_SECRET_ENV_CANDIDATES:
        val = os.environ.get(name)
        if val and val.strip():
            logger.debug("Mercury webhook secret loaded from env var %s", name)
            return val.strip()
    return None


def verify_webhook(payload: bytes, signature: str) -> bool:
    """Verify a Mercury webhook signature against the configured secret.

    Mercury signs webhook deliveries with HMAC-SHA256 of the raw request
    body using a per-endpoint secret. The signature header may arrive as
    `sha256=<hex>` or bare `<hex>`; both forms accepted.

    Returns False (never raises) when secret is unconfigured or signature
    mismatches — endpoint translates False → HTTP 400/503. Uses
    hmac.compare_digest for constant-time comparison to prevent
    signature-timing attacks.
    """
    secret = _resolve_webhook_secret()
    if not secret:
        return False
    if not signature:
        return False
    sig = signature.strip()
    if sig.startswith("sha256="):
        sig = sig[len("sha256="):]
    sig = sig.strip()
    if not sig:
        return False
    expected = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    try:
        return hmac.compare_digest(expected, sig)
    except (TypeError, ValueError):
        return False


def is_bootstrap_mode() -> bool:
    """Time-bounded operator escape hatch — accepts unsigned webhook probes
    so providers (Mercury) can run their create-time Verify step BEFORE the
    signing secret has been wired into runner env. Off by default; flip on
    only during initial webhook provisioning, flip OFF immediately after.

    Truthy values: 1 / true / yes / on (case-insensitive). Anything else
    (including unset) keeps the default-deny posture intact.
    """
    val = (os.environ.get("MERCURY_WEBHOOK_BOOTSTRAP")
           or os.environ.get("Mercury_Webhook_Bootstrap")
           or "")
    return val.strip().lower() in {"1", "true", "yes", "on"}


def parse_event(payload: bytes) -> dict:
    """Parse a Mercury webhook envelope into a slim, owner-facing projection.

    NEVER leaks bank routing details, account numbers, full customer profile,
    or raw payload internals. Endpoint can log this projection to the
    audit ledger + fire owner Telegram without redaction.

    Returns:
        {
          "event_id": str,
          "type": str,
          "created": str | None,
          "invoice_id": str | None,
          "status": str | None,
          "total_cents": int | None,
          "paid_at": str | None,
          "customer_email": str | None,
        }
    """
    try:
        raw = json.loads(payload.decode("utf-8")) if payload else {}
    except (ValueError, UnicodeDecodeError):
        raw = {}
    if not isinstance(raw, dict):
        raw = {}
    data = raw.get("data") or {}
    if not isinstance(data, dict):
        data = {}
    return {
        "event_id": raw.get("id"),
        "type": raw.get("type"),
        "created": raw.get("created"),
        "invoice_id": data.get("id") if raw.get("type", "").startswith("invoice.") else None,
        "status": data.get("status"),
        "total_cents": data.get("total_cents"),
        "paid_at": data.get("paid_at"),
        "customer_email": data.get("customer_email"),
    }


def get_invoice(invoice_id: str) -> dict:
    """Slim status of an invoice — never includes the full pay-link if already paid."""
    resp = _request("GET", f"/invoicing/invoice/{invoice_id}")
    return {
        "invoice_id": resp.get("id"),
        "status": resp.get("status"),
        "paid_at": resp.get("paid_at"),
        "total_cents": resp.get("total_cents"),
    }
