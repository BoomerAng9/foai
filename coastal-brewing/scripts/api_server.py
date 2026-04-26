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
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import requests

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from model_router import decide_route, make_receipt, utc_now  # noqa: E402
import audit_ledger  # noqa: E402
import catalog  # noqa: E402

try:
    from adapters.stripe_adapter import (  # noqa: E402
        create_checkout_session as _stripe_create_checkout_session,
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
    <p class="lede">Small-batch coffee, whole-leaf tea, ceremonial matcha. Sourced through verified partners. Every public claim has a paper trail. Every cup is what the label says it is.</p>
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

    return {"recorded": True, "decision_path": str(out_path)}


class CheckoutRequest(BaseModel):
    tier: str
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
        raise HTTPException(status_code=503, detail="Stripe is not configured (set STRIPE_SECRET_KEY + price IDs)")
    success_url = req.success_url or f"{COASTAL_PUBLIC_URL}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = req.cancel_url or f"{COASTAL_PUBLIC_URL}/checkout/cancel"
    try:
        return _stripe_create_checkout_session(
            tier=req.tier,
            customer_email=req.customer_email,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=req.metadata,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


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
    return {"received": True, "event_id": event["id"], "type": event["type"], "path": str(out_path)}


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
</style></head>
<body><div class="wrap">
<a class="brand" href="https://brewing.foai.cloud/">coastal brewing<span class="dot">.</span></a>
<div class="eyebrow">[ decision ]</div>
<h1>{title}.</h1>
<p>{message}</p>
<div class="task">{task_id}</div>
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
    p = catalog.get_product(slug)
    if not p:
        raise HTTPException(status_code=404, detail="product_not_found")
    return p


class RecommendRequest(BaseModel):
    preferences: Dict[str, Any] = Field(default_factory=dict)


@app.post("/api/recommend")
def recommend(req: RecommendRequest) -> dict:
    return catalog.recommend_bundle(req.preferences)


from adapters import livelookin  # noqa: E402


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
    content: str
    agent: Optional[str] = "sales"
    session_id: Optional[str] = None


@app.post("/api/chat/send")
def api_chat_send(req: ApiChatRequest) -> dict:
    """JSON contract for the Next.js front-end (lib/api.ts).

    Wraps the existing _navigate_chat state machine and returns the shape the
    React ChatPanel expects: { reply: ChatMessage, session_id }. Agent-aware
    negotiation kit (propose_deal, counter_offer, accept_deal) lands in a
    follow-up; for now this routes through the existing product-nav state
    machine and tags the reply with the requesting agent lane.
    """
    sid = req.session_id or f"sess_{secrets.token_hex(6)}"
    try:
        result = _navigate_chat(req.content, {"agent": req.agent or "sales"})
        reply_text = (
            result.get("reply")
            or result.get("message")
            or result.get("response")
            or ""
        )
        tool_trace = result.get("tool_trace") or []
        return {
            "reply": {
                "role": "agent",
                "agent": req.agent or "sales",
                "content": reply_text,
                "toolTrace": tool_trace,
                "ts": int(_time.time() * 1000),
            },
            "session_id": sid,
        }
    except Exception as e:
        return {
            "reply": {
                "role": "agent",
                "agent": req.agent or "sales",
                "content": "Sorry, I hit a snag. Try again in a moment?",
                "toolTrace": [{"tool": "chat_send", "status": "blocked", "detail": str(e)}],
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
def admin_margin_ui() -> HTMLResponse:
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
    return HTMLResponse(
        content=_APPROVE_RESULT_HTML.format(
            accent=accent,
            title=title,
            message=msg,
            task_id=payload["task_id"],
            footer=f"approval_id: {payload['approval_id']} · {record['decided_at']}",
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
        )
    )
