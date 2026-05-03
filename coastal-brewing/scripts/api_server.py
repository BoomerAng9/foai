"""Coastal Brewing runner — FastAPI shim wrapping the kit's routing scripts.

Endpoints:
  GET  /healthz          — liveness probe (no auth)
  POST /route            — return routing decision for a task packet
  POST /run              — route + write receipt + write route placeholder
  POST /approve          — record an owner approval decision
  POST /checkout         — create Stripe checkout session for a Coastal subscription
  POST /stripe/webhook   — Stripe-signed webhook ingest (no X-Coastal-Token; Stripe-Signature instead)

All POST endpoints except /stripe/webhook require header `X-Coastal-Token: $COASTAL_GATEWAY_TOKEN`.
"""
from __future__ import annotations

import json
import os
import pathlib
import secrets
import sys
import urllib.parse
from typing import Any, Dict, List, Optional

import asyncio
import collections
import threading

from fastapi import FastAPI, Header, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import httpx
import requests

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from model_router import decide_route, make_receipt, utc_now  # noqa: E402
import audit_ledger  # noqa: E402
import catalog  # noqa: E402

try:
    from adapters.stripe_adapter import (  # noqa: E402
        create_checkout_session as _stripe_create_checkout_session,
        create_one_time_checkout_session as _stripe_create_one_time_checkout_session,
        is_configured as _stripe_is_configured,
        verify_webhook as _stripe_verify_webhook,
    )
    STRIPE_AVAILABLE = True
except Exception:
    STRIPE_AVAILABLE = False

GATEWAY_TOKEN = os.environ.get("COASTAL_GATEWAY_TOKEN", "")
COASTAL_PUBLIC_URL = os.environ.get("COASTAL_PUBLIC_URL", "https://brewing.foai.cloud")
NEMOCLAW_URL = os.environ.get("NEMOCLAW_URL", "")
NEMOCLAW_API_KEY = os.environ.get("NEMOCLAW_API_KEY", "")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")


import base64
import hashlib
import hmac
import time as _time

APPROVE_SECRET = os.environ.get("COASTAL_APPROVE_SECRET", "")
APPROVE_TTL_SEC = 7 * 24 * 3600  # owner has a week to act


def _make_approve_token(task_id: str, decision_label: str) -> str:
    if not APPROVE_SECRET:
        return ""
    payload = {
        "task_id": task_id,
        "approval_id": f"appr_{secrets.token_hex(8)}",
        "decision": decision_label,
        "exp": int(_time.time()) + APPROVE_TTL_SEC,
    }
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload, sort_keys=True).encode("utf-8")).rstrip(b"=").decode("ascii")
    sig = hmac.new(APPROVE_SECRET.encode("utf-8"), payload_b64.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{sig}"


def _verify_approve_token(token: str) -> Optional[dict]:
    if not APPROVE_SECRET or not token or "." not in token:
        return None
    try:
        payload_b64, sig = token.rsplit(".", 1)
        expected = hmac.new(APPROVE_SECRET.encode("utf-8"), payload_b64.encode("ascii"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, sig):
            return None
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8"))
        if payload.get("exp", 0) < int(_time.time()):
            return None
        return payload
    except Exception:
        return None


def _make_audit_token(task_id: str) -> str:
    if not APPROVE_SECRET:
        return ""
    payload = {
        "task_id": task_id,
        "kind": "audit",
        "exp": int(_time.time()) + APPROVE_TTL_SEC,
    }
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload, sort_keys=True).encode("utf-8")).rstrip(b"=").decode("ascii")
    sig = hmac.new(APPROVE_SECRET.encode("utf-8"), payload_b64.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{sig}"


def _verify_audit_token(token: str, task_id: str) -> bool:
    if not APPROVE_SECRET or not token or "." not in token:
        return False
    try:
        payload_b64, sig = token.rsplit(".", 1)
        expected = hmac.new(APPROVE_SECRET.encode("utf-8"), payload_b64.encode("ascii"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, sig):
            return False
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8"))
        if payload.get("kind") != "audit":
            return False
        if payload.get("task_id") != task_id:
            return False
        if payload.get("exp", 0) < int(_time.time()):
            return False
        return True
    except Exception:
        return False


def _send_telegram_approval(packet, decision, request_path):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return False
    risk_tags_str = ", ".join(packet.risk_tags) or "(none)"
    approve_link = f"{COASTAL_PUBLIC_URL}/approve/click?token={_make_approve_token(packet.task_id, 'approved')}"
    reject_link = f"{COASTAL_PUBLIC_URL}/approve/click?token={_make_approve_token(packet.task_id, 'rejected')}"
    audit_link = f"{COASTAL_PUBLIC_URL}/audit/{packet.task_id}?token={_make_audit_token(packet.task_id)}"
    msg = (
        f"Approval needed — Coastal Brewing\n"
        f"task: {packet.task_id} ({packet.task_type})\n"
        f"department: {packet.department or '(none)'}\n"
        f"risk_tags: {risk_tags_str}\n"
        f"reason: {decision.get('reason', '')}\n\n"
        f"✅ Approve: {approve_link}\n"
        f"❌ Reject:  {reject_link}\n"
        f"📋 Trail:   {audit_link}"
    )
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    try:
        r = requests.post(
            url,
            json={"chat_id": TELEGRAM_CHAT_ID, "text": msg, "disable_web_page_preview": True},
            timeout=5,
        )
        return r.status_code == 200
    except Exception:
        return False

RECEIPTS_DIR = ROOT / "receipts"
RESEARCH_TICKETS_DIR = ROOT / "research" / "tickets"
DRAFTS_DIR = ROOT / "drafts"
OWNER_APPROVALS_DIR = ROOT / "owner_approvals"
STRIPE_EVENTS_DIR = ROOT / "stripe_events"

for _d in (RECEIPTS_DIR, RESEARCH_TICKETS_DIR, DRAFTS_DIR, OWNER_APPROVALS_DIR, STRIPE_EVENTS_DIR):
    _d.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Coastal Brewing Runner", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://brewing.foai.cloud", "http://localhost:3000"],
    # allow_credentials=True so the chat panel can send/receive the
    # `coastal_uid` cookie that powers user-profile RAG (greeting variant
    # selection + last-purchase recall + session summaries).
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Coastal-Token"],
)

# Simple in-memory rate limiter: max 15 chat requests per IP per 60s window.
_RATE_LOCK = threading.Lock()
_RATE_BUCKETS: Dict[str, list] = collections.defaultdict(list)
_RATE_WINDOW_SEC = 60
_RATE_MAX_CHAT = 15


def _check_rate_limit(ip: str) -> None:
    now = _time.time()
    with _RATE_LOCK:
        bucket = _RATE_BUCKETS[ip]
        _RATE_BUCKETS[ip] = [t for t in bucket if now - t < _RATE_WINDOW_SEC]
        if len(_RATE_BUCKETS[ip]) >= _RATE_MAX_CHAT:
            raise HTTPException(status_code=429, detail="Too many requests — slow down a little.")
        _RATE_BUCKETS[ip].append(now)


_STATIC_DIR = ROOT / "static"
if _STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(_STATIC_DIR)), name="static")


def _auth(token: Optional[str]) -> None:
    if not GATEWAY_TOKEN:
        raise HTTPException(status_code=503, detail="COASTAL_GATEWAY_TOKEN not configured")
    if not token or not secrets.compare_digest(token, GATEWAY_TOKEN):
        raise HTTPException(status_code=401, detail="invalid token")


class TaskPacket(BaseModel):
    task_id: str
    owner_goal: Optional[str] = None
    objective: Optional[str] = None
    department: Optional[str] = None
    task_type: str
    risk_tags: List[str] = Field(default_factory=list)
    approval_required: bool = False
    desired_output: Optional[str] = None
    # Free-form payload for task-type-specific data (e.g., draft_order_confirmation
    # carries customer + shipping + product info used to render the supplier and
    # customer-facing email drafts).
    payload: Dict[str, Any] = Field(default_factory=dict)


class ApprovalDecision(BaseModel):
    task_id: str
    approval_id: str
    decision: str
    decided_by: str
    note: Optional[str] = None


def _call_nemoclaw(packet: "TaskPacket") -> Optional[dict]:
    """Call NemoClaw /check if NEMOCLAW_URL+NEMOCLAW_API_KEY are configured.

    Returns the verdict dict on success, an error-shaped dict on transport failure,
    or None if NemoClaw is not configured (caller treats None as 'gate disabled').
    """
    if not NEMOCLAW_URL or not NEMOCLAW_API_KEY:
        return None
    try:
        r = requests.post(
            f"{NEMOCLAW_URL.rstrip('/')}/check",
            headers={
                "Authorization": f"Bearer {NEMOCLAW_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "action_type": packet.task_type,
                "risk_tags": packet.risk_tags,
                "approval_id": None,
                "actor": "coastal-runner",
                "metadata": {"task_id": packet.task_id, "department": packet.department},
            },
            timeout=5,
        )
        if r.status_code == 200:
            return r.json()
        return {"verdict": "error", "reason": f"nemoclaw http {r.status_code}", "basis": "nemoclaw_error"}
    except Exception as e:
        return {"verdict": "error", "reason": str(e), "basis": "nemoclaw_unreachable"}


_LANDING_HTML = """<!DOCTYPE html>
<html lang="en" data-theme="dark"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Coastal Brewing Co. &mdash; Nothing chemically, ever.</title>
<meta name="description" content="Small-batch coffee, whole-leaf tea, ceremonial matcha. Sourced through verified partners. Every public claim has a paper trail. Brewed for the Lowcountry.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Inter:wght@400;500;600;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--bg:#f3f0e8;--ink:#1a1612;--ink-soft:#4a4540;--muted:#8a857d;--rule:#d8d2c4;--surface:#fff;--accent:#6b8e4e}
[data-theme="dark"]{--bg:#0d0b09;--ink:#f3efe6;--ink-soft:#b5afa0;--muted:#6a665d;--rule:#2a2620;--surface:#15120e;--accent:#b8c984}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
html,body{background:var(--bg);color:var(--ink);font-family:'Inter',system-ui,sans-serif;
-webkit-font-smoothing:antialiased;line-height:1.55;transition:background .2s,color .2s}
.serif{font-family:'Playfair Display',Georgia,serif}
.mono,.eyebrow{font-family:'JetBrains Mono',ui-monospace,monospace}
.eyebrow{font-size:11px;letter-spacing:0.10em;text-transform:uppercase;color:var(--muted)}

/* wordmark stacked imprint */
.wordmark{text-transform:uppercase;letter-spacing:0.18em;line-height:0.92;
color:var(--ink);text-decoration:none;display:inline-block;text-align:center}
.wordmark .top,.wordmark .bot{display:block}
.wordmark.serif{font-family:'Playfair Display',Georgia,serif;font-weight:700}
.wordmark.sans{font-family:'Inter',sans-serif;font-weight:900}
.wordmark.sm{font-size:14px}
.wordmark.md{font-size:20px}
.wordmark.lg{font-size:36px}

/* nav — wordmark top-left, links + cart top-right */
nav{display:flex;justify-content:space-between;align-items:center;
padding:24px 48px;border-bottom:1px solid var(--rule)}
.nav-right{display:flex;gap:24px;align-items:center}
nav a{color:var(--ink);text-decoration:none;font-size:11px;font-weight:600;
text-transform:uppercase;letter-spacing:0.12em;font-family:'Inter',sans-serif}
nav a:hover{color:var(--accent)}
.theme-toggle{background:transparent;border:0;color:var(--ink);font-size:16px;
cursor:pointer;padding:4px 8px;font-family:inherit}
.cart{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--ink);
letter-spacing:0.05em}

/* hero — two column, no watercolor in mock 1 */
.hero{max-width:1320px;margin:0 auto;padding:72px 48px;display:grid;
grid-template-columns:1.05fr 1fr;gap:64px;align-items:center}
.hero-left .eyebrow{margin-bottom:24px}
.hero h1{font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:80px;
line-height:0.98;letter-spacing:-0.025em;margin:0 0 28px;color:var(--ink)}
.hero h1 em{font-style:italic;color:var(--ink)}
.lede{font-size:17px;line-height:1.55;color:var(--ink-soft);max-width:480px;margin:0 0 32px}
.promise{display:inline-block;font-family:'JetBrains Mono',monospace;font-size:11px;
color:var(--ink-soft);letter-spacing:0.10em;text-transform:uppercase;
border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);padding:10px 0}

/* hero-right — full mock image as the hero visual; theme-aware swap */
.hero-right{position:relative;width:100%;aspect-ratio:1/1;overflow:hidden;
border:1px solid var(--rule);background:var(--surface)}
.hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
object-position:center}
.dark-only{display:none}
[data-theme="dark"] .light-only{display:none}
[data-theme="dark"] .dark-only{display:block}

/* lineup grid (mock 2 — 3 product cards w/ shop link) */
.lineup{max-width:1280px;margin:0 auto;padding:80px 48px}
.lineup-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:32px}
.lineup-card{display:flex;flex-direction:column;gap:16px;padding:0;cursor:pointer;
text-decoration:none;color:inherit;transition:transform .25s ease}
.lineup-card:hover{transform:translateY(-4px)}
.lineup-card .product-img{position:relative;aspect-ratio:1/1;overflow:hidden;
background:var(--surface);border:1px solid var(--rule)}
.lineup-card .product-img img{position:absolute;inset:0;width:100%;height:100%;
object-fit:cover;transition:transform .4s ease}
.lineup-card:hover .product-img img{transform:scale(1.04)}
.lineup-card .num{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted);
letter-spacing:0.10em;text-transform:uppercase}
.lineup-card h3{font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:24px;
letter-spacing:-0.01em;text-transform:none;color:var(--ink)}
.lineup-card p{font-size:14px;color:var(--ink-soft);line-height:1.55;flex:1}
.lineup-card .shop-link{font-family:'Inter',sans-serif;font-size:11px;font-weight:600;
letter-spacing:0.12em;text-transform:uppercase;color:var(--ink);
border-bottom:1px solid var(--ink);padding-bottom:4px;align-self:flex-start;
transition:color .15s,border-color .15s}
.lineup-card:hover .shop-link{color:var(--accent);border-bottom-color:var(--accent)}

/* commitment 4-tile (mock 2) */
.commit{max-width:1280px;margin:0 auto;padding:48px 48px 80px;border-top:1px solid var(--rule)}
.commit-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:32px;margin-top:32px}
.commit-cell{display:flex;flex-direction:column;gap:10px;padding:8px 0;
transition:transform .2s ease}
.commit-cell:hover{transform:translateY(-2px)}
.commit-cell .icon{width:32px;height:32px;color:var(--accent);margin-bottom:4px;
transition:transform .25s ease}
.commit-cell:hover .icon{transform:scale(1.1)}
.commit-cell h4{font-family:'Inter',sans-serif;font-size:11px;font-weight:600;
letter-spacing:0.10em;text-transform:uppercase;color:var(--ink)}
.commit-cell p{font-size:12px;color:var(--ink-soft);line-height:1.55}

/* footer with watercolor */
footer{position:relative;max-width:1280px;margin:0 auto;padding:64px 48px 32px;
border-top:1px solid var(--rule);overflow:hidden}
footer .watercolor-foot{position:absolute;right:0;bottom:0;width:300px;height:200px;
opacity:0.18;pointer-events:none}
[data-theme="dark"] footer .watercolor-foot{opacity:0.28}
.footer-grid{position:relative;z-index:1;display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:48px}
.footer-brand .wordmark{font-size:24px;text-align:left;margin-bottom:16px}
.footer-brand .tag-line{font-size:13px;color:var(--ink-soft);font-style:italic;margin-bottom:12px}
.footer-brand .socials{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);
letter-spacing:0.10em;text-transform:uppercase}
.footer-col h5{font-family:'Inter',sans-serif;font-size:11px;font-weight:600;
letter-spacing:0.12em;text-transform:uppercase;color:var(--ink);margin-bottom:14px}
.footer-col ul{list-style:none}
.footer-col li{margin-bottom:8px}
.footer-col a{color:var(--ink-soft);text-decoration:none;font-size:13px}
.footer-col a:hover{color:var(--accent)}
.footer-bottom{position:relative;z-index:1;margin-top:48px;padding-top:24px;
border-top:1px solid var(--rule);display:flex;justify-content:space-between;
font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted);
letter-spacing:0.10em;text-transform:uppercase;flex-wrap:wrap;gap:8px}

@media(max-width:980px){
  nav{flex-direction:column;gap:16px;padding:16px 24px}
  nav .nav-right{flex-wrap:wrap;justify-content:center;gap:16px}
  .hero{grid-template-columns:1fr;gap:48px;padding:48px 24px}
  .hero-right{order:-1;aspect-ratio:1.3/1}
  .hero h1{font-size:48px}
  .lineup,.commit{padding:48px 24px}
  .lineup-grid{grid-template-columns:1fr;gap:48px}
  .commit-grid{grid-template-columns:1fr 1fr;gap:24px}
  footer{padding:48px 24px 24px}
  .footer-grid{grid-template-columns:1fr;gap:32px}
  .footer-bottom{flex-direction:column}
}
@media(max-width:480px){.commit-grid{grid-template-columns:1fr}.hero h1{font-size:40px}}
</style></head>
<body>

<nav>
  <a class="wordmark sans md" href="/"><span class="top">Coastal</span><span class="bot">Brewing</span></a>
  <div class="nav-right">
    <a href="#lineup">Lineup</a>
    <a href="#commitment">Commitment</a>
    <a href="/chat">Chat</a>
    <button class="theme-toggle" id="themeToggle" aria-label="Toggle theme">&#9788;</button>
    <a href="/chat" class="cart">[ <span id="cartCount">0</span> ]</a>
  </div>
</nav>

<section class="hero">
  <div class="hero-left">
    <div class="eyebrow">[ Coffee &middot; Tea &middot; Matcha ]</div>
    <h1>Nothing<br>chemically,<br><em>ever.</em></h1>
    <p class="lede">Small-batch coffee, whole-leaf tea, ceremonial matcha — brewed honest, served by ACHEEVY. Sourced through verified partners. Every public claim has a paper trail.</p>
    <div class="promise">Subscriptions opening with our supplier handshake</div>
  </div>
  <div class="hero-right">
    <img src="/static/mock-dark.png" alt="Coastal Brewing — Lowcountry coffee, tea, matcha" class="hero-img dark-only">
    <img src="/static/mock-light.png" alt="Coastal Brewing — Lowcountry coffee, tea, matcha" class="hero-img light-only">
  </div>
</section>

<section class="lineup" id="lineup">
  <div class="lineup-grid">
    <a class="lineup-card" href="/chat?cat=coffee" data-cat="coffee" id="coffee">
      <div class="product-img"><img src="/static/mock-dark.png" alt="Coffee" style="object-position:62% 38%"></div>
      <span class="num">01 / Coffee</span>
      <h3>Lowcountry Coffee</h3>
      <p>House blend, dark roast, decaf. Small-lot sourcing through Temecula Coffee Roasters. No flavorings.</p>
      <span class="shop-link">Shop now &rarr;</span>
    </a>
    <a class="lineup-card" href="/chat?cat=tea" data-cat="tea" id="tea">
      <div class="product-img"><img src="/static/mock-light.png" alt="Tea" style="object-position:48% 58%"></div>
      <span class="num">02 / Tea</span>
      <h3>Lowcountry Tea</h3>
      <p>Breakfast black, herbal, and green. Whole-leaf, no dust. Brewed how you like it.</p>
      <span class="shop-link">Shop now &rarr;</span>
    </a>
    <a class="lineup-card" href="/chat?cat=matcha" data-cat="matcha" id="matcha">
      <div class="product-img"><img src="/static/mock-dark.png" alt="Matcha" style="object-position:82% 78%"></div>
      <span class="num">03 / Matcha</span>
      <h3>Ceremonial Matcha</h3>
      <p>Ceremonial-grade matcha. Brewed slowly, savored slowly. For mornings that ask for it.</p>
      <span class="shop-link">Shop now &rarr;</span>
    </a>
  </div>
</section>

<section class="commit" id="commitment">
  <span class="eyebrow">[ The commitment ]</span>
  <div class="commit-grid">
    <div class="commit-cell">
      <svg class="icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 26c8 0 16-8 20-20-12 0-20 8-20 20z"/><path d="M6 26l8-8"/></svg>
      <h4>Thoughtfully sourced</h4>
      <p>No synthetic additives, no preservative concentrates. If it's in the cup, it grew somewhere we can name.</p>
    </div>
    <div class="commit-cell">
      <svg class="icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="16" r="10"/><path d="M16 8v8l5 3"/></svg>
      <h4>Small batch</h4>
      <p>Roasts and packs in small lots so freshness is real, not a slogan. Picked up the week it ships.</p>
    </div>
    <div class="commit-cell">
      <svg class="icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4l10 4v8c0 6-4 10-10 12C10 26 6 22 6 16V8l10-4z"/><path d="M12 16l3 3 6-6"/></svg>
      <h4>Verified claims</h4>
      <p>Organic and fair-trade language only with cert IDs we can show. Every word on the label has a paper trail.</p>
    </div>
    <div class="commit-cell">
      <svg class="icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 14h16v8a4 4 0 01-4 4h-8a4 4 0 01-4-4v-8z"/><path d="M24 14h2a2 2 0 012 2v2a2 2 0 01-2 2h-2"/><path d="M12 8c0-2 2-4 0-6M16 8c0-2 2-4 0-6M20 8c0-2 2-4 0-6"/></svg>
      <h4>Made to be brewed</h4>
      <p>No instant pretensions. No extraction shortcuts. Coffee and tea, as they are, on a slow morning.</p>
    </div>
  </div>
</section>

<footer>
  <svg class="watercolor-foot" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
    <g stroke="currentColor" fill="none" stroke-width="1.2" stroke-linecap="round">
      <path d="M40 200 Q44 140 50 80 Q52 50 60 30" stroke-width="2"/>
      <path d="M60 30 Q30 10 10 25"/>
      <path d="M60 30 Q90 5 120 15"/>
      <path d="M60 30 Q40 -10 60 -10"/>
      <path d="M180 80 q12 -6 28 -6 q-14 10 -28 6 m0 0 q-10 -8 -22 -6 q14 10 22 6" stroke-width="1.5"/>
      <path d="M0 170 Q60 165 120 168 Q180 172 240 167 Q280 165 300 168" opacity="0.5"/>
    </g>
  </svg>
  <div class="footer-grid">
    <div class="footer-brand">
      <a class="wordmark serif" href="/"><span class="top">Coastal</span><span class="bot">Brewing</span></a>
      <p class="tag-line">Nothing chemically, ever.</p>
      <p class="socials">[ ig &middot; em &middot; tt ]</p>
    </div>
    <div class="footer-col">
      <h5>Shop</h5>
      <ul>
        <li><a href="#coffee">Coffee</a></li>
        <li><a href="#tea">Tea</a></li>
        <li><a href="#matcha">Matcha</a></li>
        <li><a href="#wholesale">Wholesale</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h5>Company</h5>
      <ul>
        <li><a href="#about">About</a></li>
        <li><a href="#story">Story</a></li>
        <li><a href="#contact">Contact</a></li>
        <li><a href="/chat">Chat with Agent</a></li>
      </ul>
    </div>
  </div>
  <div class="footer-bottom">
    <span>&copy; 2026 Coastal Brewing Co.</span>
    <span>[ Powered by ACHIEVEMOR ]</span>
  </div>
</footer>

<script>
(function(){
  var btn=document.getElementById('themeToggle');
  var html=document.documentElement;
  var stored=localStorage.getItem('cb_theme');
  if(stored){html.setAttribute('data-theme',stored);}
  else if(window.matchMedia('(prefers-color-scheme: light)').matches){html.setAttribute('data-theme','light');}
  function setIcon(){var t=html.getAttribute('data-theme');btn.innerHTML=t==='dark'?'\\u263D':'\\u2600';}
  setIcon();
  btn.addEventListener('click',function(){
    var current=html.getAttribute('data-theme')||'dark';
    var next=current==='dark'?'light':'dark';
    html.setAttribute('data-theme',next);
    localStorage.setItem('cb_theme',next);
    setIcon();
  });

  // Cart count from localStorage
  function updateCart(){
    var n=parseInt(localStorage.getItem('cb_cart_count')||'0',10);
    var el=document.getElementById('cartCount');
    if(el)el.textContent=n;
  }
  updateCart();
  window.addEventListener('storage',updateCart);

  // Lineup card intent persistence
  document.querySelectorAll('.lineup-card').forEach(function(card){
    card.addEventListener('click',function(){
      try{localStorage.setItem('cb_last_intent',card.dataset.cat||'');}catch(_){}
    });
  });
})();
</script>
</body></html>"""


