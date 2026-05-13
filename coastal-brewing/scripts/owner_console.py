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


@router.get("/activity")
def get_activity(
    request: Request,
    since: str | None = None,
    owner: dict = Depends(require_owner),
) -> dict:
    """Placeholder — populated by Task 11."""
    return {"ok": True, "owner_email": owner["email"], "events": [], "cursor": None}
