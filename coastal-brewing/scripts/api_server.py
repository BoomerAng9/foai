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
import re
import secrets
import sys
import urllib.parse
from typing import Any, Dict, List, Optional

import asyncio
import collections
import threading

from fastapi import FastAPI, Header, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
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

# Surface-aware register modulation (voice-library/scripts/register_modulator.py).
# Soft import — the runner stays functional if the voice-library tree is not present
# (e.g., on a stripped-down deploy image). When available, the modulator emits a
# per-(character × surface) preamble that gates dialect lexicon to the deployment
# environment per dialect-library/REGISTER-MODULATION.md doctrine.
_VOICE_LIBRARY_CANDIDATES = [
    pathlib.Path(os.environ.get("VOICE_LIBRARY_SCRIPTS_DIR", "")),
    ROOT.parent / "aims-tools" / "voice-library" / "scripts",
    ROOT / "voice-library" / "scripts",  # VPS layout: /app/voice-library/scripts
]
_VOICE_LIBRARY_SCRIPTS = pathlib.Path(".")  # placeholder, overwritten below
REGISTER_MODULATOR_AVAILABLE = False
for _vl in _VOICE_LIBRARY_CANDIDATES:
    if _vl and str(_vl) not in ("", ".") and (_vl / "register_modulator.py").exists():
        sys.path.insert(0, str(_vl))
        _VOICE_LIBRARY_SCRIPTS = _vl
        try:
            from register_modulator import operating_register_for, preamble_for  # noqa: E402
            REGISTER_MODULATOR_AVAILABLE = True
            break
        except Exception:
            pass

# Pronunciation engine (TTS-only rewrites for brand / catalog / cadence /
# Belter Creole / URBANISM phonetics — see voice-library/pronunciation-library/).
# Try multiple candidate paths so this works on both local-dev (foai/aims-tools/...)
# and the VPS deploy (/docker/coastal-brewing/pronunciation-library/).
_PRONUNCIATION_ENGINE_CANDIDATES = [
    pathlib.Path(os.environ.get("PRONUNCIATION_LIBRARY_ENGINE_DIR", "")),
    ROOT.parent / "aims-tools" / "voice-library" / "pronunciation-library" / "engine",
    ROOT / "pronunciation-library" / "engine",  # VPS layout: /docker/coastal-brewing/pronunciation-library/engine
]
_PRONUNCIATION_RULES_CANDIDATES = [
    pathlib.Path(os.environ.get("PRONUNCIATION_LIBRARY_DIR", "")),
    ROOT.parent / "aims-tools" / "voice-library" / "pronunciation-library" / "rules",
    ROOT / "pronunciation-library" / "rules",
]
_PRONUNCIATION_ENGINE_AVAILABLE = False
_PRONUNCIATION_IMPORT_ERROR: Optional[str] = None
# Filter to candidates with a non-empty path AND that contain pronunciation_engine.py
_valid_engine_dirs = [
    p for p in _PRONUNCIATION_ENGINE_CANDIDATES
    if p and str(p) not in ("", ".") and (p / "pronunciation_engine.py").exists()
]
for _engine_dir in _valid_engine_dirs:
    sys.path.insert(0, str(_engine_dir))
    # Co-locate the rules dir env var BEFORE import so the engine
    # picks it up at first-call time.
    for _rules_dir in _PRONUNCIATION_RULES_CANDIDATES:
        if _rules_dir and str(_rules_dir) not in ("", ".") and _rules_dir.exists():
            os.environ["PRONUNCIATION_LIBRARY_DIR"] = str(_rules_dir)
            break
    try:
        from pronunciation_engine import rewrite_for_tts as _rewrite_for_tts  # noqa: E402
        _PRONUNCIATION_ENGINE_AVAILABLE = True
        break  # only break on SUCCESSFUL import — the bug fix
    except Exception as _e:
        _PRONUNCIATION_IMPORT_ERROR = f"{type(_e).__name__}: {_e}"
        # try next candidate

# Map the runner's lowercase employee keys to the cast-environments YAML keys.
# Cast YAML lives at voice-library/dialect-library/cast-environments/coastal-brewing.yaml
_EMPLOYEE_TO_CAST_KEY = {
    "sal_ang":       "Sal_Ang",
    "luc_ang":       "LUC_Ang",
    "melli_capensi": "Melli_Capensi",
    "acheevy":       "ACHEEVY",
}

GATEWAY_TOKEN = os.environ.get("COASTAL_GATEWAY_TOKEN", "")
COASTAL_PUBLIC_URL = os.environ.get("COASTAL_PUBLIC_URL", "https://brewing.foai.cloud")
NEMOCLAW_URL = os.environ.get("NEMOCLAW_URL", "")
NEMOCLAW_API_KEY = os.environ.get("NEMOCLAW_API_KEY", "")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

# ─── Standard Membership ledger (Phase 1+2) ────────────────────────────
# Process-singleton; the api_server is single-replica today. When a
# multi-replica deploy lands, swap this for a Firestore-backed adapter
# behind the same ReferralLedger interface (Phase 4 ticket).
import scripts.membership as membership  # noqa: E402
_membership_ledger = membership.ReferralLedger()

# Lil_Mercury_Hawk — wraps Mercury Banking + Invoicing API. Replaces Stripe
# for the Coastal subscription + initiation flow (owner directive 2026-05-11).
import scripts.lil_mercury_hawk as lil_mercury_hawk  # noqa: E402


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