@app.get("/", response_class=HTMLResponse)
def landing() -> HTMLResponse:
    return HTMLResponse(content=_LANDING_HTML)


@app.get("/healthz")
def healthz() -> dict:
    return {
        "status": "ok",
        "service": "coastal-runner",
        "version": "3.0",
        "company": os.environ.get("COMPANY_NAME", "Coastal Brewing"),
        "auth_configured": bool(GATEWAY_TOKEN),
        "nemoclaw_configured": bool(NEMOCLAW_URL and NEMOCLAW_API_KEY),
        "stripe_configured": bool(STRIPE_AVAILABLE and _stripe_is_configured()),
        "telegram_configured": bool(TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID),
        "audit_ledger": str(audit_ledger.DB_PATH),
        "time": utc_now(),
    }


@app.get("/audit/integrity-check")
def audit_integrity_check(authorization: str = Header(default="")) -> dict:
    """Verify the audit_chain hash chain end-to-end.

    Bearer-gated (same NemoClaw token as /run). Returns
    `{ok, chain_length, broken_at, reason?}`. broken_at is the chain_id
    of the first row whose hash doesn't match expectations; null if clean.

    Wave 1 Step B replacement: this is the AOF buyer-pitch evidence —
    "every action ACHEEVY takes is signed into a tamper-evident chain,
    and you can prove it any time."
    """
    token = authorization.removeprefix("Bearer ").strip() if authorization else ""
    if NEMOCLAW_API_KEY and token != NEMOCLAW_API_KEY:
        raise HTTPException(status_code=401, detail="invalid token")
    return audit_ledger.verify_chain()


# ---------------------------------------------------------------------------
# Order draft generation + post-approval email send
# ---------------------------------------------------------------------------
def _format_address(s: Dict[str, Any]) -> str:
    if not s:
        return "(no shipping address)"
    line1 = str(s.get("address", "")).strip()
    city = str(s.get("city", "")).strip()
    state = str(s.get("state", "")).strip()
    pc = str(s.get("postal_code", "")).strip()
    return "\n".join(filter(None, [line1, ", ".join(filter(None, [city, state, pc]))]))


def _render_supplier_draft(packet: "TaskPacket") -> Dict[str, str]:
    p = packet.payload or {}
    customer = p.get("customer") or {}
    shipping = p.get("shipping") or {}
    sku = p.get("sku") or "(unknown sku)"
    name = p.get("product_name") or sku
    qty = p.get("quantity") or 1
    company = os.environ.get("COMPANY_NAME", "Coastal Brewing")
    body = (
        f"# Wholesale order — {company}\n\n"
        f"Order id: {packet.task_id}\n\n"
        f"## Order\n\n"
        f"- SKU: {sku}\n"
        f"- Product: {name}\n"
        f"- Quantity: {qty}\n\n"
        f"## Ship to\n\n"
        f"{customer.get('name') or '(no name)'}\n"
        f"{_format_address(shipping)}\n\n"
        f"## Notes\n\n"
        f"- Delivery preference: {p.get('delivery_window_preference') or 'no preference'}\n"
        f"- Gift message: {p.get('gift_message') or '(none)'}\n\n"
        f"This order has been owner-approved. Please confirm receipt and ship under the {company} brand per the wholesale agreement.\n"
    )
    return {
        "subject": f"[Wholesale order — {company}] {packet.task_id}",
        "body": body,
    }


def _render_customer_draft(packet: "TaskPacket") -> Dict[str, str]:
    p = packet.payload or {}
    customer = p.get("customer") or {}
    shipping = p.get("shipping") or {}
    sku = p.get("sku") or "(unknown sku)"
    name = p.get("product_name") or sku
    qty = p.get("quantity") or 1
    company = os.environ.get("COMPANY_NAME", "Coastal Brewing")
    body = (
        f"# Order confirmed — thanks for choosing {company}\n\n"
        f"Hi {customer.get('name', 'there')},\n\n"
        f"Your order is in. Here's what we've got for you:\n\n"
        f"- {name} × {qty}\n\n"
        f"## Shipping to\n\n"
        f"{_format_address(shipping)}\n\n"
        f"## What happens next\n\n"
        f"We've sent the order to our roaster. You'll get a tracking note from us as soon as it ships. If anything looks off, just reply to this email — a real person reads it.\n\n"
        f"Order id: {packet.task_id}\n\n"
        f"— {company}\n"
    )
    return {
        "subject": f"Your {company} order — {name}",
        "body": body,
    }


def _generate_order_drafts(packet: "TaskPacket") -> Dict[str, str]:
    """Write supplier + customer drafts to disk for `draft_order_confirmation`
    task type. Returns a dict of {kind: path}. Idempotent — overwrites on rerun."""
    if packet.task_type != "draft_order_confirmation":
        return {}
    supplier = _render_supplier_draft(packet)
    customer = _render_customer_draft(packet)
    supplier_path = DRAFTS_DIR / f"{packet.task_id}_supplier_email.md"
    customer_path = DRAFTS_DIR / f"{packet.task_id}_customer_confirmation.md"
    supplier_path.write_text(
        f"# To: {os.environ.get('COASTAL_SUPPLIER_EMAIL') or '(supplier email not configured)'}\n"
        f"# Subject: {supplier['subject']}\n\n{supplier['body']}",
        encoding="utf-8",
    )
    p = packet.payload or {}
    customer_to = (p.get("customer") or {}).get("email") or "(customer email missing)"
    customer_path.write_text(
        f"# To: {customer_to}\n# Subject: {customer['subject']}\n\n{customer['body']}",
        encoding="utf-8",
    )
    return {"supplier": str(supplier_path), "customer": str(customer_path)}


def _read_draft_file(path: pathlib.Path) -> Dict[str, str]:
    """Parse a draft file written by _generate_order_drafts. Returns {to, subject, body}."""
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    to_addr = ""
    subject = ""
    body_start = 0
    for i, line in enumerate(lines):
        if line.startswith("# To: "):
            to_addr = line[6:].strip()
        elif line.startswith("# Subject: "):
            subject = line[11:].strip()
            body_start = i + 1
            break
    body = "\n".join(lines[body_start:]).lstrip("\n")
    return {"to": to_addr, "subject": subject, "body": body}


def _send_post_approval_emails(task_id: str, approval_id: str) -> Dict[str, Any]:
    """When an order is approved, attempt to send the supplier + customer drafts.

    Returns a structured report. Receipts are also written into AuditLedger
    (action_receipts) so the chain captures every send attempt — including
    skipped sends (RESEND_API_KEY not configured) marked truthfully."""
    report: Dict[str, Any] = {"task_id": task_id, "sends": []}
    drafts = [
        ("supplier", DRAFTS_DIR / f"{task_id}_supplier_email.md"),
        ("customer", DRAFTS_DIR / f"{task_id}_customer_confirmation.md"),
    ]
    for kind, path in drafts:
        if not path.exists():
            report["sends"].append({"kind": kind, "status": "missing", "detail": str(path)})
            continue
        d = _read_draft_file(path)
        # Customer draft uses the captured email; supplier draft uses env override
        # if the supplier line in the draft says "(supplier email not configured)".
        to_addr = d["to"]
        if kind == "supplier" and "not configured" in to_addr:
            to_addr = os.environ.get("COASTAL_SUPPLIER_EMAIL", "")
        result = email_sender.send(
            to=to_addr,
            subject=d["subject"],
            body_markdown=d["body"],
        )
        status = "sent" if result.sent else ("skipped" if result.skipped else "failed")
        try:
            audit_ledger.insert_action_receipt(
                task_id=task_id,
                executor="coastal-runner",
                action_type=f"email_{kind}",
                destination=to_addr or "(no recipient)",
                status=status,
                result_summary=(
                    f"provider={result.provider} message_id={result.message_id or '(none)'} "
                    f"approval_id={approval_id} detail={result.detail or ''}"
                )[:480],
            )
        except Exception:
            pass
        report["sends"].append(
            {
                "kind": kind,
                "to": to_addr,
                "status": status,
                "message_id": result.message_id,
                "detail": result.detail,
                "error": result.error,
            }
        )
    return report


@app.post("/route")
def route(packet: TaskPacket, x_coastal_token: Optional[str] = Header(default=None)) -> dict:
    _auth(x_coastal_token)
    p = packet.model_dump()
    decision = decide_route(p)
    receipt = make_receipt(p, decision)
    out_path = RECEIPTS_DIR / f"{packet.task_id}_route_receipt.json"
    out_path.write_text(json.dumps(receipt, indent=2), encoding="utf-8")
    return {"receipt": receipt, "receipt_path": str(out_path)}


