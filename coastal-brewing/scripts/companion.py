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