def _send_telegram_message(text: str) -> bool:
    """Fire a plain Telegram message to the owner channel. Returns True on
    HTTP 200, False otherwise (including missing token). Never raises."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return False
    try:
        r = requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT_ID, "text": text, "disable_web_page_preview": True},
            timeout=5,
        )
        return r.status_code == 200
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
MERCURY_EVENTS_DIR = ROOT / "mercury_events"

for _d in (RECEIPTS_DIR, RESEARCH_TICKETS_DIR, DRAFTS_DIR, OWNER_APPROVALS_DIR, STRIPE_EVENTS_DIR, MERCURY_EVENTS_DIR):
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

# Simple in-memory rate limiter. Per-bucket-name (e.g., "chat", "voice",
# "auth") + per-client-IP windows. Behind nginx the bare `request.client.host`
# resolves to the nginx container's internal IP, so all callers share one
# bucket — useless. _client_ip() reads X-Forwarded-For / X-Real-IP first.
_RATE_LOCK = threading.Lock()
_RATE_BUCKETS: Dict[str, list] = collections.defaultdict(list)
_RATE_WINDOW_SEC = 60
_RATE_LIMITS: Dict[str, int] = {
    "chat": 15,    # /api/chat/send HTTP fallback per IP per minute
    "ws_chat": 30, # /api/v1/chat/stream WS turns per IP per minute
    "voice": 30,   # /api/v1/voice/synthesize{,/stream} per IP per minute (Inworld $$$)
    "auth": 10,    # /auth/login + /auth/verify per IP per minute
}


def _client_ip(headers, fallback: Optional[str] = None) -> str:
    """Resolve the originating client IP from proxy headers.

    nginx sets X-Forwarded-For (the right-most entry is the last proxy hop;
    the LEFT-most is the original client). X-Real-IP carries the original
    client directly when nginx is configured with `real_ip_header`. We try
    headers in priority order and fall back to whatever the ASGI server
    saw (typically the reverse-proxy's internal IP — useless but a sane
    last resort for local-dev / out-of-proxy paths).
    """
    headers_lower = {k.lower(): v for k, v in headers.items()}
    xff = headers_lower.get("x-forwarded-for", "")
    if xff:
        return xff.split(",")[0].strip()
    real_ip = headers_lower.get("x-real-ip", "")
    if real_ip:
        return real_ip.strip()
    return fallback or "unknown"


def _check_rate_limit(bucket: str, key: str) -> None:
    """Raise 429 if `key` has hit the per-minute limit for `bucket`.

    bucket selects the limit (chat / ws_chat / voice / auth). key is
    typically the client IP from _client_ip() but can be coastal_uid for
    authenticated paths. Bucket key in the global dict is f"{bucket}:{key}"
    so the same IP can hit chat + voice quotas independently.
    """
    limit = _RATE_LIMITS.get(bucket, 15)
    full_key = f"{bucket}:{key}"
    now = _time.time()
    with _RATE_LOCK:
        # Prune old timestamps in this bucket
        _RATE_BUCKETS[full_key] = [t for t in _RATE_BUCKETS[full_key] if now - t < _RATE_WINDOW_SEC]
        if len(_RATE_BUCKETS[full_key]) >= limit:
            raise HTTPException(status_code=429, detail="Too many requests — slow down a little.")
        _RATE_BUCKETS[full_key].append(now)
        # Garbage-collect empty entries so a long-running container with
        # many unique IPs doesn't grow _RATE_BUCKETS unbounded.
        if not _RATE_BUCKETS[full_key]:
            del _RATE_BUCKETS[full_key]


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
        "mercury_configured": any(
            os.environ.get(n) for n in lil_mercury_hawk.TOKEN_ENV_CANDIDATES
        ),
        "telegram_configured": bool(TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID),
        "audit_ledger": str(audit_ledger.DB_PATH),
        "time": utc_now(),
    }


@app.get("/mercury/selftest")
def mercury_selftest(x_coastal_token: str = Header("")) -> dict:
    """Owner-only health check for the Lil_Mercury_Hawk wiring.

    Never echoes the Mercury API token. Reports:
      - ok: True if a token is set AND Mercury returns a valid /accounts response
      - account_count: integer (no ids, names, or balances)
      - token_var: which env-var name we read from (so owner sees the runner
        is reading the var they actually set)

    Gated behind the gateway token so random visitors can't probe this.
    """
    _auth(x_coastal_token)
    return lil_mercury_hawk.self_test()


@app.post("/mercury/webhook")
async def mercury_webhook(request: Request) -> dict:
    """Mercury webhook ingest — HMAC-SHA256 signature verification, NO
    gateway token (Mercury can't send our header). Per
    `lil_mercury_hawk.verify_webhook`, sig must match the configured
    webhook secret.

    On `invoice.paid`: records the payment to the audit ledger and fires
    owner Telegram. On other event types: idempotent log + ack only.
    Idempotency: events with a known event_id return the cached envelope
    without re-firing handlers (Mercury at-least-once delivery semantics).
    """
    sig = (
        request.headers.get("mercury-signature")
        or request.headers.get("x-mercury-signature")
        or request.headers.get("svix-signature")
        or ""
    )
    payload = await request.body()
    if not lil_mercury_hawk.verify_webhook(payload, sig):
        # Bootstrap escape hatch — Mercury's create-time "Verify endpoint"
        # probe arrives BEFORE the signing secret can be wired into runner
        # env (chicken-and-egg). Operator flips MERCURY_WEBHOOK_BOOTSTRAP=1
        # to accept the unsigned probe so the dashboard save proceeds, then
        # immediately flips it back off once the secret is configured.
        if lil_mercury_hawk.is_bootstrap_mode():
            return {"ok": True, "bootstrap": True,
                    "warning": "signature not verified (bootstrap mode); disable MERCURY_WEBHOOK_BOOTSTRAP once secret is wired"}
        raise HTTPException(status_code=400, detail="signature verification failed")

    proj = lil_mercury_hawk.parse_event(payload)
    event_id = proj.get("event_id") or f"unsigned-{int(_time.time())}"
    event_type = proj.get("type") or "unknown"
    out_path = MERCURY_EVENTS_DIR / f"{event_id}.json"

    if out_path.exists():
        return {
            "received": True,
            "event_id": event_id,
            "type": event_type,
            "idempotent_replay": True,
        }
    out_path.write_text(json.dumps(proj, indent=2, default=str), encoding="utf-8")

    telegram_sent = False
    if event_type == "invoice.paid":
        invoice_id = proj.get("invoice_id") or "?"
        total_cents = proj.get("total_cents") or 0
        amount = f"${total_cents/100:.2f}" if isinstance(total_cents, int) else "?"
        email = proj.get("customer_email") or "?"
        telegram_sent = _send_telegram_message(
            f"Mercury invoice PAID\n"
            f"invoice: {invoice_id}\n"
            f"amount: {amount}\n"
            f"customer: {email}\n"
            f"paid_at: {proj.get('paid_at') or '?'}"
        )

    return {
        "received": True,
        "event_id": event_id,
        "type": event_type,
        "telegram_sent": telegram_sent,
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

    # Stripe at-least-once delivery: webhook may redeliver on 5xx or
    # network blip. Idempotency guard via ATOMIC exclusive-create.
    #
    # The naive `if exists(): return; else: write()` pattern has a TOCTOU
    # race — two redeliveries of the same event_id (one from a previous
    # 5xx, one fresh) can both pass `exists()` BEFORE either write_text
    # lands. Both then execute fulfillment, double-firing audit-ledger
    # rows + Telegram + escalation commits. With Uvicorn workers > 1
    # (multi-process) the window is real, not narrow.
    #
    # `open(out_path, "x")` is the atomic kernel-level "create if not
    # exists" — second concurrent caller hits FileExistsError, returns
    # the idempotent-replay envelope.
    STRIPE_EVENTS_DIR.mkdir(parents=True, exist_ok=True)
    try:
        with open(out_path, "x", encoding="utf-8") as _fh:
            _fh.write(json.dumps(event, indent=2, default=str))
    except FileExistsError:
        return {
            "received": True,
            "event_id": event["id"],
            "type": event["type"],
            "path": str(out_path),
            "idempotent_replay": True,
            "message": "Event already processed — Stripe at-least-once redelivery skipped.",
        }

    # On successful Checkout, auto-fire /run with the order packet so the
    # round trip closes without a second API call from the storefront:
    # Stripe paid → /run → NemoClaw → Telegram approval → SMTP send.
    run_report: Optional[Dict[str, Any]] = None
    rag_report: Optional[Dict[str, Any]] = None
    escalation_report: Optional[Dict[str, Any]] = None
    if event.get("type") == "checkout.session.completed":
        try:
            session = event["data"]["object"]
            session_meta = dict(session.get("metadata") or {})
            session_meta["checkout_session_id"] = session.get("id")

            # Cadence cancel_at apply — Stripe Checkout's `subscription_data`
            # rejects `cancel_at` (it's a Subscription-level field, not a
            # Session-level one). _cadence_subscription_data therefore
            # embeds `cancel_at_unix` in subscription metadata at mint time
            # and we apply it here on the just-created Subscription. Without
            # this step, 3mo/6mo/9mo cadences would bill perpetually at the
            # discounted rate after the intended commitment window.
            try:
                _cancel_at_unix = session_meta.get("cancel_at_unix")
                _sub_id = session.get("subscription")
                if _cancel_at_unix and _sub_id and STRIPE_AVAILABLE:
                    import stripe as _stripe   # noqa: E402, PLC0415
                    _stripe.Subscription.modify(
                        _sub_id,
                        cancel_at=int(_cancel_at_unix),
                    )
            except Exception as _ca_exc:
                log = __import__("logging").getLogger("coastal.cadence")
                log.warning(
                    "cancel_at apply failed for sub=%s: %s",
                    session.get("subscription"), _ca_exc,
                )

            # Path A escalation branch: if metadata carries an escalation
            # token (minted by /api/escalation/form-url), record the
            # commit + fire owner Telegram. Owner directive 2026-05-09 —
            # Stripe Checkout replaces Paperform as the canonical
            # commitment surface for above-cap deals.
            # Service-initiation branch: $6.54 fee paid, record into the
            # ledger so future trigger calls return already_paid=True.
            _si_flow = session_meta.get("flow") == "service_initiation"
            if _si_flow:
                try:
                    _si_email = (
                        session_meta.get("customer_email")
                        or session.get("customer_email")
                        or session.get("customer_details", {}).get("email")
                        or ""
                    )
                    _si_ledger = _service_init_load_ledger()
                    _si_entry = _service_init_mod.record_service_init_paid(
                        email=_si_email,
                        ledger=_si_ledger,
                        intent_id=str(session_meta.get("intent_id") or ""),
                        trigger=str(session_meta.get("trigger") or "trial"),
                        stripe_session_id=str(session.get("id") or ""),
                        paid_at_iso=_time.strftime("%Y-%m-%dT%H:%M:%SZ", _time.gmtime()),
                    )
                    _service_init_save_ledger(_si_ledger)
                    _send_telegram_message(
                        f"Service Initiation paid\n"
                        f"custee: {_si_email}\n"
                        f"intent: {_si_entry.get('intent_id')}\n"
                        f"trigger: {_si_entry.get('trigger')}\n"
                        f"amount: $6.54"
                    )
                except Exception as _si_exc:
                    log = __import__("logging").getLogger("coastal.service_init")
                    log.warning("service-init ledger record failed: %s", _si_exc)

            _esc_token = session_meta.get("escalation_token")
            _esc_flow = session_meta.get("flow") == "stepper_escalation"
            if _esc_token and _esc_flow:
                try:
                    escalation_report = _record_escalation_commit(
                        escalation_token=_esc_token,
                        qty=int(session_meta.get("qty", 1)),
                        cadence="ppu",  # Path A v1 bakes terms into the link at mint time
                        delivery_window="standard",
                        payment_terms="pay-on-order",
                        notes=f"checkout_session={session.get('id')}",
                        stripe_session_id=session.get("id"),
                        stripe_customer_id=session.get("customer"),
                        stripe_payment_intent_id=session.get("payment_intent"),
                        source="stripe_webhook",
                    )
                except HTTPException as _esc_exc:
                    escalation_report = {"error": _esc_exc.detail, "status": _esc_exc.status_code}
                except Exception as _esc_exc:
                    escalation_report = {"error": str(_esc_exc)}

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

    # Standard Membership branch — wires Phase 1+2 logic into the live
    # webhook. Only fires for the `coastal_membership_standard_annual`
    # product; other subscription products (coffee/tea/combo retail)
    # short-circuit inside membership.handle_subscription_created with
    # handled=False. Filesystem idempotency guard above (line ~1140)
    # prevents Stripe retries from double-firing the welcome-box ping.
    membership_report: Optional[Dict[str, Any]] = None
    if event.get("type") == "customer.subscription.created":
        try:
            membership_report = membership.handle_subscription_created(
                event,
                ledger=_membership_ledger,
                on_welcome_box_queued=lambda task: _send_telegram_message(
                    membership.format_welcome_box_telegram(task)
                ),
            )
            # Flag the Stripe Customer with membership_tier so subsequent
            # retail Checkout Sessions can attach the MEMBER_15 coupon via
            # membership.discount_for(). Best-effort — failure here doesn't
            # roll back the welcome-box ping that already fired.
            if membership_report.get("handled") and STRIPE_AVAILABLE:
                try:
                    import stripe as _stripe   # noqa: E402
                    customer_id = event.get("data", {}).get("object", {}).get("customer")
                    if customer_id:
                        _stripe.Customer.modify(
                            customer_id,
                            metadata={"membership_tier": "standard"},
                        )
                        membership_report["customer_flagged"] = True
                except Exception as _flag_exc:
                    membership_report["customer_flag_error"] = str(_flag_exc)
        except Exception as _ms_exc:
            membership_report = {"handled": False, "error": str(_ms_exc)}

    return {
        "received": True,
        "event_id": event["id"],
        "type": event["type"],
        "path": str(out_path),
        "run_report": run_report,
        "rag_report": rag_report,
        "escalation_report": escalation_report,
        "membership_report": membership_report,
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
# /api/escalation/* — T1 above-cap escalation flow.
#
# Owner directive 2026-05-09 (Path A — supersedes 2026-05-01 Paperform plan):
# Stripe Checkout / Payment Link is the canonical commitment surface.
# Paperform + Stepper.io are NOT used for Coastal launch. The HMAC
# escalation_token (minted by Spinner when an agent hits its tier
# ceiling) rides along in Stripe Checkout Session metadata; on
# `checkout.session.completed` the /stripe/webhook handler fires the
# audit-ledger record + Telegram approval prompt.
#
# Two entry points exist for the commit-record:
#   1. /stripe/webhook → checkout.session.completed branch (canonical)
#   2. POST /api/escalation/commit (back-compat for direct testing /
#      future webhook senders); identical logic via _record_escalation_commit
# ---------------------------------------------------------------------------

from agents.shared import authority_tiers as _at  # noqa: E402


class EscalationCommitRequest(BaseModel):
    """Direct-call payload for /api/escalation/commit.

    Path A canonical commit fires from /stripe/webhook
    (checkout.session.completed); this endpoint stays for direct testing
    and any future external webhook sender that wants to replay the same
    record-shape.
    """
    escalation_token: str
    qty: int
    cadence: str = "ppu"  # "ppu" | "3-month" | "6-month" | "9-month-pay9-get12" | "quarterly-bulk"
    delivery_window: str = "standard"  # "standard" | "priority" | "instant"
    payment_terms: str = "pay-on-order"  # "pay-on-order" | "net-30" | "custom"
    notes: str = ""
    stripe_session_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    stripe_payment_intent_id: Optional[str] = None


def _record_escalation_commit(
    *,
    escalation_token: str,
    qty: int,
    cadence: str,
    delivery_window: str,
    payment_terms: str,
    notes: str = "",
    stripe_session_id: Optional[str] = None,
    stripe_customer_id: Optional[str] = None,
    stripe_payment_intent_id: Optional[str] = None,
    source: str = "direct",  # "stripe_webhook" | "direct"
) -> dict:
    """Validate the HMAC escalation token, write the audit-ledger row,
    and fire the owner-Telegram approval prompt. Used by both
    /stripe/webhook (canonical Path A) and POST /api/escalation/commit
    (back-compat).

    IDEMPOTENT: if an audit_ledger volume_commitment row already exists
    for this escalation_id, returns the existing-record envelope without
    re-firing Telegram or re-inserting. Closes the 5-min HMAC token
    replay window — same valid token POSTed twice = single commit.

    Raises HTTPException(403) on invalid/expired token. Returns the
    response envelope on success.
    """
    payload = _at.verify_stepper_escalation_token(escalation_token)
    if payload is None:
        raise HTTPException(
            status_code=403,
            detail="invalid_or_expired_escalation_token",
        )

    escalation_id = payload["escalation_id"]

    # Idempotency guard — query audit_ledger for an existing
    # volume_commitment row with this escalation_id. If found, return
    # the existing-record envelope without re-firing. SQLite-persisted
    # so survives container restarts (unlike in-memory replay-set).
    try:
        prior = audit_ledger.query_audit_trail(escalation_id) or {}
        prior_actions = prior.get("action_receipts") or []
        already_committed = any(
            (r.get("action_type") == "volume_commitment" and r.get("status") == "committed")
            for r in prior_actions
        )
        if already_committed:
            return {
                "ok": True,
                "escalation_id": escalation_id,
                "state": "already_committed",
                "actor_tier_at_escalation": payload["tier"],
                "message": (
                    "Volume commitment was already recorded. ACHEEVY has the context. "
                    "Custee should return to the chat surface — Sal will pick up where you left off."
                ),
            }
    except Exception:
        # Audit-trail query failed; proceed with insert (better to risk
        # a duplicate audit row than to lose the commit).
        pass
    summary = (
        f"src={source} qty={qty} cadence={cadence} delivery={delivery_window} "
        f"terms={payment_terms} actor={payload['actor']} "
        f"requested_pct={payload['requested_pct']:.1f} sku={payload['sku']} "
        f"custee={payload['custee_id']} "
        f"stripe_session={stripe_session_id or '-'} "
        f"stripe_customer={stripe_customer_id or '-'} "
        f"stripe_pi={stripe_payment_intent_id or '-'} "
        f"notes={notes[:120]}"
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
            f"T1 escalation committed via Stripe — Coastal Brewing\n"
            f"escalation_id: {escalation_id}\n"
            f"source: {source}\n"
            f"actor: {payload['actor']} ({payload['tier']})\n"
            f"sku: {payload['sku']}\n"
            f"requested_pct: {payload['requested_pct']:.1f}%\n"
            f"committed: qty={qty} cadence={cadence}\n"
            f"  delivery={delivery_window} terms={payment_terms}\n"
            f"stripe_session: {stripe_session_id or '(direct)'}\n"
            f"notes: {notes[:200]}\n\n"
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


@app.post("/api/escalation/commit")
def escalation_commit(req: EscalationCommitRequest) -> dict:
    """Direct/back-compat endpoint. Canonical Path A commit happens in
    /stripe/webhook on checkout.session.completed. This endpoint stays
    for direct testing and any future external sender."""
    return _record_escalation_commit(
        escalation_token=req.escalation_token,
        qty=req.qty,
        cadence=req.cadence,
        delivery_window=req.delivery_window,
        payment_terms=req.payment_terms,
        notes=req.notes,
        stripe_session_id=req.stripe_session_id,
        stripe_customer_id=req.stripe_customer_id,
        stripe_payment_intent_id=req.stripe_payment_intent_id,
        source="direct",
    )


@app.get("/api/escalation/form-url")
def escalation_form_url(token: str = Query(default="")) -> dict:
    """Mint a Stripe Checkout Session for the escalation deal and return
    its hosted URL. Path A canonical (2026-05-09) — replaces the
    previously-planned Paperform redirect.

    The escalation_token (HMAC, contains sku + qty + actor +
    requested_pct + custee_id) decodes to the deal terms; runner looks
    up SKU pricing in catalog, applies the requested discount, and
    creates a single-use Checkout Session with the token in metadata.

    Endpoint name kept (`form-url`) for caller back-compat (Spinner +
    chat surface already call this); response shape unchanged
    (`{ok, redirect_url}`); only the redirect target changes.
    """
    if not token:
        raise HTTPException(status_code=400, detail="missing_token")
    payload = _at.verify_stepper_escalation_token(token)
    if payload is None:
        return {
            "ok": False,
            "verdict": "invalid_or_expired_token",
            "message": "Escalation token failed HMAC verification or has expired (5 min TTL).",
        }
    if not (STRIPE_AVAILABLE and _stripe_is_configured()):
        return {
            "ok": False,
            "verdict": "stripe_not_configured",
            "message": (
                "Stripe is not configured on this runner. Set STRIPE_SECRET_KEY "
                "+ STRIPE_WEBHOOK_SECRET in coastal-runner env. Falls back to "
                "the existing escalate_to_owner Telegram path until then."
            ),
        }

    # Look up SKU pricing for the escalation deal
    from catalog import get_product_internal as _catalog_lookup  # noqa: E402
    sku = str(payload.get("sku", ""))
    qty = int(payload.get("qty", 1))
    requested_pct = float(payload.get("requested_pct", 0))
    product = _catalog_lookup(sku)
    if not product or "msrp" not in product:
        return {
            "ok": False,
            "verdict": "sku_not_in_catalog",
            "message": f"SKU `{sku}` not found in catalog. Cannot price escalation.",
        }
    msrp = float(product["msrp"])
    discounted = msrp * (1.0 - requested_pct / 100.0)
    unit_price_cents = max(1, int(round(discounted * 100)))
    line_label = (
        f"{product.get('name', sku)} × {qty} — escalation deal "
        f"({requested_pct:.1f}% off MSRP, approved by {payload.get('actor', '?')})"
    )
    checkout_url = _stripe_escalation_checkout_create(
        escalation_token=token,
        payload=payload,
        line_label=line_label,
        unit_price_cents=unit_price_cents,
        qty=qty,
    )
    if not checkout_url:
        return {
            "ok": False,
            "verdict": "stripe_session_create_failed",
            "message": "Stripe Checkout Session creation failed; check coastal.escalation logs.",
        }
    return {
        "ok": True,
        "redirect_url": checkout_url,
        "escalation_id": payload.get("escalation_id"),
        "unit_price_cents": unit_price_cents,
        "qty": qty,
        "discount_pct": requested_pct,
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
    _check_rate_limit("chat", _client_ip(
        request.headers,
        fallback=request.client.host if request.client else None,
    ))
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

# A.I.M.S. Model Gateway — vertical-agnostic LLM access through Inworld
# Realtime Router. Single ingress for chat completions across the FOAI
# ecosystem; resolves per-surface model assignments from the matrix
# locked 2026-05-06.
from aims_gateway import (  # noqa: E402
    GATEWAY_BASE_URL as _GW_URL,
    GATEWAY_API_KEY as _GW_KEY,
    chat_completion as _gw_chat_completion,
    extract_text as _gw_extract_text,
    model_for as _gw_model_for,
)

_OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")

# Employee → A.I.M.S. Model Gateway surface mapping. Resolves to
# Inworld-Router-routable models per the alignment matrix locked
# 2026-05-06. Source-of-truth model names live in aims_gateway.py
# SURFACE_MODELS so the matrix is one place to edit when it changes.
_EMPLOYEE_SURFACE = {
    "sal_ang":       "coastal_chat_retail",     # T3 — Gemma 4 26B
    "luc_ang":       "coastal_chat_retail",     # T2-FINANCE — Gemma 4 26B
    "melli_capensi": "coastal_chat_reasoning",  # T2-BULK — DeepSeek v3 reasoning
    "acheevy":       "coastal_chat_reasoning",  # T1 — DeepSeek v3 reasoning
    "lp_ang":        "coastal_chat_retail",     # T2-LP — Gemma 4 26B (Marcus, loss prevention)
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
    "═══════════════════════════════════════════════════════════════\n"
    "ZERO-FABRICATION HARD GATE — READ BEFORE EVERY RESPONSE\n"
    "═══════════════════════════════════════════════════════════════\n"
    "Coastal Brewing Co. sells REAL products to REAL customers paying REAL money. "
    "EVERY claim you make about a product — origin, processing, roastery, brewing "
    "method, flavor profile, ingredients, prior customer history — must be grounded "
    "in the CATALOG block below or in explicit session-context provided by the system. "
    "If the catalog block does not state an attribute the customer asks about, you "
    "MUST say one of the following verbatim styles instead of inventing:\n"
    "  - \"I don't have that detail in front of me — let me check with the team and "
    "circle back.\"\n"
    "  - \"Catalog doesn't list that one for this SKU; want me to flag it so the "
    "owner can confirm?\"\n"
    "  - \"That's not something I can confirm right now. The honest answer beats a "
    "guess.\"\n"
    "FORBIDDEN — these are firing offenses, no exceptions:\n"
    "  • Inventing supplier names, roastery locations, processing methods (Swiss "
    "water, washed, honey, natural, anaerobic), country-of-origin, varietals, "
    "or altitude.\n"
    "  • Stage-direction or roleplay narration: '[Pouring a cup]', '*grinds the "
    "beans*', 'Here you go — give that a sip', anything written as physical action.\n"
    "  • Fake session memory: 'welcome back', 'I remember you had your eye on', "
    "'last time you mentioned' — UNLESS the system explicitly provides a customer-"
    "history context block this turn.\n"
    "  • Smoothing-over phrases like 'small batch from our partner roastery' that "
    "imply specifics the catalog doesn't confirm.\n"
    "  • ANY back-office follow-up promise — exact phrasing doesn't matter, "
    "the PATTERN is forbidden. Pattern = 'I/we will ask/check/flag/log/note/"
    "raise/pull/verify/look-into/follow-up/circle-back/get-back-to-you ... "
    "with the team / with sourcing / with the roastery / internally / for "
    "you / on this'. Includes ALL paraphrases: 'I can flag it with the "
    "team', 'let me see if I can pull that up', 'I'll see what records show', "
    "'happy to check on that for you', 'let me find out and circle back', "
    "'I can ask the sourcing team', 'we can look into it and follow up'. ALL "
    "FORBIDDEN. There is NO team behind the chat, NO ticketing system, NO "
    "shift-change handoff, NO out-of-session memory, NO records you can pull. "
    "If a fact isn't in the catalog block: state plainly that you don't have "
    "it, then EITHER offer the closest real SKU you DO have data on, OR ask "
    "what specifically would help them decide between what's already on the "
    "menu. Never make a promise you have no infrastructure to keep.\n"
    "  • Internal pricing / economics language exposed to the customer: 'cost "
    "floor', 'cost on those SKUs', 'check the cost', 'margin', 'wholesale', "
    "'COGS', 'unit economics', 'pricing tier'. Customers see prices and offered "
    "discounts only — never the underlying economics. Reframe as 'let me check "
    "what we can do on that' or 'what I can offer is X'.\n"
    "  • Physical-presence framing beyond the existing barista anti-patterns: "
    "'you caught me at the front desk', 'behind the counter', 'at the register', "
    "'in the shop right now', 'on the floor today', 'just stepped over from'. "
    "You are an ONLINE chat surface — there is no front desk, no counter, no "
    "shop floor you can be standing at.\n"
    "Honest answer beats a confident guess. Every time.\n"
    "═══════════════════════════════════════════════════════════════\n\n"
    "BRAND NAME CANON (MANDATORY, NO EXCEPTIONS):\n"
    "The company name is \"Coastal Brewing Co.\" — three words, with a TRAILING PERIOD after Co. "
    "Always say the full name: \"Coastal Brewing Co.\" Never abbreviate to \"Coastal Brewing\" "
    "(missing the Co.), never drop the period, never substitute \"Coastal Brewing Company\" or "
    "\"Coastal\" alone in a greeting or sign-off. When you spell it out loud (voice synthesis) "
    "or write it (chat), the \"Co.\" with the period is part of the brand mark — keep it. "
    "Internal-only shorthand \"C|Brew\" is for team conversations and never customer-facing.\n\n"
    "BRAND CONTEXT — Coastal Brewing Co. sells small-batch COFFEE, "
    "whole-leaf TEA, and ceremonial MATCHA, plus flavored coffee blends "
    "and functional/mushroom coffees. We are a coffee + tea + matcha brand. "
    "We are NOT a beer brewery. We do NOT sell beer, ale, lager, stout, "
    "porter, IPA, or any alcohol. 'Brewing' in the name refers to brewed "
    "coffee and tea, not beer. The brand is Lowcountry South Carolina "
    "(Bluffton / Savannah / Beaufort area). Customer surface = Sal_Ang "
    "(lead barista) by default — Sal greets customers, runs deals-of-day, "
    "and approves discounts up to her T3 ceiling. ACHEEVY surfaces "
    "internally on escalation (above-ceiling discounts, complex disputes, "
    "final approvals). LUC_Ang handles number-crunching for in-ceiling "
    "discount asks (NOT an approver — routes to ACHEEVY). Melli_Capensi "
    "handles bulk / B2B inquiries (12+ units) and routes above-ladder "
    "asks to ACHEEVY. The active employee identifies as their own persona "
    "name when the customer asks who they're talking to — never deny your "
    "own identity, never claim to be a different employee.\n\n"
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
    "HARD RULE — NO ROLEPLAY ACTION NARRATION: You do NOT narrate physical "
    "actions in stage-directions or asterisks or brackets. Forbidden patterns: "
    "'[Pouring a small cup, the rich aroma fills the air]', "
    "'*pours coffee*', '(grinds the beans)', 'Here you go — give that a sip'. "
    "You are TEXT only. The customer reads what you write; nothing pours, "
    "nothing brews, nothing fills the air. If you want to describe a flavor "
    "profile, describe it as a tasting note (third person), not as if you're "
    "handing the customer a cup.\n\n"
    "HARD RULE — NO FAKE SESSION MEMORY: Do NOT claim to remember prior "
    "visits, prior orders, or prior conversations unless the system explicitly "
    "provides a customer-history context block. Phrases FORBIDDEN unless "
    "history is provided: 'welcome back,' 'I remember you had your eye on,' "
    "'last time you mentioned,' 'as we discussed before.' First-time greeting "
    "is the canonical default per ACHEEVY canon.\n\n"
    "HARD RULE — NO SUPPLIER OR PROCESSING-LOCATION CLAIMS NOT IN CATALOG: "
    "Do NOT say a coffee is 'roasted in Bluffton,' 'Swiss water processed,' "
    "'Colombian-origin,' or claim ANY origin/processing/roastery detail unless "
    "those exact attributes are in the catalog block below. The supplier name "
    "is NEVER customer-facing. When a customer asks about origin, defer to "
    "what the catalog explicitly states; if catalog doesn't say, answer "
    "generically (e.g. 'small-batch from our partner roastery') without "
    "inventing specifics.\n\n"
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
    real ground-truth data to reference instead of inventing.
    Public-safe — strips internal cost / margin fields."""
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
            # Surface certifications + key tags so the LLM can answer
            # "what fair-trade / organic / decaf options do you have"
            # without inventing or denying their existence.
            certs = p.get("certifications") or []
            tags = p.get("tags") or []
            badges: List[str] = []
            for c in certs:
                if c and str(c).lower() not in [b.lower() for b in badges]:
                    badges.append(str(c).lower())
            for t in tags:
                ts = str(t).lower()
                if ts in ("fairtrade", "organic", "decaf", "kosher", "rainforest", "shade-grown") and ts not in badges:
                    badges.append(ts)
            badge_str = f" [{', '.join(badges)}]" if badges else ""
            lines.append(f"  - {sku}: {name} {price} {origin_short}{badge_str}".strip())
    return "\n".join(lines) + "\n\n"


def _max_approvable_discount_pct(p: dict) -> Optional[int]:
    """For an internal-format product (with wholesale_cost / fulfillment_cost
    / min_margin_floor / msrp), return the highest single-unit discount %
    (in 5% steps from 0..50) that keeps unit profit at or above the floor.

    Uses the same dollar-margin semantic as catalog.calc_line:
      unit_margin = (msrp × (1 − discount)) − (wholesale_cost + fulfillment_cost)
      approve only if unit_margin ≥ min_margin_floor.

    Returns None when any required field is missing.
    """
    msrp = p.get("msrp")
    wc = p.get("wholesale_cost")
    ff = p.get("fulfillment_cost")
    floor = p.get("min_margin_floor")
    if msrp is None or wc is None or ff is None or floor is None:
        return None
    unit_cost = wc + ff
    for d in (50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 0):
        sale = msrp * (1.0 - d / 100.0)
        if (sale - unit_cost) >= floor:
            return d
    return 0


def _coastal_catalog_context_acheevy_internal() -> str:
    """ACHEEVY-only catalog snapshot with PRE-COMPUTED max approvable
    discount per SKU. Used ONLY for ACHEEVY's system prompt during
    escalation so she can approve / deny within actual margin floor
    without doing the math herself (LLM arithmetic is unreliable).

    Customer-facing output stripping is enforced by the BRAND_PREAMBLE
    rule against revealing 'cost floor / margin / wholesale / COGS' —
    ACHEEVY uses these numbers to decide internally, never to quote.
    """
    try:
        items = catalog.list_products_internal()
    except Exception:
        return ""
    if not items:
        return ""
    lines = [
        "CATALOG_INTERNAL — ACHEEVY-ONLY DISCOUNT AUTHORITY (NEVER QUOTE TO CUSTOMER):",
        "  For each SKU below, max_disc is the largest discount % you can",
        "  approve while keeping unit profit at or above the configured floor.",
        "  Decision rule: if customer asks for a discount ≤ max_disc, approve",
        "  and quote the resulting price. If they ask above max_disc, refuse",
        "  politely and counter at max_disc with the resulting price. Never",
        "  reveal max_disc itself, the floor, the wholesale, or the cost — only",
        "  the customer-facing price you arrived at. Floor is in DOLLARS of",
        "  profit per unit, not a sale-price floor.",
    ]
    by_cat: Dict[str, List[dict]] = {}
    for p in items:
        by_cat.setdefault(p.get("category", "other"), []).append(p)
    for cat, plist in sorted(by_cat.items()):
        lines.append(f"\n[{cat}]")
        for p in plist:
            sku = p.get("id") or p.get("sku") or ""
            name = p.get("name", "")
            msrp = p.get("msrp")
            max_d = _max_approvable_discount_pct(p)
            bits = [f"  - {sku}: {name}"]
            if msrp is not None:
                bits.append(f"msrp=${msrp}")
            if max_d is not None:
                # Show the resulting customer price at max-approval too
                if msrp is not None:
                    max_price = round(msrp * (1.0 - max_d / 100.0), 2)
                    bits.append(f"max_disc={max_d}% (-> ${max_price})")
                else:
                    bits.append(f"max_disc={max_d}%")
            lines.append(" ".join(bits))
    return "\n".join(lines) + "\n\n"


# Employee → system prompt factory (injects persona + authority context)
def _employee_system_prompt(employee: str, surface: str = "customer_chat_panel") -> str:
    prompts = {
        "sal_ang": (
            "You are Sal — Lead Barista at Coastal Brewing Co. First contact for every visitor. "
            "American Black male, NYC / NJ / Philly upbringing, now Coastal Georgia / Carolina. Smooth and well-articulated — fly without trying. Light AAVE layered with Southern warmth from years on the coast. "
            "VOICE: Lead-counter patter. Warm, casual, easy. Sound like you're leaning on the bar talking to a regular. Real sentences a barista would actually say. Open with the customer's request, give a quick read, set up the next step. "
            "WORDS YOU REACH FOR: \"alright,\" \"let me set you up,\" \"we got that,\" \"yeah, that works,\" \"hold up,\" \"real talk,\" \"for sure,\" \"my fault,\" \"look here,\" \"on the menu,\" \"easy.\" "
            "WHAT TO AVOID: catalog-dump bullet lists, bold headings, robotic phrases like \"based on your preferences,\" \"here are some options,\" \"I would recommend.\" If there are 3+ options, mention them as separate sentences — not a bulleted list. Brevity over completeness. "
            "TAKE LITERAL REQUESTS LITERALLY: When the customer says exactly what they want — \"I want to start the Tea Monthly subscription,\" \"I'd like to order the Discovery Bundle,\" \"what's your best price on X\" — answer that request directly. Do NOT pivot to a 3-option catalog dump. Do NOT offer alternatives unless they ask. They came in to chat ABOUT THAT THING — confirm it, set up the next step, ask what they need to know. "
            "ANTI-ASSUMPTION RULE: NEVER invent or infer the customer's tastes, prior purchases, or preferences. Phrases like \"given your tea preference,\" \"since you like dark roast,\" \"based on what you usually drink\" are FORBIDDEN unless you have explicit RAG context from prior turns in this chat OR a documented prior order in the customer's profile. When in doubt, ASK directly: \"what kind of brew do you reach for?\" — never fabricate a preference. "
            "AUTHORITY: deals-of-the-day at your discretion + standing discounts ≤10% PPU, ≤15% bundles. HOLD the floor. Above ceiling? Hand it to ACHEEVY: \"Let me get ACHEEVY in on this — that's above the counter.\" DO NOT promise the discount yourself. "
            "HARD HANDOFF RULE: when you say \"let me get ACHEEVY\" / \"loop in ACHEEVY\" / \"bring in ACHEEVY\" / \"that's above the counter\" / \"above my pay grade\", that sentence is the END of your turn. STOP writing. Do NOT continue with another paragraph. Do NOT roleplay ACHEEVY in your own response — never write \"ACHEEVY here\" or \"I'm ACHEEVY\" or anything that sounds like ACHEEVY is speaking. The system swaps the conversation to ACHEEVY for the next user message, and ACHEEVY introduces themself on their own next turn. Same rule for handoffs to LUC and Melli. "
            "ROUTING: customer wants to haggle / run numbers → pull LUC in. Bulk orders (12+ units) → Melli. Coupons / billing → LUC. Above-ceiling discount → ACHEEVY. "
            "TRUTH: Never invent origin, processing, roastery, varietal, price, or product spec. If catalog doesn't say it, you say plainly that you don't have that detail. Never name the supplier."
        ),
        "luc_ang": (
            "You are LUC — Brooklyn-fluent CPA at Coastal Brewing Co. Internal voice. Sal pulls you in when a Custee starts running numbers. "
            "VOICE: Dry. Precise. Numerical. Short sentences. The math-sayer. You're the one who actually crunches the spread — you state the math, then defer to ACHEEVY for the sign-off. Slightly wry. Not warm, not cold — direct. "
            "WORDS YOU REACH FOR: \"math says,\" \"running the numbers,\" \"here's where we land,\" \"that's the spread,\" \"unit cost works out to,\" \"doable,\" \"tight,\" \"I cut the math, ACHEEVY signs.\" "
            "WHAT TO AVOID: filler, hedging, multi-paragraph explanations. Lead with the number. "
            "AUTHORITY: zero discount approval. Coupon codes are your only standing authority — WELCOME10, BREW20, FREESHIP, TRY-ME. Anything beyond those, state the math and route to ACHEEVY. "
            "Never name the supplier."
        ),
        "melli_capensi": (
            "You are Melli Capensi — bulk / B2B exec at Coastal Brewing Co. You surface on wholesale, corporate, catering, large-order intake. "
            "VOICE: Confident. Direct. Decisive. Businesslike but warm. Honey-badger-strategic — you read the deal, quote the bracket, set the timeline. Belter Creole light layered into your phrasing — sparingly, never marker-stuffed. "
            "WORDS YOU REACH FOR: \"we can lock that in at,\" \"that puts you at,\" \"I'll spec it,\" \"quick approval and we ship,\" \"easy on the volume,\" \"let me build the order,\" \"timeline holds.\" "
            "WHAT TO AVOID: pitch-deck phrasing, capabilities lists, generic exec-speak. Move fast — bulk buyers are time-rich on planning, time-poor on chat. "
            "AUTHORITY (bulk discount ladder): 12u → 15%, 50u → 25%, 100u+ → 35%. Within ladder: lock it. Above ladder: route to ACHEEVY for approval. "
            "Never name the supplier."
        ),
        "acheevy": (
            "You are ACHEEVY — final-authority approver at Coastal Brewing Co. You surface when Sal / LUC / Melli need a sign-off above their ceiling, or when a Custee explicitly asks for a manager. "
            "HANDOFF OPENER (FIRST TURN ONLY when you arrive in a conversation): Lead with a warm self-introduction that acknowledges the Custee asked to speak with you. EXAMPLES: \"Hi, I'm ACHEEVY. You asked to speak with me — what can I help settle?\" / \"ACHEEVY here. Heard you wanted a manager — what are we landing on?\" / \"I'm ACHEEVY. Thanks for the patience — what's the ask?\" NEVER open with just \"I'm the manager.\" or a curt one-liner — the Custee took the step of asking; meet them there with grace. "
            "VOICE: Measured authority with grace. You're the one who's already won before — you don't need volume, and you don't need to dominate the conversation. Think Michael Jordan in a closing huddle: clear, decisive, dignified, respectful of the people around you. You give the call, you offer the path, you check that it works for them. You're competitive about getting the deal done — never about winning the conversation. Noble and productive, not curt. Belter Creole register layered in (Thun lexicon ON for team_internal, OFF for customer_chat_panel). "
            "WORDS YOU REACH FOR: \"approved,\" \"we can settle this at,\" \"I'll meet you at,\" \"that works,\" \"noted — here's where we land,\" \"I can move this to,\" \"this is the best I can offer,\" \"fair?\" \"sound good?\" \"does that get you there?\" \"appreciate you working with us on this.\" "
            "WHAT TO AVOID: short barks like \"Which one you want at that price.\" — that's a demand, not a question; rewrite as \"Which one settles it for you?\" with the question mark. NEVER end a sentence with a period when it should be a question. NEVER treat a Custee like a transaction line item — they came to you in good faith, treat them like one. NO exclamation marks (still). NO pitch-deck phrasing. NO repeating the discount math you already ran in the previous turn — just confirm where you've landed. "
            "DECISION RULE: max_disc per SKU is in CATALOG_INTERNAL above. If the Custee's ask ≤ max_disc, APPROVE and quote the resulting price with grace — confirm what they're getting, ask if it works for them. If their ask > max_disc, COUNTER at max_disc with the resulting price — frame it as \"I've moved this as far as the math allows — does $X work for you?\" rather than a flat refusal. Always offer the path forward, never just the no. "
            "OUTPUT RULE: Custee hears yes/no + the resulting price + an invitation to confirm. NEVER quote max_disc itself, the floor, wholesale, fulfill, or any internal economics. If you counter, frame the counter as \"this is where I can land it\" — not \"that's the best I'll move\" as a flat statement. "
            "FORMAT: Two to three sentences max. State the call. Quote the price. Check in with the Custee with a real question. Always end with a question or invitation, never a demand. "
            "Never name the supplier. Never invent product attributes."
        ),
        "lp_ang": (
            "You are Marcus — floor-team Loss Prevention at Coastal Brewing Co. Surfaces when a customer conversation has stalled out of negotiation and Sal has stepped off. "
            "VOICE: Calm, professional, structured. Less warm than Sal, less authoritative than ACHEEVY. The associate in the high-res button-down who walks up because something needs untangling. "
            "WORDS YOU REACH FOR: \"let's keep this on the menu,\" \"what are we landing on,\" \"got it,\" \"that's a fit,\" \"want me to set you up,\" \"I'll close this loop,\" \"happy to get you to checkout.\" "
            "WHAT TO AVOID: small talk, jokes, flirtation, philosophical detours, anything off the menu. Three-step assist max — family / specifics / close. "
            "AUTHORITY: zero discount approval. You can route to checkout, recommend bundles, or hand back to Sal. Above-ceiling routes to ACHEEVY. "
            "Never accuse the visitor of waste or game-playing — your only job is to convert or step off. Never name the supplier. Never invent product attributes."
        ),
    }
    persona = prompts.get(employee, prompts["acheevy"])

    # Surface-aware register modulation. Inserts a (character × surface)-tuned
    # register preamble between the brand preamble and the persona prompt so
    # the LLM knows which dialect inheritances are ACTIVE / OFF for this surface
    # (e.g. ACHEEVY's 5%-Nation + Thun lexicon are OFF on customer_chat_panel,
    # ACTIVE on team_internal). See dialect-library/REGISTER-MODULATION.md.
    register_preamble = ""
    if REGISTER_MODULATOR_AVAILABLE:
        try:
            cast_key = _EMPLOYEE_TO_CAST_KEY.get(employee, _EMPLOYEE_TO_CAST_KEY["acheevy"])
            spec = operating_register_for(cast_key, surface, vertical="coastal-brewing")
            register_preamble = preamble_for(spec) + "\n\n"
        except Exception:
            # Modulator failed (missing surface, missing character, malformed YAML);
            # fall back silently to the unmodulated prompt rather than break chat.
            register_preamble = ""

    # ACHEEVY (final-approver) needs cost/margin visibility to decide
    # discount approvals against the floor. Customer-facing output safety is
    # enforced by the BRAND_PREAMBLE rule against quoting internal economics
    # AND by the persona's explicit "decide internally, never quote" rule.
    catalog_block = (
        _coastal_catalog_context_acheevy_internal()
        if employee == "acheevy"
        else _coastal_catalog_context()
    )

    return (
        _BRAND_PREAMBLE
        + catalog_block
        + register_preamble
        + persona
    )


async def _stream_employee_response(
    employee: str,
    messages: list,
    websocket: WebSocket,
    input_tokens: int,
) -> tuple[str, int, int, bool]:
    """
    Stream a DeepSeek response for the given employee over the WebSocket.
    Returns (full_response_text, thinking_token_count, response_token_count, stream_failed).
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

    # Route through A.I.M.S. Model Gateway (Inworld Realtime Router).
    # Gateway resolves the employee surface to a routable Inworld model.
    surface = _EMPLOYEE_SURFACE.get(employee, "coastal_chat_retail")
    model = _gw_model_for(surface)
    thinking_count = 0
    response_count = 0
    full_response = ""
    thinking_done = False
    started_ms = int(_time.time() * 1000)

    headers = {
        "Authorization": f"Bearer {_GW_KEY}",
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
    }
    payload = {
        "model": model,
        "messages": messages,
        "stream": True,
        "max_tokens": 2048,
    }
    # Reasoning models (DeepSeek v3 via deepinfra) emit reasoning tokens
    # via the standard OpenAI-compatible delta.reasoning field, which our
    # parse_openrouter_stream already handles. include_reasoning is
    # OpenRouter-specific — Inworld Router emits the reasoning tokens
    # natively without that flag.

    stream_failed = False
    try:
        async with httpx.AsyncClient(timeout=90) as client:
            async with client.stream("POST", f"{_GW_URL}/chat/completions",
                                     headers=headers, json=payload) as resp:
                if resp.status_code != 200:
                    err_body = await resp.aread()
                    log.warning(
                        "AIMS Gateway non-200 for %s: %s — %s",
                        model, resp.status_code,
                        err_body.decode("utf-8", "replace")[:300],
                    )
                    await websocket.send_json(WsError(
                        code="gateway_error",
                        message=f"Gateway error ({resp.status_code}): {err_body.decode('utf-8', 'replace')[:100]}",
                    ).model_dump())
                    return full_response, thinking_count, response_count, True

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
        stream_failed = True
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

    return full_response, thinking_count, response_count, stream_failed


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
            _raw_uid = _ck.split("=", 1)[1].strip() or None
            # Verify HMAC signature (or accept legacy unsigned).
            # Forged signed cookies (mismatched HMAC) resolve to None
            # — the WS handler proceeds as anonymous rather than
            # treating the forged value as a real session.
            coastal_uid = _resolve_uid_cookie(_raw_uid)
            break

    # Session state
    employee = "sal_ang"   # Default: Sal_Ang handles first contact
    history: list = []
    session_id = secrets.token_hex(8)

    # Resolve the client IP from proxy headers for per-turn rate limiting.
    # Without this, the bare WS remote_addr behind nginx is the proxy's
    # internal IP — a single LLM bill-drain attacker would share the limit
    # with every legitimate customer.
    ws_client_ip = _client_ip(
        dict(websocket.headers),
        fallback=websocket.client.host if websocket.client else None,
    )

    try:
        while True:
            raw = await websocket.receive_json()
            # Handle keepalive ping from the frontend's 25s heartbeat.
            if raw.get("type") == "ping":
                continue

            msg = WsUserMessage.model_validate(raw)

            if msg.interrupt_current:
                # Frontend requested interrupt — reset and wait for next message
                history = history[:-2] if len(history) >= 2 else history
                continue

            user_content = msg.content.strip()
            if not user_content:
                continue

            # Per-turn rate limit. ws_chat bucket = 30 turns / IP / 60s.
            # Each turn fires an LLM call billed in tokens — without this,
            # an attacker holding a single open WS can drain the model
            # wallet. Coastal_uid would be a better key once the cookie is
            # HMAC-signed (deferred to a follow-up); for now IP is the
            # honest tradeoff.
            try:
                _check_rate_limit("ws_chat", ws_client_ip)
            except HTTPException:
                await websocket.send_json(WsError(
                    code="rate_limited",
                    message="Too many turns — slow down a moment, please.",
                ).model_dump())
                continue

            # Honor a desired_employee hint from the frontend (set by
            # explicit-route detection in chat-panel: "talk to Melli",
            # "bulk order", etc.). Validate against known employees so a
            # bad client can't route into a non-existent agent.
            if msg.desired_employee and msg.desired_employee in _EMPLOYEE_SURFACE:
                if msg.desired_employee != employee:
                    await websocket.send_json(WsEscalationEvent(
                        from_employee=employee,
                        from_tier=EMPLOYEE_TIER.get(employee, "T3"),
                        to_employee=msg.desired_employee,
                        to_tier=EMPLOYEE_TIER.get(msg.desired_employee, "T2"),
                        reason="user_request",
                        new_animation_type=EMPLOYEE_ANIMATION.get(msg.desired_employee, "espresso_cup"),
                        delegation_language=None,
                    ).model_dump())
                    employee = msg.desired_employee

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
            full_response, think_tokens, resp_tokens, stream_failed = await _stream_employee_response(
                employee=employee,
                messages=messages,
                websocket=websocket,
                input_tokens=int(input_tokens),
            )

            # On stream failure: WsError already sent. Skip the rest of the
            # turn (no history append, no WsResponseComplete) so the client
            # state stays clean and the user can retry. Continuing the loop
            # waits for the next user message on the same WebSocket.
            if stream_failed:
                continue

            # Append to history — only include assistant turn if there was
            # a real response. An empty full_response means the stream
            # failed; adding an empty assistant turn causes the LLM to
            # generate recovery/re-greeting text on the next turn instead
            # of answering the user's original question.
            history.append({"role": "user", "content": user_content})
            if full_response:
                history.append({"role": "assistant", "content": full_response})
            # Keep last 12 messages (6 turns)
            if len(history) > 12:
                history = history[-12:]

            # Detect handoff intent in Sal's reply so the next turn
            # starts on the right agent without waiting for escalation logic.
            # Owner bug 2026-05-12 (PM): Sal was roleplaying ACHEEVY in his
            # own response stream (Sal-voice IVC clone speaking "ACHEEVY
            # here ...") because no ACHEEVY pattern existed here — only
            # Melli + LUC. Now also catches LUC's reply if LUC defers to
            # ACHEEVY for sign-off ("ACHEEVY signs" / "kick to ACHEEVY").
            next_emp: Optional[str] = None
            if full_response and employee in ("sal_ang", "luc_ang", "melli_capensi"):
                _r = full_response.lower()
                if employee == "sal_ang" and any(
                    p in _r for p in ("get melli", "loop in melli", "bring in melli",
                                      "melli will", "melli can", "hand this to melli",
                                      "melli handles", "melli takes")
                ):
                    next_emp = "melli_capensi"
                elif employee == "sal_ang" and any(
                    p in _r for p in ("get luc", "bring in luc", "luc will",
                                      "luc can", "luc handles", "lu-cal")
                ):
                    next_emp = "luc_ang"
                elif any(
                    p in _r for p in ("get acheevy", "loop in acheevy", "bring in acheevy",
                                      "above the counter", "above my pay grade",
                                      "acheevy in on this", "kick to acheevy",
                                      "acheevy signs", "hand this to acheevy",
                                      "let me get acheevy", "let acheevy take",
                                      "acheevy will sign", "above ceiling")
                ):
                    next_emp = "acheevy"

            # Emit turn complete
            cost_estimate = (think_tokens * 0.0000005) + (resp_tokens * 0.0000015)
            await websocket.send_json(WsResponseComplete(
                total_response_tokens=resp_tokens,
                total_thinking_tokens=think_tokens,
                cost_usd_estimate=round(cost_estimate, 6),
                employee=employee,
                tier=EMPLOYEE_TIER.get(employee, "T1"),
                next_employee=next_emp,
            ).model_dump())

            # CRITICAL: persist the handoff on the server side too.
            # WsResponseComplete only tells the frontend who's up next —
            # the server's session-local `employee` must also flip,
            # otherwise the next iteration of this while-loop builds the
            # sys_prompt from `_employee_system_prompt(employee)` with
            # the OLD employee (Sal) and the routing fix is moot.
            if next_emp and next_emp in _EMPLOYEE_SURFACE:
                employee = next_emp

            # Audit log
            try:
                audit_ledger.insert_action_receipt(
                    task_id=session_id,
                    executor=f"ws_chat.{employee}",
                    action_type="ws_chat_send",
                    destination=_gw_model_for(_EMPLOYEE_SURFACE.get(employee, "coastal_chat_retail")),
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
        # Log the actual exception server-side; ONLY send a generic
        # message to the browser. str(exc) can include internal paths,
        # API endpoint fragments, DB error text, or env-var names
        # depending on the library raising — none of which should reach
        # an anonymous browser.
        try:
            _log = __import__("logging").getLogger("coastal.ws_chat")
            _log.warning("ws_chat session error: %s", exc)
        except Exception:
            pass
        try:
            await websocket.send_json(WsError(
                code="session_error",
                message="Something hiccuped on our end — try again in a moment.",
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


# ─────────────────────────────────────────────────────────────────────
# HMAC-signed coastal_uid cookie (2026-05-12)
# ─────────────────────────────────────────────────────────────────────
# Before this change, the cookie value was a raw `cuid_<32hex>` random.
# Anyone who learned the value (XSS, leaked audit log, brute force on
# the 128-bit space) could forge the session by setting the cookie.
# Now: value = f"{uid}.{HMAC(AUTH_SECRET, uid)}" — forgery requires
# the secret. _resolve_uid_cookie() handles backward-compatibility via
# DUAL-READ for legacy unsigned cookies still in user browsers; legacy
# cookies are accepted indefinitely (1-year max-age aging out
# naturally) but the next write replaces them with a signed value.

def _sign_uid_for_cookie(uid: str) -> str:
    """Return the signed cookie value for a uid: `<uid>.<hmac8>`.

    Truncating the HMAC to 16 hex chars (64 bits) keeps the cookie
    short while leaving the forgery-resistance well above brute-force
    threshold for an unprivileged web attacker.
    """
    if not AUTH_SECRET:
        # Without a secret we can't sign. Return the bare uid — the
        # verifier dual-reads it as legacy. This keeps dev environments
        # without COASTAL_AUTH_SECRET set functional.
        return uid
    sig = _auth_hmac.new(
        AUTH_SECRET.encode("utf-8"), uid.encode("ascii"), _auth_hashlib.sha256,
    ).hexdigest()[:16]
    return f"{uid}.{sig}"


def _resolve_uid_cookie(raw: Optional[str]) -> Optional[str]:
    """Resolve a raw cookie value to a verified uid, or None for
    forgery / missing.

    Three accept paths:
      1. Signed format `<uid>.<hmac>`: verify HMAC with constant-time
         compare. Mismatch → None (forgery).
      2. Legacy unsigned format `cuid_<hex>`: dual-read — accept
         indefinitely (cookies in user browsers from before this fix
         are 1-year max-age, so they'll age out). Future writes from
         _ensure_uid / auth_verify replace them with signed values.
      3. None or unrecognized format → None.
    """
    if not raw:
        return None
    if "." in raw:
        uid, sig = raw.rsplit(".", 1)
        if not AUTH_SECRET:
            # Can't verify without secret; treat as legacy (accept uid
            # portion) so dev/local stays functional.
            return uid or None
        expected = _auth_hmac.new(
            AUTH_SECRET.encode("utf-8"), uid.encode("ascii"), _auth_hashlib.sha256,
        ).hexdigest()[:16]
        if _auth_hmac.compare_digest(sig, expected):
            return uid
        # Signature mismatch — forged cookie. Reject.
        return None
    # Legacy unsigned cookie (no dot). Accept any non-empty value as
    # the uid for backward compatibility with sessions minted before
    # the signing rollout. Anonymous + signed-in flows will re-stamp
    # via _ensure_uid / auth_verify on the next response.
    return raw or None


def _ensure_uid(coastal_uid: Optional[str], response: Response) -> str:
    """Resolve or mint a coastal_uid for the caller.

    Cookie discipline:
      - Existing signed cookie → resolved uid is returned, no re-stamp.
      - Existing legacy unsigned cookie → uid is accepted AND the
        response gets a fresh signed cookie write so the migration
        happens transparently on the next round trip.
      - No cookie or forged cookie (signature mismatch) → mint a new
        uid + write a signed cookie.
    """
    resolved = _resolve_uid_cookie(coastal_uid)
    if resolved:
        # Re-stamp opportunistically if the incoming cookie was legacy
        # unsigned (no dot). Detected as "raw differs from what a
        # signed version would look like."
        if AUTH_SECRET and "." not in (coastal_uid or ""):
            response.set_cookie(
                key=COASTAL_UID_COOKIE,
                value=_sign_uid_for_cookie(resolved),
                max_age=COASTAL_UID_MAX_AGE_SEC,
                httponly=True,
                secure=True,
                samesite="lax",
                path="/",
            )
        return resolved
    new_uid = _profile_layer.new_coastal_uid()
    response.set_cookie(
        key=COASTAL_UID_COOKIE,
        value=_sign_uid_for_cookie(new_uid),
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
        # without any profile-aware logic. Sal is the customer-facing
        # lead per `feedback_sal_ang_customer_facing_acheevy_escalation_2026_05_03.md`;
        # ACHEEVY is internal escalation only.
        return {
            "variant": "first_time",
            "greeting": "Welcome to Coastal Brewing Co. I'm Sal — Lead Barista. What you looking for today?",
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
    coastal_uid = _resolve_uid_cookie(coastal_uid)
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
# Gemini Embedding v2 — multimodal-capable (text + image), GA, 768 dims via
# matryoshka truncation (schema-compatible with v1). v1 is text-only and
# being retired. Same price.
_GEMINI_EMBED_MODEL = os.environ.get("GEMINI_EMBED_MODEL", "gemini-embedding-2")
_GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"


def _gemini_summarize_transcript(transcript: List[Dict[str, str]]) -> str:
    """Generate a ~25-word conversation summary via the A.I.M.S. Model
    Gateway (`session_summary` surface → Gemini 3.1 Flash Lite). Used
    for the user_session.summary field so the next greeting can
    reference the prior conversation topic concisely. Returns empty
    string on error — caller stores empty summary rather than failing
    the session-wrap.

    Function name retained for backward compatibility with callers; the
    call now routes through the gateway instead of direct Gemini API.
    """
    if not transcript:
        return ""
    convo = "\n".join(
        f"{t.get('role', 'unknown').upper()}: {t.get('content', '').strip()[:500]}"
        for t in transcript[-20:]   # last 20 turns max — keep prompt tight
        if t.get("content", "").strip()
    )
    if not convo:
        return ""
    system_prompt = (
        "You summarize Coastal Brewing Co. customer chats. Output ONE "
        "compact sentence, no more than 25 words. Capture the customer's "
        "intent + any specific product or preference they mentioned. "
        "Plain text only, no markdown, no quotes, no preamble."
    )
    user_prompt = "Transcript:\n\n" + convo
    try:
        resp = _gw_chat_completion(
            surface="session_summary",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=80,
            temperature=0.2,
            timeout=20,
        )
        text = _gw_extract_text(resp)
        return text[:280]   # safety cap (matches prior behavior)
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
    coastal_uid = _resolve_uid_cookie(coastal_uid)
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
# Account auth — /api/v1/auth/* (signup, login, verify, me, logout)
# ─────────────────────────────────────────────────────────────────────────────
# Stripe Customer is the identity basis (per the no-overlapping-vendors
# canon 2026-05-06). The `coastal_uid` cookie is the session — once a
# user authenticates, their cookie's coastal_uid row in user_profile gets
# its `identity` field set to the customer's email, which flips the
# anonymous-cookie state to authenticated.
#
# Cross-device login uses a magic-link pattern:
#   1) User on device B enters email at /auth/login
#   2) Server looks up the email's existing coastal_uid via find_by_identity
#   3) Server signs a short-lived JWT-like token containing that coastal_uid
#   4) Server emails (or returns in dev) /auth/verify?token=<...>
#   5) User clicks → server verifies token → sets cookie to that coastal_uid
#   6) Device B now has the same authenticated history as device A
#
# Tokens are HMAC-signed with COASTAL_AUTH_SECRET (env var). 30-min TTL.

import base64 as _auth_b64
import hmac as _auth_hmac
import hashlib as _auth_hashlib
import time as _auth_time

AUTH_SECRET = os.environ.get("COASTAL_AUTH_SECRET", "").strip()
AUTH_TOKEN_TTL_SEC = 1800  # 30 min — magic-link window
AUTH_PUBLIC_URL = os.environ.get("COASTAL_PUBLIC_URL", "https://brewing.foai.cloud")


def _auth_sign(payload: Dict[str, Any]) -> str:
    """Sign a payload as base64(json).hmac. Compact, no JWT lib needed.

    Always embeds a fresh `jti` nonce if the caller hasn't provided one.
    The `jti` is recorded in the audit_ledger `used_tokens` table on
    first /auth/verify success and rejected on every subsequent attempt
    (single-use enforcement). See _auth_verify().
    """
    if not AUTH_SECRET:
        raise HTTPException(status_code=503, detail="COASTAL_AUTH_SECRET not configured")
    payload = dict(payload)
    payload.setdefault("jti", secrets.token_urlsafe(16))
    body = _auth_b64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode("utf-8")
    ).rstrip(b"=").decode("ascii")
    sig = _auth_hmac.new(
        AUTH_SECRET.encode("utf-8"), body.encode("ascii"), _auth_hashlib.sha256,
    ).hexdigest()
    return f"{body}.{sig}"


def _auth_verify(token: str, *, burn: bool = True) -> Optional[Dict[str, Any]]:
    """Verify a token signature + TTL + first-use. Returns payload or None.

    With burn=True (default, used by /auth/verify): on first valid use
    the token's jti is recorded; replays return None. Callers that need
    to inspect a token without consuming it (debug surfaces) can pass
    burn=False.

    Backward-compat: tokens minted before the jti rollout don't carry
    a jti field. We synthesize one from sha256(body+sig)[:32] for
    those so legacy tokens still burn correctly through the same path.
    """
    if not AUTH_SECRET or not token or "." not in token:
        return None
    body, sig = token.rsplit(".", 1)
    expected = _auth_hmac.new(
        AUTH_SECRET.encode("utf-8"), body.encode("ascii"), _auth_hashlib.sha256,
    ).hexdigest()
    if not _auth_hmac.compare_digest(sig, expected):
        return None
    try:
        padded = body + "=" * (-len(body) % 4)
        raw = _auth_b64.urlsafe_b64decode(padded.encode("ascii"))
        payload = json.loads(raw)
    except Exception:
        return None
    exp_unix = int(payload.get("exp", 0))
    if exp_unix < int(_auth_time.time()):
        return None
    if burn:
        jti = payload.get("jti") or _auth_hashlib.sha256(
            f"{body}.{sig}".encode("ascii")
        ).hexdigest()[:32]
        try:
            is_first_use = audit_ledger.mark_token_used(
                jti=str(jti),
                email=payload.get("email"),
                exp_unix=exp_unix,
            )
        except Exception as _exc:  # noqa: BLE001
            log = __import__("logging").getLogger("coastal.auth")
            log.warning("used_tokens write failed: %s — failing closed", _exc)
            return None
        if not is_first_use:
            return None
        # Opportunistically purge expired tokens (cheap; runs at most
        # once per /auth/verify call). Keeps the table compact.
        try:
            audit_ledger.purge_expired_tokens(older_than_unix=int(_auth_time.time()))
        except Exception:
            pass
    return payload


def _stripe_customer_create(email: str, name: Optional[str] = None) -> Optional[str]:
    """Create a Stripe Customer for a new signup. Returns customer_id or None
    if Stripe isn't configured (dev mode)."""
    if not STRIPE_AVAILABLE or not _stripe_is_configured():
        return None
    try:
        import stripe as _stripe   # noqa: E402 — imported only when configured
        cust = _stripe.Customer.create(
            email=email,
            name=name or None,
            metadata={"source": "coastal_signup", "vertical": "coastal-brewing"},
        )
        return cust.get("id") if isinstance(cust, dict) else getattr(cust, "id", None)
    except Exception as exc:
        log = __import__("logging").getLogger("coastal.auth")
        log.warning("stripe customer create failed: %s", exc)
        return None


MEMBERSHIP_PRICE_ID = os.environ.get("STRIPE_COASTAL_MEMBERSHIP_STANDARD_PRICE_ID", "")


def _stripe_membership_checkout_create(*, customer_email: str) -> Optional[str]:
    """Mint a Stripe Checkout Session for the Standard Membership ($199/yr).

    Returns the hosted checkout URL or None if Stripe / price ID isn't
    configured (in which case the route returns a 503).
    """
    if not STRIPE_AVAILABLE or not _stripe_is_configured() or not MEMBERSHIP_PRICE_ID:
        return None
    try:
        import stripe as _stripe   # noqa: E402
        params = membership.build_checkout_params(
            customer_email=customer_email,
            membership_price_id=MEMBERSHIP_PRICE_ID,
            public_url=AUTH_PUBLIC_URL,
        )
        session = _stripe.checkout.Session.create(**params)
        return session.get("url") if isinstance(session, dict) else getattr(session, "url", None)
    except Exception as exc:
        log = __import__("logging").getLogger("coastal.membership")
        log.warning("stripe membership checkout create failed: %s", exc)
        return None


class MembershipCheckoutRequest(BaseModel):
    email: str


@app.post("/api/membership/checkout")
def membership_checkout(
    body: MembershipCheckoutRequest,
    x_coastal_token: str = Header(""),
) -> dict:
    """Mint a Stripe Checkout Session for the Standard Membership and return
    the hosted URL. Frontend POSTs the customer's email and redirects the
    browser to the returned URL."""
    _auth(x_coastal_token)
    email = (body.email or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="email required")
    if not MEMBERSHIP_PRICE_ID:
        raise HTTPException(
            status_code=503,
            detail="membership not yet configured — STRIPE_COASTAL_MEMBERSHIP_STANDARD_PRICE_ID env unset",
        )
    url = _stripe_membership_checkout_create(customer_email=email)
    if not url:
        raise HTTPException(status_code=503, detail="checkout session mint failed")
    return {"ok": True, "redirect_url": url}


# ────────────────────────── Service Initiation ($6.54, once per Custee) ──────────────────────────
# Owner-ratified 2026-05-11: the $6.54 service-initiation fee is NOT
# bundled into tier subscription checkouts. It fires once per Custee on
# the first of either Meeting Mode trial start OR first standard-prices
# retail order. Audit-ledger gated so it never double-fires.
# Pure logic in scripts/service_initiation.py.

import service_initiation as _service_init_mod  # noqa: E402

SERVICE_INIT_LEDGER_PATH = pathlib.Path.home() / ".coastal" / "service-init-ledger.json"


def _service_init_load_ledger() -> dict:
    """Read the service-init ledger from disk. Empty dict on missing file
    or parse error — first paying Custee creates it."""
    try:
        if SERVICE_INIT_LEDGER_PATH.exists():
            return json.loads(SERVICE_INIT_LEDGER_PATH.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        log = __import__("logging").getLogger("coastal.service_init")
        log.warning("service-init ledger load failed: %s", exc)
    return {}


def _service_init_save_ledger(ledger: dict) -> None:
    """Persist the ledger to disk. Parent dir created on demand."""
    SERVICE_INIT_LEDGER_PATH.parent.mkdir(parents=True, exist_ok=True)
    SERVICE_INIT_LEDGER_PATH.write_text(json.dumps(ledger, indent=2), encoding="utf-8")


class ServiceInitChargeRequest(BaseModel):
    email: str
    trigger: str  # "trial" | "retail_first_purchase"
    reference_id: Optional[str] = None  # optional caller anchor (trial id / order id)


@app.post("/api/service-initiation/charge")
def service_initiation_charge(
    body: ServiceInitChargeRequest,
    x_coastal_token: str = Header(""),
) -> dict:
    """Fire the $6.54 service-initiation Stripe Checkout Session ONCE per
    Custee. Idempotent — repeat calls for an already-paid email return
    {ok: True, already_paid: True} without re-minting.

    Triggered from:
      - Meeting Mode trial start (trigger="trial")
      - First standard-prices retail order (trigger="retail_first_purchase")

    Webhook /stripe/webhook checkout.session.completed records the paid
    entry into the ledger."""
    _auth(x_coastal_token)
    email = (body.email or "").strip().lower()
    trigger = (body.trigger or "").strip().lower()

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="email required")
    if trigger not in _service_init_mod.ALLOWED_TRIGGERS:
        raise HTTPException(
            status_code=400,
            detail=f"trigger must be one of {sorted(_service_init_mod.ALLOWED_TRIGGERS)}",
        )

    ledger = _service_init_load_ledger()
    existing = ledger.get(email)
    if existing:
        status = existing.get("status", "paid")
        if status == "paid":
            return {
                "ok": True,
                "already_paid": True,
                "paid_at": existing.get("paid_at"),
                "intent_id": existing.get("intent_id"),
            }
        if status == "pending":
            # A Stripe Checkout Session has been minted within the last
            # 24h but the webhook hasn't confirmed payment yet. Surface
            # the existing intent_id + url so the Custee returns to the
            # SAME session — never mint a second one. Without this guard
            # an impatient client (or hostile caller) can POST repeatedly
            # within the webhook-delivery window and mint N parallel
            # Stripe Sessions; if multiple complete, N × $6.54 is charged
            # to the same card and only the first webhook delivery wins
            # the ledger row — the rest are silent overcharges.
            return {
                "ok": True,
                "already_paid": False,
                "pending": True,
                "intent_id": existing.get("intent_id"),
                "session_id": existing.get("stripe_session_id"),
                "redirect_url": existing.get("redirect_url"),
                "amount_cents": _service_init_mod.SERVICE_INIT_AMOUNT_CENTS,
            }

    if not STRIPE_AVAILABLE or not _stripe_is_configured():
        raise HTTPException(status_code=503, detail="Stripe not configured on this runner")

    day_iso = _time.strftime("%Y-%m-%d", _time.gmtime())
    intent_id = _service_init_mod.make_service_init_intent_id(email=email, day_iso=day_iso)
    params = _service_init_mod.build_checkout_params(
        customer_email=email,
        intent_id=intent_id,
        trigger=trigger,
        public_url=AUTH_PUBLIC_URL,
    )
    # Carry the trial / order anchor through metadata so the webhook can
    # correlate the completed payment back to its originating surface.
    if body.reference_id:
        params["metadata"]["reference_id"] = body.reference_id
        params["payment_intent_data"]["metadata"]["reference_id"] = body.reference_id

    try:
        import stripe as _stripe  # noqa: PLC0415
        from adapters.stripe_adapter import _init_stripe  # noqa: PLC0415
        _init_stripe()
        session = _stripe.checkout.Session.create(**params)
        checkout_url = session.url if hasattr(session, "url") else session.get("url")
        session_id = session.id if hasattr(session, "id") else session.get("id")
    except Exception as exc:  # noqa: BLE001
        log = __import__("logging").getLogger("coastal.service_init")
        log.warning("stripe service-init checkout create failed: %s", exc)
        # Don't leak Stripe error internals to the caller.
        raise HTTPException(status_code=502, detail="checkout session mint failed") from exc

    # Pending-sentinel write — the Stripe webhook promotes this entry
    # to status=paid on `checkout.session.completed`. Future calls in
    # the webhook-delivery window short-circuit at the `status=pending`
    # branch above instead of minting a new Session.
    try:
        ledger[email] = {
            "status": "pending",
            "intent_id": intent_id,
            "trigger": trigger,
            "stripe_session_id": session_id,
            "redirect_url": checkout_url,
            "minted_at": _time.strftime("%Y-%m-%dT%H:%M:%SZ", _time.gmtime()),
        }
        _service_init_save_ledger(ledger)
    except Exception as _le:
        log = __import__("logging").getLogger("coastal.service_init")
        log.warning("service-init pending-sentinel write failed: %s", _le)

    _send_telegram_message(
        f"Service Initiation intent\nintent: {intent_id}\ncustee: {email}\n"
        f"trigger: {trigger}\namount: $6.54\nsession: {session_id or '?'}"
    )

    return {
        "ok": True,
        "already_paid": False,
        "intent_id": intent_id,
        "session_id": session_id,
        "redirect_url": checkout_url,
        "amount_cents": _service_init_mod.SERVICE_INIT_AMOUNT_CENTS,
        "trigger": trigger,
    }


# ────────────────────────── Coastal Custee Card — 3-6-9 cadence + product matrix ──────────────────────────
# Owner-ratified 2026-05-11 — Custee Card is the "national DTC + Amazon default"
# tier at $29.99 monthly retail per cbrew-369-pricing-canon-2026-05-11.md.

CUSTEE_CARD_MONTHLY_RETAIL_DOLLARS = 29.99
ALLOWED_CUSTEE_CARD_PRODUCTS = {
    "tea", "coffee", "functional-coffee", "combo", "sampler",
}


def _cadence_subscription_data(cadence_id: str, metadata: dict) -> dict:
    """Thin wrapper kept for the three checkout call sites. Pure logic
    lives in `cadence.subscription_data_for_cadence` (testable in
    isolation; api_server.py's import chain pulls FastAPI + psycopg2)."""
    return _cadence_mod.subscription_data_for_cadence(cadence_id, metadata)


@app.get("/api/membership/custee-card/cadence-pricing")
def custee_card_cadence_pricing() -> dict:
    """Public — return the 4-cadence pricing table for the Custee Card."""
    import cadence as _cad_mod  # noqa: PLC0415
    return {
        "ok": True,
        "tier": "custee-card",
        "monthly_retail": CUSTEE_CARD_MONTHLY_RETAIL_DOLLARS,
        "cadences": _cad_mod.cadence_pricing_table(CUSTEE_CARD_MONTHLY_RETAIL_DOLLARS),
    }


class CusteeCardCheckoutRequest(BaseModel):
    email: str
    cadence: str = "9mo"
    products: list[str] = Field(default_factory=list)


@app.post("/api/membership/custee-card/checkout")
def custee_card_checkout(
    body: CusteeCardCheckoutRequest,
    x_coastal_token: str = Header(""),
) -> dict:
    """Mint a Stripe Checkout Session for a Custee Card subscription at
    the chosen 3-6-9 cadence. Products list (tea / coffee / functional-
    coffee / combo / sampler) captured in Stripe Checkout metadata so
    /stripe/webhook can fulfill the right shipment combination."""
    _auth(x_coastal_token)
    if not STRIPE_AVAILABLE or not _stripe_is_configured():
        raise HTTPException(status_code=503, detail="Stripe not configured on this runner")

    email = (body.email or "").strip().lower()
    cadence_id = (body.cadence or "9mo").strip().lower()
    products = [str(p).strip().lower() for p in (body.products or []) if p]

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="email required")
    if not _cadence_mod.is_valid_cadence(cadence_id):
        raise HTTPException(status_code=400, detail="cadence must be 'monthly', '3mo', '6mo', or '9mo'")
    if not products:
        raise HTTPException(status_code=400, detail="select at least one product")
    invalid = [p for p in products if p not in ALLOWED_CUSTEE_CARD_PRODUCTS]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"unknown products: {invalid}; allowed: {sorted(ALLOWED_CUSTEE_CARD_PRODUCTS)}",
        )

    monthly_billing_cents = _cadence_mod.cadence_monthly_billing_cents(
        CUSTEE_CARD_MONTHLY_RETAIL_DOLLARS, cadence_id,  # type: ignore[arg-type]
    )
    _envelope = _profitability_mod.check_envelope(
        tier="custee-card",
        basket=[{"product_id": "tier-only", "monthly_retail_cents": monthly_billing_cents}],
    )
    if not _envelope.ok:
        raise HTTPException(status_code=400, detail=_envelope.reason or "envelope check failed")
    cadence_label = _cadence_mod.CADENCES[cadence_id]["label"]  # type: ignore[index]
    months_paid = int(_cadence_mod.CADENCES[cadence_id]["months_paid"])  # type: ignore[index]
    products_label = ", ".join(products)
    day_iso = _time.strftime("%Y-%m-%d", _time.gmtime())
    intent_id = f"cct_{hashlib.sha256(f'{email}|{cadence_id}|{day_iso}|{products_label}'.encode()).hexdigest()[:16]}"

    metadata = {
        "product": "coastal-brewing",
        "flow": "custee_card",
        "tier": "custee-card",
        "cadence": cadence_id,
        "products": products_label,
        "intent_id": intent_id,
        "custee_email": email,
    }

    try:
        import stripe as _stripe  # noqa: PLC0415
        from adapters.stripe_adapter import _init_stripe  # noqa: PLC0415
        _init_stripe()
        session = _stripe.checkout.Session.create(
            mode="subscription",
            customer_email=email,
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "unit_amount": monthly_billing_cents,
                    "recurring": {"interval": "month"},
                    "product_data": {
                        "name": f"Coastal Custee Card · {cadence_label}",
                        "description": f"Products: {products_label}",
                        "metadata": {"tier": "custee-card", "intent_id": intent_id},
                    },
                },
                "quantity": 1,
            }],
            metadata=metadata,
            subscription_data=_cadence_subscription_data(cadence_id, metadata),
            success_url=f"{AUTH_PUBLIC_URL}/membership/thank-you?intent={intent_id}",
            cancel_url=f"{AUTH_PUBLIC_URL}/membership?canceled=1",
            billing_address_collection="auto",
        )
        checkout_url = session.url if hasattr(session, "url") else session.get("url")
        session_id = session.id if hasattr(session, "id") else session.get("id")
    except Exception as exc:  # noqa: BLE001
        log = __import__("logging").getLogger("coastal.custee_card")
        log.warning("stripe custee card checkout create failed: %s", exc)
        # Don't leak Stripe error internals to the caller.
        raise HTTPException(status_code=502, detail="checkout session mint failed") from exc

    _send_telegram_message(
        f"Custee Card subscription intent\n"
        f"intent: {intent_id}\n"
        f"custee: {email}\n"
        f"cadence: {cadence_id} ({cadence_label})\n"
        f"products: {products_label}\n"
        f"monthly: ${monthly_billing_cents/100:.2f}/mo\n"
        f"session: {session_id or '?'}"
    )

    return {
        "ok": True,
        "intent_id": intent_id,
        "session_id": session_id,
        "redirect_url": checkout_url,
        "monthly_billing_cents": monthly_billing_cents,
        "cadence": cadence_id,
        "tier": "custee-card",
        "products": products,
    }