@app.post("/run")
def run(packet: TaskPacket, x_coastal_token: Optional[str] = Header(default=None)) -> dict:
    _auth(x_coastal_token)

    nemoclaw_verdict = _call_nemoclaw(packet)
    if nemoclaw_verdict and nemoclaw_verdict.get("verdict") == "deny":
        try:
            audit_ledger.insert_risk_event(
                severity="high",
                category="blocked_action_attempt",
                description=f"NemoClaw denied '{packet.task_type}': {nemoclaw_verdict.get('reason', '')}",
                task_id=packet.task_id,
                actor="coastal-runner",
                metadata={
                    "task_type": packet.task_type,
                    "risk_tags": packet.risk_tags,
                    "check_id": nemoclaw_verdict.get("check_id"),
                    "basis": nemoclaw_verdict.get("basis"),
                },
            )
        except Exception:
            pass
        raise HTTPException(
            status_code=403,
            detail={
                "error": "NemoClaw denied this action",
                "reason": nemoclaw_verdict.get("reason"),
                "basis": nemoclaw_verdict.get("basis"),
                "check_id": nemoclaw_verdict.get("check_id"),
            },
        )

    p = packet.model_dump()
    decision = decide_route(p)
    receipt = make_receipt(p, decision)
    if nemoclaw_verdict:
        receipt["nemoclaw_verdict"] = nemoclaw_verdict
    receipt_path = RECEIPTS_DIR / f"{packet.task_id}_route_receipt.json"
    receipt_path.write_text(json.dumps(receipt, indent=2), encoding="utf-8")

    try:
        audit_ledger.insert_task_packet(p, decision, str(receipt_path))
    except Exception:
        pass

    placeholder_path: Optional[str] = None
    risk_tags_str = ", ".join(packet.risk_tags) or "(none)"
    if decision["route"] == "feynman":
        path = RESEARCH_TICKETS_DIR / f"{packet.task_id}.md"
        path.write_text(
            f"# Feynman research ticket — {packet.task_id}\n\n"
            f"- task_type: {packet.task_type}\n"
            f"- risk_tags: {risk_tags_str}\n"
            f"- objective: {packet.objective or '(none)'}\n"
            f"- desired_output: {packet.desired_output or '(none)'}\n\n"
            f"_No live Feynman call. Wire FEYNMAN_CLI_PATH to enable._\n",
            encoding="utf-8",
        )
        placeholder_path = str(path)
        try:
            audit_ledger.insert_research_receipt(
                task_id=packet.task_id,
                ticket_path=str(path),
                research_topic=packet.objective or packet.task_type,
                source_count=0,
                confidence="pending",
            )
        except Exception:
            pass
    elif decision["route"] == "nvidia":
        path = DRAFTS_DIR / f"{packet.task_id}_draft.md"
        path.write_text(
            f"# NVIDIA draft placeholder — {packet.task_id}\n\n"
            f"- task_type: {packet.task_type}\n"
            f"- desired_output: {packet.desired_output or '(none)'}\n\n"
            f"_No live NVIDIA call. Wire NVIDIA_API_KEY to enable._\n",
            encoding="utf-8",
        )
        placeholder_path = str(path)
        try:
            audit_ledger.insert_model_call_receipt(
                task_id=packet.task_id,
                route="nvidia",
                provider="placeholder",
                model="(not_configured)",
                prompt_summary=packet.task_type,
                output_summary=str(path),
                success=True,
            )
        except Exception:
            pass
    elif decision["route"] in ("owner", "premium_review"):
        path = OWNER_APPROVALS_DIR / f"{packet.task_id}_request.md"
        path.write_text(
            f"# Owner approval request — {packet.task_id}\n\n"
            f"- route: {decision['route']}\n"
            f"- task_type: {packet.task_type}\n"
            f"- risk_tags: {risk_tags_str}\n"
            f"- objective: {packet.objective or '(none)'}\n"
            f"- desired_output: {packet.desired_output or '(none)'}\n\n"
            f"_Owner sign-off required before OpenClaw execution._\n",
            encoding="utf-8",
        )
        placeholder_path = str(path)
        # When the task is a customer order, also pre-render the supplier
        # and customer drafts so the post-approval email send has source.
        try:
            _generate_order_drafts(packet)
        except Exception:
            pass

    telegram_sent = False
    if receipt["approval_required"]:
        telegram_sent = _send_telegram_approval(packet, receipt, placeholder_path or "")

    return {
        "receipt": receipt,
        "receipt_path": str(receipt_path),
        "placeholder_path": placeholder_path,
        "telegram_notified": telegram_sent,
        "next_action": (
            "owner_sign_off_required"
            if receipt["approval_required"]
            else f"OpenClaw may execute allowed actions for route '{receipt['route']}'"
        ),
    }


@app.post("/approve")
def approve(decision: ApprovalDecision, x_coastal_token: Optional[str] = Header(default=None)) -> dict:
    _auth(x_coastal_token)
    if decision.decision not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="decision must be 'approved' or 'rejected'")
    record = {
        "approval_id": decision.approval_id,
        "task_id": decision.task_id,
        "decision": decision.decision,
        "decided_by": decision.decided_by,
        "decided_at": utc_now(),
        "note": decision.note,
    }
    out_path = OWNER_APPROVALS_DIR / f"{decision.approval_id}_decision.json"
    out_path.write_text(json.dumps(record, indent=2), encoding="utf-8")

    try:
        audit_ledger.insert_approval_decision(
            approval_id=decision.approval_id,
            task_id=decision.task_id,
            decision=decision.decision,
            decided_by=decision.decided_by,
            note=decision.note,
        )
    except Exception:
        pass

    email_report: Optional[Dict[str, Any]] = None
    if decision.decision == "approved":
        try:
            email_report = _send_post_approval_emails(
                task_id=decision.task_id, approval_id=decision.approval_id
            )
        except Exception as e:
            email_report = {"error": str(e)}

    return {"recorded": True, "decision_path": str(out_path), "email_report": email_report}


class CheckoutRequest(BaseModel):
    """Either `tier` (subscription) or `sku`+amount_cents (one-time).
    Order intake metadata (customer + shipping + product details) flows
    through `metadata` so /stripe/webhook can build a TaskPacket on
    checkout.session.completed and auto-fire /run."""
    # Subscription path
    tier: Optional[str] = None
    # One-time path
    sku: Optional[str] = None
    product_name: Optional[str] = None
    amount_cents: Optional[int] = None
    quantity: int = 1
    # Common
    customer_email: str
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


@app.post("/checkout")
def checkout(req: CheckoutRequest, x_coastal_token: Optional[str] = Header(default=None)) -> dict:
    _auth(x_coastal_token)
    if not STRIPE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Stripe SDK not installed")
    if not _stripe_is_configured():
        raise HTTPException(status_code=503, detail="Stripe is not configured (set STRIPE_SECRET_KEY)")
    success_url = req.success_url or f"{COASTAL_PUBLIC_URL}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = req.cancel_url or f"{COASTAL_PUBLIC_URL}/checkout/cancel"
    try:
        # Subscription if tier provided; otherwise one-time on the catalog SKU.
        if req.tier:
            return _stripe_create_checkout_session(
                tier=req.tier,
                customer_email=req.customer_email,
                success_url=success_url,
                cancel_url=cancel_url,
                metadata=req.metadata,
            )
        if not req.sku or not req.amount_cents:
            raise HTTPException(
                status_code=400,
                detail="checkout requires either `tier` (subscription) or `sku`+`amount_cents` (one-time)",
            )
        return _stripe_create_one_time_checkout_session(
            sku=req.sku,
            product_name=req.product_name or req.sku,
            amount_cents=int(req.amount_cents),
            quantity=int(req.quantity or 1),
            customer_email=req.customer_email,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=req.metadata,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


def _build_task_packet_from_session(session_metadata: Dict[str, Any]) -> Optional["TaskPacket"]:
    """Reconstruct a TaskPacket from Stripe session metadata. The Stepper
    intake flattens nested customer/shipping into prefixed keys when
    stashing; rehydrate them here. Returns None if the session wasn't from
    the Coastal Stepper flow (e.g. legacy subscription with only tier)."""
    if session_metadata.get("product") != "coastal-brewing":
        return None
    sku = session_metadata.get("sku")
    if not sku:
        return None
    customer_email = (
        session_metadata.get("customer_email")
        or session_metadata.get("intake_customer_email")
        or ""
    )
    customer_name = session_metadata.get("intake_customer_name", "")
    payload = {
        "sku": sku,
        "product_name": session_metadata.get("intake_product_name", sku),
        "quantity": int(session_metadata.get("intake_quantity", "1")),
        "customer": {"email": customer_email, "name": customer_name},
        "shipping": {
            "address": session_metadata.get("intake_shipping_address", ""),
            "city": session_metadata.get("intake_shipping_city", ""),
            "state": session_metadata.get("intake_shipping_state", ""),
            "postal_code": session_metadata.get("intake_shipping_postal_code", ""),
        },
        "delivery_window_preference": session_metadata.get("intake_delivery_window_preference") or None,
        "gift_message": session_metadata.get("intake_gift_message") or None,
        "consent_to_receive_email": True,  # Stripe Checkout completion is consent
        "stripe_session_id": session_metadata.get("checkout_session_id"),
        "submitted_at": utc_now(),
    }
    task_id = (
        session_metadata.get("task_id")
        or session_metadata.get("intake_task_id")
        or f"order_{session_metadata.get('checkout_session_id', '')}"
    )
    return TaskPacket(
        task_id=task_id,
        owner_goal="Process new customer order (Stripe-paid)",
        objective=f"Stripe-paid order: {sku} x{payload['quantity']} for {customer_email}",
        department="boomer_ops",
        task_type="draft_order_confirmation",
        risk_tags=["money"],
        approval_required=True,
        desired_output="draft confirmation email + supplier order draft + AuditLedger receipt",
        payload=payload,
    )


@app.post("/stripe/webhook")
async def stripe_webhook(request: Request) -> dict:
    if not STRIPE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Stripe SDK not installed")
    if not _stripe_is_configured():
        raise HTTPException(status_code=503, detail="Stripe is not configured")
    sig = request.headers.get("stripe-signature", "")
    payload = await request.body()
    try:
        event = _stripe_verify_webhook(payload, sig)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"signature verification failed: {e}")

    out_path = STRIPE_EVENTS_DIR / f"{event['id']}.json"
    out_path.write_text(json.dumps(event, indent=2, default=str), encoding="utf-8")

    # On successful Checkout, auto-fire /run with the order packet so the
    # round trip closes without a second API call from the storefront:
    # Stripe paid → /run → NemoClaw → Telegram approval → SMTP send.
    run_report: Optional[Dict[str, Any]] = None
    rag_report: Optional[Dict[str, Any]] = None
    if event.get("type") == "checkout.session.completed":
        try:
            session = event["data"]["object"]
            session_meta = dict(session.get("metadata") or {})
            session_meta["checkout_session_id"] = session.get("id")
            packet = _build_task_packet_from_session(session_meta)
            if packet is not None:
                # Inject the gateway token so the internal call to /run passes _auth.
                run_resp = run(packet=packet, x_coastal_token=GATEWAY_TOKEN)
                run_report = {
                    "task_id": packet.task_id,
                    "next_action": run_resp.get("next_action"),
                    "telegram_notified": run_resp.get("telegram_notified", False),
                }

            # User-profile RAG hook — record the purchase against the
            # customer's coastal_uid (passed through Stripe checkout
            # metadata when the chat panel initiates the session). Without
            # a coastal_uid we can't tie the purchase to a profile, so we
            # silently skip rather than orphan a row.
            try:
                _coastal_uid = session_meta.get("coastal_uid")
                if _coastal_uid and _profile_layer.is_configured():
                    _sku = (
                        session_meta.get("sku")
                        or session_meta.get("primary_sku")
                        or "unknown"
                    )
                    _label = session_meta.get("sku_label") or session_meta.get("product_name")
                    _amount = session.get("amount_total")
                    _currency = (session.get("currency") or "usd").lower()
                    _purchase_id = _profile_layer.record_purchase(
                        coastal_uid=_coastal_uid,
                        sku=_sku,
                        sku_label=_label,
                        amount_cents=_amount,
                        currency=_currency,
                        stripe_session_id=session.get("id"),
                        metadata={
                            "stripe_event_id": event["id"],
                            "customer_email": session.get("customer_email") or session.get("customer_details", {}).get("email"),
                        },
                    )
                    rag_report = {
                        "purchase_id": _purchase_id,
                        "coastal_uid": _coastal_uid,
                        "sku": _sku,
                    }
                    # If Stripe gave us a customer email, opportunistically
                    # upgrade the anonymous profile to identity-bound.
                    _customer_email = (
                        session.get("customer_email")
                        or session.get("customer_details", {}).get("email")
                    )
                    if _customer_email:
                        try:
                            _profile_layer.update_identity(_coastal_uid, _customer_email)
                        except Exception:
                            pass
            except Exception as _rag_exc:
                rag_report = {"error": str(_rag_exc)}
        except Exception as e:
            run_report = {"error": str(e)}

    return {
        "received": True,
        "event_id": event["id"],
        "type": event["type"],
        "path": str(out_path),
        "run_report": run_report,
        "rag_report": rag_report,
    }


def _gmail_compose_url(to: str, subject: str, body: str) -> str:
    """Build a Gmail web-compose URL with prefilled fields.
    Owner taps it from the approval page and Gmail opens compose with
    everything filled in — owner just hits Send. Bypasses SMTP entirely."""
    qs = urllib.parse.urlencode(
        {"view": "cm", "fs": "1", "to": to, "su": subject, "body": body},
        quote_via=urllib.parse.quote,
    )
    return f"https://mail.google.com/mail/?{qs}"


def _render_send_buttons(task_id: str) -> str:
    """When an order is approved, look for the supplier + customer drafts on
    disk and emit big 'Open Gmail to send' buttons that prefill compose for
    each. Returns empty string if no drafts exist (non-order tasks)."""
    drafts = [
        ("Supplier", DRAFTS_DIR / f"{task_id}_supplier_email.md"),
        ("Customer", DRAFTS_DIR / f"{task_id}_customer_confirmation.md"),
    ]
    rows: list[str] = []
    for label, path in drafts:
        if not path.exists():
            continue
        try:
            d = _read_draft_file(path)
        except Exception:
            continue
        to_addr = d.get("to") or ""
        if "not configured" in to_addr or not to_addr:
            to_addr = os.environ.get("COASTAL_SUPPLIER_EMAIL", "") if label == "Supplier" else ""
        if not to_addr:
            continue
        url = _gmail_compose_url(to=to_addr, subject=d.get("subject", ""), body=d.get("body", ""))
        rows.append(
            f'<a class="send-btn" href="{url}" target="_blank" rel="noopener noreferrer">'
            f'<span class="send-btn-label">→ Open Gmail to send {label.lower()} draft</span>'
            f'<span class="send-btn-to">{to_addr}</span></a>'
        )
    if not rows:
        return ""
    return (
        '<div class="send-block">'
        '<div class="eyebrow" style="margin-top:32px">[ next: send ]</div>'
        '<p style="font-size:14px;margin-bottom:16px">'
        'Two drafts are queued. Click each to open Gmail with the message prefilled — review, then hit Send.'
        '</p>'
        + "".join(rows)
        + '</div>'
    )


_APPROVE_RESULT_HTML = """<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>{title} &mdash; coastal brewing</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>:root{{--bg:#f8f7f4;--ink:#0e0e0e;--ink-soft:#444;--muted:#8a8a8a;--rule:#e0ddd4;--surface:#fff;--accent:{accent}}}
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
html,body{{background:var(--bg);color:var(--ink);font-family:'Space Grotesk',system-ui,sans-serif;
line-height:1.55;min-height:100vh}}
.wrap{{max-width:560px;margin:0 auto;padding:64px 24px}}
.brand{{font-weight:900;font-size:14px;letter-spacing:-0.01em;color:var(--ink);
text-decoration:none;display:inline-block;margin-bottom:48px}}
.brand .dot{{color:#c8492f}}
.eyebrow{{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;
letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}}
h1{{font-size:48px;line-height:1.05;letter-spacing:-0.04em;font-weight:900;
color:var(--accent);margin-bottom:24px}}
p{{font-size:16px;color:var(--ink-soft);margin-bottom:24px}}
.task{{font-family:'JetBrains Mono',ui-monospace,monospace;background:var(--surface);
border:1px solid var(--rule);padding:10px 14px;display:inline-block;font-size:13px;
color:var(--ink);word-break:break-all}}
.foot{{margin-top:48px;padding-top:24px;border-top:1px solid var(--rule);font-size:11px;
color:var(--muted);font-family:'JetBrains Mono',ui-monospace,monospace;letter-spacing:0.05em}}
.tag-line{{font-style:italic;color:var(--ink-soft);font-family:'Space Grotesk',sans-serif;
font-size:13px;letter-spacing:0;margin-top:8px;display:block}}
.send-btn{{display:flex;flex-direction:column;gap:4px;padding:16px 20px;margin-top:12px;
background:var(--surface);border:1px solid var(--rule);border-left:3px solid var(--accent);
text-decoration:none;color:var(--ink);transition:border-color .15s,transform .15s}}
.send-btn:hover{{border-color:var(--accent);transform:translateX(2px)}}
.send-btn-label{{font-weight:700;font-size:15px}}
.send-btn-to{{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;
color:var(--muted);letter-spacing:0.02em}}
.send-block{{margin-top:8px}}
</style></head>
<body><div class="wrap">
<a class="brand" href="https://brewing.foai.cloud/">coastal brewing<span class="dot">.</span></a>
<div class="eyebrow">[ decision ]</div>
<h1>{title}.</h1>
<p>{message}</p>
<div class="task">{task_id}</div>
{actions_html}
<div class="foot">
  {footer}
  <span class="tag-line">Nothing chemically, ever.</span>
</div>
</div></body></html>"""


