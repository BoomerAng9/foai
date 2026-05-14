"""C|Brew Communication Companion — FastAPI router.

Mounts /api/v1/companion/* on the existing coastal-runner. Every
endpoint authenticates via the existing coastal_uid cookie (set by
/api/v1/auth/verify in the Coastal magic-link flow) — there's no
separate Companion auth surface; the Companion is a feature on
top of the existing customer identity.
"""
from __future__ import annotations

import logging
import os
from typing import Annotated, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException
from pydantic import BaseModel

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
    """Placeholder — Task 8 fills in the real workspace lookup."""
    return {"ok": True, "coastal_uid": uid, "taskade_workspace_id": None}


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


import secrets as _secrets  # noqa: E402

FREE_TIER_DAILY_MINUTES_CAP = 30.0


def _free_tier_minutes_used_last_24h(coastal_uid: str) -> float:
    """Query audit_ledger for total minutes used by free-tier sessions
    in the last 24 hours. Returns float (0.0 if no sessions found)."""
    import audit_ledger
    import time as _t
    cutoff = int(_t.time()) - 86400
    audit_ledger.init_schema()
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
    audit_ledger.init_schema()
    session_id = "ccs_" + _secrets.token_urlsafe(12)
    tier = "paid" if audit_ledger.companion_is_paid(uid) else "free"
    if tier == "free":
        used = _free_tier_minutes_used_last_24h(uid)
        if used >= FREE_TIER_DAILY_MINUTES_CAP:
            raise HTTPException(
                status_code=429,
                detail=f"free-tier daily cap reached ({FREE_TIER_DAILY_MINUTES_CAP} min); upgrade or retry tomorrow",
            )
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
    audit_ledger.init_schema()
    audit_ledger.companion_session_end(
        session_id=session_id, minutes_used=body.minutes_used,
    )
    return {"ok": True, "session_id": session_id}