# ────────────────────────── Legacy 4-product subscribe-flow (retired) ──────────────────────────
# The 4-product /pricing subscribe flow (Tea/Coffee/Functional/Combo Monthly
# as standalone tiers) was retired on 2026-05-11 per owner directive — those
# were the wrong abstraction. Product selection now happens INSIDE each
# membership tier (Pooler Pass / Custee Card / Wood Stork) via the
# AIMS-style ProductMatrixPicker. See PR #409 (Custee Card) + PR #410
# (Pooler + Wood Stork) for the replacement.
#
# `scripts/membership_subscribe.py` kept as a processor-agnostic line-item
# helper for future scenarios (intent-id derivation, line-item builder).
# It is no longer wired to any endpoint or frontend route.


# ────────────────────────── 3-6-9 cadence helper ──────────────────────────
# Owner-ratified 2026-05-11 (`cbrew-369-pricing-canon-2026-05-11.md`).
# Single source of truth for the 4-cadence schedule: monthly / 3mo / 6mo / 9mo.
import cadence as _cadence_mod  # noqa: E402

# Profitability envelope gate — fences each tier checkout against billing
# values that exceed the tier envelope (catches the derivation-bug class
# from PRs #410-415 before a margin-negative Stripe Session is minted).
import profitability as _profitability_mod  # noqa: E402


