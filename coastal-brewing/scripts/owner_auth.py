"""Owner-only auth primitives — cookie HMAC sign/verify, allowlist
parsing, and per-email lockout tracking.

The WebAuthn ceremony lives in this module too (added in Task 8).
This file is the single source of truth for "is this caller the
owner" across the FastAPI router."""
from __future__ import annotations

import hashlib
import hmac
import logging
import os
import time
from typing import Optional

log = logging.getLogger("coastal.owner_auth")

# Tunable constants — overridable by env for ops.
DEFAULT_TTL_SEC = int(os.environ.get("COASTAL_OWNER_COOKIE_TTL_SEC", "86400"))  # 24h
LOCKOUT_THRESHOLD = int(os.environ.get("COASTAL_OWNER_LOCKOUT_THRESHOLD", "3"))
LOCKOUT_WINDOW_SEC = int(os.environ.get("COASTAL_OWNER_LOCKOUT_WINDOW_SEC", "300"))   # 5min
LOCKOUT_COOLDOWN_SEC = int(os.environ.get("COASTAL_OWNER_LOCKOUT_COOLDOWN_SEC", "1800"))  # 30min

# In-memory failure tracking — email → list[failure_unix]
_LOCKOUT: dict[str, list[float]] = {}


def parse_allowlist(env_value: Optional[str]) -> set[str]:
    """Parse COASTAL_OWNER_EMAILS into a normalised set (lowercased,
    whitespace-stripped). Empty env → empty set."""
    if not env_value:
        return set()
    return {e.strip().lower() for e in env_value.split(",") if e.strip()}


def is_owner_email(email: str, allowlist: set[str]) -> bool:
    return (email or "").strip().lower() in allowlist


def sign_owner_cookie(email: str, secret: str, *, ttl_sec: int = DEFAULT_TTL_SEC) -> str:
    """Mint a coastal_owner cookie value: <email>.<exp_unix>.<hmac8>"""
    expires = int(time.time()) + ttl_sec
    payload = f"{email.lower()}.{expires}"
    mac = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
    return f"{payload}.{mac}"


def verify_owner_cookie(raw: Optional[str], secret: str) -> Optional[dict]:
    """Verify a coastal_owner cookie. Returns {email, expires} on success,
    None on tamper / expiry / malformed."""
    if not raw or not isinstance(raw, str):
        return None
    parts = raw.rsplit(".", 2)
    if len(parts) != 3:
        return None
    email, expires_str, mac = parts
    payload = f"{email}.{expires_str}"
    expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
    if not hmac.compare_digest(mac, expected):
        return None
    try:
        expires = int(expires_str)
    except ValueError:
        return None
    if expires < int(time.time()):
        return None
    return {"email": email, "expires": expires}


def _prune_old(failures: list[float], now: float) -> list[float]:
    cutoff = now - LOCKOUT_WINDOW_SEC
    return [t for t in failures if t >= cutoff]


def record_failure(email: str) -> None:
    now = time.time()
    bucket = _LOCKOUT.get(email, [])
    bucket = _prune_old(bucket, now)
    bucket.append(now)
    _LOCKOUT[email] = bucket
    if len(bucket) >= LOCKOUT_THRESHOLD:
        log.warning("owner_auth: lockout triggered for %s (failures=%d)", email, len(bucket))


def is_locked(email: str) -> bool:
    now = time.time()
    bucket = _LOCKOUT.get(email, [])
    bucket = _prune_old(bucket, now)
    _LOCKOUT[email] = bucket
    return len(bucket) >= LOCKOUT_THRESHOLD


def clear_failures(email: str) -> None:
    """Call on successful auth to reset the lockout counter."""
    _LOCKOUT.pop(email, None)
