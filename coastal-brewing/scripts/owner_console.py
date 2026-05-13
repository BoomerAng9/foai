# coastal-brewing/scripts/owner_console.py
"""Owner-only API router for /api/v1/owner/*.

Every endpoint in this module is gated by `require_owner` which checks
the `coastal_owner` cookie HMAC + the email's continued presence in
COASTAL_OWNER_EMAILS (env change → ongoing session denied).
"""
from __future__ import annotations

import logging
import os
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request

import owner_auth

log = logging.getLogger("coastal.owner_console")

router = APIRouter(prefix="/api/v1/owner", tags=["owner"])


def _owner_session_secret() -> str:
    secret = os.environ.get("COASTAL_OWNER_SESSION_SECRET", "").strip()
    if not secret:
        raise HTTPException(status_code=503, detail="owner session not configured")
    return secret


def require_owner(
    coastal_owner: Annotated[str | None, Cookie()] = None,
) -> dict:
    """FastAPI dependency. Returns the owner identity dict on success.
    Raises 401 (no/invalid cookie) or 403 (email no longer in allowlist)."""
    parsed = owner_auth.verify_owner_cookie(coastal_owner, _owner_session_secret())
    if parsed is None:
        raise HTTPException(status_code=401, detail="owner session required")
    allowlist = owner_auth.parse_allowlist(os.environ.get("COASTAL_OWNER_EMAILS"))
    if not owner_auth.is_owner_email(parsed["email"], allowlist):
        raise HTTPException(status_code=403, detail="email not in owner allowlist")
    return parsed


_STRIPE_EVENT_CACHE: dict[str, object] = {"at": 0.0, "value": []}


def _cached_stripe_events() -> list[dict]:
    """Return a 30s-cached snapshot of stripe.Event.list(limit=50).
    On Stripe API failure, returns the last-cached value (or empty)
    + logs a warning. Refresh is lazy — fired on the next /activity
    request after the cache TTL expires (no background task)."""
    import time
    if time.time() - _STRIPE_EVENT_CACHE["at"] < 30:
        return _STRIPE_EVENT_CACHE["value"]
    try:
        import stripe
        events = stripe.Event.list(limit=50)
        out = [{"id": e.id, "type": e.type, "created": e.created} for e in events]
    except Exception as exc:
        log.warning("owner_console: stripe event fetch failed: %s", exc)
        return _STRIPE_EVENT_CACHE["value"]
    _STRIPE_EVENT_CACHE["at"] = time.time()
    _STRIPE_EVENT_CACHE["value"] = out
    return out


@router.get("/activity")
def get_activity(
    request: Request,
    since: str | None = None,
    include_stripe: bool = True,
    owner: dict = Depends(require_owner),
) -> dict:
    """Return last 50 audit_ledger events + (optionally) 50 Stripe events
    (cached 30s). `since` is a unix cursor — events older than this are
    excluded."""
    import audit_ledger
    cutoff = float(since) if since else 0.0
    try:
        events = audit_ledger.recent_events(limit=50, since_unix=cutoff)
    except AttributeError:
        # recent_events helper missing — add it to audit_ledger
        events = []
        log.warning("audit_ledger.recent_events not implemented; returning empty list")
    stripe_events: list[dict] = []
    if include_stripe:
        stripe_events = _cached_stripe_events()
    cursor = None
    if events:
        first = events[0]
        cursor = str(first.get("ts") or first.get("created_at") or "")
    return {
        "ok": True,
        "owner_email": owner["email"],
        "events": events,
        "stripe_events": stripe_events,
        "cursor": cursor,
    }