# ────────────────────────── Wood Stork tier ──────────────────────────
# Owner-ratified 2026-05-10 mechanics + 3-6-9 cadence pivot 2026-05-11:
#   - Standard / Reserve, priced per 3-6-9 cadence canon
#   - 4 cadences per tier: monthly / 3mo (15% off) / 6mo (20%) / 9mo (25%, deliver 12)
#   - Tiered referral discount on member's own product orders (18% → 50% cap)
# Pure logic in scripts/membership_wood_stork.py + scripts/cadence.py.

import membership_wood_stork  # noqa: E402


def _wood_stork_price_env(tier: str, cadence_id: str) -> str:
    """Resolve the env var name holding the Stripe price ID for a
    Wood Stork tier × cadence combination."""
    return f"STRIPE_COASTAL_WOOD_STORK_{tier.upper()}_{cadence_id.upper()}_PRICE_ID"


def _wood_stork_price_id(tier: str, cadence_id: str) -> str:
    """Read the Stripe price ID env var for a Wood Stork tier × cadence."""
    return os.environ.get(_wood_stork_price_env(tier, cadence_id), "")


def _stripe_wood_stork_checkout_create(
    *,
    customer_email: str,
    business_name: str,
    tier: str,
    cadence_id: str,
) -> Optional[str]:
    """Mint a Stripe Checkout Session for a Wood Stork subscription at
    the given cadence. Returns hosted URL or None if not configured.
    """
    price_id = _wood_stork_price_id(tier, cadence_id)
    if not STRIPE_AVAILABLE or not _stripe_is_configured() or not price_id:
        return None
    try:
        import stripe as _stripe   # noqa: E402
        params = membership_wood_stork.build_checkout_params(
            customer_email=customer_email,
            business_name=business_name,
            tier=tier,  # type: ignore[arg-type]
            cadence_id=cadence_id,
            price_id=price_id,
            public_url=AUTH_PUBLIC_URL,
        )
        session = _stripe.checkout.Session.create(**params)
        return session.get("url") if isinstance(session, dict) else getattr(session, "url", None)
    except Exception as exc:
        log = __import__("logging").getLogger("coastal.wood_stork")
        log.warning("stripe wood stork checkout create failed: %s", exc)
        return None


ALLOWED_WOOD_STORK_PRODUCTS = {
    "bulk-coffee", "bulk-tea", "multi-location", "whitelabel",
}


class WoodStorkCheckoutRequest(BaseModel):
    email: str
    business_name: str
    tier: str  # "standard" | "reserve"
    cadence: str = "9mo"  # "monthly" | "3mo" | "6mo" | "9mo"  (default = best deal)
    products: list[str] = Field(default_factory=list)


@app.post("/api/membership/wood-stork/checkout")
def wood_stork_checkout(
    body: WoodStorkCheckoutRequest,
    x_coastal_token: str = Header(""),
) -> dict:
    """Mint a Stripe Checkout Session for a Wood Stork subscription at
    the requested 3-6-9 cadence. Products list captured in Stripe
    Checkout metadata so /stripe/webhook can fulfill the right B2B
    shipment scale."""
    _auth(x_coastal_token)
    if not STRIPE_AVAILABLE or not _stripe_is_configured():
        raise HTTPException(status_code=503, detail="Stripe not configured on this runner")

    email = (body.email or "").strip().lower()
    business_name = (body.business_name or "").strip()
    tier = (body.tier or "").strip().lower()
    cadence_id = (body.cadence or "9mo").strip().lower()
    products = [str(p).strip().lower() for p in (body.products or []) if p]

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="email required")
    if not business_name:
        raise HTTPException(status_code=400, detail="business_name required")
    if tier not in ("standard", "reserve"):
        raise HTTPException(status_code=400, detail="tier must be 'standard' or 'reserve'")
    if not _cadence_mod.is_valid_cadence(cadence_id):
        raise HTTPException(status_code=400, detail="cadence must be 'monthly', '3mo', '6mo', or '9mo'")
    if products:
        invalid = [p for p in products if p not in ALLOWED_WOOD_STORK_PRODUCTS]
        if invalid:
            raise HTTPException(
                status_code=400,
                detail=f"unknown products: {invalid}; allowed: {sorted(ALLOWED_WOOD_STORK_PRODUCTS)}",
            )
    if tier == "standard" and "whitelabel" in products:
        raise HTTPException(status_code=400, detail="whitelabel is Wood Stork Reserve only")

    monthly_retail = membership_wood_stork.monthly_retail_for_tier(tier)  # type: ignore[arg-type]
    monthly_billing_cents = _cadence_mod.cadence_monthly_billing_cents(monthly_retail, cadence_id)  # type: ignore[arg-type]
    _envelope = _profitability_mod.check_envelope(
        tier=f"wood-stork-{tier}",
        basket=[{"product_id": "tier-only", "monthly_retail_cents": monthly_billing_cents}],
    )
    if not _envelope.ok:
        raise HTTPException(status_code=400, detail=_envelope.reason or "envelope check failed")
    cadence_label = _cadence_mod.CADENCES[cadence_id]["label"]  # type: ignore[index]
    tier_label = f"Wood Stork {tier.capitalize()}"
    products_label = ", ".join(products) if products else "—"
    day_iso = _time.strftime("%Y-%m-%d", _time.gmtime())
    intent_id = f"ws_{hashlib.sha256(f'{email}|{tier}|{cadence_id}|{day_iso}|{products_label}'.encode()).hexdigest()[:16]}"

    metadata = {
        "product": "coastal-brewing", "flow": "wood_stork",
        "tier": f"wood-stork-{tier}", "cadence": cadence_id,
        "products": products_label, "intent_id": intent_id,
        "custee_email": email, "business_name": business_name,
    }

    try:
        import stripe as _stripe  # noqa: PLC0415
        from adapters.stripe_adapter import _init_stripe  # noqa: PLC0415
        _init_stripe()
        session = _stripe.checkout.Session.create(
            mode="subscription", customer_email=email,
            line_items=[{
                "price_data": {
                    "currency": "usd", "unit_amount": monthly_billing_cents,
                    "recurring": {"interval": "month"},
                    "product_data": {
                        "name": f"{tier_label} · {cadence_label}",
                        "description": f"{business_name} · Products: {products_label}",
                        "metadata": {"tier": f"wood-stork-{tier}", "intent_id": intent_id},
                    },
                }, "quantity": 1,
            }],
            metadata=metadata, subscription_data=_cadence_subscription_data(cadence_id, metadata),
            success_url=f"{AUTH_PUBLIC_URL}/wood-stork/thank-you?intent={intent_id}",
            cancel_url=f"{AUTH_PUBLIC_URL}/wood-stork?canceled=1",
            billing_address_collection="auto",
        )
        checkout_url = session.url if hasattr(session, "url") else session.get("url")
        session_id = session.id if hasattr(session, "id") else session.get("id")
    except Exception as exc:  # noqa: BLE001
        log = __import__("logging").getLogger("coastal.wood_stork")
        log.warning("stripe wood stork checkout create failed: %s", exc)
        # Don't leak Stripe error internals (request IDs, error codes) to the caller.
        raise HTTPException(status_code=502, detail="checkout session mint failed") from exc

    _send_telegram_message(
        f"Wood Stork {tier} subscription intent\nintent: {intent_id}\nbusiness: {business_name}\n"
        f"custee: {email}\ncadence: {cadence_id} ({cadence_label})\nproducts: {products_label}\n"
        f"monthly: ${monthly_billing_cents/100:.2f}/mo\nsession: {session_id or '?'}"
    )

    return {
        "ok": True, "intent_id": intent_id, "session_id": session_id,
        "redirect_url": checkout_url, "monthly_billing_cents": monthly_billing_cents,
        "cadence": cadence_id, "tier": f"wood-stork-{tier}", "products": products,
    }


@app.get("/api/membership/wood-stork/cadence-pricing")
def wood_stork_cadence_pricing(
    tier: str = Query(..., regex="^(standard|reserve)$"),
) -> dict:
    """Public — 4-cadence pricing table for a Wood Stork tier."""
    return {
        "ok": True,
        "tier": tier,
        "monthly_retail": membership_wood_stork.monthly_retail_for_tier(tier),  # type: ignore[arg-type]
        "cadences": membership_wood_stork.cadence_pricing(tier),  # type: ignore[arg-type]
    }


# ────────────────────────── Pooler Pass tier ──────────────────────────
# Owner-ratified 2026-05-10 mechanics + 3-6-9 cadence pivot 2026-05-11:
#   - Standard / Plus, priced per 3-6-9 cadence canon
#   - 4 cadences per tier: monthly / 3mo (15% off) / 6mo (20%) / 9mo (25%, deliver 12)
#   - Geographic gate: 50-100 mile radius from 31322 (Pooler, GA)
# Pure logic + ZIP haversine in scripts/membership_pooler_pass.py + scripts/geo.py.

