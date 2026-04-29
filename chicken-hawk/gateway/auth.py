"""Magic-link + 6-digit code single-owner auth + JWT session for Chicken Hawk Gateway.

Owner enters email -> server generates a magic-link JWT AND a 6-digit code
-> sends both via Telegram. Owner can either tap the link OR type the code
into the /login page. Code path lands the session cookie in whatever browser
is actively on /login (avoids the Telegram in-app browser cookie split).

Single-user system: only OWNER_EMAILS aliases are allowlisted. Email mismatch
returns 200 with generic message (no enumeration leak).
"""
from __future__ import annotations

import os
import secrets
import time
from typing import Optional

import httpx
import jwt
from fastapi import APIRouter, Cookie, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel

# Owner identity may map to multiple email aliases (Telegram-bound,
# project-bound, executive). Provide as comma-separated `OWNER_EMAIL` OR
# `OWNER_EMAILS`. Either works; first listed email is the canonical sub
# when external systems need a single value.
_owner_email_raw = os.getenv("OWNER_EMAILS", os.getenv("OWNER_EMAIL", ""))
OWNER_EMAILS: tuple[str, ...] = tuple(
    e for e in (x.lower().strip() for x in _owner_email_raw.split(",")) if e
)
OWNER_EMAIL: str = OWNER_EMAILS[0] if OWNER_EMAILS else ""
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


# In-memory pending-code store. Single-process, single-owner — fine without Redis.
# Restart loses pending codes (TTL is 15 min anyway). Per-email lock not needed
# (no concurrent login attempts in a single-owner system).
_PENDING_CODES: dict[str, dict] = {}


def _generate_code() -> str:
    """Cryptographically random 6-digit numeric code."""
    return f"{secrets.randbelow(1_000_000):06d}"


def _store_code(email: str, code: str) -> None:
    _PENDING_CODES[email] = {
        "code": code,
        "expires_at": int(time.time()) + MAGIC_LINK_TTL_SEC,
        "used": False,
    }


def _consume_code(email: str, code: str) -> bool:
    """Verify code and mark used. Single-use; expired or wrong codes return False."""
    entry = _PENDING_CODES.get(email)
    if not entry:
        return False
    if entry["used"]:
        return False
    if int(time.time()) > entry["expires_at"]:
        return False
    # Constant-time compare to avoid timing oracle on the 6-digit code.
    if not secrets.compare_digest(entry["code"], code):
        return False
    entry["used"] = True
    return True


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

    if not email or email not in OWNER_EMAILS:
        return _html_response(
            "Check your Telegram",
            "If the email is recognized, a magic link has been sent. Single-click consumes it.",
        )

    now = int(time.time())
    token = _sign(
        {"sub": email, "iat": now, "exp": now + MAGIC_LINK_TTL_SEC, "kind": "magic_link"}
    )
    link = f"{PORTAL_BASE}/login/verify?token={token}"
    code = _generate_code()
    _store_code(email, code)
    msg = (
        f"Chicken Hawk sign-in (expires in 15 min):\n\n"
        f"6-digit code: {code}\n"
        f"Type this on the /login page in your browser.\n\n"
        f"Or tap to sign in directly:\n{link}\n\n"
        f"If you didn't request this, ignore."
    )
    # Wave 1 Step C (Path 1): magic-link delivery stays on direct Telegram.
    # Hermes Agent is the INBOUND owner command surface (chat → tool calls),
    # not an outbound notifier. notifier.py is a Wave 2 placeholder for
    # outbound multi-channel; calling it here would always return False
    # and add a needless try/except for zero benefit today. Wave 2 wires
    # outbound multi-channel by replacing this _send_telegram call with a
    # notifier.notify_owner(...) try-then-fallback chain.
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