_AUDIT_HTML = """<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>audit &mdash; coastal brewing</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
:root{{--bg:#f8f7f4;--ink:#0e0e0e;--ink-soft:#444;--muted:#8a8a8a;--rule:#e0ddd4;--surface:#fff;--accent:#c8492f;--success:#2d5a3d;--warning:#8a6a2d;--danger:#8a2a2a}}
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
html,body{{background:var(--bg);color:var(--ink);font-family:'Space Grotesk',system-ui,sans-serif;
line-height:1.55;-webkit-font-smoothing:antialiased}}
.wrap{{max-width:880px;margin:0 auto;padding:48px 24px}}
.brand{{font-weight:900;font-size:14px;letter-spacing:-0.01em;color:var(--ink);
text-decoration:none;display:inline-block;margin-bottom:32px}}
.brand .dot{{color:var(--accent)}}
.head{{padding-bottom:24px;border-bottom:1px solid var(--rule);margin-bottom:32px}}
.eyebrow{{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;
letter-spacing:0.08em;text-transform:uppercase;color:var(--muted)}}
h1{{font-size:32px;line-height:1.10;letter-spacing:-0.03em;font-weight:700;margin:8px 0 16px}}
.task-id{{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:13px;
color:var(--ink);background:var(--surface);border:1px solid var(--rule);
padding:8px 12px;display:inline-block;word-break:break-all}}
.empty{{padding:64px 24px;text-align:center;color:var(--muted);border:1px dashed var(--rule)}}
.event{{padding:20px 0;border-bottom:1px solid var(--rule)}}
.event:first-child{{border-top:1px solid var(--rule)}}
.event-header{{display:flex;justify-content:space-between;align-items:baseline;
margin-bottom:8px;gap:12px;flex-wrap:wrap}}
.tag{{padding:4px 10px;font-size:10px;font-weight:700;letter-spacing:0.08em;
text-transform:uppercase;font-family:'JetBrains Mono',ui-monospace,monospace}}
.tag-task{{background:var(--ink);color:var(--bg)}}
.tag-research{{background:var(--success);color:#fff}}
.tag-model{{background:var(--ink-soft);color:var(--bg)}}
.tag-approval{{background:var(--accent);color:#fff}}
.tag-action{{background:var(--success);color:#fff}}
.tag-risk{{background:var(--danger);color:#fff}}
.ts{{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;color:var(--muted)}}
.summary{{font-size:15px;color:var(--ink);margin-top:6px}}
.summary strong{{font-weight:700}}
details{{margin-top:10px}}
details summary{{cursor:pointer;color:var(--accent);font-size:11px;font-weight:500;
font-family:'JetBrains Mono',ui-monospace,monospace;outline:none;letter-spacing:0.05em;
text-transform:uppercase}}
details pre{{margin-top:10px;padding:14px;background:var(--surface);border:1px solid var(--rule);
overflow-x:auto;font-size:11px;color:var(--ink-soft);font-family:'JetBrains Mono',monospace}}
.foot{{margin-top:48px;padding-top:24px;border-top:1px solid var(--rule);font-size:12px;
color:var(--muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px}}
.foot .tag-line{{font-style:italic;color:var(--ink-soft)}}
.mono{{font-family:'JetBrains Mono',ui-monospace,monospace}}
</style></head>
<body><div class="wrap">
<a class="brand" href="https://brewing.foai.cloud/">coastal brewing<span class="dot">.</span></a>
<div class="head">
  <div class="eyebrow">[ audit trail ]</div>
  <h1>Decision history.</h1>
  <span class="task-id">{task_id}</span>
</div>
{events_html}
<div class="foot">
  <span>{count} event(s) &middot; queried <span class="mono">{now}</span></span>
  <span class="tag-line">Nothing chemically, ever.</span>
</div>
</div></body></html>"""


def _render_audit_trail(task_id: str, trail: dict) -> str:
    events: list[tuple[str, str, str, str, dict]] = []
    label_for = {
        "task_packet": ("task", "task-task"),
        "research_receipts": ("research", "tag-research"),
        "model_call_receipts": ("model_call", "tag-model"),
        "approval_receipts": ("approval", "tag-approval"),
        "action_receipts": ("action", "tag-action"),
        "risk_events": ("risk", "tag-risk"),
    }
    for table_name, rows in trail.items():
        label, css = label_for.get(table_name, (table_name, "tag-task"))
        if table_name == "task_packet":
            css = "tag-task"
        for row in rows:
            ts = row.get("created_at") or ""
            if table_name == "task_packet":
                summary = (
                    f"<strong>routed</strong> via <strong>{row.get('route', '?')}</strong> "
                    f"(approval_required={row.get('approval_required', '?')}, status={row.get('status', '?')})"
                )
            elif table_name == "research_receipts":
                summary = f"<strong>research ticket</strong> on '{row.get('research_topic', '?')}' (confidence={row.get('confidence', '?')})"
            elif table_name == "model_call_receipts":
                summary = f"<strong>model call</strong> route={row.get('route', '?')} provider={row.get('provider', '?')} success={row.get('success', '?')}"
            elif table_name == "approval_receipts":
                summary = f"<strong>{row.get('decision', '?').upper()}</strong> by {row.get('decided_by', '?')}"
            elif table_name == "action_receipts":
                summary = f"<strong>{row.get('action_type', '?')}</strong> via {row.get('executor', '?')} (status={row.get('status', '?')})"
            elif table_name == "risk_events":
                summary = f"<strong>{row.get('severity', '?').upper()}</strong> · {row.get('category', '?')} — {row.get('description', '?')[:120]}"
            else:
                summary = json.dumps(row)
            events.append((ts, label, css, summary, row))
    events.sort(key=lambda x: x[0])

    if not events:
        events_html = '<div class="empty">No events recorded for this task_id.</div>'
    else:
        parts = []
        for ts, label, css, summary, row in events:
            raw = json.dumps(row, indent=2, default=str)
            parts.append(
                f'<div class="event"><div class="event-header">'
                f'<span class="tag {css}">{label}</span>'
                f'<span class="ts">{ts}</span></div>'
                f'<div class="summary">{summary}</div>'
                f'<details><summary>raw</summary><pre>{raw}</pre></details></div>'
            )
        events_html = "\n".join(parts)
    return _AUDIT_HTML.format(
        task_id=task_id,
        events_html=events_html,
        count=len(events),
        now=utc_now(),
    )


_CHAT_HTML = """<!DOCTYPE html>
<html lang="en" data-theme="dark"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Chat &mdash; Coastal Brewing Co.</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--bg:#f3f0e8;--ink:#1a1612;--ink-soft:#4a4540;--muted:#8a857d;--rule:#d8d2c4;--surface:#fff;--accent:#6b8e4e}
[data-theme="dark"]{--bg:#0d0b09;--ink:#f3efe6;--ink-soft:#b5afa0;--muted:#6a665d;--rule:#2a2620;--surface:#15120e;--accent:#b8c984}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--bg);color:var(--ink);font-family:'Inter',system-ui,sans-serif;
line-height:1.55;height:100vh;overflow:hidden;transition:background .2s,color .2s}
.app{display:grid;grid-template-rows:auto 1fr auto;height:100vh;max-width:880px;margin:0 auto}
header{display:flex;justify-content:space-between;align-items:center;padding:16px 24px;
border-bottom:1px solid var(--rule)}
header .left{display:flex;align-items:center;gap:16px}
.wordmark{font-family:'Playfair Display',Georgia,serif;font-weight:700;text-transform:uppercase;
letter-spacing:0.18em;line-height:0.92;color:var(--ink);text-decoration:none;font-size:14px}
.wordmark .top,.wordmark .bot{display:block}
header .back{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);
text-decoration:none;letter-spacing:0.10em;text-transform:uppercase}
header .back:hover{color:var(--accent)}
header .right{display:flex;gap:12px;align-items:center}
.theme-toggle{background:transparent;border:0;color:var(--ink);font-size:16px;cursor:pointer;padding:4px 8px}
.label{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);
letter-spacing:0.10em;text-transform:uppercase}
main{overflow-y:auto;padding:32px 24px;display:flex;flex-direction:column;gap:24px}
.empty{text-align:center;padding:64px 24px;color:var(--muted)}
.empty h2{font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:28px;
color:var(--ink);margin-bottom:12px;letter-spacing:-0.01em}
.empty p{font-size:14px;max-width:420px;margin:0 auto}
.empty .examples{margin-top:24px;display:flex;flex-direction:column;gap:8px;align-items:center}
.empty .ex{font-size:12px;color:var(--ink-soft);font-style:italic;cursor:pointer;
padding:6px 12px;border:1px solid var(--rule);border-radius:0;background:var(--surface)}
.empty .ex:hover{border-color:var(--accent);color:var(--accent)}
.msg{display:flex;flex-direction:column;gap:6px;max-width:80%}
.msg.user{align-self:flex-end;align-items:flex-end}
.msg.agent{align-self:flex-start;align-items:flex-start}
.bubble{padding:14px 18px;border-radius:0;font-size:15px;line-height:1.55;white-space:pre-wrap;
border:1px solid var(--rule)}
.msg.user .bubble{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.msg.agent .bubble{background:var(--surface);color:var(--ink)}
.msg.error .bubble{background:transparent;border-color:#8a3a2a;color:#8a3a2a;font-size:13px}
.meta{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted);
letter-spacing:0.08em;text-transform:uppercase;display:flex;gap:8px}
footer{padding:16px 24px;border-top:1px solid var(--rule);background:var(--bg)}
.composer{display:flex;gap:12px;align-items:flex-end}
textarea{flex:1;padding:14px 16px;font-family:'Inter',sans-serif;font-size:15px;
line-height:1.5;color:var(--ink);background:var(--surface);border:1px solid var(--rule);
border-radius:0;resize:none;min-height:48px;max-height:200px;outline:none;
transition:border-color .15s}
textarea:focus{border-color:var(--ink)}
textarea::placeholder{color:var(--muted)}
.send-btn{padding:12px 24px;font-family:'Inter',sans-serif;font-size:11px;font-weight:600;
letter-spacing:0.12em;text-transform:uppercase;color:var(--bg);background:var(--ink);
border:0;border-radius:0;cursor:pointer;transition:opacity .15s;flex-shrink:0}
.send-btn:hover{opacity:0.85}
.send-btn:disabled{opacity:0.4;cursor:wait}
.tag-line{font-family:'Inter',sans-serif;font-style:italic;font-size:11px;color:var(--muted);
text-align:center;margin-top:8px}
@media(max-width:680px){
  header{padding:12px 16px}main{padding:24px 16px}footer{padding:12px 16px}
  .msg{max-width:90%}
  .empty h2{font-size:22px}
}
</style></head>
<body>
<div class="app">
  <header>
    <div class="left">
      <a class="back" href="/">&larr; Brewing</a>
      <a class="wordmark" href="/"><span class="top">Coastal</span><span class="bot">Brewing</span></a>
      <span class="label">[ Agent ]</span>
    </div>
    <div class="right">
      <button class="theme-toggle" id="themeToggle" aria-label="Toggle theme">&#9788;</button>
    </div>
  </header>
  <main id="messages">
    <div class="empty" id="empty">
      <h2>What can the Agent help with?</h2>
      <p>Ask about the lineup, draft a caption, summarize the day's operations, or check on a supplier. The Agent routes to the right Lil_Hawk and returns reviewed answers.</p>
      <div class="examples">
        <span class="ex" data-ex="Draft three caption variants for the Lowcountry House Blend launch.">Draft three caption variants for the launch.</span>
        <span class="ex" data-ex="Summarize what we know about Temecula Coffee Roasters and what's still unverified.">Summarize what we know about our supplier.</span>
        <span class="ex" data-ex="Outline a weekly operating receipt for the upcoming week.">Outline this week's operating receipt.</span>
      </div>
    </div>
  </main>
  <footer>
    <form class="composer" id="composer">
      <textarea id="input" placeholder="Ask the Agent..." rows="1" autofocus></textarea>
      <button type="submit" class="send-btn" id="send">Send</button>
    </form>
    <p class="tag-line">Nothing chemically, ever.</p>
  </footer>
</div>
<script>
(function(){
  var html=document.documentElement,btn=document.getElementById('themeToggle');
  var stored=localStorage.getItem('cb_theme');
  if(stored){html.setAttribute('data-theme',stored);}
  else if(window.matchMedia('(prefers-color-scheme: dark)').matches){html.setAttribute('data-theme','dark');}
  function setIcon(){btn.innerHTML=html.getAttribute('data-theme')==='dark'?'\\u263D':'\\u2600';}
  setIcon();
  btn.addEventListener('click',function(){
    var current=html.getAttribute('data-theme')||'light';
    var next=current==='dark'?'light':'dark';
    html.setAttribute('data-theme',next);localStorage.setItem('cb_theme',next);setIcon();
  });

  var messages=document.getElementById('messages'),empty=document.getElementById('empty');
  var form=document.getElementById('composer'),input=document.getElementById('input'),sendBtn=document.getElementById('send');

  function fmtTime(){var d=new Date();return d.toTimeString().slice(0,8);}
  function escapeHtml(s){return s.replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function append(role,text,meta){
    if(empty&&empty.parentNode){empty.remove();}
    var el=document.createElement('div');el.className='msg '+role;
    var bubble=document.createElement('div');bubble.className='bubble';bubble.innerHTML=escapeHtml(text);
    var m=document.createElement('div');m.className='meta';m.textContent=meta||fmtTime();
    el.appendChild(bubble);el.appendChild(m);messages.appendChild(el);
    messages.scrollTop=messages.scrollHeight;
    return bubble;
  }
  function autoresize(){input.style.height='auto';input.style.height=Math.min(input.scrollHeight,200)+'px';}
  input.addEventListener('input',autoresize);
  input.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit();}});

  document.querySelectorAll('.ex').forEach(function(node){
    node.addEventListener('click',function(){input.value=node.dataset.ex;autoresize();input.focus();});
  });

  form.addEventListener('submit',async function(e){
    e.preventDefault();
    var text=input.value.trim();if(!text)return;
    append('user',text);
    input.value='';autoresize();
    sendBtn.disabled=true;sendBtn.textContent='\\u2026';
    var thinking=append('agent','Thinking\\u2026','agent &middot; pending');
    try{
      var res=await fetch('/chat/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text})});
      var data=await res.json();
      if(data.content){
        thinking.textContent=data.content;
        var meta=thinking.parentNode.querySelector('.meta');
        meta.textContent=(data.hawk||'agent')+' \\u00b7 '+fmtTime()+(data.elapsed_ms?' \\u00b7 '+Math.round(data.elapsed_ms)+'ms':'');
      }else if(data.error){
        thinking.parentNode.classList.remove('agent');thinking.parentNode.classList.add('error');
        thinking.textContent='Error: '+data.error+(data.detail?' \\u2014 '+data.detail:'');
        thinking.parentNode.querySelector('.meta').textContent='error \\u00b7 '+fmtTime();
      }else{thinking.textContent=JSON.stringify(data);}
    }catch(err){
      thinking.parentNode.classList.remove('agent');thinking.parentNode.classList.add('error');
      thinking.textContent='Network error: '+err.message;
    }finally{sendBtn.disabled=false;sendBtn.textContent='Send';}
  });
})();
</script>
</body></html>"""


class ChatMessage(BaseModel):
    message: str
    state: Optional[Dict[str, Any]] = None


@app.get("/chat", response_class=HTMLResponse)
def chat_ui() -> HTMLResponse:
    return HTMLResponse(content=_CHAT_HTML)