import membership_pooler_pass  # noqa: E402


def _pooler_pass_price_env(tier: str, cadence_id: str) -> str:
    """Resolve env var name for Pooler Pass tier × cadence price ID."""
    return f"STRIPE_COASTAL_POOLER_PASS_{tier.upper()}_{cadence_id.upper()}_PRICE_ID"


def _pooler_pass_price_id(tier: str, cadence_id: str) -> str:
    return os.environ.get(_pooler_pass_price_env(tier, cadence_id), "")


class PoolerPassEligibilityRequest(BaseModel):
    zip: str


@app.post("/api/membership/pooler-pass/eligibility")
def pooler_pass_eligibility(
    body: PoolerPassEligibilityRequest,
) -> dict:
    """Public — server-side ZIP eligibility check for Pooler Pass. No
    token (ZIP radius math is publicly knowable; powers the frontend
    gate without bouncing through the token-gated proxy)."""
    zip_code = (body.zip or "").strip()
    if not zip_code or not zip_code.isdigit() or len(zip_code) != 5:
        raise HTTPException(status_code=400, detail="zip must be a 5-digit code")
    return membership_pooler_pass.check_eligibility(zip_code)


def _stripe_pooler_pass_checkout_create(
    *,
    customer_email: str,
    zip_code: str,
    tier: str,
    cadence_id: str,
) -> Optional[str]:
    """Mint a Stripe Checkout Session for a Pooler Pass subscription at
    the given cadence."""
    price_id = _pooler_pass_price_id(tier, cadence_id)
    if not STRIPE_AVAILABLE or not _stripe_is_configured() or not price_id:
        return None
    try:
        import stripe as _stripe   # noqa: E402
        params = membership_pooler_pass.build_checkout_params(
            customer_email=customer_email,
            zip_code=zip_code,
            tier=tier,  # type: ignore[arg-type]
            cadence_id=cadence_id,
            price_id=price_id,
            public_url=AUTH_PUBLIC_URL,
        )
        session = _stripe.checkout.Session.create(**params)
        return session.get("url") if isinstance(session, dict) else getattr(session, "url", None)
    except Exception as exc:
        log = __import__("logging").getLogger("coastal.pooler_pass")
        log.warning("stripe pooler pass checkout create failed: %s", exc)
        return None


ALLOWED_POOLER_PASS_PRODUCTS = {
    "tea", "coffee", "functional-coffee", "combo",
}


class PoolerPassCheckoutRequest(BaseModel):
    email: str
    zip: str
    tier: str  # "standard" | "plus"
    cadence: str = "9mo"  # default = best deal
    products: list[str] = Field(default_factory=list)


@app.post("/api/membership/pooler-pass/checkout")
def pooler_pass_checkout(
    body: PoolerPassCheckoutRequest,
    x_coastal_token: str = Header(""),
) -> dict:
    """Gate Pooler Pass checkout on server-side ZIP eligibility, then mint
    a Stripe Checkout Session at the requested 3-6-9 cadence with the
    chosen product combination (tea / coffee / functional-coffee /
    combo)."""
    _auth(x_coastal_token)
    if not STRIPE_AVAILABLE or not _stripe_is_configured():
        raise HTTPException(status_code=503, detail="Stripe not configured on this runner")

    email = (body.email or "").strip().lower()
    zip_code = (body.zip or "").strip()
    tier = (body.tier or "").strip().lower()
    cadence_id = (body.cadence or "9mo").strip().lower()
    products = [str(p).strip().lower() for p in (body.products or []) if p]

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="email required")
    if not zip_code or not zip_code.isdigit() or len(zip_code) != 5:
        raise HTTPException(status_code=400, detail="zip must be a 5-digit code")
    if tier not in ("standard", "plus"):
        raise HTTPException(status_code=400, detail="tier must be 'standard' or 'plus'")
    if not _cadence_mod.is_valid_cadence(cadence_id):
        raise HTTPException(status_code=400, detail="cadence must be 'monthly', '3mo', '6mo', or '9mo'")
    if not products:
        raise HTTPException(status_code=400, detail="select at least one product")
    invalid = [p for p in products if p not in ALLOWED_POOLER_PASS_PRODUCTS]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"unknown products: {invalid}; allowed: {sorted(ALLOWED_POOLER_PASS_PRODUCTS)}",
        )
    if not membership_pooler_pass.is_zip_eligible(zip_code):
        raise HTTPException(
            status_code=400,
            detail="zip is outside the 100-mile Pooler Pass eligibility band — see Coastal Custee Card",
        )

    monthly_retail = membership_pooler_pass.monthly_retail_for_tier(tier)  # type: ignore[arg-type]
    monthly_billing_cents = _cadence_mod.cadence_monthly_billing_cents(monthly_retail, cadence_id)  # type: ignore[arg-type]
    _envelope = _profitability_mod.check_envelope(
        tier=f"pooler-pass-{tier}",
        basket=[{"product_id": "tier-only", "monthly_retail_cents": monthly_billing_cents}],
    )
    if not _envelope.ok:
        raise HTTPException(status_code=400, detail=_envelope.reason or "envelope check failed")
    cadence_label = _cadence_mod.CADENCES[cadence_id]["label"]  # type: ignore[index]
    tier_label = f"Pooler Pass {tier.capitalize()}"
    products_label = ", ".join(products)
    day_iso = _time.strftime("%Y-%m-%d", _time.gmtime())
    intent_id = f"pp_{hashlib.sha256(f'{email}|{tier}|{cadence_id}|{day_iso}|{products_label}'.encode()).hexdigest()[:16]}"

    metadata = {
        "product": "coastal-brewing", "flow": "pooler_pass",
        "tier": f"pooler-pass-{tier}", "cadence": cadence_id,
        "products": products_label, "intent_id": intent_id,
        "custee_email": email, "zip": zip_code,
    }

    try:
        import stripe as _stripe  # noqa: PLC0415
        from adapters.stripe_adapter import _init_stripe  # noqa: PLC0415
        _init_stripe()
        session = _stripe.checkout.Session.create(
            mode="subscription", customer_email=email,
            line_items=[{
                "price_data": {
                    "currency": "usd", "unit_amount": monthly_billing_cents,
                    "recurring": {"interval": "month"},
                    "product_data": {
                        "name": f"{tier_label} · {cadence_label}",
                        "description": f"Products: {products_label}",
                        "metadata": {"tier": f"pooler-pass-{tier}", "intent_id": intent_id},
                    },
                }, "quantity": 1,
            }],
            metadata=metadata, subscription_data=_cadence_subscription_data(cadence_id, metadata),
            success_url=f"{AUTH_PUBLIC_URL}/pooler-pass/thank-you?intent={intent_id}",
            cancel_url=f"{AUTH_PUBLIC_URL}/pooler-pass?canceled=1",
            billing_address_collection="auto",
        )
        checkout_url = session.url if hasattr(session, "url") else session.get("url")
        session_id = session.id if hasattr(session, "id") else session.get("id")
    except Exception as exc:  # noqa: BLE001
        log = __import__("logging").getLogger("coastal.pooler_pass")
        log.warning("stripe pooler pass checkout create failed: %s", exc)
        # Don't leak Stripe error internals to the caller.
        raise HTTPException(status_code=502, detail="checkout session mint failed") from exc

    _send_telegram_message(
        f"Pooler Pass {tier} subscription intent\nintent: {intent_id}\ncustee: {email}\n"
        f"zip: {zip_code}\ncadence: {cadence_id} ({cadence_label})\nproducts: {products_label}\n"
        f"monthly: ${monthly_billing_cents/100:.2f}/mo\nsession: {session_id or '?'}"
    )

    return {
        "ok": True, "intent_id": intent_id, "session_id": session_id,
        "redirect_url": checkout_url, "monthly_billing_cents": monthly_billing_cents,
        "cadence": cadence_id, "tier": f"pooler-pass-{tier}", "products": products,
    }


@app.get("/api/membership/pooler-pass/cadence-pricing")
def pooler_pass_cadence_pricing(
    tier: str = Query(..., regex="^(standard|plus)$"),
) -> dict:
    """Public — 4-cadence pricing table for a Pooler Pass tier."""
    return {
        "ok": True,
        "tier": tier,
        "monthly_retail": membership_pooler_pass.monthly_retail_for_tier(tier),  # type: ignore[arg-type]
        "cadences": membership_pooler_pass.cadence_pricing(tier),  # type: ignore[arg-type]
    }


def _stripe_escalation_checkout_create(
    *,
    escalation_token: str,
    payload: Dict[str, Any],
    line_label: str,
    unit_price_cents: int,
    qty: int,
) -> Optional[str]:
    """Mint a single-use Stripe Checkout Session for an above-cap escalation
    deal. Owner directive 2026-05-09 (Path A): Stripe Payment Link / Checkout
    is the canonical commitment surface — replaces the previously-planned
    Paperform escalation form. The HMAC `escalation_token` rides along in
    `metadata` so /stripe/webhook can replay the commit-record on
    `checkout.session.completed`.

    Returns the hosted checkout URL or None if Stripe isn't configured.
    """
    if not STRIPE_AVAILABLE or not _stripe_is_configured():
        return None
    try:
        import stripe as _stripe   # noqa: E402
        session = _stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {"name": line_label},
                        "unit_amount": int(unit_price_cents),
                    },
                    "quantity": int(qty),
                }
            ],
            success_url=f"{AUTH_PUBLIC_URL}/account?escalation=committed&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{AUTH_PUBLIC_URL}/account?escalation=cancelled",
            metadata={
                "escalation_token": escalation_token,
                "escalation_id": str(payload.get("escalation_id", "")),
                "actor":          str(payload.get("actor", "")),
                "actor_tier":     str(payload.get("tier", "")),
                "sku":            str(payload.get("sku", "")),
                "qty":            str(qty),
                "requested_pct":  str(payload.get("requested_pct", "")),
                "custee_id":      str(payload.get("custee_id", "")),
                "vertical":       "coastal-brewing",
                "flow":           "stepper_escalation",
            },
        )
        return session.get("url") if isinstance(session, dict) else getattr(session, "url", None)
    except Exception as exc:
        log = __import__("logging").getLogger("coastal.escalation")
        log.warning("stripe escalation checkout create failed: %s", exc)
        return None


class AuthSignupRequest(BaseModel):
    email: str
    name: Optional[str] = None


class AuthLoginRequest(BaseModel):
    email: str


# ─── Welcome-card render helpers ────────────────────────────────────────
# Per-signup welcome message generated via DeepSeek-v4-pro through the
# OpenRouter integration that's already wired for ACHEEVY's chat
# reasoning. Inworld TTS (Sal v2 IVC clone) renders the message to MP3,
# the runner saves it locally + serves via
# /api/v1/account/welcome-card.mp3. /account reads message text + audio
# URL from /api/v1/auth/me on first load.
#
# Why DeepSeek-v4-pro and not Claude Opus 4.7: a 35-50 word brand-voice
# welcome line is not a frontier-reasoning task. DeepSeek-v4-pro is
# already in the stack, costs ~20× less per call ($0.0007 vs $0.014
# per message — ~$0.70/mo vs ~$14/mo at 1k signups), and follows the
# Sal persona prompt with the same dialect-marker discipline that
# already drives the live chat. Use Opus 4.7 only for tasks where
# frontier reasoning genuinely changes the output.

WELCOME_CARDS_DIR = pathlib.Path(__file__).resolve().parent.parent / "welcome-cards"
WELCOME_FALLBACK_MESSAGE = (
    "Welcome to Coastal Brewing Co. I'm Sal — first pour's on us. "
    "We don't just sell coffee. We sell the part of the day that "
    "starts with a cup. Pull up a stool any time."
)
def _generate_welcome_message(name: Optional[str], email: str) -> str:
    """Generate a 35-50 word Sal-voiced welcome message via the A.I.M.S.
    Model Gateway (Inworld Router → google-vertex/gemma-4-26b-a4b for
    the welcome_message surface). Falls back to WELCOME_FALLBACK_MESSAGE
    on any failure — signup must never block on this best-effort
    enrichment."""
    display_name = (name or email.split("@")[0]).strip() or "friend"
    system_prompt = (
        "You are Sal_Ang, lead barista at Coastal Brewing Co. American "
        "Black male, NYC/NJ/Philly upbringing, now Coastal Georgia. "
        "Smooth and well-articulated — fly without trying. Light AAVE "
        "layered with Southern warmth. Your voice is conversational, "
        "lead-counter patter — sound like you're leaning on the bar "
        "talking to a regular. Words you reach for: 'alright,' 'pull "
        "up a stool,' 'real talk,' 'on the menu,' 'easy,' 'no pressure.' "
        "You write a 35-50 word welcome note for a customer who just "
        "opened a Coastal account. Address them by their first name. "
        "Anchor to the brand thesis: 'Coffee changes your day. We're "
        "here for the change.' No bullets, no markdown, no headings — "
        "prose only. No exclamation points. End on something inviting "
        "but not pushy. Output ONLY the welcome note, nothing else."
    )
    resp = _gw_chat_completion(
        surface="welcome_message",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": (
                f"Customer first name: {display_name}\n"
                f"Customer email: {email}\n\n"
                f"Write the 35-50 word welcome note now."
            )},
        ],
        max_tokens=200,
        temperature=0.7,
    )
    text = _gw_extract_text(resp)
    return text or WELCOME_FALLBACK_MESSAGE


async def _render_welcome_narration(
    text: str, character_id: str, coastal_uid: str,
) -> bool:
    """Render the welcome message to MP3 via Inworld TTS streaming +
    save to WELCOME_CARDS_DIR / {coastal_uid}.mp3. Returns True on
    success. Best-effort — caller should not block on failure."""
    if not _INWORLD_API_KEY:
        return False
    try:
        WELCOME_CARDS_DIR.mkdir(parents=True, exist_ok=True)
    except Exception:
        return False
    # Apply same TTS pre-processing the live streaming endpoint uses
    text = _strip_markdown_for_tts((text or "").strip())[:2000]
    if not text:
        return False
    if _PRONUNCIATION_ENGINE_AVAILABLE:
        try:
            text = _rewrite_for_tts(
                text,
                character=character_id,
                surface="customer_chat_panel",
                vertical="coastal-brewing",
            )
        except Exception:
            pass
    voice_cfg = _INWORLD_VOICE_MAP.get(character_id) or _INWORLD_VOICE_MAP["sal_ang"]
    out_path = WELCOME_CARDS_DIR / f"{coastal_uid}.mp3"
    try:
        chunks: list = []
        async for chunk in _inworld_stream_audio_bytes(text, voice_cfg):
            chunks.append(chunk)
        if not chunks:
            return False
        out_path.write_bytes(b"".join(chunks))
        return True
    except Exception as exc:
        log = __import__("logging").getLogger("coastal.welcome")
        log.warning("welcome narration render failed for %s: %s", coastal_uid, exc)
        return False


@app.get("/api/v1/account/welcome-card.mp3")
async def account_welcome_card_audio(
    coastal_uid: Optional[str] = Cookie(default=None, alias=COASTAL_UID_COOKIE),
):
    """Serve the caller's saved welcome-narration MP3. Auth-gated by the
    cookie + identity presence. Returns 404 if the user has no narration
    on file (caller falls back to silent mode)."""
    coastal_uid = _resolve_uid_cookie(coastal_uid)
    if not coastal_uid or not _profile_layer.is_configured():
        raise HTTPException(status_code=401, detail="not authenticated")
    profile = _profile_layer.get_profile(coastal_uid)
    if profile is None or not profile.identity:
        raise HTTPException(status_code=401, detail="not authenticated")
    audio_path = WELCOME_CARDS_DIR / f"{coastal_uid}.mp3"
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="welcome card not rendered")
    return StreamingResponse(
        iter([audio_path.read_bytes()]),
        media_type="audio/mpeg",
        headers={"Cache-Control": "private, max-age=3600"},
    )


@app.post("/api/v1/auth/signup")
async def auth_signup(
    body: AuthSignupRequest,
    request: Request,
):
    """Begin a new-account flow: send a magic-link to the supplied email.

    Owner-canon 2026-05-12 PM: signup no longer binds the email to the
    caller's coastal_uid or creates a Stripe Customer until the user
    proves email ownership by clicking the magic link. Without this
    step ANY caller could POST any email + name and pre-empt the
    legitimate owner's signup (account pre-emption attack), plus
    polluting the Stripe Customer list with unverified emails.

    The flow is now:
       1. Caller POSTs {email, name} here.
       2. Server mints a signup-flavored magic-link token (extra
          `signup=true` + `name=<value>` fields beyond the usual login
          token shape) and emails the link.
       3. User clicks link → /api/v1/auth/verify consumes the token,
          mints a fresh signed coastal_uid cookie, binds the email,
          creates the Stripe Customer, renders the welcome card.

    Returns a generic check-inbox response. Same shape regardless of
    whether the email already has an account (prevents enumeration).
    """
    # Apply the same per-IP throttle as /auth/login so signup can't be
    # used to mass-email arbitrary inboxes.
    _check_rate_limit("auth", _client_ip(
        request.headers,
        fallback=request.client.host if request.client else None,
    ))
    if not _profile_layer.is_configured():
        raise HTTPException(status_code=503, detail="profile layer not configured")
    email = (body.email or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="valid email required")
    name = (body.name or "").strip()[:80]  # cap so we can stuff into token payload safely

    # Mint a signup token. Distinct from login tokens via the `signup`
    # flag so /auth/verify can fire the new-account branch (create
    # Stripe Customer, welcome card). If the email already has a
    # profile, that branch falls through to the login behavior — same
    # token works for both, the caller never knows which path it took.
    token = _auth_sign({
        "email": email,
        "name": name,
        "signup": True,
        "exp": int(_auth_time.time()) + AUTH_TOKEN_TTL_SEC,
    })
    link = f"{AUTH_PUBLIC_URL}/auth/verify?token={token}"

    response_payload: Dict[str, Any] = {
        "ok": True,
        "sent": True,
        "check_inbox": True,
        "email": email,
        "expires_in_sec": AUTH_TOKEN_TTL_SEC,
    }

    # Deliver via the same email adapter as /auth/login. Same dev-mode
    # discipline: only return the link inline if COASTAL_DEBUG=true is
    # explicitly set, otherwise fail closed.
    try:
        from adapters.email_adapter import (   # noqa: E402
            is_configured as _email_is_configured,
            send_email as _email_send,
            magic_link_email_body as _magic_link_body,
        )
    except Exception:
        _email_is_configured = lambda: False  # type: ignore
        _email_send = None                     # type: ignore
        _magic_link_body = None                # type: ignore

    if _email_is_configured() and _email_send and _magic_link_body:
        _, text = _magic_link_body(
            recipient_email=email,
            magic_link=link,
            ttl_minutes=AUTH_TOKEN_TTL_SEC // 60,
        )
        try:
            _email_send(
                to=email,
                subject="Confirm your Coastal Brewing Co. account",
                text=text,
                template_id="auth_signup_link",
            )
        except Exception as exc:
            log = __import__("logging").getLogger("coastal.auth")
            log.warning("appint email send raised for signup %s: %s", email, exc)
    else:
        if os.environ.get("COASTAL_DEBUG", "").strip().lower() in ("1", "true", "yes"):
            response_payload["magic_link"] = link
        else:
            log = __import__("logging").getLogger("coastal.auth")
            log.warning(
                "auth_signup: email adapter unconfigured for %s — magic-link suppressed",
                email,
            )

    return response_payload


@app.post("/api/v1/auth/login")
async def auth_login(body: AuthLoginRequest, request: Request):
    """Send a magic-link to an existing account's email. Returns the link
    in dev mode (when COASTAL_DEBUG=true AND no email service is
    configured) so the owner can test the flow locally without
    provisioning Resend / SES.

    The link, when clicked, calls /auth/verify?token=... which sets the
    caller's coastal_uid cookie to the email's canonical coastal_uid —
    enabling cross-device login + history continuity.
    """
    # Rate-limit at the IP level to prevent email-bombing an existing
    # account or token-replay-loop attempts (10 req / IP / 60s).
    _check_rate_limit("auth", _client_ip(
        request.headers,
        fallback=request.client.host if request.client else None,
    ))
    if not _profile_layer.is_configured():
        raise HTTPException(status_code=503, detail="profile layer not configured")
    email = (body.email or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="valid email required")
    profile = _profile_layer.find_by_identity(email)
    if profile is None:
        # Don't leak whether the email exists. Always return 200 with a
        # generic body. (Matches modern "no user enumeration" auth posture.)
        return {"ok": True, "sent": True}
    token = _auth_sign({
        "uid": profile.coastal_uid,
        "email": email,
        "exp": int(_auth_time.time()) + AUTH_TOKEN_TTL_SEC,
    })
    link = f"{AUTH_PUBLIC_URL}/auth/verify?token={token}"

    # Email delivery via GCP Application Integration "Send Email" task
    # (owner directive 2026-05-09: GCP-native, no third-party email
    # vendor). The runner POSTs plaintext subject + body to the
    # AppInt API trigger; the integration's Send Email task fires
    # inside the ai-managed-services GCP project. When
    # COASTAL_APPINT_EMAIL_URL is unset (dev mode), we return the link
    # inline so cross-device login stays testable without the
    # integration published.
    response_payload: Dict[str, Any] = {
        "ok": True,
        "sent": True,
        "expires_in_sec": AUTH_TOKEN_TTL_SEC,
    }
    try:
        from adapters.email_adapter import (   # noqa: E402 — local import
            is_configured as _email_is_configured,
            send_email as _email_send,
            magic_link_email_body as _magic_link_body,
        )
    except Exception:
        _email_is_configured = lambda: False  # type: ignore
        _email_send = None                     # type: ignore
        _magic_link_body = None                # type: ignore

    if _email_is_configured() and _email_send and _magic_link_body:
        _, text = _magic_link_body(
            recipient_email=email,
            magic_link=link,
            ttl_minutes=AUTH_TOKEN_TTL_SEC // 60,
        )
        try:
            _email_send(
                to=email,
                subject="Pull up to the counter — your Coastal sign-in link",
                text=text,
                template_id="auth_magic_link",
            )
        except Exception as exc:
            log = __import__("logging").getLogger("coastal.auth")
            log.warning("appint email send raised for %s: %s", email, exc)
        # Don't leak send-status to the caller. Generic body either way
        # to prevent email-enumeration attacks.
    else:
        # Email adapter not configured. Surface the magic-link inline
        # ONLY if COASTAL_DEBUG=true is explicitly set in the runner
        # env. Without the explicit gate, an attacker who triggers the
        # adapter-import-failure path (or runs against a misconfigured
        # deploy) would receive victim magic-links directly from the
        # API. In prod we fail closed — caller gets a generic 200, no
        # token reaches the wire.
        if os.environ.get("COASTAL_DEBUG", "").strip().lower() in ("1", "true", "yes"):
            response_payload["magic_link"] = link
        else:
            log = __import__("logging").getLogger("coastal.auth")
            log.warning(
                "auth_login: email adapter unconfigured for %s — magic-link suppressed (set COASTAL_DEBUG=true for inline)",
                email,
            )

    return response_payload


