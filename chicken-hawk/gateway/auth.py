"""Magic-link single-owner auth + JWT session for Chicken Hawk Gateway.

Owner enters email -> server generates JWT magic-link token -> sends via Telegram bot
to the canonical owner chat_id -> owner clicks link -> JWT validated -> session cookie set.

Single-user system: only OWNER_EMAIL is allowlisted. Email mismatch returns 200 with
generic message (no enumeration leak).
"""
from __future__ import annotations

import os
import time
from typing import Optional

import httpx
import jwt
from fastapi import APIRouter, Cookie, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel

OWNER_EMAIL = os.getenv("OWNER_EMAIL", "").lower().strip()
JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_ALG = "HS256"
SESSION_COOKIE = "ch_session"
MAGIC_LINK_TTL_SEC = 15 * 60
SESSION_TTL_SEC = 24 * 3600

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

PORTAL_BASE = os.getenv("PORTAL_BASE", "https://app.myclaw.foai.cloud")

router = APIRouter()


class LoginRequest(BaseModel):
    email: str


def _sign(payload: dict) -> str:
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def _verify(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])


async def _send_telegram(message: str) -> None:
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        raise RuntimeError("Telegram not configured")
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    async with httpx.AsyncClient(timeout=5) as client:
        r = await client.post(
            url,
            json={
                "chat_id": TELEGRAM_CHAT_ID,
                "text": message,
                "disable_web_page_preview": False,
            },
        )
        r.raise_for_status()