@router.post("/login/verify-code")
async def login_verify_code(request: Request) -> JSONResponse:
    """Verify a 6-digit code typed on /login. Sets session cookie on the
    *requesting* browser so the cookie lives where the user actually is
    (avoids the Telegram in-app browser cookie-isolation problem)."""
    if not JWT_SECRET:
        raise HTTPException(status_code=503, detail="JWT_SECRET not configured")
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        body = await request.json()
        email = (body.get("email") or "").lower().strip()
        code = (body.get("code") or "").strip()
    else:
        form = await request.form()
        email = (form.get("email") or "").lower().strip()
        code = (form.get("code") or "").strip()

    if not email or email not in OWNER_EMAILS:
        # Same decoy shape as /login: no enumeration leak.
        raise HTTPException(status_code=401, detail="invalid email or code")
    if not code or len(code) != 6 or not code.isdigit():
        raise HTTPException(status_code=401, detail="invalid email or code")
    if not _consume_code(email, code):
        raise HTTPException(status_code=401, detail="invalid email or code")

    now = int(time.time())
    session = _sign(
        {"sub": email, "iat": now, "exp": now + SESSION_TTL_SEC, "kind": "session"}
    )
    resp = JSONResponse({"ok": True, "owner": email})
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
    resp = RedirectResponse(url="/tools", status_code=303)
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


_ME_BASE_CSS = """
:root{--bg:#F8FAFC;--surface:#FFFFFF;--border:#E2E8F0;--text:#0F172A;
--muted:#475569;--gold:#D97706;--gold-hover:#B45309;--gold-tint:rgba(217,119,6,0.08);}
*{box-sizing:border-box}
body{font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;
background:var(--bg);color:var(--text);padding:48px 24px;min-height:100vh;margin:0;
-webkit-font-smoothing:antialiased}
.box{max-width:520px;margin:60px auto;padding:40px;background:var(--surface);
border:1px solid var(--border);border-radius:16px;
box-shadow:0 1px 3px rgba(15,23,42,0.06),0 1px 2px rgba(15,23,42,0.04)}
h1{color:var(--text);margin:0 0 8px;font-size:28px;letter-spacing:-0.02em}
p{color:var(--muted);line-height:1.55;margin:0 0 16px}
.email{color:var(--text);font-weight:600}
.cta{display:inline-flex;align-items:center;gap:8px;background:var(--gold);
color:#fff;border:0;padding:10px 18px;border-radius:8px;font-weight:600;
text-decoration:none;font-family:inherit;font-size:14px;cursor:pointer;margin-top:8px}
.cta:hover{background:var(--gold-hover)}
.cta-secondary{display:inline-flex;align-items:center;gap:8px;background:transparent;
color:var(--muted);border:1px solid var(--border);padding:10px 18px;border-radius:8px;
font-weight:600;text-decoration:none;font-family:inherit;font-size:14px;
cursor:pointer;margin-left:8px}
.cta-secondary:hover{border-color:var(--gold);color:var(--text)}
.row{display:flex;align-items:center;gap:0;flex-wrap:wrap}
.dot{display:inline-block;width:8px;height:8px;background:#22C55E;border-radius:50%;
margin-right:8px;vertical-align:middle}
"""


@router.get("/me", response_class=HTMLResponse)
async def me(ch_session: Optional[str] = Cookie(default=None)) -> HTMLResponse:
    owner = get_owner_from_session(ch_session)
    if not owner:
        return HTMLResponse(
            content=f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Chicken Hawk · Sign in</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>{_ME_BASE_CSS}</style></head>
<body><div class="box">
<h1>Not signed in</h1>
<p>Your owner session expired or never started. Head to the sign-in page to request a fresh code.</p>
<a href="/login" class="cta">Sign in →</a>
</div></body></html>""",
            status_code=401,
        )

    return HTMLResponse(
        content=f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Chicken Hawk · Owner</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>{_ME_BASE_CSS}</style></head>
<body><div class="box">
<h1>You&apos;re signed in.</h1>
<p><span class="dot"></span>Signed in as <span class="email">{owner}</span>. Session active for 24 hours.</p>
<div class="row">
<a href="/tools" class="cta">Open the Tool Chest</a>
<form method="POST" action="/logout" style="display:inline;margin:0">
<button type="submit" class="cta-secondary">Sign out</button>
</form>
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