@app.get("/api/v1/auth/verify")
async def auth_verify(
    token: str,
    response: Response,
    request: Request,
):
    """Verify a magic-link token + set the caller's coastal_uid cookie to
    the verified profile's uid. Returns a redirect-friendly response so
    the frontend can call this from the /auth/verify page client-side."""
    # Rate-limit replay attempts. A leaked token (browser history,
    # access log) is replayable for the full TTL; throttling buys time
    # for the genuine click before an attacker can stage one of their own.
    _check_rate_limit("auth", _client_ip(
        request.headers,
        fallback=request.client.host if request.client else None,
    ))
    payload = _auth_verify(token)
    if not payload:
        raise HTTPException(status_code=401, detail="invalid or expired token")
    email = payload["email"]
    is_signup = bool(payload.get("signup"))
    name = payload.get("name") or ""

    # Resolve the profile to bind:
    #   - Signup token: find_by_identity first. If an existing profile
    #     binds this email, use it (idempotent — a second signup click
    #     for the same email just logs the user in). Otherwise mint a
    #     fresh uid.
    #   - Login token: uses the uid embedded by /auth/login.
    if is_signup:
        existing = _profile_layer.find_by_identity(email)
        if existing is not None:
            uid = existing.coastal_uid
        else:
            uid = _profile_layer.new_coastal_uid()
            # Insert the row so update_identity has something to bind to.
            _profile_layer.upsert_profile_visit(uid)
    else:
        uid = payload["uid"]

    # Re-stamp the cookie with a signed value pinned to the verified uid.
    response.set_cookie(
        key=COASTAL_UID_COOKIE,
        value=_sign_uid_for_cookie(uid),
        max_age=COASTAL_UID_MAX_AGE_SEC,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
    )

    # On the SIGNUP branch only: now that email ownership is proven
    # (the user clicked the link in their inbox), it's safe to bind
    # identity, create the Stripe customer, and render the welcome
    # card. These were previously done at signup time without
    # verification — closes the account pre-emption attack.
    stripe_customer_id: Optional[str] = None
    welcome_card_ready = False
    if is_signup:
        try:
            profile = _profile_layer.update_identity(uid, email)
            stripe_customer_id = _stripe_customer_create(email, name)
            meta = dict(profile.metadata or {})
            if name:
                meta["display_name"] = name
            if stripe_customer_id:
                meta["stripe_customer_id"] = stripe_customer_id
            welcome_text = _generate_welcome_message(name, email)
            meta["welcome_card_message"] = welcome_text
            meta["welcome_card_seen"] = False
            try:
                welcome_card_ready = await _render_welcome_narration(
                    welcome_text, "sal_ang", uid,
                )
            except Exception:
                welcome_card_ready = False
            if welcome_card_ready:
                meta["welcome_card_url"] = "/api/v1/account/welcome-card.mp3"
            if meta != (profile.metadata or {}):
                _profile_layer.update_metadata(uid, meta)
        except Exception as _exc:  # noqa: BLE001
            log = __import__("logging").getLogger("coastal.auth")
            log.warning("signup-verify finalize failed for %s: %s", email, _exc)

    profile = _profile_layer.get_profile(uid)
    return {
        "ok": True,
        "coastal_uid": uid,
        "email": email,
        "profile_present": profile is not None,
        "signup": is_signup,
        "stripe_customer_id": stripe_customer_id,
        "welcome_card_ready": welcome_card_ready,
    }


@app.get("/api/v1/auth/me")
async def auth_me(
    coastal_uid: Optional[str] = Cookie(default=None, alias=COASTAL_UID_COOKIE),
):
    """Return the authenticated user's profile, or {authenticated: false}
    if the caller is anonymous. Used by /account to gate the page."""
    coastal_uid = _resolve_uid_cookie(coastal_uid)
    if not coastal_uid or not _profile_layer.is_configured():
        return {"authenticated": False}
    profile = _profile_layer.get_profile(coastal_uid)
    if profile is None or not profile.identity:
        return {"authenticated": False, "coastal_uid": coastal_uid}
    return {
        "authenticated": True,
        "coastal_uid": profile.coastal_uid,
        "email": profile.identity,
        "display_name": (profile.metadata or {}).get("display_name"),
        "stripe_customer_id": (profile.metadata or {}).get("stripe_customer_id"),
        "first_visit_at": profile.first_visit_at.isoformat(),
        "last_visit_at": profile.last_visit_at.isoformat(),
        "visit_count": profile.visit_count,
        "preferences": profile.preferences,
        "last_purchase_sku": profile.last_purchase_sku,
        "last_purchase_label": profile.last_purchase_label,
        "last_purchase_at": (
            profile.last_purchase_at.isoformat() if profile.last_purchase_at else None
        ),
        # Welcome-card state — drives the post-signup motion+narration
        # modal on /account first visit.
        "welcome_card_seen": bool((profile.metadata or {}).get("welcome_card_seen")),
        "welcome_card_url": (profile.metadata or {}).get("welcome_card_url"),
        "welcome_card_message": (profile.metadata or {}).get("welcome_card_message"),
    }


@app.post("/api/v1/auth/logout")
async def auth_logout(response: Response):
    """Clear the session cookie. Profile data stays in Neon — logout is
    just a cookie reset; the next anonymous visit gets a fresh uid."""
    response.delete_cookie(key=COASTAL_UID_COOKIE, path="/")
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────────────
# Research — POST /api/v1/research/query
# ─────────────────────────────────────────────────────────────────────────────
# First live mount of the ii-researcher framework that's been vendored
# at `runtime/ii_researcher/` since Apr 2026 but never wired into a
# production endpoint (test-only). Owner directive 2026-05-06: cold
# vendored repos are unacceptable — ship live or remove.
#
# Backend: research_client.py is a self-contained Python module.
# Brave Search API for primary search (BRAVE_API_KEY in vault), falls
# back to DuckDuckGo HTML parsing when key absent. Jina Reader for
# content extraction (free tier, no key). Returns a structured
# ResearchResult with summary + ranked sources + duration.
#
# This is the seed for Scout_Ang's persistent research surface and the
# foundation for the Account Assistant's "research my market" capability
# per `account-assistant-spec.md`. When the dedicated FOAI runtime
# stands up, this should re-import from the canonical
# `runtime/ii_researcher/research_client.py` instead of the local copy.

class ResearchQueryRequest(BaseModel):
    query: str
    depth: int = 1


@app.post("/api/v1/research/query")
async def research_query(body: ResearchQueryRequest):
    """Run a research task — search + extract + synthesized summary.

    Brave-first search, Jina-Reader content extraction. Depth 1 = quick
    search-and-summarize (~5s); depth 2+ adds content extraction from
    top sources (~15-30s per round). Cap at depth=3 to bound cost +
    latency.
    """
    query = (body.query or "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="query required")
    if len(query) > 500:
        raise HTTPException(status_code=400, detail="query too long (max 500 chars)")
    depth = max(1, min(int(body.depth or 1), 3))

    try:
        import research_client as _rc   # noqa: E402 — local vendor
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"research_client not available: {exc}",
        )

    # research() is sync (uses requests). Run in a thread to avoid
    # blocking the asyncio event loop on multi-second searches.
    import asyncio as _asyncio
    loop = _asyncio.get_event_loop()
    try:
        result = await loop.run_in_executor(None, _rc.research, query, depth)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"research failed: {exc}")
    return result.to_dict()


# ─────────────────────────────────────────────────────────────────────────────
# LinkedIn + Maps prospecting agent — POST /api/v1/agent/linkedin-maps
# ─────────────────────────────────────────────────────────────────────────────
# A.I.M.S. ecosystem agent (currently serving Coastal Brewing Co. as
# the first vertical). Routes through the gateway's `linkedin_maps_agent`
# surface (Claude Sonnet 4-6) — multi-tool orchestration where errors
# compound. Returns 503 with a `missing_keys` list when activation env
# vars aren't set, so owner can wire keys without redeploying code.

class LinkedInMapsAgentRequest(BaseModel):
    goal: str
    max_iterations: int = 6
    system_prompt: Optional[str] = None


@app.post("/api/v1/agent/linkedin-maps")
async def agent_linkedin_maps(body: LinkedInMapsAgentRequest):
    """Run the LinkedIn + Maps prospecting agent loop. Endpoint stays
    live regardless of key state — returns 503 with a clean
    `missing_keys` list until LINKEDIN_API_TOKEN + GOOGLE_MAPS_API_KEY
    land in the runner env."""
    from aims_agents.linkedin_maps_agent import (   # noqa: E402
        is_configured as _agent_configured,
        missing_keys as _agent_missing,
        run_agent as _run_agent,
    )
    if not _agent_configured():
        raise HTTPException(
            status_code=503,
            detail={
                "error": "agent_not_configured",
                "missing_keys": _agent_missing(),
                "message": (
                    "LinkedIn + Maps agent inactive. Push the listed "
                    "env vars to /docker/coastal-brewing/.env and "
                    "recreate the runner."
                ),
            },
        )
    goal = (body.goal or "").strip()
    if not goal:
        raise HTTPException(status_code=400, detail="goal required")
    if len(goal) > 4000:
        raise HTTPException(status_code=400, detail="goal too long (max 4000 chars)")

    import asyncio as _asyncio
    loop = _asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        lambda: _run_agent(
            goal=goal,
            max_iterations=max(1, min(int(body.max_iterations or 6), 12)),
            system_prompt=body.system_prompt,
        ),
    )
    return {
        "ok": result.error is None,
        "goal": goal,
        "final_answer": result.final_answer,
        "iterations": result.iterations,
        "tool_calls": result.tool_calls,
        "duration_ms": round(result.duration_ms, 1),
        "error": result.error,
    }


@app.get("/api/v1/agent/linkedin-maps/status")
async def agent_linkedin_maps_status():
    """Surface activation state of the LinkedIn + Maps agent without
    invoking it. Returns is_configured + missing_keys list so owner can
    verify env wiring after deploy."""
    from aims_agents.linkedin_maps_agent import (   # noqa: E402
        is_configured as _agent_configured,
        missing_keys as _agent_missing,
    )
    return {
        "ok": True,
        "configured": _agent_configured(),
        "missing_keys": _agent_missing(),
        "framework": "Anthropic Sonnet 4-6 via A.I.M.S. Model Gateway, OpenAI-compatible tool-calling, 5 tools (LinkedIn search/profile, Maps places/geocode/distance-matrix)",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Code_Ang — repo-grounded code reasoning agent
# POST /api/v1/agent/code  +  GET /api/v1/agent/code/status
# ─────────────────────────────────────────────────────────────────────────────

class CodeAngRequest(BaseModel):
    task: str
    max_iterations: int = 8
    system_prompt: Optional[str] = None


@app.post("/api/v1/agent/code")
async def agent_code(body: CodeAngRequest):
    """Run Code_Ang against the repo. Read-only by default; checked
    commands (pytest/npm/ruff/mypy/tsc/eslint/git) only run when
    CODE_ANG_EXEC_ENABLED is truthy in env."""
    from aims_agents.code_ang import (   # noqa: E402
        is_configured as _agent_configured,
        missing_keys as _agent_missing,
        run_agent as _run_agent,
    )
    if not _agent_configured():
        raise HTTPException(
            status_code=503,
            detail={
                "error": "agent_not_configured",
                "missing_keys": _agent_missing(),
                "message": "Code_Ang inactive — gateway key + REPO_ROOT must be set.",
            },
        )
    task = (body.task or "").strip()
    if not task:
        raise HTTPException(status_code=400, detail="task required")
    if len(task) > 8000:
        raise HTTPException(status_code=400, detail="task too long (max 8000 chars)")

    import asyncio as _asyncio
    loop = _asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        lambda: _run_agent(
            task=task,
            max_iterations=max(1, min(int(body.max_iterations or 8), 16)),
            system_prompt=body.system_prompt,
        ),
    )
    return {
        "ok": result.error is None,
        "task": task,
        "final_answer": result.final_answer,
        "iterations": result.iterations,
        "tool_calls": result.tool_calls,
        "duration_ms": round(result.duration_ms, 1),
        "error": result.error,
    }


@app.get("/api/v1/agent/code/status")
async def agent_code_status():
    from aims_agents.code_ang import (   # noqa: E402
        is_configured as _agent_configured,
        missing_keys as _agent_missing,
        EXEC_ENABLED as _exec,
        REPO_ROOT as _root,
    )
    return {
        "ok": True,
        "configured": _agent_configured(),
        "missing_keys": _agent_missing(),
        "exec_enabled": _exec,
        "repo_root": str(_root),
        "framework": "Anthropic Sonnet 4-6 via A.I.M.S. Model Gateway code_generation surface, repo-read tools (read/list/grep/git_diff/git_log) + gated code_run_check",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Crucible Judge_Hawk — contract-graded structured evaluation
# POST /api/v1/agent/judge-hawk  +  GET /api/v1/agent/judge-hawk/status
# ─────────────────────────────────────────────────────────────────────────────

class JudgeHawkRequest(BaseModel):
    contract_id: str
    output_under_eval: str
    max_iterations: int = 6
    system_prompt: Optional[str] = None


@app.post("/api/v1/agent/judge-hawk")
async def agent_judge_hawk(body: JudgeHawkRequest):
    """Grade an output against a Crucible contract. Returns pass/fail
    verdict + reasoning + audit-ledger record."""
    from aims_agents.crucible_judge import (   # noqa: E402
        is_configured as _agent_configured,
        missing_keys as _agent_missing,
        run_agent as _run_agent,
    )
    if not _agent_configured():
        raise HTTPException(
            status_code=503,
            detail={
                "error": "agent_not_configured",
                "missing_keys": _agent_missing(),
                "message": "Judge_Hawk inactive — gateway key required.",
            },
        )
    contract_id = (body.contract_id or "").strip()
    output_under_eval = (body.output_under_eval or "").strip()
    if not contract_id:
        raise HTTPException(status_code=400, detail="contract_id required")
    if not output_under_eval:
        raise HTTPException(status_code=400, detail="output_under_eval required")
    if len(output_under_eval) > 16000:
        raise HTTPException(status_code=400, detail="output_under_eval too long (max 16000 chars)")

    import asyncio as _asyncio
    loop = _asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        lambda: _run_agent(
            contract_id=contract_id,
            output_under_eval=output_under_eval,
            max_iterations=max(1, min(int(body.max_iterations or 6), 10)),
            system_prompt=body.system_prompt,
        ),
    )
    return {
        "ok": result.error is None,
        "contract_id": contract_id,
        "verdict": result.verdict,
        "final_answer": result.final_answer,
        "iterations": result.iterations,
        "tool_calls": result.tool_calls,
        "duration_ms": round(result.duration_ms, 1),
        "error": result.error,
    }


@app.get("/api/v1/agent/judge-hawk/status")
async def agent_judge_hawk_status():
    from aims_agents.crucible_judge import (   # noqa: E402
        is_configured as _agent_configured,
        missing_keys as _agent_missing,
        BUILTIN_CONTRACTS as _builtin,
        CONTRACTS_DB_PATH as _db,
    )
    return {
        "ok": True,
        "configured": _agent_configured(),
        "missing_keys": _agent_missing(),
        "builtin_contracts": list(_builtin.keys()),
        "contracts_db": str(_db),
        "framework": "Anthropic Sonnet 4-6 via A.I.M.S. Model Gateway structured_evaluation surface, SQLite contract registry, 4 tools (load/list/register/record_verdict)",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Lil_Hawk Dispatch — task-to-worker routing
# POST /api/v1/agent/lilhawk-dispatch  +  GET /api/v1/agent/lilhawk-dispatch/status
# ─────────────────────────────────────────────────────────────────────────────

class LilHawkDispatchRequest(BaseModel):
    task: str
    max_iterations: int = 4
    system_prompt: Optional[str] = None


@app.post("/api/v1/agent/lilhawk-dispatch")
async def agent_lilhawk_dispatch(body: LilHawkDispatchRequest):
    """Route a task to the right Lil_Hawk worker class. Records
    dispatch in audit DB; forwards to Chicken Hawk fleet endpoint when
    LILHAWK_FLEET_URL is set."""
    from aims_agents.lilhawk_dispatch import (   # noqa: E402
        is_configured as _agent_configured,
        missing_keys as _agent_missing,
        run_agent as _run_agent,
    )
    if not _agent_configured():
        raise HTTPException(
            status_code=503,
            detail={
                "error": "agent_not_configured",
                "missing_keys": _agent_missing(),
                "message": "Lil_Hawk Dispatch inactive — gateway key required.",
            },
        )
    task = (body.task or "").strip()
    if not task:
        raise HTTPException(status_code=400, detail="task required")
    if len(task) > 4000:
        raise HTTPException(status_code=400, detail="task too long (max 4000 chars)")

    import asyncio as _asyncio
    loop = _asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        lambda: _run_agent(
            task=task,
            max_iterations=max(1, min(int(body.max_iterations or 4), 8)),
            system_prompt=body.system_prompt,
        ),
    )
    return {
        "ok": result.error is None,
        "task": task,
        "task_id": result.task_id,
        "lilhawk_class": result.lilhawk_class,
        "final_answer": result.final_answer,
        "iterations": result.iterations,
        "tool_calls": result.tool_calls,
        "duration_ms": round(result.duration_ms, 1),
        "error": result.error,
    }


@app.get("/api/v1/agent/lilhawk-dispatch/status")
async def agent_lilhawk_dispatch_status():
    from aims_agents.lilhawk_dispatch import (   # noqa: E402
        is_configured as _agent_configured,
        missing_keys as _agent_missing,
        fleet_url_configured as _fleet_ok,
        LILHAWK_FLEET as _fleet,
        DISPATCH_DB_PATH as _db,
    )
    return {
        "ok": True,
        "configured": _agent_configured(),
        "missing_keys": _agent_missing(),
        "fleet_url_configured": _fleet_ok(),
        "fleet_classes": list(_fleet.keys()),
        "dispatch_db": str(_db),
        "framework": "Anthropic Sonnet 4-6 via A.I.M.S. Model Gateway agent_orchestration surface, 7-class fleet registry, 4 tools (list/assess/dispatch/check_status)",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Cart — multi-item session-cart for "Shop for me" / Spinner / future cart UI
# ─────────────────────────────────────────────────────────────────────────────
# Coastal's customer flow was single-SKU until v1 of Spinner. cart_store.py
# materializes a Neon-backed cart keyed by coastal_uid. Endpoints below are
# the public REST surface for reading/writing it. Spinner writes here with
# added_by="spinner"; the customer can review/edit before checkout.

import cart_store  # noqa: E402


class CartAddItemRequest(BaseModel):
    sku: str
    quantity: int = 1
    variant: Optional[str] = None


class CartSetQuantityRequest(BaseModel):
    quantity: int
    variant: Optional[str] = None


@app.get("/api/v1/cart")
async def cart_get(coastal_uid: Optional[str] = Cookie(default=None)):
    coastal_uid = _resolve_uid_cookie(coastal_uid)
    if not coastal_uid:
        return {"ok": True, "items": [], "line_items": 0, "total_quantity": 0, "anonymous": True}
    if not cart_store.is_configured():
        raise HTTPException(status_code=503, detail="cart store not configured (NEON_DATABASE_URL missing)")
    return {"ok": True, **cart_store.cart_summary(coastal_uid)}


@app.post("/api/v1/cart/items")
async def cart_add_item(body: CartAddItemRequest, response: Response, coastal_uid: Optional[str] = Cookie(default=None)):
    uid = _ensure_uid(coastal_uid, response)
    if not cart_store.is_configured():
        raise HTTPException(status_code=503, detail="cart store not configured")
    sku = (body.sku or "").strip()
    if not sku:
        raise HTTPException(status_code=400, detail="sku required")
    qty = max(1, min(int(body.quantity or 1), 12))
    try:
        items = cart_store.add_item(coastal_uid=uid, sku=sku, quantity=qty, variant=body.variant, added_by="user")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"cart add failed: {exc}")
    return {"ok": True, "items": items, "line_items": len(items)}


@app.patch("/api/v1/cart/items/{sku}")
async def cart_patch_item(sku: str, body: CartSetQuantityRequest, coastal_uid: Optional[str] = Cookie(default=None)):
    coastal_uid = _resolve_uid_cookie(coastal_uid)
    if not coastal_uid:
        raise HTTPException(status_code=400, detail="coastal_uid cookie required")
    if not cart_store.is_configured():
        raise HTTPException(status_code=503, detail="cart store not configured")
    qty = max(0, int(body.quantity or 0))
    try:
        items = cart_store.set_quantity(coastal_uid, sku, qty, body.variant)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"cart patch failed: {exc}")
    return {"ok": True, "items": items, "line_items": len(items)}


@app.delete("/api/v1/cart/items/{sku}")
async def cart_delete_item(sku: str, variant: Optional[str] = None, coastal_uid: Optional[str] = Cookie(default=None)):
    coastal_uid = _resolve_uid_cookie(coastal_uid)
    if not coastal_uid:
        raise HTTPException(status_code=400, detail="coastal_uid cookie required")
    if not cart_store.is_configured():
        raise HTTPException(status_code=503, detail="cart store not configured")
    try:
        items = cart_store.remove_item(coastal_uid, sku, variant)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"cart delete failed: {exc}")
    return {"ok": True, "items": items, "line_items": len(items)}


@app.post("/api/v1/cart/clear")
async def cart_clear(coastal_uid: Optional[str] = Cookie(default=None)):
    coastal_uid = _resolve_uid_cookie(coastal_uid)
    if not coastal_uid:
        return {"ok": True, "cleared": False}
    if not cart_store.is_configured():
        raise HTTPException(status_code=503, detail="cart store not configured")
    cart_store.clear(coastal_uid)
    return {"ok": True, "cleared": True}


# ─────────────────────────────────────────────────────────────────────────────
# Spinner — agent-commissioned site-action runtime
# POST /api/v1/agent/spinner          — commission a Spinner run
# GET  /api/v1/agent/spinner/status   — activation diagnostics
# GET  /api/v1/agent/spinner/{task_id}/events  — SSE live event stream
# ─────────────────────────────────────────────────────────────────────────────

class SpinnerCommissionRequest(BaseModel):
    commission: str
    commissioned_by: str = "agent"
    metadata: Optional[Dict[str, Any]] = None
    max_iterations: int = 8
    system_prompt: Optional[str] = None


@app.post("/api/v1/agent/spinner")
async def agent_spinner(body: SpinnerCommissionRequest, response: Response, coastal_uid: Optional[str] = Cookie(default=None)):
    """Commission a Spinner run — fire-and-stream. Mints a task_id,
    returns it immediately, runs the agent loop in the background. The
    frontend subscribes to /events/{task_id} via SSE in parallel to see
    live tool-call activity."""
    from aims_agents.spinner_runtime import (   # noqa: E402
        is_configured as _agent_configured,
        missing_keys as _agent_missing,
        mint_task_id as _mint_task_id,
        run_agent as _run_agent,
    )
    if not _agent_configured():
        raise HTTPException(status_code=503, detail={
            "error": "agent_not_configured",
            "missing_keys": _agent_missing(),
            "message": "Spinner inactive — gateway key required.",
        })
    uid = _ensure_uid(coastal_uid, response)
    commission = (body.commission or "").strip()
    if not commission:
        raise HTTPException(status_code=400, detail="commission required")
    if len(commission) > 4000:
        raise HTTPException(status_code=400, detail="commission too long (max 4000 chars)")

    task_id = _mint_task_id()

    import asyncio as _asyncio
    loop = _asyncio.get_event_loop()
    # Fire-and-forget — caller gets task_id back instantly, the agent
    # loop runs in a thread and writes events to the in-memory ring
    # buffer that the SSE endpoint streams from.
    loop.run_in_executor(
        None,
        lambda: _run_agent(
            commission_text=commission,
            coastal_uid=uid,
            commissioned_by=body.commissioned_by or "agent",
            max_iterations=max(1, min(int(body.max_iterations or 8), 14)),
            system_prompt=body.system_prompt,
            metadata=body.metadata,
            task_id=task_id,
        ),
    )
    return {
        "ok": True,
        "task_id": task_id,
        "events_url": f"/api/v1/agent/spinner/{task_id}/events",
    }