def _html_response(status: str, message: str) -> HTMLResponse:
    return HTMLResponse(
        content=f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Chicken Hawk</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>body{{font-family:Inter,system-ui,sans-serif;background:#0a0c10;color:#e2e8f0;
padding:48px;text-align:center;min-height:100vh;margin:0}}
h1{{color:#00f0ff;margin-bottom:24px}}p{{color:#94a3b8;line-height:1.6}}
.box{{max-width:480px;margin:80px auto;padding:32px;background:#0f141b;
border:1px solid #1e293b;border-radius:8px}}</style></head>
<body><div class="box"><h1>{status}</h1><p>{message}</p></div></body></html>"""
    )


@router.post("/login")
async def login(request: Request) -> HTMLResponse:
    if not JWT_SECRET:
        raise HTTPException(status_code=503, detail="JWT_SECRET not configured")
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        body = await request.json()
        email = (body.get("email") or "").lower().strip()
    else:
        form = await request.form()
        email = (form.get("email") or "").lower().strip()

    if not email or email != OWNER_EMAIL:
        return _html_response(
            "Check your Telegram",
            "If the email is recognized, a magic link has been sent. Single-click consumes it.",
        )

    now = int(time.time())
    token = _sign(
        {"sub": OWNER_EMAIL, "iat": now, "exp": now + MAGIC_LINK_TTL_SEC, "kind": "magic_link"}
    )
    link = f"{PORTAL_BASE}/login/verify?token={token}"
    msg = (
        f"Access code (expires in 15 min):\n{link}\n\n"
        f"Tap once. If you didn't request this, ignore."
    )
    try:
        await _send_telegram(msg)
    except Exception as e:
        return _html_response(
            "Delivery failed",
            f"Could not send via Telegram: {e}. Check server logs.",
        )
    return _html_response(
        "Check your Telegram",
        "Code sent. Tap once. Expires in 15 min.",
    )


@router.get("/login/verify")
async def login_verify(token: str) -> RedirectResponse:
    if not JWT_SECRET:
        raise HTTPException(status_code=503, detail="JWT_SECRET not configured")
    try:
        payload = _verify(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"invalid magic link: {e}")
    if payload.get("kind") != "magic_link":
        raise HTTPException(status_code=401, detail="not a magic_link token")

    now = int(time.time())
    session = _sign(
        {"sub": payload["sub"], "iat": now, "exp": now + SESSION_TTL_SEC, "kind": "session"}
    )
    resp = RedirectResponse(url="/me", status_code=303)
    resp.set_cookie(
        SESSION_COOKIE,
        session,
        max_age=SESSION_TTL_SEC,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
    )
    return resp


@router.get("/me", response_class=HTMLResponse)
async def me(ch_session: Optional[str] = Cookie(default=None)) -> HTMLResponse:
    owner = get_owner_from_session(ch_session)
    if not owner:
        return HTMLResponse(
            content="""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Chicken Hawk</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>body{font-family:Inter,system-ui,sans-serif;background:#0a0c10;color:#e2e8f0;
padding:48px;text-align:center;min-height:100vh;margin:0}h1{color:#00f0ff;margin-bottom:24px}
p{color:#94a3b8;line-height:1.6}.box{max-width:480px;margin:80px auto;padding:32px;
background:#0f141b;border:1px solid #1e293b;border-radius:8px}
a{color:#00f0ff;text-decoration:none}a:hover{text-decoration:underline}</style></head>
<body><div class="box"><h1>Not signed in</h1>
<p>Open <a href="https://myclaw.foai.cloud/">the portal</a> and request a magic link.</p>
</div></body></html>""",
            status_code=401,
        )

    return HTMLResponse(
        content=f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Chicken Hawk</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>body{{font-family:Inter,system-ui,sans-serif;background:#0a0c10;color:#e2e8f0;
padding:48px;min-height:100vh;margin:0}}h1{{color:#00f0ff;margin-bottom:8px}}
.subtitle{{color:#94a3b8;margin-bottom:32px}}
.box{{max-width:680px;margin:60px auto;padding:40px;background:#0f141b;
border:1px solid #1e293b;border-radius:8px}}
.section{{margin-top:32px;padding-top:24px;border-top:1px solid #1e293b}}
.section h2{{color:#e2e8f0;font-size:16px;text-transform:uppercase;letter-spacing:0.1em;
margin-bottom:12px}}
.endpoint{{font-family:'SF Mono',monospace;background:#0a0c10;padding:8px 12px;
border-radius:4px;display:block;margin-bottom:6px;color:#94a3b8;font-size:13px}}
.endpoint .method{{color:#00f0ff;font-weight:700;margin-right:8px}}
button{{background:#00f0ff;color:#0a0c10;border:0;padding:10px 20px;border-radius:4px;
font-weight:700;cursor:pointer;font-family:inherit}}</style></head>
<body><div class="box">
<h1>Chicken Hawk</h1>
<p class="subtitle">Signed in as <strong>{owner}</strong>. Session active for 24h.</p>

<div class="section"><h2>Operator endpoints</h2>
<span class="endpoint"><span class="method">POST</span>/chat — natural-language to Lil_Hawks</span>
<span class="endpoint"><span class="method">GET </span>/hawks — Lil_Hawk fleet status</span>
<span class="endpoint"><span class="method">GET </span>/api/chicken-hawk/live-plan — SSE task plan stream</span>
</div>

<div class="section"><h2>Guard layer (NemoClaw, embedded)</h2>
<span class="endpoint"><span class="method">POST</span>/check — action policy verdict (bearer)</span>
<span class="endpoint"><span class="method">POST</span>/risk-event — record risk event (bearer)</span>
<span class="endpoint"><span class="method">GET </span>/risk-events — recent events (bearer)</span>
</div>

<div class="section"><h2>Session</h2>
<form method="POST" action="/logout" style="display:inline">
<button type="submit">Sign out</button></form>
</div>
</div></body></html>"""
    )


@router.post("/logout")
async def logout(response: Response) -> dict:
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"status": "ok"}


def get_owner_from_session(ch_session: Optional[str]) -> Optional[str]:
    if not ch_session or not JWT_SECRET:
        return None
    try:
        payload = _verify(ch_session)
        if payload.get("kind") == "session":
            return payload.get("sub")
    except Exception:
        return None
    return None