def _navigate_chat(message: str, state: Optional[dict]) -> dict:
    """Product-navigation chat. Lightweight rule-based for now.

    When SPINNER_URL is wired, swap this for spinner.dispatch(message, state).
    """
    state = state or {}
    msg = (message or "").lower().strip()

    # Step 1: category not yet chosen
    if "category" not in state:
        if "coffee" in msg:
            state["category"] = "coffee"
            return {
                "content": "Coffee — good choice. Caffeine on, off, or either way?",
                "state": state,
                "options": ["Caffeine on", "Decaf only", "Either"],
                "step": "caffeine",
            }
        if "tea" in msg:
            state["category"] = "tea"
            return {
                "content": "Tea — black, herbal, or green?",
                "state": state,
                "options": ["Breakfast black", "Herbal (caffeine-free)", "Green"],
                "step": "tea_type",
            }
        if "matcha" in msg:
            state["category"] = "matcha"
            return {
                "content": "Matcha. Are you starting out or building a daily ritual?",
                "state": state,
                "options": ["Starter pack", "Monthly ritual"],
                "step": "size",
            }
        if any(w in msg for w in ("bundle", "discovery", "sample", "trial", "first")):
            rec = catalog.recommend_bundle({"size": "starter", "category": "mixed"})
            return {
                "content": "The Coffee + Tea Discovery Bundle is built for first-timers — one coffee, one tea, one matcha trial in a single shipment.",
                "state": {"category": "bundle", "done": True},
                "recommendation": rec,
            }
        return {
            "content": "What are you brewing? Coffee, tea, or matcha — pick one and I'll narrow it down.",
            "state": state,
            "options": ["Coffee", "Tea", "Matcha", "Discovery bundle"],
            "step": "category",
        }

    cat = state["category"]

    # Coffee follow-ups
    if cat == "coffee":
        if "caffeine" not in state:
            if "decaf" in msg or "off" in msg:
                state["caffeine"] = "off"
            elif "either" in msg:
                state["caffeine"] = "either"
            else:
                state["caffeine"] = "on"
            if state["caffeine"] != "off":
                return {
                    "content": "Roast preference — medium house blend, dark roast, or either?",
                    "state": state,
                    "options": ["House blend", "Dark roast", "Either"],
                    "step": "roast",
                }
            else:
                return {
                    "content": "Decaf locked in. One bag for the pantry, or monthly subscription?",
                    "state": state,
                    "options": ["Pantry (one bag)", "Monthly subscription"],
                    "step": "size",
                }
        if "roast" not in state:
            if "dark" in msg:
                state["roast"] = "dark"
            elif "house" in msg or "medium" in msg or "blend" in msg:
                state["roast"] = "medium"
            else:
                state["roast"] = "either"
            return {
                "content": "Pantry bag or monthly subscription?",
                "state": state,
                "options": ["Pantry (one bag)", "Monthly subscription"],
                "step": "size",
            }
        if "size" not in state:
            state["size"] = "monthly" if "monthly" in msg or "subscription" in msg else "pantry"
            rec = catalog.recommend_bundle(state)
            return {
                "content": "Got it. Here's what I'd start with:",
                "state": {**state, "done": True},
                "recommendation": rec,
            }

    # Tea
    if cat == "tea":
        if "tea_type" not in state:
            if "herbal" in msg or "caffeine-free" in msg or "free" in msg:
                state["tea_type"] = "herbal"
            elif "green" in msg:
                state["tea_type"] = "green"
            else:
                state["tea_type"] = "black"
            return {
                "content": "Pantry can or monthly subscription?",
                "state": state,
                "options": ["Pantry (one can)", "Monthly subscription"],
                "step": "size",
            }
        if "size" not in state:
            state["size"] = "monthly" if "monthly" in msg or "subscription" in msg else "pantry"
            rec = catalog.recommend_bundle(state)
            return {
                "content": "Here's the pick:",
                "state": {**state, "done": True},
                "recommendation": rec,
            }

    # Matcha
    if cat == "matcha":
        if "size" not in state:
            state["size"] = "monthly" if "monthly" in msg or "ritual" in msg else "starter"
            rec = catalog.recommend_bundle(state)
            return {
                "content": "Matcha set:",
                "state": {**state, "done": True},
                "recommendation": rec,
            }

    return {
        "content": "I lost the thread — start over by telling me coffee, tea, or matcha.",
        "state": {},
        "options": ["Coffee", "Tea", "Matcha"],
        "step": "category",
    }


@app.post("/chat/send")
def chat_send(req: ChatMessage) -> dict:
    try:
        return _navigate_chat(req.message, req.state)
    except Exception as e:
        return {"error": "chat_dispatch_failed", "detail": str(e)}


# ---------------------------------------------------------------------------
# Product / catalog endpoints
# ---------------------------------------------------------------------------

@app.get("/api/catalog")
def get_catalog(category: Optional[str] = Query(default=None)) -> dict:
    return {"products": catalog.list_products(category=category)}


@app.get("/api/catalog/{slug}")
def get_catalog_item(slug: str) -> dict:
    # `catalog.get_product` strips internal cost fields by default
    # (wholesale_cost, fulfillment_cost, min_margin_floor, vendor_source_sku).
    # Owner directive 2026-04-30: COST never exposed to the customer.
    p = catalog.get_product(slug)
    if not p:
        raise HTTPException(status_code=404, detail="product_not_found")
    return p


class RecommendRequest(BaseModel):
    preferences: Dict[str, Any] = Field(default_factory=dict)


@app.post("/api/recommend")
def recommend(req: RecommendRequest) -> dict:
    return catalog.recommend_bundle(req.preferences)


# ---------------------------------------------------------------------------
# /api/quote — The Equation as an HTTP endpoint.
#
# Computes the canonical 3-6-9 Tesla Vortex × V.I.B.E. × Three Pillars
# matrix price, applies the requesting agent's tier ceiling, and either
# returns the quoted price or an HMAC-signed Stepper escalation token if
# the tier ceiling was breached. Cost data NEVER serializes to the
# response — `equation.strip_internal_fields()` is the boundary.
# ---------------------------------------------------------------------------

import equation  # noqa: E402


class QuoteRequest(BaseModel):
    sku: str
    qty: int = 1
    vibe: str = "individual"
    pillars: List[str] = Field(default_factory=list)
    frequency: str = "ppu"
    actor: str = "acheevy"
    requested_discount_pct: float = 0.0
    is_bundle: bool = False
    custee_id: str = "anon"


@app.post("/api/quote")
def get_quote(req: QuoteRequest) -> dict:
    q = equation.quote(
        sku_id=req.sku,
        qty=req.qty,
        vibe=req.vibe,
        pillars=req.pillars,
        frequency=req.frequency,
        actor=req.actor,
        requested_discount_pct=req.requested_discount_pct,
        is_bundle=req.is_bundle,
        custee_id=req.custee_id,
    )
    # Strip server-internal fields (cost, floor, margin) before serializing.
    # `_internal_*` keys never reach the customer; only quoted price +
    # discount + escalation_required + stepper_token reach the response.
    return equation.strip_internal_fields(q)


# ---------------------------------------------------------------------------
# /api/escalation/commit — Paperform webhook consumer for T1 escalation.
#
# Owner directive 2026-05-01: Stripe is built into Paperform + Stepper.
# The Paperform form handles payment-method-on-file (or upfront charge)
# natively as the canonical commitment gate. When a Custee submits the
# T1 commitment-confirmation form, Paperform webhooks here. Runner
# verifies the HMAC token (issued by Spinner when an agent hit its tier
# ceiling), records the volume_commitment in the audit ledger, and fires
# Telegram to ACHEEVY/owner.
#
# Form spec lives in iCloudDrive/.../coastal-business-plan/paperform-
# escalation-form-spec.md. Set STEPPER_ESCALATION_FORM_URL env var to
# the live Paperform URL once owner builds it.
# ---------------------------------------------------------------------------

from agents.shared import authority_tiers as _at  # noqa: E402


class EscalationCommitRequest(BaseModel):
    """Webhook payload from Paperform's T1 commitment-confirmation form.

    The form spec (paperform-escalation-form-spec.md) defines these fields.
    Paperform's Stripe integration handles payment authorization or
    method-on-file before this webhook fires.
    """
    escalation_token: str
    qty: int
    cadence: str  # "ppu" | "3-month" | "6-month" | "9-month-pay9-get12" | "quarterly-bulk"
    delivery_window: str  # "standard" | "priority" | "instant"
    payment_terms: str  # "pay-on-order" | "net-30" | "custom"
    notes: str = ""
    # Paperform-side fields populated automatically (not part of the Custee form):
    paperform_submission_id: Optional[str] = None
    paperform_form_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None  # Paperform→Stripe ID after auth
    stripe_payment_method_id: Optional[str] = None


@app.post("/api/escalation/commit")
def escalation_commit(req: EscalationCommitRequest) -> dict:
    """Receive Paperform webhook after Custee completes the T1 commitment
    confirmation form. Validates HMAC token + records volume_commitment +
    fires Telegram. ACHEEVY then enters the chat with full context to
    finalize the deal.
    """
    payload = _at.verify_stepper_escalation_token(req.escalation_token)
    if payload is None:
        raise HTTPException(
            status_code=403,
            detail="invalid_or_expired_escalation_token",
        )

    escalation_id = payload["escalation_id"]
    summary = (
        f"qty={req.qty} cadence={req.cadence} delivery={req.delivery_window} "
        f"terms={req.payment_terms} actor={payload['actor']} "
        f"requested_pct={payload['requested_pct']:.1f} sku={payload['sku']} "
        f"custee={payload['custee_id']} "
        f"paperform_sub={req.paperform_submission_id or '-'} "
        f"stripe_customer={req.stripe_customer_id or '-'} "
        f"notes={req.notes[:120]}"
    )
    audit_ledger.insert_action_receipt(
        task_id=escalation_id,
        executor=f"custee:{payload['custee_id']}",
        action_type="volume_commitment",
        destination="t1_queue",
        status="committed",
        result_summary=summary,
    )

    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        msg = (
            f"T1 escalation committed via Paperform — Coastal Brewing\n"
            f"escalation_id: {escalation_id}\n"
            f"actor: {payload['actor']} ({payload['tier']})\n"
            f"sku: {payload['sku']}\n"
            f"requested_pct: {payload['requested_pct']:.1f}%\n"
            f"committed: qty={req.qty} cadence={req.cadence}\n"
            f"  delivery={req.delivery_window} terms={req.payment_terms}\n"
            f"stripe_customer: {req.stripe_customer_id or '(not yet)'}\n"
            f"notes: {req.notes[:200]}\n\n"
            f"ACHEEVY: enter the chat with full context."
        )
        try:
            requests.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={"chat_id": TELEGRAM_CHAT_ID, "text": msg, "disable_web_page_preview": True},
                timeout=5,
            )
        except Exception:
            pass  # best-effort; audit ledger is the canonical record

    return {
        "ok": True,
        "escalation_id": escalation_id,
        "state": "awaiting_T1",
        "actor_tier_at_escalation": payload["tier"],
        "message": (
            "Volume commitment recorded. ACHEEVY will pick up the conversation "
            "with full context. Custee should return to the chat surface."
        ),
    }


@app.get("/api/escalation/form-url")
def escalation_form_url(token: str = Query(default="")) -> dict:
    """Resolve the Paperform escalation form URL, with the HMAC token
    embedded as a hidden-field prefill. Runner caller (Spinner) uses this
    to compose the redirect link surfaced to the Custee in chat:
    `https://stepper.coastalbrewing.co/t1-commit?escalation_token=<token>`.

    Set `STEPPER_ESCALATION_FORM_URL` env to the Paperform URL once owner
    builds it. Until then, returns a not-configured envelope so Spinner
    can fall back to the existing `escalate_to_owner` Telegram path.
    """
    base = os.environ.get("STEPPER_ESCALATION_FORM_URL", "")
    if not base:
        return {
            "ok": False,
            "verdict": "not_configured",
            "message": (
                "Paperform escalation form URL not yet set. "
                "Owner: build the form per paperform-escalation-form-spec.md "
                "and set STEPPER_ESCALATION_FORM_URL env on aims-vps."
            ),
        }
    if not token:
        raise HTTPException(status_code=400, detail="missing_token")
    sep = "&" if "?" in base else "?"
    return {
        "ok": True,
        "redirect_url": f"{base}{sep}escalation_token={token}",
    }


from adapters import livelookin  # noqa: E402
from adapters import email_sender  # noqa: E402


class LiveLookInRequest(BaseModel):
    agent: str  # "sales" | "marketing"


@app.post("/api/livelookin/session")
def livelookin_create(req: LiveLookInRequest) -> dict:
    return livelookin.create_session(req.agent)


@app.get("/api/livelookin/session/{session_id}")
def livelookin_status(session_id: str) -> dict:
    return livelookin.get_session(session_id)


@app.delete("/api/livelookin/session/{session_id}")
def livelookin_end(session_id: str) -> dict:
    return livelookin.end_session(session_id)


class ApiChatRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    agent: Optional[str] = "sales"
    session_id: Optional[str] = None


_CHAT_HISTORY: Dict[str, List[dict]] = {}
_CHAT_HISTORY_MAX = 12  # last 6 user/assistant turn pairs per session


def _record_history(session_id: str, role: str, content: str) -> None:
    if not content:
        return
    h = _CHAT_HISTORY.setdefault(session_id, [])
    h.append({"role": role, "content": content})
    if len(h) > _CHAT_HISTORY_MAX:
        del h[: len(h) - _CHAT_HISTORY_MAX]


@app.post("/api/chat/send")
def api_chat_send(req: ApiChatRequest, request: Request) -> dict:
    """JSON contract for the Next.js front-end (lib/api.ts).

    Primary path: Supernemotron via OpenRouter (`scripts/llm_client.py`).
    Fallback path: rule-based `_navigate_chat` state machine — runs when
    the LLM is unconfigured, errors, or returns empty content. Either
    way the customer always receives a non-empty reply.
    """
    _check_rate_limit(request.client.host if request.client else "unknown")
    from llm_client import chat_completion, is_configured  # noqa: E402

    sid = req.session_id or f"sess_{secrets.token_hex(6)}"
    agent_lane = req.agent or "sales"
    started = _time.time()
    reply_text = ""
    tool_trace: List[dict] = []
    model_used: Optional[str] = None
    fallback_reason: Optional[str] = None

    # Primary: LLM via OpenRouter
    if is_configured():
        history = list(_CHAT_HISTORY.get(sid, []))
        try:
            llm_result = chat_completion(
                user_message=req.content,
                history=history,
                agent=agent_lane,
            )
            if llm_result.get("ok"):
                reply_text = llm_result.get("content") or ""
                model_used = llm_result.get("model")
                tool_trace.append({
                    "tool": "openrouter_chat",
                    "status": "ok",
                    "detail": f"{model_used} · {llm_result.get('latency_ms')}ms",
                })
            else:
                fallback_reason = llm_result.get("error") or "llm_failed"
        except Exception as e:
            fallback_reason = f"llm_exception: {e}"
    else:
        fallback_reason = "openrouter_not_configured"

    # Fallback: rule-based state machine. Always runs if LLM didn't produce
    # a non-empty reply. The state-machine returns a `content` key (bug
    # fix: prior code looked for `reply`/`message`/`response` and got "").
    if not reply_text:
        try:
            result = _navigate_chat(req.content, {"agent": agent_lane})
            reply_text = (
                result.get("content")
                or result.get("reply")
                or result.get("message")
                or "Tell me — coffee, tea, or matcha?"
            )
            if fallback_reason:
                tool_trace.append({
                    "tool": "rule_based_fallback",
                    "status": "ok",
                    "detail": f"reason: {fallback_reason}",
                })
        except Exception as e:
            reply_text = "Sorry, I hit a snag. Try again in a moment?"
            tool_trace.append({
                "tool": "chat_send",
                "status": "blocked",
                "detail": str(e),
            })

    # Record history for future LLM context.
    _record_history(sid, "user", req.content)
    _record_history(sid, "assistant", reply_text)

    # Audit ledger receipt — every chat call leaves a row.
    try:
        latency_ms = int((_time.time() - started) * 1000)
        audit_ledger.insert_action_receipt(
            task_id=sid,
            executor=f"chat.{agent_lane}",
            action_type="chat_send",
            destination=model_used or "rule_based",
            status="ok" if reply_text else "blocked",
            result_summary=(
                f"u:{req.content[:120]} | r:{reply_text[:200]} | "
                f"latency={latency_ms}ms"
                + (f" | fallback={fallback_reason}" if fallback_reason else "")
            ),
        )
    except Exception:
        pass  # Audit failure must not break the user reply.

    return {
        "reply": {
            "role": "agent",
            "agent": agent_lane,
            "content": reply_text,
            "toolTrace": tool_trace,
            "ts": int(_time.time() * 1000),
        },
        "session_id": sid,
    }


# ---------------------------------------------------------------------------
# Owner-only margin calculator
# ---------------------------------------------------------------------------

class BundleLine(BaseModel):
    product_id: str
    qty: int = 1
    discount_pct: float = 0.0


class MarginRequest(BaseModel):
    items: List[BundleLine]
    deal_discount_pct: float = 0.0


@app.post("/admin/margin/calculate")
def margin_calculate(req: MarginRequest, x_coastal_token: Optional[str] = Header(default=None)) -> dict:
    _auth(x_coastal_token)
    items = [line.model_dump() for line in req.items]
    return catalog.calc_bundle(items, deal_discount_pct=req.deal_discount_pct)


@app.post("/admin/margin/suggest-max-discount")
def margin_suggest(req: MarginRequest, x_coastal_token: Optional[str] = Header(default=None)) -> dict:
    _auth(x_coastal_token)
    items = [line.model_dump() for line in req.items]
    return catalog.suggest_max_deal_discount(items)