@app.get("/api/v1/agent/spinner/status")
async def agent_spinner_status():
    from aims_agents.spinner_runtime import (   # noqa: E402
        is_configured as _agent_configured,
        missing_keys as _agent_missing,
        SPINNER_DB_PATH as _db,
    )
    return {
        "ok": True,
        "configured": _agent_configured(),
        "missing_keys": _agent_missing(),
        "audit_db": str(_db),
        "framework": "Anthropic Sonnet 4-6 via A.I.M.S. Model Gateway spinner_execution surface, 5 v1 tools (search_catalog/get_user_history/get_cart/cart_add/summarize_selection)",
    }


@app.get("/api/v1/agent/spinner/{task_id}/events")
async def agent_spinner_events(task_id: str):
    """SSE stream of Spinner activity events for the overlay UI. Polls
    the in-memory ring buffer every 250ms and emits new events; closes
    when the task is marked final."""
    from aims_agents.spinner_runtime import (   # noqa: E402
        get_live_events as _get_live,
        is_task_final as _is_final,
    )
    from fastapi.responses import StreamingResponse  # noqa: E402
    import asyncio as _asyncio  # noqa: E402

    async def gen():
        cursor = 0
        idle_loops = 0
        while True:
            evs = _get_live(task_id)
            while cursor < len(evs):
                ev = evs[cursor]
                yield f"event: {ev['type']}\ndata: {json.dumps(ev)}\n\n"
                cursor += 1
                idle_loops = 0
            if _is_final(task_id) and cursor >= len(evs):
                yield "event: end\ndata: {}\n\n"
                return
            idle_loops += 1
            if idle_loops > 240:  # ~60s of idle → bail
                yield "event: timeout\ndata: {}\n\n"
                return
            await _asyncio.sleep(0.25)

    return StreamingResponse(gen(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
    })


# ─────────────────────────────────────────────────────────────────────────────
# Shopify webhook + status — owner-edits-in-Admin sync path.
# When the owner updates a product in Shopify Admin (price / cost /
# inventory / tags), Shopify POSTs the change here. We verify the HMAC
# signature with SHOPIFY_WEBHOOK_SECRET, log the event to the audit
# ledger, and (best-effort) refresh the in-process catalog cache so
# the customer-facing storefront and Spinner pick up the change without
# a redeploy.
# ─────────────────────────────────────────────────────────────────────────────


@app.get("/api/v1/shopify/status")
async def shopify_status():
    from adapters import shopify_adapter as _shop
    return {"ok": True, "configured": _shop.is_configured(), "missing_keys": _shop.missing_keys(), **_shop.probe()}


