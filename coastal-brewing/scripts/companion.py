"""C|Brew Communication Companion — FastAPI router.

Mounts /api/v1/companion/* on the existing coastal-runner. Every
endpoint authenticates via the existing coastal_uid cookie (set by
/api/v1/auth/verify in the Coastal magic-link flow) — there's no
separate Companion auth surface; the Companion is a feature on
top of the existing customer identity.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Annotated, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, WebSocket, WebSocketDisconnect
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
    """Return the caller's Taskade workspace id (if provisioned) +
    paid-tier flag. Customer-facing UI uses this to gate the dashboard
    deep-link + show upgrade prompts."""
    import audit_ledger
    audit_ledger.init_schema()
    ws_id = audit_ledger.companion_workspace_get(uid)
    is_paid = audit_ledger.companion_is_paid(uid)
    return {
        "ok": True,
        "coastal_uid": uid,
        "taskade_workspace_id": ws_id,
        "is_paid_tier": is_paid,
    }


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


class BillingCheckoutBody(BaseModel):
    email: str


@router.post("/billing/checkout")
def billing_checkout(
    body: BillingCheckoutBody, uid: str = Depends(require_uid),
) -> dict:
    import stripe
    import companion_billing
    from adapters.stripe_adapter import _init_stripe  # noqa: PLC0415
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
    import sqlite3
    import stripe
    import audit_ledger
    from adapters.stripe_adapter import _init_stripe  # noqa: PLC0415
    audit_ledger.init_schema()
    _init_stripe()
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
    try:
        portal = stripe.billing_portal.Session.create(
            customer=row["stripe_customer_id"],
            return_url=f"{os.environ.get('COASTAL_PUBLIC_URL', 'https://brewing.foai.cloud')}/companion",
        )
    except Exception as exc:
        log.warning("companion portal mint failed: %s", exc)
        raise HTTPException(status_code=502, detail="portal mint failed")
    return {"ok": True, "url": portal.url}


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


def _coastal_uid_from_cookie_header(cookie_header: str) -> Optional[str]:
    """Parse coastal_uid from a raw Cookie header. WebSocket handshakes
    don't use FastAPI Cookie() dependencies the same way HTTP routes do
    — we read the raw header from `websocket.headers.get("cookie")`."""
    from api_server import _resolve_uid_cookie  # noqa: PLC0415
    if not cookie_header:
        return None
    for part in cookie_header.split(";"):
        part = part.strip()
        if part.startswith("coastal_uid="):
            return _resolve_uid_cookie(part.split("=", 1)[1])
    return None


@router.websocket("/session/{session_id}/stream")
async def session_stream(websocket: WebSocket, session_id: str) -> None:
    """Bidirectional audio + caption proxy between the customer and
    the Inworld Gateway. WS close codes:
      4401 — no/invalid coastal_uid cookie
      4402 — no Inworld BYOK key on file
      4404 — session not found / not owned by this uid
      4500 — BYOK decrypt failed
      4502 — upstream connection failed
    """
    await websocket.accept()

    cookie_hdr = websocket.headers.get("cookie", "")
    coastal_uid = _coastal_uid_from_cookie_header(cookie_hdr)
    if coastal_uid is None:
        await websocket.close(code=4401, reason="uid required")
        return

    import audit_ledger
    import companion_byok
    import companion_inworld

    audit_ledger.init_schema()
    ct = audit_ledger.companion_byok_fetch(coastal_uid, "inworld")
    if ct is None:
        await websocket.close(code=4402, reason="no Inworld BYOK key on file")
        return
    user_key = companion_byok.decrypt_key(_byok_secret(), ct)
    if user_key is None:
        await websocket.close(code=4500, reason="BYOK decrypt failed")
        return

    sess = audit_ledger.companion_session_fetch(session_id)
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