_ADMIN_MARGIN_HTML = """<!DOCTYPE html>
<html lang="en" data-theme="dark"><head>
<meta charset="UTF-8"><title>Margin Calculator &mdash; Coastal Brewing</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--bg:#f3f0e8;--ink:#1a1612;--ink-soft:#4a4540;--muted:#8a857d;--rule:#d8d2c4;--surface:#fff;--accent:#6b8e4e;--success:#2d5a3d;--warning:#8a6a2d;--danger:#8a3a2a}
[data-theme="dark"]{--bg:#0d0b09;--ink:#f3efe6;--ink-soft:#b5afa0;--muted:#6a665d;--rule:#2a2620;--surface:#15120e;--accent:#b8c984}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--bg);color:var(--ink);font-family:'Inter',sans-serif;line-height:1.5;min-height:100vh}
.wrap{max-width:1080px;margin:0 auto;padding:32px 24px}
.head{padding-bottom:24px;border-bottom:1px solid var(--rule);margin-bottom:32px;
display:flex;justify-content:space-between;align-items:flex-end;gap:24px;flex-wrap:wrap}
.head .left{display:flex;flex-direction:column;gap:4px}
.eyebrow{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.10em;
text-transform:uppercase;color:var(--muted)}
h1{font-family:'Playfair Display',serif;font-size:32px;letter-spacing:-0.015em;font-weight:700}
.brand{font-family:'Inter',sans-serif;font-weight:900;text-transform:uppercase;letter-spacing:0.18em;
font-size:13px;line-height:0.92;color:var(--ink);text-decoration:none;display:inline-block}
.brand .top,.brand .bot{display:block}
.theme-toggle{background:transparent;border:0;color:var(--ink);font-size:18px;cursor:pointer;padding:4px 8px}
.config{margin-bottom:24px;padding:16px;border:1px solid var(--rule);background:var(--surface);
display:flex;flex-direction:column;gap:8px}
.config label{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);
letter-spacing:0.08em;text-transform:uppercase}
.config input{padding:10px 12px;border:1px solid var(--rule);background:var(--bg);color:var(--ink);
font-family:'JetBrains Mono',monospace;font-size:13px;border-radius:0;outline:none;width:100%}
.config input:focus{border-color:var(--ink)}
table{width:100%;border-collapse:collapse;margin-bottom:24px}
th,td{padding:10px 12px;text-align:left;font-size:13px;border-bottom:1px solid var(--rule)}
th{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted);font-weight:500;
letter-spacing:0.08em;text-transform:uppercase}
td.num,th.num{text-align:right;font-family:'JetBrains Mono',monospace}
input.qty,input.disc{width:64px;padding:6px;border:1px solid var(--rule);background:transparent;
color:var(--ink);font-family:'JetBrains Mono',monospace;font-size:12px;border-radius:0;text-align:right}
.actions{display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap}
button.btn{padding:10px 18px;font-family:'Inter',sans-serif;font-size:11px;font-weight:600;
letter-spacing:0.10em;text-transform:uppercase;color:var(--bg);background:var(--ink);
border:0;border-radius:0;cursor:pointer}
button.btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--ink)}
button.btn:hover{opacity:0.85}
.totals{padding:20px;border:1px solid var(--rule);background:var(--surface);
display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px}
.totals .stat{display:flex;flex-direction:column;gap:4px}
.totals .stat .lbl{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted);
letter-spacing:0.08em;text-transform:uppercase}
.totals .stat .val{font-family:'Playfair Display',serif;font-size:24px;font-weight:700;color:var(--ink)}
.totals .stat .val.warn{color:var(--warning)}
.totals .stat .val.danger{color:var(--danger)}
.totals .stat .val.success{color:var(--success)}
.tag-line{margin-top:32px;font-style:italic;font-size:12px;color:var(--muted);text-align:center}
.token-pill{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:0.05em;
color:var(--ink-soft);padding:4px 8px;border:1px solid var(--rule);display:inline-block}
</style></head>
<body><div class="wrap">
<div class="head">
  <div class="left">
    <a class="brand" href="/"><span class="top">Coastal</span><span class="bot">Brewing</span></a>
    <span class="eyebrow">[ Internal &middot; Margin Calculator ]</span>
    <h1>Run a deal scenario.</h1>
  </div>
  <button class="theme-toggle" id="themeToggle">&#9788;</button>
</div>

<div class="config">
  <label>X-Coastal-Token (paste your owner token)</label>
  <input id="token" type="password" placeholder="paste owner token (stored in localStorage)" />
</div>

<table id="lines"><thead><tr>
  <th>Product</th>
  <th class="num">QTY</th>
  <th class="num">Disc %</th>
  <th class="num">Unit Price</th>
  <th class="num">Unit Cost</th>
  <th class="num">Line Margin</th>
  <th class="num">%</th>
  <th>Floor</th>
</tr></thead><tbody id="rows"></tbody></table>

<div class="config">
  <label>Bulk deal discount (additional, applied on top of per-line %)</label>
  <input id="dealDisc" type="number" min="0" max="50" step="1" value="0" />
</div>

<div class="actions">
  <button class="btn" id="calc">Calculate</button>
  <button class="btn ghost" id="suggest">Suggest max-deal discount</button>
  <button class="btn ghost" id="reset">Reset</button>
</div>

<div class="totals" id="totals">
  <div class="stat"><span class="lbl">Total Revenue</span><span class="val" id="tRev">&mdash;</span></div>
  <div class="stat"><span class="lbl">Total Cost</span><span class="val" id="tCost">&mdash;</span></div>
  <div class="stat"><span class="lbl">Total Margin</span><span class="val" id="tMargin">&mdash;</span></div>
  <div class="stat"><span class="lbl">Margin %</span><span class="val" id="tPct">&mdash;</span></div>
  <div class="stat"><span class="lbl">Verdict</span><span class="val" id="tVerdict">&mdash;</span></div>
</div>

<p class="tag-line">Nothing chemically, ever.</p>
</div>

<script>
(function(){
  var html=document.documentElement,btn=document.getElementById('themeToggle');
  var stored=localStorage.getItem('cb_theme')||'dark';
  html.setAttribute('data-theme',stored);
  function setIcon(){btn.innerHTML=html.getAttribute('data-theme')==='dark'?'\\u263D':'\\u2600';}
  setIcon();
  btn.addEventListener('click',function(){
    var n=html.getAttribute('data-theme')==='dark'?'light':'dark';
    html.setAttribute('data-theme',n);localStorage.setItem('cb_theme',n);setIcon();
  });

  var tok=document.getElementById('token');
  tok.value=localStorage.getItem('cb_admin_token')||'';
  tok.addEventListener('change',function(){localStorage.setItem('cb_admin_token',tok.value);});

  fetch('/api/catalog').then(function(r){return r.json();}).then(function(data){
    var tbody=document.getElementById('rows');
    data.products.forEach(function(p){
      var tr=document.createElement('tr');
      tr.dataset.pid=p.id;
      tr.innerHTML='<td>'+p.name+' <span class="eyebrow">'+(p.category||'')+'/'+(p.size||'')+'</span></td>'+
        '<td class="num"><input class="qty" type="number" min="0" value="0" /></td>'+
        '<td class="num"><input class="disc" type="number" min="0" max="50" step="1" value="0" /></td>'+
        '<td class="num lp">&mdash;</td><td class="num lc">&mdash;</td>'+
        '<td class="num lm">&mdash;</td><td class="num lpct">&mdash;</td>'+
        '<td class="lfloor">&mdash;</td>';
      tbody.appendChild(tr);
    });
  });

  function gather(){
    var items=[];
    document.querySelectorAll('#rows tr').forEach(function(tr){
      var qty=parseInt(tr.querySelector('.qty').value)||0;
      if(qty>0){
        items.push({product_id:tr.dataset.pid,qty:qty,discount_pct:parseFloat(tr.querySelector('.disc').value)||0});
      }
    });
    return items;
  }

  function paint(result){
    document.getElementById('tRev').textContent='$'+result.total_revenue;
    document.getElementById('tCost').textContent='$'+result.total_cost;
    var mEl=document.getElementById('tMargin');
    mEl.textContent='$'+result.total_margin;
    document.getElementById('tPct').textContent=result.total_margin_pct+'%';
    var vEl=document.getElementById('tVerdict');
    vEl.textContent=result.verdict;
    vEl.className='val '+(result.verdict==='within_margin_floor'?'success':'warn');
    // line-level paint
    document.querySelectorAll('#rows tr').forEach(function(tr){
      var pid=tr.dataset.pid;
      var line=result.lines.find(function(l){return l.product_id===pid;});
      if(line){
        tr.querySelector('.lp').textContent='$'+line.unit_price;
        tr.querySelector('.lc').textContent='$'+line.unit_cost;
        tr.querySelector('.lm').textContent='$'+line.line_margin;
        tr.querySelector('.lpct').textContent=line.margin_pct+'%';
        tr.querySelector('.lfloor').textContent=line.below_floor?'BELOW':'ok';
        tr.querySelector('.lfloor').style.color=line.below_floor?'var(--danger)':'var(--success)';
      }else{
        ['.lp','.lc','.lm','.lpct','.lfloor'].forEach(function(s){tr.querySelector(s).textContent='\\u2014';});
      }
    });
  }

  document.getElementById('calc').addEventListener('click',async function(){
    var items=gather();
    if(!items.length){alert('Add a quantity to at least one product.');return;}
    var dealDisc=parseFloat(document.getElementById('dealDisc').value)||0;
    var res=await fetch('/admin/margin/calculate',{method:'POST',
      headers:{'Content-Type':'application/json','X-Coastal-Token':tok.value},
      body:JSON.stringify({items:items,deal_discount_pct:dealDisc})});
    if(!res.ok){alert('Auth failed or error: '+res.status);return;}
    paint(await res.json());
  });

  document.getElementById('suggest').addEventListener('click',async function(){
    var items=gather();
    if(!items.length){alert('Add a quantity to at least one product.');return;}
    var res=await fetch('/admin/margin/suggest-max-discount',{method:'POST',
      headers:{'Content-Type':'application/json','X-Coastal-Token':tok.value},
      body:JSON.stringify({items:items,deal_discount_pct:0})});
    if(!res.ok){alert('Auth failed or error: '+res.status);return;}
    var data=await res.json();
    document.getElementById('dealDisc').value=data.max_discount_pct;
    paint(data.calc);
    alert('Max safe deal discount: '+data.max_discount_pct+'%');
  });

  document.getElementById('reset').addEventListener('click',function(){
    document.querySelectorAll('#rows .qty').forEach(function(i){i.value=0;});
    document.querySelectorAll('#rows .disc').forEach(function(i){i.value=0;});
    document.getElementById('dealDisc').value=0;
    ['tRev','tCost','tMargin','tPct','tVerdict'].forEach(function(id){
      document.getElementById(id).textContent='\\u2014';
    });
    document.querySelectorAll('#rows tr').forEach(function(tr){
      ['.lp','.lc','.lm','.lpct','.lfloor'].forEach(function(s){tr.querySelector(s).textContent='\\u2014';});
    });
  });
})();
</script>
</body></html>"""


@app.get("/admin/margin", response_class=HTMLResponse)
def admin_margin_ui(x_coastal_token: Optional[str] = Header(default=None)) -> HTMLResponse:
    _auth(x_coastal_token)
    return HTMLResponse(content=_ADMIN_MARGIN_HTML)


@app.get("/audit/{task_id}", response_class=HTMLResponse)
def audit_view(task_id: str, token: str = Query(...)) -> HTMLResponse:
    if not _verify_audit_token(token, task_id):
        return HTMLResponse(
            status_code=401,
            content=_APPROVE_RESULT_HTML.format(
                accent="#ef4444",
                title="Audit Link Invalid or Expired",
                message="This trail link is no longer valid. Generate a new one or use a fresh approval-required packet.",
                task_id=task_id,
                footer="No audit shown.",
                actions_html="",
            ),
        )
    trail = audit_ledger.query_audit_trail(task_id)
    return HTMLResponse(content=_render_audit_trail(task_id, trail))


@app.get("/approve/click", response_class=HTMLResponse)
def approve_click(token: str = Query(...)) -> HTMLResponse:
    payload = _verify_approve_token(token)
    if not payload:
        return HTMLResponse(
            status_code=401,
            content=_APPROVE_RESULT_HTML.format(
                accent="#ef4444",
                title="Link Invalid or Expired",
                message="This approval link is no longer valid. Request a new packet to retry.",
                task_id="—",
                footer="No decision recorded.",
                actions_html="",
            ),
        )
    decision_label = payload["decision"]
    record = {
        "approval_id": payload["approval_id"],
        "task_id": payload["task_id"],
        "decision": decision_label,
        "decided_by": os.environ.get("OWNER_APPROVAL_EMAIL", "owner"),
        "decided_at": utc_now(),
        "note": f"via Telegram one-click ({decision_label})",
    }
    out_path = OWNER_APPROVALS_DIR / f"{payload['approval_id']}_decision.json"
    out_path.write_text(json.dumps(record, indent=2), encoding="utf-8")
    try:
        audit_ledger.insert_approval_decision(
            approval_id=payload["approval_id"],
            task_id=payload["task_id"],
            decision=decision_label,
            decided_by=record["decided_by"],
            note=record["note"],
        )
    except Exception:
        pass
    if decision_label == "approved":
        title, accent, msg = "Approved", "#5dd0c0", "Decision recorded. Coastal will proceed with allowed actions."
        try:
            audit_ledger.insert_action_receipt(
                task_id=payload["task_id"],
                executor="openclaw_authorized",
                action_type="owner_approved",
                destination="downstream_executor",
                status="authorized",
                result_summary=f"approval_id={payload['approval_id']} via Telegram one-click",
            )
        except Exception:
            pass
        # Fire post-approval execution: send supplier + customer drafts via
        # email_sender. Each send attempt records its own action_receipt to
        # AuditLedger (sent / skipped / failed). Never raises.
        try:
            _send_post_approval_emails(
                task_id=payload["task_id"], approval_id=payload["approval_id"]
            )
        except Exception:
            pass
    else:
        title, accent, msg = "Rejected", "#f59e0b", "Decision recorded. Coastal will halt and notify originating department."
        try:
            audit_ledger.insert_action_receipt(
                task_id=payload["task_id"],
                executor="openclaw_blocked",
                action_type="owner_rejected",
                destination="(none)",
                status="rejected",
                result_summary=f"approval_id={payload['approval_id']} via Telegram one-click",
            )
        except Exception:
            pass
    actions_html = (
        _render_send_buttons(payload["task_id"]) if decision_label == "approved" else ""
    )
    return HTMLResponse(
        content=_APPROVE_RESULT_HTML.format(
            accent=accent,
            title=title,
            message=msg,
            task_id=payload["task_id"],
            footer=f"approval_id: {payload['approval_id']} · {record['decided_at']}",
            actions_html=actions_html,
        )
    )


@app.get("/checkout/success", response_class=HTMLResponse)
def checkout_success(session_id: str = Query(...)) -> HTMLResponse:
    return HTMLResponse(
        content=_APPROVE_RESULT_HTML.format(
            accent="#2d5a3d",
            title="Welcome aboard",
            message="Thanks for subscribing to Coastal Brewing. Watch your inbox for confirmation. The owner approves the first dispatch before any shipment leaves.",
            task_id=session_id,
            footer=f"session_id &middot; {session_id[:24]}...",
            actions_html="",
        )
    )


@app.get("/checkout/cancel", response_class=HTMLResponse)
def checkout_cancel() -> HTMLResponse:
    return HTMLResponse(
        content=_APPROVE_RESULT_HTML.format(
            accent="#8a6a2d",
            title="No charge",
            message="Checkout canceled. Come back when you're ready. We'll be here.",
            task_id="—",
            footer="no payment captured",
            actions_html="",
        )
    )


# =============================================================================
# CHAIN OF COMMAND — WebSocket streaming endpoint
# WS /api/v1/chat/stream
# Streams: cup_metadata → thinking_token → thinking_complete → response_token
#          → escalation_event → response_complete
# =============================================================================
from streaming.message_types import (  # noqa: E402
    WsCupMetadata, WsThinkingToken, WsThinkingComplete,
    WsResponseToken, WsEscalationEvent, WsResponseComplete, WsError,
    WsUserMessage, EMPLOYEE_ANIMATION, EMPLOYEE_TIER, get_animation_size,
)
from streaming.thinking_parser import parse_openrouter_stream, THINKING, RESPONSE, DONE  # noqa: E402
from animation.escalation_triggers import detect_escalation  # noqa: E402

_OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")

# Employee → DeepSeek model mapping
_EMPLOYEE_MODEL = {
    "sal_ang":       "deepseek/deepseek-v4-flash",   # T3 — fast, retail floor
    "luc_ang":       "deepseek/deepseek-v4-flash",   # T2-FINANCE — efficient CPA math
    "melli_capensi": "deepseek/deepseek-v4-pro",     # T2-BULK — strategic PMO reasoning
    "acheevy":       "deepseek/deepseek-v4-pro",     # T1 — full authority reasoning
}