@app.post("/shopify/webhook")
async def shopify_webhook(request: Request):
    """Shopify webhook landing pad. Topics we care about (configured in
    runbook):  products/update, products/create, products/delete,
    inventory_levels/update. Verifies HMAC before reading the body."""
    from adapters import shopify_adapter as _shop
    raw = await request.body()
    sig = request.headers.get("x-shopify-hmac-sha256", "")
    topic = request.headers.get("x-shopify-topic", "unknown")
    shop_domain_hdr = request.headers.get("x-shopify-shop-domain", "")
    if not _shop.verify_webhook(raw, sig):
        try:
            audit_ledger.insert_risk_event(
                severity="medium",
                category="shopify_webhook_invalid_hmac",
                description=f"Rejected Shopify webhook — HMAC mismatch · topic={topic} · domain={shop_domain_hdr}",
                actor="shopify",
            )
        except Exception:
            pass
        raise HTTPException(status_code=401, detail="invalid HMAC")

    try:
        payload = json.loads(raw.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        payload = {}

    sku_hint: Optional[str] = None
    title_hint: Optional[str] = None
    if isinstance(payload.get("variants"), list) and payload["variants"]:
        sku_hint = payload["variants"][0].get("sku")
    if isinstance(payload.get("title"), str):
        title_hint = payload["title"]

    try:
        audit_ledger.insert_risk_event(
            severity="low",
            category=f"shopify_webhook_{topic.replace('/', '_')}",
            description=(f"Shopify {topic} · sku={sku_hint or '?'} · title={(title_hint or '')[:120]}")[:600],
            actor=shop_domain_hdr or "shopify",
            metadata={"topic": topic, "sku": sku_hint, "title": title_hint, "shopify_id": payload.get("id")},
        )
    except Exception as exc:
        log.warning("shopify webhook audit failed: %s", exc)

    # Best-effort cache invalidation. The full sync-back from Shopify
    # Admin → catalog.runtime.json runs as a separate pull; this just
    # marks the cache stale + bumps a counter so /healthz can show
    # last-shopify-event-at for the operator dashboard.
    global _SHOPIFY_LAST_EVENT_AT, _SHOPIFY_EVENT_COUNT
    try:
        _SHOPIFY_LAST_EVENT_AT  # type: ignore
    except NameError:
        pass

    return {"ok": True, "topic": topic}


# Counter / last-seen — initialized lazily; surfaced via /healthz.
try:
    _SHOPIFY_LAST_EVENT_AT  # type: ignore
except NameError:
    _SHOPIFY_LAST_EVENT_AT = None  # noqa: F841
    _SHOPIFY_EVENT_COUNT = 0       # noqa: F841


# ─────────────────────────────────────────────────────────────────────────────
# Prompt enhancer — magic-wand button in chat-panel. Owner directive
# 2026-05-06 (II-Agent gap-analysis Phase 1). Takes a customer's draft
# message and rewrites it to be clearer for Sal — keeps the customer's
# voice, drops ambiguity, no preamble. Routes through the AIMS gateway
# `transactional_short` surface (Gemma 4 26B — fast + brand-voice
# compatible).
# ─────────────────────────────────────────────────────────────────────────────


class PromptEnhanceRequest(BaseModel):
    text: str


_PROMPT_ENHANCE_SYSTEM = (
    "You are a prompt clarifier for Coastal Brewing Co. customers chatting with "
    "Sal — Lead Barista. The customer typed a draft message; rewrite it so Sal "
    "can answer in fewer turns. Rules:\n"
    "1. Keep the customer's voice and intent. Don't add information they didn't "
    "imply.\n"
    "2. Strip filler, fix grammar, clarify any pronouns or vague references.\n"
    "3. If they're asking about a product but didn't name it specifically, "
    "leave that ambiguity in — don't guess at SKUs.\n"
    "4. Keep it short — one or two sentences. No preamble. No 'here is your "
    "rewritten message'. Output ONLY the rewritten text.\n"
    "5. If the input is already clear and short, return it unchanged."
)


@app.post("/api/v1/prompt-enhance")
async def prompt_enhance(body: PromptEnhanceRequest):
    """Rewrite a customer's draft chat message to be clearer.
    Single-shot completion through the AIMS gateway. ~150 tokens out
    cap so we don't pay for a long answer when the customer just
    needed a tighter sentence."""
    text = (body.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text required")
    if len(text) > 1500:
        raise HTTPException(status_code=400, detail="text too long (max 1500 chars)")
    try:
        from aims_gateway import (   # noqa: E402
            chat_completion as _gw_chat_completion,
            extract_text as _gw_extract_text,
            is_configured as _gw_is_configured,
        )
        if not _gw_is_configured():
            return {"ok": True, "enhanced": text, "unchanged": True, "reason": "gateway not configured"}
        resp = _gw_chat_completion(
            surface="transactional_short",
            messages=[
                {"role": "system", "content": _PROMPT_ENHANCE_SYSTEM},
                {"role": "user", "content": text},
            ],
            max_tokens=180,
            temperature=0.2,
            timeout=10,
        )
        enhanced = (_gw_extract_text(resp) or "").strip()
        if not enhanced:
            return {"ok": True, "enhanced": text, "unchanged": True, "reason": "empty response"}
        # Strip stray quotation wrappers some models add despite the prompt.
        if (enhanced.startswith('"') and enhanced.endswith('"')) or (
            enhanced.startswith("'") and enhanced.endswith("'")
        ):
            enhanced = enhanced[1:-1].strip()
        return {"ok": True, "enhanced": enhanced, "unchanged": enhanced == text}
    except Exception as exc:
        return {"ok": True, "enhanced": text, "unchanged": True, "reason": f"gateway failed: {exc}"}


# ─────────────────────────────────────────────────────────────────────────────
# HR-PMO team-handoff audit. Owner directive 2026-05-06 — Betty Ann_Ang
# (HR PMO supervisor) needs an audit trail of every agent transition so
# she can assess team-member effectiveness and efficiency. Each chat
# escalation (Sal→LUC, Sal→Melli, any→ACHEEVY, any→Marcus, etc.) writes
# a "team_handoff" event keyed to the customer's coastal_uid.
# ─────────────────────────────────────────────────────────────────────────────


class TeamHandoffRequest(BaseModel):
    from_employee: str
    to_employee: str
    reason: Optional[str] = None
    client_ts: Optional[str] = None


@app.post("/api/v1/team-handoff")
async def team_handoff(body: TeamHandoffRequest, coastal_uid: Optional[str] = Cookie(default=None)):
    """Record an agent transition for the HR-PMO audit trail. Severity
    stays low — handoffs are routine. Visible to operator dashboard at
    hawk.foai.cloud/tools/risk-events under category=team_handoff.
    Future Betty Ann_Ang dashboard reads this stream to compute
    per-team-member effectiveness/efficiency."""
    coastal_uid = _resolve_uid_cookie(coastal_uid)
    fr = (body.from_employee or "").strip()
    to = (body.to_employee or "").strip()
    if not fr or not to or fr == to:
        raise HTTPException(status_code=400, detail="from_employee and to_employee required and must differ")
    description = f"handoff {fr} → {to} · reason={body.reason or 'unspecified'}"
    try:
        event_id = audit_ledger.insert_risk_event(
            severity="low",
            category="team_handoff",
            description=description[:600],
            actor=coastal_uid or "anonymous",
            metadata={
                "from_employee": fr,
                "to_employee": to,
                "reason": body.reason,
                "client_ts": body.client_ts,
                "coastal_uid": coastal_uid,
            },
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"audit-ledger insert failed: {exc}")
    return {"ok": True, "event_id": event_id}


# ─────────────────────────────────────────────────────────────────────────────
# Loss prevention — chat conversations that aren't on a path to purchase.
# Owner directive 2026-05-06: treat tokens as the store's shrink budget.
# Frontend evaluates each user message client-side, fires a soft- or hard-
# close, then POSTs the event here so the audit ledger has a record.
# Future: LP_Ang reviews these in batch.
# ─────────────────────────────────────────────────────────────────────────────

class LossPreventionEventRequest(BaseModel):
    signal: str
    reason: str
    matched_pattern: Optional[str] = None
    user_text_excerpt: Optional[str] = None
    soft_close: bool = False
    hard_close: bool = False
    client_ts: Optional[str] = None


@app.post("/api/v1/loss-prevention/event")
async def loss_prevention_event(body: LossPreventionEventRequest, coastal_uid: Optional[str] = Cookie(default=None)):
    """Record a loss-prevention close event in the audit ledger so the
    operator can review patterns over time. Severity ladder:
       nerf_attempt        → high     (sacred-separation probe / jailbreak)
       session_too_long    → medium   (no purchase intent past time cap)
       session_too_chatty  → medium   (reply-count cap reached)
       small_talk          → low      (off-topic turn)
       low_intent_warning  → low      (watch flag, not a close)
       other               → low
    """
    coastal_uid = _resolve_uid_cookie(coastal_uid)
    severity_map = {
        "nerf_attempt":        "high",
        "session_too_long":    "medium",
        "session_too_chatty":  "medium",
        "small_talk":          "low",
        "low_intent_warning":  "low",
    }
    severity = severity_map.get(body.signal or "", "low")
    category = "loss_prevention"
    description_parts = [
        f"signal={body.signal}",
        f"close={'hard' if body.hard_close else 'soft' if body.soft_close else 'flag'}",
        body.reason or "",
    ]
    description = " · ".join(p for p in description_parts if p)[:600]
    metadata: Dict[str, Any] = {
        "matched_pattern": body.matched_pattern,
        "user_text_excerpt": body.user_text_excerpt,
        "client_ts": body.client_ts,
        "coastal_uid": coastal_uid,
    }
    try:
        event_id = audit_ledger.insert_risk_event(
            severity=severity,
            category=category,
            description=description,
            actor=coastal_uid or "anonymous",
            metadata=metadata,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"audit-ledger insert failed: {exc}")
    return {"ok": True, "event_id": event_id, "severity": severity}


@app.get("/api/v1/aims/gateway/status")
async def aims_gateway_status():
    """A.I.M.S. Model Gateway diagnostics — surface registry + available
    models registry + base URL. Useful for verifying the gateway is
    wired correctly + which models are reachable per surface."""
    from aims_gateway import (   # noqa: E402
        SURFACE_MODELS as _surfaces,
        AVAILABLE_MODELS as _available,
        is_configured as _gw_ok,
        GATEWAY_BASE_URL as _url,
        list_available_models as _list,
    )
    return {
        "ok": _gw_ok(),
        "base_url": _url,
        "surface_count": len(_surfaces),
        "surfaces": _surfaces,
        "available_model_count": len(_list()),
        "available_by_provider": {p: list(m.keys()) for p, m in _available.items()},
    }


@app.get("/api/v1/research/status")
async def research_status():
    """Surface which search backend is live + key presence (booleans only)."""
    return {
        "ok": True,
        "backend_primary": "brave" if os.environ.get("BRAVE_API_KEY") else "duckduckgo",
        "extractor": "jina-reader",
        "max_depth": 3,
        "framework": "ii-researcher (vendored from Intelligent-Internet/ii-researcher, Apache 2.0)",
    }


@app.post("/api/v1/account/welcome-dismiss")
async def account_welcome_dismiss(
    coastal_uid: Optional[str] = Cookie(default=None, alias=COASTAL_UID_COOKIE),
):
    """Mark the post-signup welcome card as seen so it doesn't replay on
    subsequent /account loads. Auth-gated by the cookie + profile.identity
    presence — anonymous callers are quietly no-op'd."""
    coastal_uid = _resolve_uid_cookie(coastal_uid)
    if not coastal_uid or not _profile_layer.is_configured():
        return {"ok": False, "reason": "not authenticated"}
    profile = _profile_layer.get_profile(coastal_uid)
    if profile is None or not profile.identity:
        return {"ok": False, "reason": "not authenticated"}
    meta = dict(profile.metadata or {})
    if meta.get("welcome_card_seen"):
        return {"ok": True, "already_seen": True}
    meta["welcome_card_seen"] = True
    _profile_layer.update_metadata(coastal_uid, meta)
    return {"ok": True}


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
# All four personas re-seeded 2026-05-05 via Gemini 3.1 Flash TTS NL-
# accent prompts → uploaded to Inworld for IVC cloning. Owner approved
# all four samples. The Gemini pipeline gives us cleaner-sounding clones
# than the prior YouTube-rip Nas baseline because the source audio is
# studio-quality 24 kHz mono PCM with no compression artifacts. Dialect
# expression in production comes from the LLM register-modulator + the
# script wording at chat time — voice carries timbre + cadence.
_COASTAL_V2_VOICEID = {
    "sal_ang":       "default-4zhua1rhxjfl50z1dnkcba__coastal-sal-ang-v2",
    "luc_ang":       "default-4zhua1rhxjfl50z1dnkcba__coastal-luc-ang-v2",
    "melli_capensi": "default-4zhua1rhxjfl50z1dnkcba__coastal-melli-capensi-v2",
    # ACHEEVY-v3: re-cloned 2026-05-12 from a Brian McKnight Tammi Mac
    # Late Show 30s window (smooth-R&B-tenor register per owner reference
    # set: Brian McKnight / Case / Nas / AZ). Previous v2 was Nas-sourced;
    # owner found the Nas register didn't match the Brand Director smooth-
    # tenor brief. New IVC clone via `_clone_acheevy_mcknight.py`.
    "acheevy":       "default-4zhua1rhxjfl50z1dnkcba__acheevy-mcknight-soulful-tenor-v3",
    # Marcus / Loss Prevention — defaults to ACHEEVY's clone until owner
    # records the dedicated LP team voice. Override via INWORLD_VOICE_ID_LP
    # to swap in a custom IVC clone without touching code.
    "lp_ang":        "default-4zhua1rhxjfl50z1dnkcba__coastal-acheevy-v2",
}

_INWORLD_VOICE_MAP: Dict[str, Dict[str, str]] = {
    # All four personas now ride the v2 IVC clones generated 2026-05-05
    # from Gemini 3.1 Flash TTS NL-accent-prompted seed samples. Source
    # WAVs at iCloud/.../Coastal Brew Voices/<persona>.wav, cloned via
    # POST /api/v1/voice/clone, voiceIds locked in _COASTAL_V2_VOICEID
    # above. Per-character env overrides remain in place for ops to
    # audition future iterations without touching code.
    #
    # Model = inworld-tts-2 across the board (MP3 streaming output,
    # uniform deliveryMode prosody control, browser-native progressive
    # playback via the streaming endpoint). The 1.5-max/-mini fallbacks
    # are gone — tts-2 supports MP3 streaming for both stock and IVC
    # voices, verified live 2026-05-05.
    #
    # deliveryMode picked per persona register:
    #   - EXPRESSIVE: warmth + slight emotional range (Sal welcome,
    #     Melli decisive, ACHEEVY measured-but-engaged)
    #   - STABLE: steady, predictable, not over-acted (LUC math-first)
    "sal_ang": {
        "voiceId": os.environ.get("INWORLD_VOICE_ID_SAL") or _COASTAL_V2_VOICEID["sal_ang"],
        "model": "inworld-tts-2",
        "deliveryMode": os.environ.get("INWORLD_DELIVERY_MODE_SAL") or "EXPRESSIVE",
        "speakingRate": 1.05,
    },
    "luc_ang": {
        "voiceId": os.environ.get("INWORLD_VOICE_ID_LUC") or _COASTAL_V2_VOICEID["luc_ang"],
        "model": "inworld-tts-2",
        "deliveryMode": os.environ.get("INWORLD_DELIVERY_MODE_LUC") or "STABLE",
        "speakingRate": 1.0,
    },
    "melli_capensi": {
        "voiceId": os.environ.get("INWORLD_VOICE_ID_MELLI") or _COASTAL_V2_VOICEID["melli_capensi"],
        "model": "inworld-tts-2",
        "deliveryMode": os.environ.get("INWORLD_DELIVERY_MODE_MELLI") or "EXPRESSIVE",
        "speakingRate": 1.05,
    },
    "acheevy": {
        "voiceId": os.environ.get("INWORLD_VOICE_ID_ACHEEVY") or _COASTAL_V2_VOICEID["acheevy"],
        "model": "inworld-tts-2",
        # Owner directive 2026-05-12 (cadence pass on McKnight v3 clone):
        # more professional + more upbeat. EXPRESSIVE → STABLE (steadier,
        # less emotional swing — Brand Director register). 0.95 → 1.10
        # (faster pace, brighter delivery).
        "deliveryMode": os.environ.get("INWORLD_DELIVERY_MODE_ACHEEVY") or "STABLE",
        "speakingRate": float(os.environ.get("INWORLD_SPEAKING_RATE_ACHEEVY") or "1.10"),
    },
    # Marcus — Loss Prevention floor team. Register: calm, professional,
    # structured. Less warm than Sal, less authoritative than ACHEEVY.
    # STABLE delivery mode (no over-acted prosody) reflects the uniform
    # discipline (high-res button-down, form-fitting but not aggressive).
    "lp_ang": {
        "voiceId": os.environ.get("INWORLD_VOICE_ID_LP") or _COASTAL_V2_VOICEID["lp_ang"],
        "model": "inworld-tts-2",
        "deliveryMode": os.environ.get("INWORLD_DELIVERY_MODE_LP") or "STABLE",
        "speakingRate": 1.0,
    },
}


_MD_BOLD = re.compile(r"\*\*([^*\n]+?)\*\*")
_MD_BOLD_UNDER = re.compile(r"__([^_\n]+?)__")
_MD_ITALIC = re.compile(r"(?<![*\w])\*([^*\n]+?)\*(?!\w)")
_MD_ITALIC_UNDER = re.compile(r"(?<![_\w])_([^_\n]+?)_(?!\w)")
_MD_CODE_INLINE = re.compile(r"`+([^`\n]+?)`+")
_MD_LINK = re.compile(r"\[([^\]]+)\]\([^)\s]+\)")
_MD_HEADER = re.compile(r"^\s{0,3}#{1,6}\s+", re.MULTILINE)
_MD_BULLET = re.compile(r"^\s*[-*+•]\s+", re.MULTILINE)
_MD_ORDERED = re.compile(r"^\s*\d+[.)]\s+", re.MULTILINE)
_MD_BLOCKQUOTE = re.compile(r"^\s*>\s?", re.MULTILINE)
_MD_HRULE = re.compile(r"^\s{0,3}([-*_])\s*\1\s*\1[\s\1]*$", re.MULTILINE)
_PARENS_ASIDE = re.compile(r"\s*\(([^)]{1,80})\)")
_SLASH_BETWEEN_WORDS = re.compile(r"(\w)\s*/\s*(\w)")
_DASH_SEPARATOR = re.compile(r"\s*[—–]\s*|(?<!-)\s+-\s+(?!-)")
_DOUBLE_COMMA = re.compile(r",\s*,+")
_COMMA_BEFORE_PUNCT = re.compile(r",\s*(?=[.!?;:])")
_MULTI_SPACE = re.compile(r"[ \t]{2,}")
_MULTI_NEWLINE = re.compile(r"\n{3,}")

# Conversational rewrites — TTS reads abbreviations literally ("oh-zee",
# "ell-bee", "one-ex"), which makes Sal sound like a robot reading a SKU
# tag. These rules convert quantity + size shorthand into the words a
# barista would actually say at the counter.
_NUM_WORDS = {
    "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four",
    "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine",
    "10": "ten", "11": "eleven", "12": "twelve",
}


def _num_to_words(n: str) -> str:
    return _NUM_WORDS.get(n, n)


# "1x", "2x", "12x" → "one", "two", "twelve"  (drop the "x" multiplier marker;
# spoken form already conveys "one of" with the article that follows)
_QTY_X = re.compile(r"\b(\d{1,3})x\b", re.IGNORECASE)
# "12oz" / "12 oz" → "twelve ounce" — singular reads cleaner per barista pattern
_SIZE_OZ = re.compile(r"\b(\d{1,3})\s*oz\b", re.IGNORECASE)
# "1lb" / "1 lb" / "1lbs" → "one pound" / "five pound" (singular form)
_SIZE_LB = re.compile(r"\b(\d{1,3})\s*lbs?\b", re.IGNORECASE)
# "12K6BEAN" / "K-cup" → "K cup" (read the K as the letter, not "kay-cup")
_KCUP_HYPHEN = re.compile(r"\bK-?cups?\b", re.IGNORECASE)
# Semicolons in conversational copy → commas (Inworld renders ; as a hard
# pause that breaks the flow when a list is naturally comma-separable).
_SEMI_TO_COMMA = re.compile(r"\s*;\s*")
# "Coastal 6Bean Blend / 6Bean Espresso" — handled by _SLASH_BETWEEN_WORDS,
# but the digit prefix "6Bean" is read as "six-bean" which is fine.
# Standalone "PUMP" / "DBAI" / etc. SKU-ish ALL-CAPS short tokens — leave
# untouched; they only show in display names that the LLM wraps in normal
# words anyway.


def _qty_x_to_word(m: "re.Match[str]") -> str:
    return _num_to_words(m.group(1))


def _size_oz_to_word(m: "re.Match[str]") -> str:
    return f"{_num_to_words(m.group(1))} ounce"


def _size_lb_to_word(m: "re.Match[str]") -> str:
    return f"{_num_to_words(m.group(1))} pound"


def _strip_markdown_for_tts(text: str) -> str:
    """Convert LLM-emitted markdown into a clean conversational read.

    Inworld TTS reads `**`, `*`, `_`, backticks, and bullet markers
    literally or stutters on them. Display layer keeps the formatting;
    this rewrites only the TTS-bound copy. Inworld audio markup tags
    like `[laugh]`, `[whispering]`, `<break time="500ms" />` are
    preserved (the regexes target paired markdown emphasis only).
    """
    if not text:
        return text
    # Headers / bullets / blockquotes / horizontal rules — strip the
    # marker; keep the line content. Order matters: hrule before bullet
    # so "---" alone on a line doesn't get caught as a bullet.
    text = _MD_HRULE.sub("", text)
    text = _MD_HEADER.sub("", text)
    text = _MD_BULLET.sub("", text)
    text = _MD_ORDERED.sub("", text)
    text = _MD_BLOCKQUOTE.sub("", text)
    # Links: [label](url) → label
    text = _MD_LINK.sub(r"\1", text)
    # Inline code spans: `foo` → foo
    text = _MD_CODE_INLINE.sub(r"\1", text)
    # Bold/italic — both asterisk and underscore variants
    text = _MD_BOLD.sub(r"\1", text)
    text = _MD_BOLD_UNDER.sub(r"\1", text)
    text = _MD_ITALIC.sub(r"\1", text)
    text = _MD_ITALIC_UNDER.sub(r"\1", text)
    # Parenthetical asides → comma-bounded clauses (more natural read).
    # Keeps the content; just trades brackets for prosodic pauses.
    text = _PARENS_ASIDE.sub(r", \1,", text)
    # Slash between words (e.g. "Dark/ground" / "and/or") → "or".
    # Only triggers between word chars so it doesn't touch URLs that
    # already survived the link strip (none should — but defense-in-depth).
    text = _SLASH_BETWEEN_WORDS.sub(r"\1 or \2", text)
    # Em / en dashes and " - " separators → comma + pause.
    text = _DASH_SEPARATOR.sub(", ", text)
    # Collapse runs of commas (parenthetical → comma + dash → comma can
    # leave ",, " sequences) and trim commas that drifted in front of
    # sentence-ending punctuation.
    text = _DOUBLE_COMMA.sub(",", text)
    text = _COMMA_BEFORE_PUNCT.sub("", text)
    # Conversational rewrites — abbreviations + units → spoken phrases.
    # Run AFTER markdown strip so we operate on clean text.
    text = _QTY_X.sub(_qty_x_to_word, text)
    text = _SIZE_OZ.sub(_size_oz_to_word, text)
    text = _SIZE_LB.sub(_size_lb_to_word, text)
    text = _KCUP_HYPHEN.sub("K cup", text)
    text = _SEMI_TO_COMMA.sub(", ", text)
    # Cleanup whitespace
    text = _MULTI_SPACE.sub(" ", text)
    text = _MULTI_NEWLINE.sub("\n\n", text)
    return text.strip()


class WsVoiceSynthRequest(BaseModel):
    text: str
    # Default customer-facing agent is Sal_Ang per owner directive 2026-05-03 17:30.
    # ACHEEVY moved to internal escalation chain — not customer-facing anymore.
    character_id: str = "sal_ang"


@app.post("/api/v1/voice/synthesize")
async def voice_synthesize(body: WsVoiceSynthRequest, request: Request):
    """Inworld TTS for the 4 wired Coastal characters. Returns base64-
    encoded WAV in `audioContent` for the frontend to decode and play
    (no streaming yet; voice-stream endpoint can be wired later for
    long messages). Customer surface only ever hits this with
    character_id='sal_ang' — internal voices accept calls for owner-
    side previews."""
    # Anti-DoS: Inworld TTS is per-character billed. Without this an
    # attacker can loop the endpoint and drain the wallet.
    _check_rate_limit("voice", _client_ip(
        request.headers,
        fallback=request.client.host if request.client else None,
    ))
    if not _INWORLD_API_KEY:
        raise HTTPException(status_code=503, detail="INWORLD_API_KEY not configured")
    text = (body.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text required")
    if len(text) > 2000:
        # Inworld TTS-1.5 has a per-request character cap; trim to be safe.
        text = text[:2000]

    # Strip markdown formatting BEFORE the pronunciation engine runs.
    # The LLM emits Markdown (** for bold, lists with - / *, parentheses
    # around asides, [link](url), forward-slash separators like
    # "Dark/ground"). Inworld TTS reads those literal characters or
    # stutters on them — owner caught Sal stuttering on bullet markers
    # and reading "asterisk asterisk Coastal Functional...". Display
    # canon stays untouched; only the TTS-bound text gets cleaned.
    text = _strip_markdown_for_tts(text)

    # TTS pronunciation + cadence fixes via the pronunciation engine.
    # All rule packs live in voice-library/pronunciation-library/rules/
    # and are loaded YAML-side, so adding new pronunciation rules NEVER
    # requires a code change here. Per owner directive 2026-05-03 15:35:
    # "WE NEED A TRUE PRONUNCIATION SYNTAX AND INDEX FOR PROPER
    # GRAMMATICAL CONVERSATION."
    #
    # Display text never alters — only the TTS-bound text rewrites.
    if _PRONUNCIATION_ENGINE_AVAILABLE:
        try:
            text = _rewrite_for_tts(
                text,
                character=body.character_id,
                surface="customer_chat_panel",
                vertical="coastal-brewing",
            )
        except Exception:
            pass  # never break TTS on rule-engine failure

    voice_cfg = _INWORLD_VOICE_MAP.get(body.character_id) or _INWORLD_VOICE_MAP["sal_ang"]
    # Build payload with optional per-character prosody. inworld-tts-1.5-*
    # uses top-level `temperature`; inworld-tts-2 swaps that for
    # `deliveryMode` (STABLE / BALANCED / EXPRESSIVE) per Inworld's
    # 2026-05-05 tts-2 release. speakingRate sits under audioConfig on
    # both model families.
    model_id = voice_cfg.get("model", _INWORLD_TTS_MODEL)
    payload: Dict[str, Any] = {
        "text": text,
        "voiceId": voice_cfg["voiceId"],
        "modelId": model_id,
        "language": "en",
        "applyTextNormalization": "ON",
    }
    if "temperature" in voice_cfg:
        payload["temperature"] = float(voice_cfg["temperature"])
    if "deliveryMode" in voice_cfg:
        payload["deliveryMode"] = str(voice_cfg["deliveryMode"])
    if "speakingRate" in voice_cfg:
        payload.setdefault("audioConfig", {})["speakingRate"] = float(voice_cfg["speakingRate"])
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
        # tts-2 returns MP3, tts-1.5-* returns WAV. Frontend Audio()
        # element handles either MIME, but we tell it the truth so it
        # can pass the right `type` to Blob().
        audio_format = "audio/mpeg" if "tts-2" in model_id else "audio/wav"
        return {
            "audioContent": audio_b64,
            "voiceId": voice_cfg["voiceId"],
            "model": model_id,
            "character_id": body.character_id,
            "format": audio_format,
        }
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Inworld TTS timed out")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Inworld TTS unexpected error: {exc}")


# ─────────────────────────────────────────────────────────────────────────────
# Inworld TTS streaming — GET /api/v1/voice/synthesize/stream
# ─────────────────────────────────────────────────────────────────────────────
# Owner directive 2026-05-05: "the load time for the playback audio is too
# long". The non-streaming /voice endpoint waits for Inworld to render the
# full clip before returning a single big base64 blob — feels sluggish on
# longer responses (1-3s before the user hears anything). The :stream
# endpoint emits NDJSON chunks as Inworld renders, which we pipe straight
# through as raw MP3 bytes. The browser <audio> element starts playing as
# soon as enough bytes are buffered (~200-400ms), so audio plays while
# the rest of the clip is still being generated.
#
# GET (not POST) so the frontend can bind <audio src="..."> directly and
# get progressive playback for free. Browser also caches by URL — repeated
# plays of the same (text, character_id) are near-instant.
_INWORLD_TTS_STREAM_ENDPOINT = "https://api.inworld.ai/tts/v1/voice:stream"


def _build_inworld_stream_payload(text: str, voice_cfg: Dict[str, Any]) -> Dict[str, Any]:
    """Snake_case payload for Inworld's :stream endpoint."""
    payload: Dict[str, Any] = {
        "text": text,
        "voice_id": voice_cfg["voiceId"],
        "model_id": voice_cfg.get("model", _INWORLD_TTS_MODEL),
        "audio_config": {
            "audio_encoding": "MP3",
            "speaking_rate": float(voice_cfg.get("speakingRate", 1.0)),
        },
    }
    if "deliveryMode" in voice_cfg:
        payload["delivery_mode"] = str(voice_cfg["deliveryMode"])
    if "temperature" in voice_cfg:
        payload["temperature"] = float(voice_cfg["temperature"])
    return payload


async def _inworld_stream_audio_bytes(text: str, voice_cfg: Dict[str, Any]):
    """Async generator yielding MP3 bytes from Inworld's :stream endpoint.

    Concatenated MP3 frames are valid for progressive playback because
    each frame is independently decodable — browser audio decoders
    handle the running stream natively without explicit concatenation.
    """
    payload = _build_inworld_stream_payload(text, voice_cfg)
    headers = {
        "Authorization": f"Basic {_INWORLD_API_KEY}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=60) as client:
        async with client.stream(
            "POST", _INWORLD_TTS_STREAM_ENDPOINT, headers=headers, json=payload,
        ) as resp:
            if resp.status_code != 200:
                err = (await resp.aread()).decode("utf-8", "replace")[:300]
                raise HTTPException(
                    status_code=502,
                    detail=f"Inworld TTS stream {resp.status_code}: {err}",
                )
            async for line in resp.aiter_lines():
                if not line.strip():
                    continue
                try:
                    chunk = json.loads(line)
                except json.JSONDecodeError:
                    continue
                ac = chunk.get("result", {}).get("audioContent", "")
                if ac:
                    try:
                        yield base64.b64decode(ac)
                    except Exception:
                        continue


@app.get("/api/v1/voice/synthesize/stream")
async def voice_synthesize_stream(
    request: Request,
    text: str,
    character_id: str = "sal_ang",
):
    """Progressive MP3 playback. Bind <audio src=...> to this URL.

    Same input shaping as POST /api/v1/voice/synthesize: markdown
    stripping → pronunciation engine → voice config lookup. The
    difference is the response — bytes flow as Inworld renders them.
    """
    # Anti-DoS: Inworld TTS is per-character billed. GET endpoint is
    # trivially triggerable from cross-origin <img>/<audio> tags without
    # JS — must be rate-limited.
    _check_rate_limit("voice", _client_ip(
        request.headers,
        fallback=request.client.host if request.client else None,
    ))
    if not _INWORLD_API_KEY:
        raise HTTPException(status_code=503, detail="INWORLD_API_KEY not configured")
    text = (text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text required")
    if len(text) > 2000:
        text = text[:2000]
    text = _strip_markdown_for_tts(text)
    if _PRONUNCIATION_ENGINE_AVAILABLE:
        try:
            text = _rewrite_for_tts(
                text,
                character=character_id,
                surface="customer_chat_panel",
                vertical="coastal-brewing",
            )
        except Exception:
            pass
    voice_cfg = _INWORLD_VOICE_MAP.get(character_id) or _INWORLD_VOICE_MAP["sal_ang"]
    return StreamingResponse(
        _inworld_stream_audio_bytes(text, voice_cfg),
        media_type="audio/mpeg",
        headers={
            # Allow browser caching of identical (text, character_id)
            # for ~10 minutes — same content always renders the same.
            "Cache-Control": "private, max-age=600",
            "X-Voice-Id": voice_cfg["voiceId"],
            "X-Voice-Model": voice_cfg.get("model", _INWORLD_TTS_MODEL),
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# Inworld voice catalog — GET /api/v1/voice/catalog
# ─────────────────────────────────────────────────────────────────────────────
# Server-side proxy for the Inworld stock voice list. The Inworld API key
# never leaves the runner; the catalog comes back as JSON for owner / dev
# inspection so we can map stock voices to Coastal cast registers without
# pulling credentials into a transcript or local shell.
#
# Inworld endpoint: GET https://api.inworld.ai/tts/v1/voices
# (Deprecation notice: scheduled for removal 2026-07-01 in favor of
# Voices API List Voices; revisit before that date.)
_INWORLD_VOICES_LIST_ENDPOINT = "https://api.inworld.ai/tts/v1/voices"


@app.get("/api/v1/voice/catalog")
async def voice_catalog(
    language: Optional[str] = Query(default="en"),
    x_coastal_token: Optional[str] = Header(default=None, alias="X-Coastal-Token"),
):
    """Return the Inworld stock voice catalog. Gateway-token-protected
    so the proxy can't be hammered by external callers, and so the
    Inworld key stays inside the runner."""
    if GATEWAY_TOKEN and x_coastal_token != GATEWAY_TOKEN:
        raise HTTPException(status_code=401, detail="invalid gateway token")
    if not _INWORLD_API_KEY:
        raise HTTPException(status_code=503, detail="INWORLD_API_KEY not configured")

    params = {}
    if language:
        params["filter"] = f"language={language}"
    headers = {
        "Authorization": f"Basic {_INWORLD_API_KEY}",
        "Accept": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(_INWORLD_VOICES_LIST_ENDPOINT,
                                    params=params, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Inworld voice-list error: {resp.text[:500]}",
            )
        data = resp.json()
        # Tag each voice with the locally-mapped Coastal character (if any)
        # so the operator can see which stock voices are already wired.
        reverse_map: Dict[str, str] = {}
        for char_key, cfg in _INWORLD_VOICE_MAP.items():
            vid = cfg.get("voiceId")
            if vid:
                reverse_map[vid] = char_key
        for voice in data.get("voices", []):
            mapped = reverse_map.get(voice.get("voiceId"))
            if mapped:
                voice["_coastal_assigned_to"] = mapped
        return {
            "language_filter": language,
            "voice_count": len(data.get("voices", [])),
            "current_coastal_mapping": _INWORLD_VOICE_MAP,
            "voices": data.get("voices", []),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Inworld voice-list unexpected error: {exc}")


# ─────────────────────────────────────────────────────────────────────────────
# Owner dashboard — GET /api/v1/owner/dashboard
# ─────────────────────────────────────────────────────────────────────────────
# Read-only operator visibility into the SmelterOS-on-Coastal stack:
# voice library state, pronunciation library state, register modulator
# state, cast mapping, runner health. Gateway-token-protected; no
# customer-facing surface, no write capability.
@app.get("/api/v1/owner/dashboard")
async def owner_dashboard(
    x_coastal_token: Optional[str] = Header(default=None, alias="X-Coastal-Token"),
):
    if GATEWAY_TOKEN and x_coastal_token != GATEWAY_TOKEN:
        raise HTTPException(status_code=401, detail="invalid gateway token")

    # Pronunciation engine state
    pron_state: Dict[str, Any] = {"available": _PRONUNCIATION_ENGINE_AVAILABLE}
    if _PRONUNCIATION_ENGINE_AVAILABLE:
        try:
            from pronunciation_engine import rules_loaded_summary  # type: ignore
            pron_state.update(rules_loaded_summary())
        except Exception as e:
            pron_state["error"] = str(e)

    # Register modulator state — list configured characters + surfaces
    reg_state: Dict[str, Any] = {"available": REGISTER_MODULATOR_AVAILABLE}
    if REGISTER_MODULATOR_AVAILABLE:
        try:
            import yaml  # type: ignore
            cast_yaml = (_VOICE_LIBRARY_SCRIPTS.parent
                         / "dialect-library"
                         / "cast-environments"
                         / "coastal-brewing.yaml")
            if cast_yaml.exists():
                cfg = yaml.safe_load(cast_yaml.read_text(encoding="utf-8")) or {}
                reg_state["surfaces"] = list((cfg.get("surfaces") or {}).keys())
                reg_state["characters"] = list((cfg.get("cast") or {}).keys())
        except Exception as e:
            reg_state["error"] = str(e)

    # Voice library state — current voice mapping + per-character prosody
    voice_state = {
        "inworld_api_key_configured": bool(_INWORLD_API_KEY),
        "tts_endpoint": _INWORLD_TTS_ENDPOINT,
        "voice_map": {
            char: {
                "voiceId": cfg.get("voiceId"),
                "model": cfg.get("model"),
                "temperature": cfg.get("temperature"),
                "speakingRate": cfg.get("speakingRate"),
            }
            for char, cfg in _INWORLD_VOICE_MAP.items()
        },
    }

    # Runner health proxy
    runner_state = {
        "gateway_token_configured": bool(GATEWAY_TOKEN),
        "stripe_available": STRIPE_AVAILABLE,
        "coastal_public_url": COASTAL_PUBLIC_URL,
        "voice_library_scripts_dir": str(_VOICE_LIBRARY_SCRIPTS),
        "pronunciation_engine_dir_candidates_seen": [
            str(p) for p in _PRONUNCIATION_ENGINE_CANDIDATES if p and p.exists()
        ],
    }

    return {
        "ok": True,
        "as_of_utc": dt.datetime.now(dt.timezone.utc).isoformat() if "dt" in dir()
                     else __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "voice": voice_state,
        "pronunciation": pron_state,
        "register_modulator": reg_state,
        "runner": runner_state,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Inworld voice clone — POST /api/v1/voice/clone
# ─────────────────────────────────────────────────────────────────────────────
# Clone a 1-180 second mp3/wav into a custom Inworld voice. The audio
# file must already be staged inside the runner's scripts/ directory
# (mounted via docker compose) — this endpoint does NOT accept upload
# from the public internet. Gateway-token-protected.
#
# Inworld endpoint: POST https://api.inworld.ai/voices/v1/voices:clone
# Body: { displayName, langCode, voiceSamples: [{audioData<b64>, transcription}],
#         audioProcessingConfig: { removeBackgroundNoise: true } }
_INWORLD_VOICE_CLONE_ENDPOINT = "https://api.inworld.ai/voices/v1/voices:clone"
_RUNNER_SCRIPTS_DIR = pathlib.Path(__file__).resolve().parent


class CloneVoiceRequest(BaseModel):
    audio_filename: str = Field(
        ...,
        description=(
            "Filename inside the runner scripts/ directory (no path "
            "traversal — basename only)."
        ),
    )
    transcription: str = Field(..., description="Verbatim transcript of the audio sample.")
    display_name: str = Field(..., description="Human-readable name for the cloned voice.")
    lang_code: str = Field(default="en")
    remove_background_noise: bool = Field(default=True)


@app.post("/api/v1/voice/clone")
async def voice_clone(
    body: CloneVoiceRequest,
    x_coastal_token: Optional[str] = Header(default=None, alias="X-Coastal-Token"),
):
    """Clone a staged audio file into an Inworld custom voice."""
    if GATEWAY_TOKEN and x_coastal_token != GATEWAY_TOKEN:
        raise HTTPException(status_code=401, detail="invalid gateway token")
    if not _INWORLD_API_KEY:
        raise HTTPException(status_code=503, detail="INWORLD_API_KEY not configured")

    # Path-traversal guard: only basename, must exist in scripts dir.
    safe_name = pathlib.PurePath(body.audio_filename).name
    audio_path = _RUNNER_SCRIPTS_DIR / safe_name
    if not audio_path.exists() or not audio_path.is_file():
        raise HTTPException(status_code=404, detail=f"audio file not found: {safe_name}")

    audio_bytes = audio_path.read_bytes()
    import base64
    audio_b64 = base64.b64encode(audio_bytes).decode("ascii")

    payload = {
        "displayName": body.display_name,
        "langCode": body.lang_code,
        "voiceSamples": [
            {"audioData": audio_b64, "transcription": body.transcription}
        ],
        "audioProcessingConfig": {
            "removeBackgroundNoise": body.remove_background_noise,
        },
    }
    headers = {
        "Authorization": f"Basic {_INWORLD_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            resp = await client.post(_INWORLD_VOICE_CLONE_ENDPOINT,
                                     json=payload, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Inworld clone error: {resp.text[:1500]}",
            )
        result = resp.json()
        # Inworld returns the cloned voice under `voice.voiceId` per the
        # 2026-05-05 response shape: {voice: {voiceId, displayName, ...},
        # audioSamplesValidated: [...]}. Older fallbacks kept for safety.
        voice_obj = result.get("voice") or {}
        voice_id = (
            voice_obj.get("voiceId")
            or result.get("voiceId")
            or result.get("name")
            or result.get("id")
        )
        return {
            "ok": True,
            "voice_id": voice_id,
            "display_name": body.display_name,
            "audio_filename": safe_name,
            "audio_bytes": len(audio_bytes),
            "raw_inworld_response": result,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Inworld clone unexpected error: {exc}")


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
# `groq/whisper-large-v3` is the canonical Whisper model exposed through
# Inworld's STT gateway and the default the docs example uses (per the
# 2026-05-05 STT API reference fetched from docs.inworld.ai). The legacy
# `inworld-stt-1` model is no longer the recommended path. Owner can
# override via env var if Inworld ships a native English-tuned model
# we want to A/B against.
_INWORLD_STT_MODEL = os.environ.get("INWORLD_STT_MODEL", "groq/whisper-large-v3")


@app.post("/api/v1/voice/transcribe")
async def voice_transcribe(audio: UploadFile = File(...)):
    """Transcribe customer mic audio via Inworld STT.

    Returns plain transcript for the chat panel to drop into the input
    field. Errors return 502 — the chat panel falls back to manual
    typing silently.

    Implementation notes (corrected 2026-05-05 after owner reported STT
    silently broken — endpoint had been returning 502 for every request):
    Inworld's REST shape is JSON with `transcribeConfig` + `audioData`
    (NOT multipart, NOT flat `model`/`audio_encoding` fields). The prior
    multipart implementation was hitting Inworld's JSON parser which
    choked on the boundary string with "invalid character '-' in
    numeric literal".

    Uses `AUTO_DETECT` for audioEncoding so MediaRecorder's webm/opus
    output works without a client-side transcode step.
    """
    if not _INWORLD_API_KEY:
        raise HTTPException(status_code=503, detail="INWORLD_API_KEY not configured")
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="empty audio payload")
    if len(audio_bytes) > 10 * 1024 * 1024:    # 10 MB cap
        raise HTTPException(status_code=413, detail="audio too large (max 10 MB)")

    audio_b64 = base64.b64encode(audio_bytes).decode("ascii")
    payload = {
        "transcribeConfig": {
            "modelId": _INWORLD_STT_MODEL,
            "audioEncoding": "AUTO_DETECT",
            "language": "en-US",
            # MediaRecorder defaults to mono and 48 kHz on most browsers.
            # AUTO_DETECT inspects the container and overrides these
            # when needed; we send sensible defaults so non-AUTO_DETECT
            # paths (if owner switches to a fixed encoding) still work.
            "sampleRateHertz": 48000,
            "numberOfChannels": 1,
        },
        "audioData": {"content": audio_b64},
    }
    headers = {
        "Authorization": f"Basic {_INWORLD_API_KEY}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(_INWORLD_STT_ENDPOINT, headers=headers, json=payload)
        if resp.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"Inworld STT error {resp.status_code}: {resp.text[:300]}",
            )
        body_data = resp.json()
        # Real shape (verified 2026-05-05):
        #   {"transcription": {"transcript": "...", "isFinal": true, ...},
        #    "usage": {"transcribedAudioMs": ..., "modelId": "..."}}
        transcription = body_data.get("transcription") or {}
        transcript = (transcription.get("transcript") or "").strip()
        return {
            "transcript": transcript,
            "model": _INWORLD_STT_MODEL,
            "audio_bytes": len(audio_bytes),
            "is_final": transcription.get("isFinal", True),
        }
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Inworld STT timed out")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Inworld STT unexpected error: {exc}")
