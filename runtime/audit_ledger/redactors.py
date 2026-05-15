"""Pre-write redactors — Sacred Separation + PII hashing applied BEFORE the
row hits the database.

Defense in depth: even at owner-tier DB access, raw customer UIDs do not
exist. Agent + action names are canonicalized (not redacted — the audit
ledger is owner-tier internal; sync worker handles client-tier rendering).
Payload values flagged with PII-sounding keys are hashed too.

Per the standing Coastal-protection directive (memory
`feedback_secure_coastal_in_all_ways_during_foai_work_2026_05_15`).
"""
from __future__ import annotations

import hashlib
import logging
import re
from typing import Any

log = logging.getLogger("foai.runtime.audit_ledger.redactors")

# Keys whose values get auto-hashed if present in the payload. Anchored to
# the start + end of the key string so we don't false-positive on adjacent
# tokens (e.g. "non_pii_email_count" stays untouched). Caller is still
# responsible for passing customer_uid explicitly to write_event() (which
# is always hashed regardless of payload contents).
_PII_KEY_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"^customer[_-]?(?:id|uid|email|name|phone)$", re.IGNORECASE),
    re.compile(r"^user[_-]?(?:id|email|name|phone)$", re.IGNORECASE),
    re.compile(r"^email(?:[_-]?address)?$", re.IGNORECASE),
    re.compile(r"^phone(?:[_-]?number)?$", re.IGNORECASE),
    re.compile(r"^stripe[_-]?customer(?:[_-]?id)?$", re.IGNORECASE),
    re.compile(r"^mercury[_-]?account(?:[_-]?id)?$", re.IGNORECASE),
    re.compile(r"^(?:ssn|tax[_-]?id)$", re.IGNORECASE),
)


def hash_customer_uid(raw: str | None, pii_salt: str) -> str | None:
    """SHA-256 hash a customer UID with the per-deployment salt.

    Returns None if `raw` is empty/None. Returns None (and logs a warning) if
    `pii_salt` is empty — refuse to write raw PII to the ledger.
    """
    if not raw:
        return None
    if not pii_salt:
        log.warning(
            "audit_ledger: pii_salt empty; refusing to write raw customer_uid"
        )
        return None
    return hashlib.sha256((pii_salt + raw).encode("utf-8")).hexdigest()


def redact_payload(payload: dict[str, Any] | None, pii_salt: str) -> dict[str, Any]:
    """Walk the payload + hash any value whose key matches a PII pattern.

    Non-string values under PII-matched keys get str()ed first. Nested dicts
    are walked recursively. Lists / non-dict values pass through unchanged.

    If `pii_salt` is empty, PII-matched values are replaced with the literal
    string `"<redacted:no_salt>"` rather than raw — fail-closed.
    """
    if not payload:
        return {}

    def _walk(value: Any) -> Any:
        if isinstance(value, dict):
            return {k: _redact_kv(k, v) for k, v in value.items()}
        if isinstance(value, list):
            return [_walk(item) for item in value]
        return value

    def _redact_kv(key: str, value: Any) -> Any:
        if any(p.search(str(key)) for p in _PII_KEY_PATTERNS):
            raw = str(value) if value is not None else None
            if raw is None:
                return None
            if not pii_salt:
                return "<redacted:no_salt>"
            return f"sha256:{hashlib.sha256((pii_salt + raw).encode('utf-8')).hexdigest()[:32]}"
        if isinstance(value, (dict, list)):
            return _walk(value)
        return value

    return _walk(payload)


# ─── Agent + action canonicalization ─────────────────────────────────────

# Restricted character set: alphanum + - + _ + . + space. Anything else stripped.
_CANON_PATTERN = re.compile(r"[^A-Za-z0-9._\- ]+")


def canonicalize_agent(agent: str) -> str:
    """Strip control chars + bound length. Agent names are internal canon
    (Iller_Ang, Sal_Ang, etc.) — keep them readable but defended against
    injection.
    """
    return _CANON_PATTERN.sub("", agent.strip())[:128]


def canonicalize_action(action: str) -> str:
    """Same as canonicalize_agent but for action strings."""
    return _CANON_PATTERN.sub("", action.strip())[:256]