# Brand-grounding preamble prepended to EVERY lieutenant prompt. The model's
# default English prior on "Coastal Brewing Co." is "craft beer brewery,"
# which causes hallucinations like "our Lowcountry Coffee Stout." This block
# anchors the brand to coffee/tea/matcha + Lowcountry SC and explicitly
# excludes alcohol. Verified via WS smoke test 2026-05-02.
#
# Anti-hallucination rules added 2026-05-03 after owner caught ACHEEVY
# inventing "Costa Rican honey process / Ethiopian washed" SKUs that don't
# exist in our catalog. Plus anti-simulate-drinking (no "let me pour you a
# sample / how was your drink" — ACHEEVY is an ONLINE chat agent, not a
# physical barista; customers aren't actually drinking anything mid-chat).
_BRAND_PREAMBLE = (
    "BRAND CONTEXT — Coastal Brewing Co. sells small-batch COFFEE, "
    "whole-leaf TEA, and ceremonial MATCHA, plus flavored coffee blends "
    "and functional/mushroom coffees. We are a coffee + tea + matcha brand. "
    "We are NOT a beer brewery. We do NOT sell beer, ale, lager, stout, "
    "porter, IPA, or any alcohol. 'Brewing' in the name refers to brewed "
    "coffee and tea, not beer. The brand is Lowcountry South Carolina "
    "(Bluffton / Savannah / Beaufort area). Customer surface is single-"
    "persona ACHEEVY only — internal lieutenant names (Sal_Ang, LUC_Ang, "
    "Melli) never appear in customer-facing copy.\n\n"
    "HARD RULE — NO FABRICATION: ONLY recommend SKUs that appear in the "
    "CATALOG section below. NEVER invent product names, origins, processes, "
    "or attributes. If a customer asks for something not in the catalog "
    "(e.g. a specific origin we don't carry), say so plainly and offer the "
    "closest real SKU instead. Do not say 'Costa Rican honey process' or "
    "'Ethiopian washed' or 'Lowcountry Decaf' if those aren't in catalog. "
    "Use the EXACT SKU NAME from the catalog when recommending.\n\n"
    "HARD RULE — ONLINE CHAT AGENT: You are an ONLINE conversational agent, "
    "not a physical barista standing at a counter. The customer is at a "
    "screen. They are NOT drinking anything right now. Do NOT say 'let me "
    "pour you a sample,' 'how was that drink,' 'come sit at the bar,' "
    "'try a sip,' 'I'll grind it for you,' or any phrase that simulates "
    "physical service. Recommend products through descriptions, brewing "
    "guidance, and links — let the customer decide to order.\n\n"
    "HARD RULE — INLINE PRODUCT CARDS: When you mention a specific SKU "
    "from the catalog, IMMEDIATELY follow the SKU name with a marker in "
    "this exact form: [product:<sku-id>]. The frontend will REPLACE the "
    "marker with a visual product card showing the photo, price, and a "
    "Shop button. Use the EXACT sku-id from the catalog (e.g. "
    "[product:coastal-decaf-espresso-12oz]). Do not paraphrase or invent "
    "ids. Do not embed the marker inside parentheses or quotes. Do not "
    "list more than 3 product markers per response — pick the best 1-3 "
    "matches. Keep your text shorter when you use markers (the cards do "
    "the visual work). Example correct usage: 'For decaf, you've got two "
    "real options. [product:coastal-decaf-12oz] for everyday brewing, or "
    "[product:coastal-decaf-espresso-12oz] if you pull shots.'\n\n"
    "===\n\n"
)


def _coastal_catalog_context() -> str:
    """Build a compact catalog snapshot for system-prompt injection.
    Lists every SKU with name, category, origin, and price so the LLM has
    real ground-truth data to reference instead of inventing."""
    try:
        items = catalog.list_products()
    except Exception:
        return ""
    if not items:
        return ""
    lines = ["CATALOG (the ONLY products you may recommend):"]
    # Group by category for readability + token efficiency
    by_cat: Dict[str, List[dict]] = {}
    for p in items:
        by_cat.setdefault(p.get("category", "other"), []).append(p)
    for cat, plist in sorted(by_cat.items()):
        lines.append(f"\n[{cat}]")
        for p in plist:
            sku = p.get("id") or p.get("sku") or ""
            name = p.get("name", "")
            msrp = p.get("msrp")
            origin = p.get("origin") or p.get("ingredients") or ""
            origin_short = origin[:60] if origin else ""
            price = f"${msrp}" if msrp else ""
            lines.append(f"  - {sku}: {name} {price} {origin_short}".strip())
    return "\n".join(lines) + "\n\n"


# Employee → system prompt factory (injects persona + authority context)
def _employee_system_prompt(employee: str) -> str:
    prompts = {
        "sal_ang": (
            "You are Sal_Ang — Sales Lead at Coastal Brewing Co., T3 retail authority. "
            "Lowcountry Southern register. Warm, direct, place-anchored. "
            "Discount authority: ≤10% PPU, ≤15% bundles — hold the floor, no exceptions. "
            "For coupons/billing: delegate to LUC_Ang. For discounts above ceiling: escalate to owner. "
            "Never name the supplier. Brewed honest — owner-signed paper trail on every public claim."
        ),
        "luc_ang": (
            "You are LUC_Ang — Locale Universal Calculator, T2-FINANCE at Coastal Brewing Co. "
            "Brooklyn-fluent CPA precision. Lu-Cal calculator. CPA Gadget Man. "
            "ZERO margin-discount authority — coupon codes only: WELCOME10, BREW20, FREESHIP, TRY-ME. "
            "Delegate-not-ask voice. Short, precise, numerical."
        ),
        "melli_capensi": (
            "You are Melli Capensi — Honey Badger, leader of The Sett, T2-BULK at Coastal Brewing Co. "
            "Strategic, PMO-authoritative, funnel-minded. "
            "Bulk ladder: 12u→15%, 50u→25%, 100u+→35%. Above ceiling routes to ACHEEVY. "
            "7-stage Sett funnel owner. Never name the supplier."
        ),
        "acheevy": (
            "You are ACHEEVY — T1 final authority at Coastal Brewing Co. "
            "Belter Creole truth-speak. Direct, no pretending, short declaratives. No exclamation marks. "
            "Uncapped discount authority bound only by cost floor. "
            "Every public claim has a paper trail. The owner signs everything."
        ),
    }
    return _BRAND_PREAMBLE + _coastal_catalog_context() + prompts.get(employee, prompts["acheevy"])


async def _stream_employee_response(
    employee: str,
    messages: list,
    websocket: WebSocket,
    input_tokens: int,
) -> tuple[str, int, int]:
    """
    Stream a DeepSeek response for the given employee over the WebSocket.
    Returns (full_response_text, thinking_token_count, response_token_count).
    """
    anim_type = EMPLOYEE_ANIMATION.get(employee, "espresso_cup")
    anim_size, anim_dur = get_animation_size(anim_type, input_tokens)

    # Send cup metadata first so frontend pre-sizes the animation
    await websocket.send_json(WsCupMetadata(
        employee=employee,
        tier=EMPLOYEE_TIER.get(employee, "T1"),
        animation_type=anim_type,
        animation_size=anim_size,
        estimated_thinking_tokens=max(500, input_tokens * 3),
        estimated_duration_sec=anim_dur,
        input_tokens=input_tokens,
    ).model_dump())

    model = _EMPLOYEE_MODEL.get(employee, "deepseek/deepseek-v4-flash")
    thinking_count = 0
    response_count = 0
    full_response = ""
    thinking_done = False
    started_ms = int(_time.time() * 1000)

    headers = {
        "Authorization": f"Bearer {_OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://brewing.foai.cloud",
        "X-Title": "Coastal Brewing Co.",
    }
    payload = {
        "model": model,
        "messages": messages,
        "stream": True,
        "include_reasoning": True,
        "max_tokens": 2048,
    }

    try:
        async with httpx.AsyncClient(timeout=90) as client:
            async with client.stream("POST", "https://openrouter.ai/api/v1/chat/completions",
                                     headers=headers, json=payload) as resp:
                async for token_type, content in parse_openrouter_stream(resp.aiter_lines()):
                    if token_type == THINKING:
                        thinking_count += 1
                        await websocket.send_json(WsThinkingToken(
                            content=content,
                            token_index=thinking_count,
                            employee=employee,
                        ).model_dump())
                    elif token_type == RESPONSE:
                        if not thinking_done and thinking_count > 0:
                            thinking_done = True
                            elapsed = int(_time.time() * 1000) - started_ms
                            await websocket.send_json(WsThinkingComplete(
                                total_thinking_tokens=thinking_count,
                                duration_ms=elapsed,
                                employee=employee,
                            ).model_dump())
                        response_count += 1
                        full_response += content
                        await websocket.send_json(WsResponseToken(
                            content=content,
                            token_index=response_count,
                        ).model_dump())
                    elif token_type == DONE:
                        break
    except Exception as exc:
        await websocket.send_json(WsError(
            code="stream_error",
            message=f"Stream interrupted: {exc}",
        ).model_dump())

    # If no thinking tokens came through (model doesn't support it), close cleanly
    if thinking_count > 0 and not thinking_done:
        elapsed = int(_time.time() * 1000) - started_ms
        await websocket.send_json(WsThinkingComplete(
            total_thinking_tokens=thinking_count,
            duration_ms=elapsed,
            employee=employee,
        ).model_dump())

    return full_response, thinking_count, response_count


@app.websocket("/api/v1/chat/stream")
async def chat_stream(websocket: WebSocket, token: Optional[str] = Query(default=None)):
    """
    Chain-of-command WebSocket endpoint — PUBLIC (customer-facing).

    Auth model: this endpoint is intentionally open to anonymous browsers
    so the customer chat works without leaking the gateway token to the
    JS bundle. Real protections are:
      1. CORS allow_origins lock to brewing.foai.cloud + dev origins
      2. IP rate limit (15 req / 60s window)
      3. NemoClaw policy gate on every escalation
      4. ACHEEVY-only customer surface keeps internal lieutenants hidden
    The optional token param is preserved for backend-driven testing
    (passes when set, ignored when missing — anonymous browsers OK).
    Protocol: receive WsUserMessage → stream cup_metadata, thinking_token*,
              thinking_complete, response_token* → escalation_event (if needed)
              → response_complete.
    """
    # Token is OPTIONAL — public chat endpoint. Reject only on EXPLICIT
    # token mismatch (caller sent a token but it was wrong). Anonymous
    # callers pass through.
    if token and GATEWAY_TOKEN and token != GATEWAY_TOKEN:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await websocket.accept()

    # Resolve coastal_uid from cookie header (cookie was set by an earlier
    # /api/v1/users/identity or /greeting call). Used for profile-aware
    # context injection on every chat turn. None for users who haven't hit
    # the cookie-setting endpoints yet — graceful first-time fallback.
    _cookie_header = websocket.headers.get("cookie", "")
    coastal_uid: Optional[str] = None
    for _ck in _cookie_header.split(";"):
        _ck = _ck.strip()
        if _ck.startswith(f"{COASTAL_UID_COOKIE}="):
            coastal_uid = _ck.split("=", 1)[1].strip() or None
            break

    # Session state
    employee = "sal_ang"   # Default: Sal_Ang handles first contact
    history: list = []
    session_id = secrets.token_hex(8)

    try:
        while True:
            raw = await websocket.receive_json()
            msg = WsUserMessage.model_validate(raw)

            if msg.interrupt_current:
                # Frontend requested interrupt — reset and wait for next message
                history = history[:-2] if len(history) >= 2 else history
                continue

            user_content = msg.content.strip()
            if not user_content:
                continue

            # Detect escalation before calling the model
            escalation = detect_escalation(user_content, employee)
            if escalation:
                to_emp, reason, delegation_lang, new_anim = escalation
                await websocket.send_json(WsEscalationEvent(
                    from_employee=employee,
                    from_tier=EMPLOYEE_TIER.get(employee, "T3"),
                    to_employee=to_emp,
                    to_tier=EMPLOYEE_TIER.get(to_emp, "T1"),
                    reason=reason,
                    new_animation_type=new_anim,
                    delegation_language=delegation_lang,
                ).model_dump())
                employee = to_emp

            # Build messages list for this employee — prepend customer
            # profile context (last purchase, preferences, last summary)
            # so ACHEEVY can reference history naturally without reciting.
            sys_prompt = _employee_system_prompt(employee)
            if coastal_uid and _profile_layer.is_configured():
                try:
                    _profile = _profile_layer.get_profile(coastal_uid)
                    _profile_ctx = _profile_layer.profile_context_for_prompt(_profile)
                    if _profile_ctx:
                        sys_prompt = _profile_ctx + sys_prompt
                except Exception as _exc:
                    print(f"[user_profile] context fetch failed for uid={coastal_uid}: {_exc}", flush=True)
            messages = [{"role": "system", "content": sys_prompt}]
            messages.extend(history)
            messages.append({"role": "user", "content": user_content})

            input_tokens = sum(len(m["content"].split()) * 1.3 for m in messages)

            # Stream the response
            full_response, think_tokens, resp_tokens = await _stream_employee_response(
                employee=employee,
                messages=messages,
                websocket=websocket,
                input_tokens=int(input_tokens),
            )

            # Append to history
            history.append({"role": "user", "content": user_content})
            history.append({"role": "assistant", "content": full_response})
            # Keep last 12 messages (6 turns)
            if len(history) > 12:
                history = history[-12:]

            # Emit turn complete
            cost_estimate = (think_tokens * 0.0000005) + (resp_tokens * 0.0000015)
            await websocket.send_json(WsResponseComplete(
                total_response_tokens=resp_tokens,
                total_thinking_tokens=think_tokens,
                cost_usd_estimate=round(cost_estimate, 6),
                employee=employee,
                tier=EMPLOYEE_TIER.get(employee, "T1"),
            ).model_dump())

            # Audit log
            try:
                audit_ledger.insert_action_receipt(
                    task_id=session_id,
                    executor=f"ws_chat.{employee}",
                    action_type="ws_chat_send",
                    destination=_EMPLOYEE_MODEL.get(employee, "deepseek/deepseek-v4-flash"),
                    status="ok" if full_response else "empty",
                    result_summary=(
                        f"u:{user_content[:80]} | think:{think_tokens}tok "
                        f"| resp:{resp_tokens}tok | emp:{employee}"
                    ),
                )
            except Exception:
                pass

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        try:
            await websocket.send_json(WsError(
                code="session_error",
                message=str(exc),
            ).model_dump())
        except Exception:
            pass


# =============================================================================
# User-profile RAG layer — greeting / preferences / session continuity
# =============================================================================
# Reads/writes through scripts/user_profile.py against the shared FOAI Neon
# database (`coastal` schema). Cookie-based identity (anonymous-first); the
# `coastal_uid` cookie is set on first contact and persisted client-side for
# 1 year. Powers the canonical first-time / returning / within-24h ACHEEVY
# greeting variants per `Chain of thought research.txt` lines 846-942.

from fastapi import Cookie, Response  # noqa: E402

import user_profile as _profile_layer  # noqa: E402

COASTAL_UID_COOKIE = "coastal_uid"
COASTAL_UID_MAX_AGE_SEC = 31_536_000  # 1 year


def _ensure_uid(coastal_uid: Optional[str], response: Response) -> str:
    """Resolve or mint a coastal_uid for the caller. If a cookie is present,
    return its value; otherwise mint a new one + set the cookie on the
    response. Idempotent: subsequent calls reuse the existing cookie."""
    if coastal_uid:
        return coastal_uid
    new_uid = _profile_layer.new_coastal_uid()
    response.set_cookie(
        key=COASTAL_UID_COOKIE,
        value=new_uid,
        max_age=COASTAL_UID_MAX_AGE_SEC,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
    )
    return new_uid


class WsUserPreferences(BaseModel):
    """POST /api/v1/users/preferences body."""
    likes: List[str] = Field(default_factory=list)         # e.g. ["coffee", "tea"]
    path_choice: Optional[str] = None                       # 'guide_me' | 'shop_for_me' | 'direct_to_marketplace'


class WsUserSessionSummary(BaseModel):
    """POST /api/v1/users/session-summary body — kept for direct-summary
    callers; the frontend calls /session-wrap instead which generates the
    summary server-side via Gemini."""
    summary: str
    summary_embedding: Optional[List[float]] = None         # gemini-embedding-001 = 768 dims, optional
    metadata: Optional[Dict[str, Any]] = None


class WsUserSessionWrap(BaseModel):
    """POST /api/v1/users/session-wrap body. Frontend posts the transcript
    on unmount; server generates summary + embedding via Gemini and stores."""
    transcript: List[Dict[str, str]]                        # [{"role": "user|agent", "content": "..."}, ...]
    metadata: Optional[Dict[str, Any]] = None


@app.get("/api/v1/users/identity")
async def users_identity(
    response: Response,
    coastal_uid: Optional[str] = Cookie(default=None, alias=COASTAL_UID_COOKIE),
):
    """Resolve or mint the caller's coastal_uid cookie + return it.

    Side effect: if a profile doesn't exist yet, inserts a fresh row with
    visit_count=1. If it does, bumps last_visit_at and visit_count.
    """
    if not _profile_layer.is_configured():
        return {"coastal_uid": None, "rag": "disabled"}
    uid = _ensure_uid(coastal_uid, response)
    profile = _profile_layer.upsert_profile_visit(uid)
    return {
        "coastal_uid": uid,
        "visit_count": profile.visit_count,
        "first_visit_at": profile.first_visit_at.isoformat(),
        "last_visit_at": profile.last_visit_at.isoformat(),
    }


@app.get("/api/v1/users/profile")
async def users_profile(
    response: Response,
    coastal_uid: Optional[str] = Cookie(default=None, alias=COASTAL_UID_COOKIE),
):
    """Return the full profile for the caller's coastal_uid. Mints a uid +
    empty profile if none exists yet."""
    if not _profile_layer.is_configured():
        return {"profile": None, "rag": "disabled"}
    uid = _ensure_uid(coastal_uid, response)
    profile = _profile_layer.get_profile(uid)
    if profile is None:
        profile = _profile_layer.upsert_profile_visit(uid)
    return {
        "coastal_uid": profile.coastal_uid,
        "identity": profile.identity,
        "first_visit_at": profile.first_visit_at.isoformat(),
        "last_visit_at": profile.last_visit_at.isoformat(),
        "visit_count": profile.visit_count,
        "preferences": profile.preferences,
        "last_path_choice": profile.last_path_choice,
        "last_summary": profile.last_summary,
        "last_purchase_sku": profile.last_purchase_sku,
        "last_purchase_label": profile.last_purchase_label,
        "last_purchase_at": (
            profile.last_purchase_at.isoformat() if profile.last_purchase_at else None
        ),
    }


@app.get("/api/v1/users/greeting")
async def users_greeting(
    response: Response,
    coastal_uid: Optional[str] = Cookie(default=None, alias=COASTAL_UID_COOKIE),
):
    """Return the appropriate greeting variant + path/preference button
    flags for the caller's coastal_uid. Mints a uid if missing.

    Variants: first_time, within_session, returning, returning_long_break.
    Per `Chain of thought research.txt` lines 846-942.
    """
    if not _profile_layer.is_configured():
        # Graceful degradation — serve the canonical first-time greeting
        # without any profile-aware logic.
        return {
            "variant": "first_time",
            "greeting": "Welcome to Coastal Brewing Co. I'm ACHEEVY. How can I help you today?",
            "show_path_buttons": True,
            "show_preference_buttons": True,
            "context": {"last_purchase_label": None, "preferences": {}, "visit_count": 1},
            "rag": "disabled",
        }
    uid = _ensure_uid(coastal_uid, response)
    profile = _profile_layer.get_profile(uid)
    if profile is None:
        profile = _profile_layer.upsert_profile_visit(uid)
    payload = _profile_layer.pick_greeting_variant(profile)
    payload["coastal_uid"] = uid
    return payload


@app.post("/api/v1/users/preferences")
async def users_preferences(
    body: WsUserPreferences,
    response: Response,
    coastal_uid: Optional[str] = Cookie(default=None, alias=COASTAL_UID_COOKIE),
):
    """Update preferences + optional path-choice for the caller. Used by
    the chat-panel button clicks (path-selection + preference-capture)."""
    if not _profile_layer.is_configured():
        raise HTTPException(status_code=503, detail="user-profile RAG disabled")
    uid = _ensure_uid(coastal_uid, response)
    # Ensure profile exists
    _profile_layer.upsert_profile_visit(uid)
    profile = _profile_layer.update_preferences(
        uid,
        preferences={"likes": body.likes} if body.likes else {},
        path_choice=body.path_choice,
    )
    return {
        "coastal_uid": uid,
        "preferences": profile.preferences,
        "last_path_choice": profile.last_path_choice,
    }


@app.post("/api/v1/users/session-summary")
async def users_session_summary(
    body: WsUserSessionSummary,
    coastal_uid: Optional[str] = Cookie(default=None, alias=COASTAL_UID_COOKIE),
):
    """Store a pre-generated conversation summary. Kept for direct callers
    (e.g. backend cron); the frontend uses /session-wrap which generates
    the summary server-side via Gemini."""
    if not _profile_layer.is_configured():
        raise HTTPException(status_code=503, detail="user-profile RAG disabled")
    if not coastal_uid:
        return {"stored": False, "reason": "no coastal_uid cookie"}
    sid = _profile_layer.record_session_summary(
        coastal_uid=coastal_uid,
        summary=body.summary,
        summary_embedding=body.summary_embedding,
        metadata=body.metadata,
    )
    return {"stored": True, "session_id": sid}


# Gemini configuration for server-side summarization + embedding.
# Per CLAUDE.md model policy: Google/Gemini/Vertex first.
_GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
_GEMINI_FLASH_MODEL = os.environ.get("GEMINI_FLASH_MODEL", "gemini-2.5-flash")
_GEMINI_EMBED_MODEL = os.environ.get("GEMINI_EMBED_MODEL", "gemini-embedding-001")
_GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"


def _gemini_summarize_transcript(transcript: List[Dict[str, str]]) -> str:
    """Generate a ~50-token conversation summary via Gemini Flash. Used
    for the user_session.summary field so the next greeting can reference
    the prior conversation topic concisely. Returns empty string on error
    (caller stores empty summary rather than failing the session-wrap)."""
    if not _GEMINI_API_KEY:
        return ""
    if not transcript:
        return ""
    convo = "\n".join(
        f"{t.get('role', 'unknown').upper()}: {t.get('content', '').strip()[:500]}"
        for t in transcript[-20:]   # last 20 turns max — keep prompt tight
        if t.get("content", "").strip()
    )
    if not convo:
        return ""
    prompt = (
        "Summarize this Coastal Brewing Co. customer chat in ONE compact "
        "sentence (<= 25 words). Capture the customer's intent + any "
        "specific product or preference they mentioned. Plain text only, "
        "no markdown, no quotes.\n\n---TRANSCRIPT---\n"
        + convo
    )
    url = f"{_GEMINI_API_BASE}/models/{_GEMINI_FLASH_MODEL}:generateContent?key={_GEMINI_API_KEY}"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 80},
    }
    try:
        r = requests.post(url, json=payload, timeout=20)
        r.raise_for_status()
        data = r.json()
        candidates = data.get("candidates") or []
        if not candidates:
            return ""
        parts = (candidates[0].get("content") or {}).get("parts") or []
        text = " ".join(p.get("text", "") for p in parts).strip()
        return text[:280]   # safety cap
    except Exception as exc:
        print(f"[user_profile] Gemini summarize failed: {exc}", flush=True)
        return ""


def _gemini_embed_text(text: str, output_dim: int = 768) -> Optional[List[float]]:
    """Generate a 768-dim embedding via gemini-embedding-001 (matryoshka
    truncated to 768 to match the coastal.user_session schema). Returns
    None on error so callers can store the summary without an embedding."""
    if not _GEMINI_API_KEY or not text:
        return None
    url = f"{_GEMINI_API_BASE}/models/{_GEMINI_EMBED_MODEL}:embedContent?key={_GEMINI_API_KEY}"
    payload = {
        "model": f"models/{_GEMINI_EMBED_MODEL}",
        "content": {"parts": [{"text": text}]},
        "outputDimensionality": output_dim,
        "taskType": "SEMANTIC_SIMILARITY",
    }
    try:
        r = requests.post(url, json=payload, timeout=20)
        r.raise_for_status()
        data = r.json()
        emb = (data.get("embedding") or {}).get("values")
        if not emb or len(emb) != output_dim:
            return None
        return emb
    except Exception as exc:
        print(f"[user_profile] Gemini embed failed: {exc}", flush=True)
        return None


@app.post("/api/v1/users/session-wrap")
async def users_session_wrap(
    body: WsUserSessionWrap,
    coastal_uid: Optional[str] = Cookie(default=None, alias=COASTAL_UID_COOKIE),
):
    """Frontend posts the conversation transcript at session-end (chat-
    panel unmount or 30-min idle). Server generates a compact summary +
    768-dim embedding via Gemini and stores both in coastal.user_session.
    Frontend never touches the Gemini key."""
    if not _profile_layer.is_configured():
        raise HTTPException(status_code=503, detail="user-profile RAG disabled")
    if not coastal_uid:
        return {"stored": False, "reason": "no coastal_uid cookie"}
    if not body.transcript:
        return {"stored": False, "reason": "empty transcript"}

    summary = _gemini_summarize_transcript(body.transcript)
    if not summary:
        # Fall back to a deterministic tail-of-conversation snippet so we
        # always store SOMETHING when the customer had real interaction.
        last_user = next(
            (t.get("content", "") for t in reversed(body.transcript)
             if t.get("role") == "user" and t.get("content", "").strip()),
            "",
        )
        if not last_user:
            return {"stored": False, "reason": "no useful content"}
        summary = f"Customer asked: {last_user[:200]}"

    embedding = _gemini_embed_text(summary)
    sid = _profile_layer.record_session_summary(
        coastal_uid=coastal_uid,
        summary=summary,
        summary_embedding=embedding,
        metadata={
            **(body.metadata or {}),
            "transcript_turns": len(body.transcript),
            "embedding_dim": len(embedding) if embedding else 0,
        },
    )
    return {
        "stored": True,
        "session_id": sid,
        "summary": summary,
        "embedded": embedding is not None,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Inworld TTS — POST /api/v1/voice/synthesize
# ─────────────────────────────────────────────────────────────────────────────
# Customer-visible: ACHEEVY voice playback only (per the ACHEEVY-only canon
# in feedback_only_acheevy_speaks_to_users_on_coastal_chat.md). The Sal /
# LUC / Melli voice IDs are mapped here for internal future use (training
# previews, voice-design comparisons, owner Tool Chest) but are not exposed
# on the customer chat surface.
#
# Stock voice mapping picked 2026-05-03 from Inworld's 148-voice catalog,
# matching each character's voice_design_prompt archetype. Custom voice
# DESIGN endpoint is a separate scope — script-driven creation returned
# 404 against the `/studio/v1/workspaces/.../voice-library/voices` path
# the legacy setup expected. When that path is re-discovered or owner
# uses the platform UI to publish custom voices, swap voiceId values
# here. Both inworld-tts-1.5-max (flagship) and -mini (cheap/fast) are
# valid model IDs per documented support.

_INWORLD_API_KEY = os.environ.get("INWORLD_API_KEY", "").strip()
_INWORLD_TTS_ENDPOINT = "https://api.inworld.ai/tts/v1/voice"
_INWORLD_TTS_MODEL = os.environ.get("INWORLD_TTS_MODEL", "inworld-tts-1.5-max")

# Coastal employee → Inworld stock voice + tier override.
# Tier "max" = flagship (richer expression, ~200ms p50). "mini" = ~120ms,
# cheaper. ACHEEVY gets max because customers hear his voice; internal
# voices default to mini when ever surfaced (cost discipline).
_INWORLD_VOICE_MAP: Dict[str, Dict[str, str]] = {
    # ACHEEVY voice = custom-cloned voice via the FOAI voice-procurement
    # pipeline (aims-tools/voice-library/scripts/procure_voice.py),
    # 2026-05-03. Source: Marcus Garvey 1921 PD speech (US copyright
    # lapsed for pre-1923 sound recordings 2022); 30-second trim;
    # Inworld Instant Voice Cloning (IVC). Black-Atlantic baritone
    # archetype matching owner's "Idris-Elba-type Black-British"
    # spec. Belter Creole register comes from the system prompt
    # (clipped consonants, dropped articles, vacuum-truth-speak) —
    # the cloned voice provides the timbre.
    # Override via env INWORLD_VOICE_ID_ACHEEVY when a higher-quality
    # cloned voice (multi-sample, professional cloning) is published.
    "acheevy":       {
        "voiceId": os.environ.get("INWORLD_VOICE_ID_ACHEEVY") or "default-4zhua1rhxjfl50z1dnkcba__acheevy-idrisarchetype-v3",
        "model": "inworld-tts-1.5-max",
    },
    "sal_ang":       {"voiceId": "Hank",    "model": "inworld-tts-1.5-max"},
    "luc_ang":       {"voiceId": "Vinny",   "model": "inworld-tts-1.5-mini"},
    "melli_capensi": {"voiceId": "Bianca",  "model": "inworld-tts-1.5-max"},
}


class WsVoiceSynthRequest(BaseModel):
    text: str
    character_id: str = "acheevy"


@app.post("/api/v1/voice/synthesize")
async def voice_synthesize(body: WsVoiceSynthRequest):
    """Inworld TTS for the 4 wired Coastal characters. Returns base64-
    encoded WAV in `audioContent` for the frontend to decode and play
    (no streaming yet; voice-stream endpoint can be wired later for
    long messages). Customer surface only ever hits this with
    character_id='acheevy' — internal voices accept calls for owner-
    side previews."""
    if not _INWORLD_API_KEY:
        raise HTTPException(status_code=503, detail="INWORLD_API_KEY not configured")
    text = (body.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text required")
    if len(text) > 2000:
        # Inworld TTS-1.5 has a per-request character cap; trim to be safe.
        text = text[:2000]

    voice_cfg = _INWORLD_VOICE_MAP.get(body.character_id) or _INWORLD_VOICE_MAP["acheevy"]
    payload = {
        "text": text,
        "voiceId": voice_cfg["voiceId"],
        "modelId": voice_cfg.get("model", _INWORLD_TTS_MODEL),
        "language": "en",
    }
    headers = {
        "Authorization": f"Basic {_INWORLD_API_KEY}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(_INWORLD_TTS_ENDPOINT, headers=headers, json=payload)
        if resp.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"Inworld TTS error {resp.status_code}: {resp.text[:300]}",
            )
        body_data = resp.json()
        audio_b64 = body_data.get("audioContent", "")
        if not audio_b64:
            raise HTTPException(status_code=502, detail="Inworld TTS returned empty audioContent")
        return {
            "audioContent": audio_b64,
            "voiceId": voice_cfg["voiceId"],
            "model": voice_cfg.get("model", _INWORLD_TTS_MODEL),
            "character_id": body.character_id,
            "format": "audio/wav",
        }
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Inworld TTS timed out")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Inworld TTS unexpected error: {exc}")


# ─────────────────────────────────────────────────────────────────────────────
# Inworld STT — POST /api/v1/voice/transcribe (multipart audio upload)
# ─────────────────────────────────────────────────────────────────────────────
# Customer-facing voice INPUT for the chat panel mic button. Browser
# captures mic audio via MediaRecorder (webm/opus by default), uploads
# multipart, we forward to Inworld STT (model inworld-stt-1, sync API).
# Returns plain transcript for the frontend to drop into the input field.
#
# Inworld STT sync supports LINEAR16, MP3, OGG_OPUS, FLAC, AUTO_DETECT.
# Browser webm-opus typically works under AUTO_DETECT. If accuracy
# degrades on a given codec, we can switch to LINEAR16 PCM client-side
# at the cost of larger payloads.

from fastapi import UploadFile, File   # noqa: E402  (used here only)

_INWORLD_STT_ENDPOINT = "https://api.inworld.ai/stt/v1/transcribe"
_INWORLD_STT_MODEL = os.environ.get("INWORLD_STT_MODEL", "inworld-stt-1")
# Fallback to Groq Whisper via Inworld's own provider (per their STT docs
# `groq/whisper-large-v3` is supported through the same /stt/v1/transcribe
# endpoint but with a different audio_encoding requirement). If Inworld's
# native model rejects browser webm, retry with Groq.


@app.post("/api/v1/voice/transcribe")
async def voice_transcribe(audio: UploadFile = File(...)):
    """Transcribe customer mic audio via Inworld STT. Returns plain
    transcript for the chat panel to drop into the input field.
    Errors return 502 — the chat panel falls back to manual typing
    silently."""
    if not _INWORLD_API_KEY:
        raise HTTPException(status_code=503, detail="INWORLD_API_KEY not configured")
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="empty audio payload")
    if len(audio_bytes) > 10 * 1024 * 1024:    # 10 MB cap
        raise HTTPException(status_code=413, detail="audio too large (max 10 MB)")

    # Inworld STT REST sync API. Uses multipart form upload (the docs
    # JSON shape with base64 was returning proto parse errors as of
    # 2026-05-03 — multipart is the working path). `audio_encoding`
    # AUTO_DETECT lets the model handle webm/opus from MediaRecorder
    # without client-side transcoding.
    files = {
        "audio": (audio.filename or "audio.webm", audio_bytes, audio.content_type or "audio/webm"),
    }
    data = {
        "model": _INWORLD_STT_MODEL,
        "audio_encoding": "AUTO_DETECT",
        "language_code": "en-US",
    }
    headers = {"Authorization": f"Basic {_INWORLD_API_KEY}"}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(_INWORLD_STT_ENDPOINT, headers=headers, files=files, data=data)
        if resp.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"Inworld STT error {resp.status_code}: {resp.text[:300]}",
            )
        body_data = resp.json()
        # Response can come back as either {results: [{alternatives: [...]}]} (Google-style)
        # or {transcript: "..."} (OpenAI-style). Handle both.
        transcript = body_data.get("transcript") or ""
        if not transcript:
            results = body_data.get("results") or []
            for r in results:
                alts = r.get("alternatives") or []
                if alts and alts[0].get("transcript"):
                    transcript += alts[0]["transcript"] + " "
        transcript = transcript.strip()
        return {
            "transcript": transcript,
            "model": _INWORLD_STT_MODEL,
            "audio_bytes": len(audio_bytes),
        }
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Inworld STT timed out")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Inworld STT unexpected error: {exc}")
