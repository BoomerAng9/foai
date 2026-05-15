"""
Chicken Hawk Gateway — FastAPI application entrypoint.

Wave 2: Rewired to use DeerFlow 2.0 orchestration harness.
Chicken Hawk is the lead agent, Lil_Hawks are sub-agents.
DeerFlow handles task decomposition, dispatch, and coordination.
The gateway exposes /chat, /health, /hawks, and /api/chicken-hawk/live-plan (SSE).
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncIterator

import structlog
import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from pydantic import BaseModel, Field
from starlette.middleware.base import BaseHTTPMiddleware

from config import get_settings
from event_bus import EventBus, TaskEvent, TaskStatus, get_event_bus
from hermes_client import HermesClient, HermesNotConfigured
from router import HawkResponse, Router

# Pre-flight wiring (Wave 1, ecosystem-wide): NemoClaw policy gate + magic-link auth.
# Both modules already implement their FastAPI routers; main.py mounts them below.
from auth import (  # noqa: E402
    router as auth_router,
    _send_telegram,
    get_owner_from_session,
    OWNER_EMAILS,
    SESSION_COOKIE,
)
from nemoclaw import router as nemoclaw_router, _evaluate, _append_event  # noqa: E402
from public_chat import router as public_chat_router  # noqa: E402

# Phase-1 wiring (2026-05-11 PM build session): Lane A/B/C action handlers,
# Sqwaadrun fleet proxy, schedule list/run-once. See ~/foai/chicken-hawk/
# CLAUDE.md + FOAI Project/registry/chicken-hawk-action-registry.yaml.
from lane_actions import (  # noqa: E402
    trigger_lane_a,
    trigger_lane_b,
    fire_lane_c5_snapshot,
)
from schedule_actions import list_all_schedules, run_schedule_once  # noqa: E402
from sqwaadrun_proxy import (  # noqa: E402
    list_sqwaadrun_hawks,
    get_active_missions as sqwaadrun_get_active_missions,
    get_recent_missions as sqwaadrun_get_recent_missions,
    get_cache_stats as sqwaadrun_get_cache_stats,
)
from lane_views import get_lane_cache, get_lane_drift  # noqa: E402
from missions_views import list_missions, get_mission_spec  # noqa: E402
from press_actions import daemon_start as press_daemon_start_handler  # noqa: E402
from press_actions import dry_run as press_dry_run_handler  # noqa: E402
from press_actions import auth_test as press_auth_test_handler  # noqa: E402
from press_views import (  # noqa: E402
    get_heartbeat as press_get_heartbeat,
    get_receipts as press_get_receipts,
    get_auth_list as press_get_auth_list,
    get_token_index as press_get_token_index,
)
from deploy_actions import (  # noqa: E402
    deploy_hawk_ui as deploy_hawk_ui_handler,
    deploy_gateway as deploy_gateway_handler,
    deploy_sqwaadrun as deploy_sqwaadrun_handler,
    deploy_rollback as deploy_rollback_handler,
    read_history as deploy_read_history,
)
from builder_actions import build_site as build_site_handler, get_stack_presets  # noqa: E402
from sandbox_actions import (  # noqa: E402
    dispatch_sandbox_job as sandbox_dispatch_handler,
    get_job_status as sandbox_get_job_status,
    list_recent_jobs as sandbox_list_recent_jobs,
)

# ---------------------------------------------------------------------------
# Structured logging setup
# ---------------------------------------------------------------------------
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer() if os.getenv("LOG_LEVEL", "INFO") == "DEBUG"
        else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(
        logging.getLevelName(os.getenv("LOG_LEVEL", "INFO"))
    ),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

logger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Application lifecycle
# ---------------------------------------------------------------------------
_router: Router | None = None
_event_bus: EventBus | None = None
_hermes: HermesClient | None = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    global _router, _event_bus, _hermes
    settings = get_settings()
    _event_bus = get_event_bus()
    _router = Router(settings, event_bus=_event_bus)
    _hermes = HermesClient()
    logger.info(
        "gateway_started",
        provider=settings.llm_provider,
        hermes_configured=_hermes.configured,
    )
    yield
    if _event_bus:
        await _event_bus.close()
    if _router:
        await _router.aclose()
    if _hermes:
        await _hermes.aclose()
    logger.info("gateway_stopped")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
_is_production = os.getenv("ENVIRONMENT", "production").lower() == "production"

app = FastAPI(
    title="Chicken Hawk Gateway",
    description=(
        "Intent-routing gateway for the Chicken Hawk AI operations platform. "
        "Classifies natural-language requests and dispatches them to the "
        "appropriate Lil_Hawk specialist agent via DeerFlow 2.0 orchestration."
    ),
    version="2.0.0",
    lifespan=lifespan,
    # Disable Swagger/OpenAPI docs in production
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    openapi_url=None if _is_production else "/openapi.json",
)

_ALLOWED_ORIGINS = [
    "https://perform.foai.cloud",
    "https://cti.foai.cloud",
    "https://deploy.foai.cloud",
    "https://foai.cloud",
    "https://hawk.foai.cloud",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ALLOW_ORIGINS", "").split(",") if os.getenv("CORS_ALLOW_ORIGINS") else _ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Security headers middleware
# ---------------------------------------------------------------------------
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to every response.

    Owner-tier paths additionally get Cache-Control: no-store so the browser
    bfcache (back/forward cache) doesn't restore a stale 'signed in' shell
    after the cookie has expired or been cleared. Without this, navigating
    away from /tools and pressing Back rendered a cached HTML body whose
    embedded API calls then 401'd — appearing to drop the session.
    """

    # Paths that must never be cached by browsers, intermediaries, or the
    # Next.js standalone runtime. Match by prefix.
    _NO_STORE_PREFIXES = (
        "/me",
        "/tools",
        "/run",
        "/route",
        "/check",
        "/risk-event",
        "/risk-events",
        "/audit/",
        "/hawks",
        "/admin/",
        "/login",
        "/api/chicken-hawk/",
        # Phase-1 owner-tier endpoints (2026-05-11 PM)
        "/schedules",
        "/sqwaadrun/",
        # Phase-2 owner-tier endpoints (2026-05-11 PM)
        "/lanes/",
        # Phase-3 owner-tier endpoints (2026-05-11 PM)
        "/press/",
        # Phase-4 owner-tier endpoints (2026-05-11 PM)
        "/deploy/",
        # Phase-4b owner-tier endpoints (2026-05-11 PM)
        "/builder/",
        # Phase-5 owner-tier endpoints (2026-05-11 PM)
        "/missions",
        # Phase-1C sandbox dispatch (2026-05-14)
        "/sandbox/",
    )

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Server"] = "ACHEEVY"
        path = request.url.path
        if any(path == p.rstrip("/") or path.startswith(p) for p in self._NO_STORE_PREFIXES):
            response.headers["Cache-Control"] = "no-store, must-revalidate, private"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response


app.add_middleware(SecurityHeadersMiddleware)


# ---------------------------------------------------------------------------
# Pre-flight wired routers (Wave 1, ecosystem-wide)
#
# `nemoclaw_router` exposes /check, /risk-event, /risk-events (Bearer-gated)
# `auth_router`     exposes /login, /login/verify, /logout, /me (magic-link)
#
# These were defined as APIRouters but never mounted. Wave 1 mounts them so
# every project that calls hawk.foai.cloud inherits policy gating + auth.
# ---------------------------------------------------------------------------
app.include_router(nemoclaw_router, prefix="", tags=["NemoClaw"])
app.include_router(auth_router, prefix="", tags=["Auth"])
app.include_router(public_chat_router, prefix="", tags=["PublicChat"])


# ---------------------------------------------------------------------------
# Auth dependency
# ---------------------------------------------------------------------------
def _get_gateway_secret() -> str:
    """Return the GATEWAY_SECRET from settings."""
    return get_settings().gateway_secret.get_secret_value()


async def require_auth(request: Request) -> None:
    """
    Require a valid Bearer token (GATEWAY_SECRET) or session cookie.
    Raises 401 if authentication fails.
    """
    secret = _get_gateway_secret()

    # Check Authorization header
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer ") and auth_header[7:] == secret:
        return

    # Check query param fallback (for internal tools)
    token_param = request.query_params.get("token")
    if token_param and token_param == secret:
        return

    # Check owner-tier magic-link session cookie (JWT, bound to one of the
    # OWNER_EMAILS aliases — Telegram-bound / project-bound / executive).
    ch_session = request.cookies.get(SESSION_COOKIE)
    if ch_session:
        owner = get_owner_from_session(ch_session)
        if owner and OWNER_EMAILS and owner in OWNER_EMAILS:
            return

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing or invalid authentication",
        headers={"WWW-Authenticate": "Bearer"},
    )


# ---------------------------------------------------------------------------
# Tool Chest GUI — hawk.foai.cloud
#
# Customer-facing chat at /  (anonymous, persona-prepended via /api/public/chat)
# Operator Tool Chest at /tools/*  (auth-gated via require_auth)
#
# Templates rendered as static FileResponse; static assets mounted at /static.
# ---------------------------------------------------------------------------
_GATEWAY_DIR = Path(__file__).resolve().parent
_TEMPLATES_DIR = _GATEWAY_DIR / "templates"
_STATIC_DIR = _GATEWAY_DIR / "static"

if _STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(_STATIC_DIR)), name="static")


def _serve(template: str) -> FileResponse:
    path = _TEMPLATES_DIR / template
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Template '{template}' not found")
    return FileResponse(str(path), media_type="text/html")


@app.get("/", include_in_schema=False)
async def customer_chat_page() -> FileResponse:
    """Public-facing Chicken Hawk chat. Anonymous, rate-limited."""
    if not get_settings().tool_chest_enabled:
        raise HTTPException(status_code=503, detail="Tool Chest disabled")
    return _serve("customer_chat.html")


@app.get("/tools", include_in_schema=False, dependencies=[Depends(require_auth)])
async def tools_index_page() -> FileResponse:
    return _serve("tools_index.html")


@app.get("/tools/tuning-loop", include_in_schema=False, dependencies=[Depends(require_auth)])
async def tools_tuning_loop_page() -> FileResponse:
    return _serve("tools_tuning_loop.html")


@app.get("/tools/nemoclaw", include_in_schema=False, dependencies=[Depends(require_auth)])
async def tools_nemoclaw_page() -> FileResponse:
    return _serve("tools_nemoclaw.html")


@app.get("/tools/hermes", include_in_schema=False, dependencies=[Depends(require_auth)])
async def tools_hermes_page() -> FileResponse:
    return _serve("tools_hermes.html")


@app.get("/tools/lil-hawks", include_in_schema=False, dependencies=[Depends(require_auth)])
async def tools_lil_hawks_page() -> FileResponse:
    return _serve("tools_lil_hawks.html")


@app.get("/tools/cron", include_in_schema=False, dependencies=[Depends(require_auth)])
async def tools_cron_page() -> FileResponse:
    return _serve("tools_cron.html")


@app.get("/tools/audit", include_in_schema=False, dependencies=[Depends(require_auth)])
async def tools_audit_page() -> FileResponse:
    return _serve("tools_audit.html")


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=32_768, description="Natural-language input")
    session_id: str | None = Field(None, description="Optional session identifier for continuity")


class ChatResponse(BaseModel):
    hawk: str = Field(..., description="Lil_Hawk that handled the request")
    content: str = Field(..., description="Reviewed response content")
    reviewed: bool = Field(..., description="Whether the response passed the review gate")
    trace_id: str = Field(..., description="Unique trace identifier for this request")
    elapsed_ms: float = Field(..., description="End-to-end latency in milliseconds")
    metadata: dict = Field(default_factory=dict)


class HealthResponse(BaseModel):
    status: str
    version: str = "2.0.0"
    orchestrator: str = "deerflow"
    hawks: dict[str, str]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health", tags=["Observability"])
async def health() -> dict:
    """Return minimal public health status."""
    return {"status": "ok"}


@app.get("/internal/health", response_model=HealthResponse, tags=["Observability"])
async def internal_health(_: None = Depends(require_auth)) -> HealthResponse:
    """Return detailed health status (requires GATEWAY_SECRET auth)."""
    if _router is None:
        raise HTTPException(status_code=503, detail="Gateway not initialised")
    hawk_health = await _router.health_check()
    gateway_status = "ok" if all(v == "ok" for v in hawk_health.values()) else "degraded"
    return HealthResponse(
        status=gateway_status,
        orchestrator="deerflow-2.0",
        hawks=hawk_health,
    )


@app.post("/chat", response_model=ChatResponse, tags=["Chat"])
async def chat(request: ChatRequest, _: None = Depends(require_auth)) -> ChatResponse:
    """
    Accept a natural-language message, route it to the best Lil_Hawk,
    and return a reviewed, evidence-backed response.
    """
    if _router is None:
        raise HTTPException(status_code=503, detail="Gateway not initialised")

    try:
        result: HawkResponse = await _router.route(
            message=request.message,
            session_id=request.session_id,
        )
    except Exception as exc:
        logger.error("chat_error", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Routing failed: {exc}",
        ) from exc

    return ChatResponse(
        hawk=result.hawk,
        content=result.content,
        reviewed=result.reviewed,
        trace_id=result.trace_id,
        elapsed_ms=result.elapsed_ms,
        metadata=result.metadata,
    )


@app.get("/hawks", tags=["Observability"], dependencies=[Depends(require_auth)])
async def list_hawks() -> dict:
    """Return the configured Lil_Hawk endpoints."""
    settings = get_settings()
    return {"hawks": list(settings.hawk_endpoints.keys())}


# ---------------------------------------------------------------------------
# /run action handler — Wave 1 ecosystem-wide contract
#
# Any FOAI project (Coastal, Per|Form, AIMS, future apps) POSTs:
#   {"action": str, "payload": dict}
# The gateway evaluates against NemoClaw and routes to:
#   200 {ok, verdict: "allow",     ...} on allow + dispatch
#   202 {ok, verdict: "escalate",  ...} on escalate (owner Telegram pinged)
#   403 {ok, verdict: "denied",    ...} on deny    (risk event recorded)
# Receipts are written to an in-memory ledger keyed by task_id (Wave 1).
# Wave 2 migrates the ledger to AuditLedger (renamed Hermes SQLite).
# ---------------------------------------------------------------------------
import asyncio
import time as _time
import uuid as _uuid
from datetime import datetime, timezone

# Track B Phase 2 wiring (2026-05-15): dual-write receipts to Neon via
# the runtime/audit_ledger writer library. _RUN_LEDGER stays as the fast
# in-memory cache for /audit/{task_id}; Neon is the durable backup.
# Neon-write failures are LOGGED + Telegram-alerted but NEVER fail the
# parent /run response (fail-soft per the Coastal Protection directive
# memory feedback_secure_coastal_in_all_ways_during_foai_work_2026_05_15).
# When FOAI_AUDIT_LEDGER_URL is unset, the Neon path silently no-ops
# and the gateway keeps running on _RUN_LEDGER alone.
import os as _os

try:
    from runtime.audit_ledger import (  # noqa: E402
        AuditEvent as _AuditEvent,
        get_audit_engine as _get_audit_engine,
        write_event as _audit_write_event,
    )
    _AUDIT_LEDGER_AVAILABLE = True
except ImportError as _audit_import_err:
    logger.warning("audit_ledger_import_failed", error=str(_audit_import_err))
    _AUDIT_LEDGER_AVAILABLE = False
    # Bind placeholder names so monkeypatch + attribute lookups don't fail
    # when the runtime library isn't on the import path.
    _AuditEvent = None  # type: ignore[assignment,misc]
    _get_audit_engine = None  # type: ignore[assignment]
    _audit_write_event = None  # type: ignore[assignment]

# In-memory receipt ledger (Wave 1, still authoritative for /audit/{task_id}
# reads to avoid latency). Keyed by task_id; bounded buffer.
_RUN_LEDGER: list[dict] = []
_RUN_LEDGER_MAX = 5000
_RUN_LEDGER_LOCK = asyncio.Lock()


class RunRequest(BaseModel):
    action: str = Field(..., min_length=1, max_length=128)
    payload: dict = Field(default_factory=dict)


def _receipt_to_audit_event_kwargs(receipt: dict) -> dict:
    """Project an in-memory receipt into the audit_ledger.write_event kwargs.

    receipt has shape: {receipt_id, task_id, action, actor, verdict, reason,
    basis, decided_at, elapsed_ms, action_result?, ...}. The audit ledger
    schema wants: agent, action, payload, customer_uid, timestamp_event.
    """
    actor = receipt.get("actor") or "agent"
    # If the actor is the generic "agent" placeholder, attribute to Chicken_Hawk
    agent = actor if actor != "agent" else "Chicken_Hawk"

    # Parse decided_at back into a datetime for timestamp_event
    decided_at_raw = receipt.get("decided_at")
    try:
        ts_event = datetime.fromisoformat(decided_at_raw) if decided_at_raw else None
    except (ValueError, TypeError):
        ts_event = None

    # customer_uid: explicit on issue_coupon receipts (mapped from payload's custee_id)
    # — extracted earlier in run_action. Otherwise None.
    customer_uid = receipt.get("custee_id") or None

    # Payload: every field except identity/timestamp/customer_uid (which are
    # promoted to top-level columns)
    payload = {
        k: v
        for k, v in receipt.items()
        if k not in {"receipt_id", "task_id", "action", "actor", "decided_at", "custee_id"}
    }

    return {
        "agent": agent,
        "action": receipt["action"],
        "payload": payload,
        "customer_uid": customer_uid,
        "timestamp_event": ts_event,
    }


def _persist_to_neon(receipt: dict) -> None:
    """Best-effort durable persistence to Neon foai.audit_ledger.

    Fail-soft: every exception is logged + (optionally) Telegram-pinged but
    NEVER propagates to the caller. The gateway response always reflects
    the in-memory write succeeding.
    """
    if not _AUDIT_LEDGER_AVAILABLE:
        return
    if not _os.environ.get("FOAI_AUDIT_LEDGER_URL") and not _os.environ.get("NEON_DATABASE_URL"):
        # No Neon target configured — silent no-op (Phase 2 owner-blocking
        # item #1: owner provisions FOAI_AUDIT_LEDGER_URL before deploy).
        return

    try:
        kwargs = _receipt_to_audit_event_kwargs(receipt)
        _audit_write_event(**kwargs)
    except Exception as exc:  # pragma: no cover — defensive top-level
        logger.warning(
            "audit_ledger_neon_write_failed",
            receipt_id=receipt.get("receipt_id"),
            error=str(exc),
        )
        # Telegram alert is best-effort; never raises. _send_telegram is
        # already imported at module top. Only attempt to schedule the alert
        # when a running event loop is available — checking first avoids
        # constructing the coroutine in a sync context (which would emit a
        # RuntimeWarning: coroutine never awaited).
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return
        try:
            loop.create_task(
                _send_telegram(
                    f"⚠️ audit_ledger Neon write failed for receipt "
                    f"{receipt.get('receipt_id')}: {exc}"
                )
            )
        except Exception:
            pass


async def _record_run_receipt(receipt: dict) -> None:
    """In-memory append (fast, never fails) + best-effort Neon dual-write."""
    async with _RUN_LEDGER_LOCK:
        _RUN_LEDGER.append(receipt)
        if len(_RUN_LEDGER) > _RUN_LEDGER_MAX:
            del _RUN_LEDGER[: len(_RUN_LEDGER) - _RUN_LEDGER_MAX]
    # Dual-write to Neon AFTER the in-memory append so a Neon outage never
    # delays the gateway response.
    _persist_to_neon(receipt)


@app.post("/run", tags=["Run"])
async def run_action(req: RunRequest, _: None = Depends(require_auth)) -> JSONResponse:
    """Execute an action through the NemoClaw policy gate.

    Caller (FOAI agent) sends {action, payload}. Gateway maps `action` to
    NemoClaw `action_type`, evaluates, and either dispatches, escalates,
    or denies. Always writes a receipt to the in-memory ledger.
    """
    started = _time.perf_counter()
    task_id = req.payload.get("task_id") or req.payload.get("session_id") or f"task_{_uuid.uuid4().hex[:12]}"
    risk_tags = req.payload.get("risk_tags") or []
    approval_id = req.payload.get("approval_id")
    actor = req.payload.get("actor") or "agent"

    verdict = _evaluate(req.action, risk_tags, approval_id)
    decided_at = datetime.now(timezone.utc).isoformat()
    receipt: dict = {
        "receipt_id": f"rcpt_{_uuid.uuid4().hex[:16]}",
        "task_id": task_id,
        "action": req.action,
        "actor": actor,
        "verdict": verdict["verdict"],
        "reason": verdict["reason"],
        "basis": verdict["basis"],
        "decided_at": decided_at,
    }

    if verdict["verdict"] == "deny":
        # Record blocked-action attempt as a risk event, return 403.
        _append_event({
            "event_id": f"risk_{_uuid.uuid4().hex[:16]}",
            "severity": "high",
            "category": "blocked_action_attempt",
            "description": f"NemoClaw denied '{req.action}': {verdict['reason']}",
            "task_id": task_id,
            "actor": actor,
            "metadata": {"action": req.action, "risk_tags": risk_tags},
            "recorded_at": decided_at,
        })
        receipt["elapsed_ms"] = (_time.perf_counter() - started) * 1000
        await _record_run_receipt(receipt)
        return JSONResponse(
            status_code=403,
            content={
                "ok": False,
                "verdict": "denied",
                "message": "NemoClaw denied this action.",
                "detail": verdict,
                "receipt": receipt,
            },
        )

    if verdict["verdict"] == "escalate":
        # Notify owner via Telegram (auth._send_telegram); 202 pending approval.
        try:
            await _send_telegram(
                f"⚠️ Approval needed for action '{req.action}' (task {task_id}).\n"
                f"Reason: {verdict['reason']}"
            )
        except Exception as exc:
            logger.warning("escalate_telegram_failed", error=str(exc))
        receipt["elapsed_ms"] = (_time.perf_counter() - started) * 1000
        await _record_run_receipt(receipt)
        return JSONResponse(
            status_code=202,
            content={
                "ok": False,
                "verdict": "escalated",
                "message": "Owner approval required; routed to Telegram.",
                "detail": verdict,
                "receipt": receipt,
            },
        )

    # ---------------------------------------------------------------------------
    # Action-specific dispatch (Wave 2).  Each block executes after NemoClaw
    # allows and records its own fields into the receipt + response body.
    # Fall-through to the generic allow response at the bottom.
    # ---------------------------------------------------------------------------

    # --- issue_coupon ---------------------------------------------------
    # Issues a Coastal-specific discount code.  The runner-side spinner_tools
    # validates actor authority + 30-day rate-limit before reaching here.
    # This layer: double-checks allow-list, generates a unique promo code, and
    # returns the code for LUC to relay to the Custee.
    #
    # Stripe integration note: when STRIPE_SECRET_KEY is configured, swap the
    # generated code block with stripe.Coupon.create() + stripe.PromotionCode.
    # The response envelope shape is intentionally identical so spinner_tools
    # reads `stripe_coupon_id` / `promotion_code` unchanged in both modes.
    # ---------------------------------------------------------------------------
    if req.action == "issue_coupon":
        COASTAL_COUPON_ALLOW_LIST = {
            "TRY-ME":    {"type": "percent", "value": 100, "description": "Cost-recovery sample"},
            "WELCOME10": {"type": "percent", "value": 10,  "description": "First-order welcome"},
            "BREW20":    {"type": "percent", "value": 20,  "description": "Subscriber promo"},
            "FREESHIP":  {"type": "fixed",   "value": 0,   "description": "Free shipping"},
        }
        coupon_code = req.payload.get("coupon_code", "")
        custee_id   = req.payload.get("custee_id", "")
        actor_tier  = req.payload.get("actor_tier", "")

        if coupon_code not in COASTAL_COUPON_ALLOW_LIST:
            receipt["elapsed_ms"] = (_time.perf_counter() - started) * 1000
            receipt["action_result"] = "denied_off_list"
            await _record_run_receipt(receipt)
            return JSONResponse(
                status_code=403,
                content={
                    "ok": False,
                    "verdict": "denied",
                    "message": f"Coupon '{coupon_code}' is not on the Coastal allow-list.",
                    "receipt": receipt,
                },
            )

        # Generate a unique per-Custee promotion code.
        # Format: {BASE_CODE}-{custee_hash8}-{ts_hex8}
        # Example: TRY-ME-A3B1C9D2-1F4E8A0B
        # When Stripe is configured: replace with stripe.PromotionCode.create(...)
        import hashlib as _hashlib
        custee_hash = _hashlib.sha256(custee_id.encode()).hexdigest()[:8].upper()
        ts_hex = hex(int(_time.time()))[2:].upper().zfill(8)
        promo_code = f"{coupon_code}-{custee_hash}-{ts_hex}"

        # Redemption URL: if STEPPER_ESCALATION_FORM_URL is set for Paperform,
        # use it as the checkout entry point with the promo code as a URL param.
        # Otherwise fall back to the storefront with a query param.
        stepper_url = os.getenv("COASTAL_PAPERFORM_URL", "") or os.getenv("STEPPER_ESCALATION_FORM_URL", "")
        if stepper_url:
            redemption_url = f"{stepper_url}?promo={promo_code}"
        else:
            redemption_url = f"https://brewing.foai.cloud/cart?promo={promo_code}"

        coupon_meta = COASTAL_COUPON_ALLOW_LIST[coupon_code]
        receipt["elapsed_ms"] = (_time.perf_counter() - started) * 1000
        receipt["action_result"] = "coupon_issued"
        receipt["coupon_code"] = coupon_code
        receipt["promo_code"] = promo_code
        await _record_run_receipt(receipt)
        return JSONResponse(
            status_code=200,
            content={
                "ok": True,
                "verdict": "allow",
                "stripe_coupon_id": promo_code,   # protocol compat with spinner_tools
                "promotion_code":   promo_code,
                "redemption_url":   redemption_url,
                "coupon_type":      coupon_meta["type"],
                "coupon_value":     coupon_meta["value"],
                "coupon_description": coupon_meta["description"],
                "note": (
                    "Give this code to the Custee: they apply it at checkout. "
                    "Code is unique to this Custee and expires when rate-limit window resets."
                ),
                "receipt": receipt,
            },
        )

    # --- Phase-1 lane + schedule actions ---------------------------------
    # All four call internal services (Sqwaadrun gateway, CTI Hub admin
    # endpoint, Print_Press CLI). NemoClaw has already allowed; we attach
    # the upstream service's slim-projection result to the receipt body.
    # ---------------------------------------------------------------------
    if req.action == "lane_a_trigger":
        result = await trigger_lane_a(req.payload)
        receipt["elapsed_ms"] = (_time.perf_counter() - started) * 1000
        receipt["action_result"] = result
        await _record_run_receipt(receipt)
        return JSONResponse(
            status_code=200 if result.get("ok") else 502,
            content={"ok": result.get("ok", False), "verdict": "allow", "detail": result, "receipt": receipt},
        )

    if req.action == "lane_b_trigger":
        result = await trigger_lane_b(req.payload)
        receipt["elapsed_ms"] = (_time.perf_counter() - started) * 1000
        receipt["action_result"] = result
        await _record_run_receipt(receipt)
        return JSONResponse(
            status_code=200 if result.get("ok") else 502,
            content={"ok": result.get("ok", False), "verdict": "allow", "detail": result, "receipt": receipt},
        )

    if req.action == "lane_c5_snapshot_fire":
        result = await fire_lane_c5_snapshot(req.payload)
        receipt["elapsed_ms"] = (_time.perf_counter() - started) * 1000
        receipt["action_result"] = {k: v for k, v in result.items() if k != "snapshot"}
        await _record_run_receipt(receipt)
        return JSONResponse(
            status_code=200 if result.get("ok") else 502,
            content={"ok": result.get("ok", False), "verdict": "allow", "detail": result, "receipt": receipt},
        )

    if req.action == "schedule_run_once":
        result = await run_schedule_once(req.payload)
        receipt["elapsed_ms"] = (_time.perf_counter() - started) * 1000
        receipt["action_result"] = result
        await _record_run_receipt(receipt)
        return JSONResponse(
            status_code=200 if result.get("ok") else 502,
            content={"ok": result.get("ok", False), "verdict": "allow", "detail": result, "receipt": receipt},
        )

    # --- Phase-3 Print_Press control actions ----------------------------
    if req.action == "press_daemon_start":
        result = await press_daemon_start_handler(req.payload)
        receipt["elapsed_ms"] = (_time.perf_counter() - started) * 1000
        receipt["action_result"] = result
        await _record_run_receipt(receipt)
        return JSONResponse(
            status_code=200 if result.get("ok") else 502,
            content={"ok": result.get("ok", False), "verdict": "allow", "detail": result, "receipt": receipt},
        )

    if req.action == "press_dry_run":
        result = await press_dry_run_handler(req.payload)
        receipt["elapsed_ms"] = (_time.perf_counter() - started) * 1000
        receipt["action_result"] = {k: v for k, v in result.items() if k != "stdout"}
        await _record_run_receipt(receipt)
        return JSONResponse(
            status_code=200 if result.get("ok") else 502,
            content={"ok": result.get("ok", False), "verdict": "allow", "detail": result, "receipt": receipt},
        )

    if req.action == "press_auth_test":
        result = await press_auth_test_handler(req.payload)
        receipt["elapsed_ms"] = (_time.perf_counter() - started) * 1000
        receipt["action_result"] = result
        await _record_run_receipt(receipt)
        return JSONResponse(
            status_code=200 if result.get("ok") else 502,
            content={"ok": result.get("ok", False), "verdict": "allow", "detail": result, "receipt": receipt},
        )

    # --- Phase-4 deploy actions (NemoClaw escalates first call → Telegram → owner approves) ---
    if req.action == "deploy_hawk_ui":
        result = await deploy_hawk_ui_handler(req.payload)
        receipt["elapsed_ms"] = (_time.perf_counter() - started) * 1000
        receipt["action_result"] = {k: v for k, v in result.items() if k not in ("stdout_excerpt",)}
        await _record_run_receipt(receipt)
        return JSONResponse(
            status_code=200 if result.get("ok") else 502,
            content={"ok": result.get("ok", False), "verdict": "allow", "detail": result, "receipt": receipt},
        )

    if req.action == "deploy_gateway":
        result = await deploy_gateway_handler(req.payload)
        receipt["elapsed_ms"] = (_time.perf_counter() - started) * 1000
        receipt["action_result"] = {k: v for k, v in result.items() if k not in ("stdout_excerpt",)}
        await _record_run_receipt(receipt)
        return JSONResponse(
            status_code=200 if result.get("ok") else 502,
            content={"ok": result.get("ok", False), "verdict": "allow", "detail": result, "receipt": receipt},
        )

    if req.action == "deploy_sqwaadrun":
        result = await deploy_sqwaadrun_handler(req.payload)
        receipt["elapsed_ms"] = (_time.perf_counter() - started) * 1000
        receipt["action_result"] = {k: v for k, v in result.items() if k not in ("stdout_excerpt",)}
        await _record_run_receipt(receipt)
        return JSONResponse(
            status_code=200 if result.get("ok") else 502,
            content={"ok": result.get("ok", False), "verdict": "allow", "detail": result, "receipt": receipt},
        )

    if req.action.startswith("deploy_rollback"):
        result = await deploy_rollback_handler(req.payload)
        receipt["elapsed_ms"] = (_time.perf_counter() - started) * 1000
        receipt["action_result"] = {k: v for k, v in result.items() if k not in ("stdout_excerpt",)}
        await _record_run_receipt(receipt)
        return JSONResponse(
            status_code=200 if result.get("ok") else 502,
            content={"ok": result.get("ok", False), "verdict": "allow", "detail": result, "receipt": receipt},
        )

    # --- Phase-4b builder — Chicken Hawk creates full-stack sites ----------
    # Safe to allow without escalation: writes to ~/chicken-hawk-workspaces
    # only. Ship-to-production requires explicit /tools/deploy which IS
    # owner-Telegram-confirmed.
    if req.action == "build_site":
        result = await build_site_handler(req.payload)
        receipt["elapsed_ms"] = (_time.perf_counter() - started) * 1000
        receipt["action_result"] = result
        await _record_run_receipt(receipt)
        return JSONResponse(
            status_code=200 if result.get("ok") else 400,
            content={"ok": result.get("ok", False), "verdict": "allow", "detail": result, "receipt": receipt},
        )

    # --- Phase-1C sandbox_dispatch (2026-05-14) --------------------------
    # Routes heavy-compute / isolated-execution jobs into aims-open-sandbox
    # (Hono service on AIMS Core VPS port 4400, reachable via WireGuard or
    # the URL configured in AIMS_OPEN_SANDBOX_URL). NemoClaw allowed; we
    # attach a slim execution projection to the receipt body. Full output
    # available via GET /sandbox/executions/{id} (see read endpoints below).
    # ---------------------------------------------------------------------
    if req.action == "sandbox_dispatch":
        result = await sandbox_dispatch_handler(req.payload)
        receipt["elapsed_ms"] = (_time.perf_counter() - started) * 1000
        receipt["action_result"] = result
        await _record_run_receipt(receipt)
        return JSONResponse(
            status_code=200 if result.get("ok") else 502,
            content={"ok": result.get("ok", False), "verdict": "allow", "detail": result, "receipt": receipt},
        )

    # Verdict == allow (generic fall-through for actions without a specific dispatch block).
    receipt["elapsed_ms"] = (_time.perf_counter() - started) * 1000
    await _record_run_receipt(receipt)
    return JSONResponse(
        status_code=200,
        content={
            "ok": True,
            "verdict": "allow",
            "message": "Action allowed; receipt recorded.",
            "detail": verdict,
            "receipt": receipt,
        },
    )


# ---------------------------------------------------------------------------
# Phase-1 read endpoints (2026-05-11 PM)
#
# /schedules         — merged Sqwaadrun + Print_Press schedule list
# /sqwaadrun/hawks   — 20-Hawk ops fleet roster (distinct from the 11
#                       customer-facing helpers at /hawks)
# ---------------------------------------------------------------------------


@app.get("/schedules", tags=["Schedules"], dependencies=[Depends(require_auth)])
async def list_schedules() -> dict:
    """Merged schedule registry: Sqwaadrun scrape cadence + Print_Press publish cadence."""
    return await list_all_schedules()


@app.get("/sqwaadrun/hawks", tags=["Sqwaadrun"], dependencies=[Depends(require_auth)])
async def list_sqwaadrun_hawks_endpoint() -> dict:
    """20-Hawk Sqwaadrun ops-fleet roster (Lil_Feed/Diff/Schema/.../Telegram).

    Distinct from /hawks (11 customer-facing Lil_Hawk helpers). Renders in
    hawk-ui /tools/lil-hawks under the 'Ops Fleet' tab.
    """
    return await list_sqwaadrun_hawks()


# ---------------------------------------------------------------------------
# Phase-2 lane view endpoints (2026-05-11 PM)
#
# /lanes/{id}/cache  — latest cached output for the lane
# /lanes/{id}/drift  — drift-guard report (Python stages vs JSON spec)
# ---------------------------------------------------------------------------


@app.get("/lanes/{lane_id}/cache", tags=["Lanes"], dependencies=[Depends(require_auth)])
async def get_lane_cache_endpoint(lane_id: str) -> dict:
    """Latest cached payload for a lane.

    lane-a   → ~/.cache/sqwaadrun/acheevy-monitor/latest.json
    lane-b   → ~/.cache/sqwaadrun/lane-b-fallen-apps/latest.json
    lane-c5  → ~/.cache/cti-hub/mindedge-snapshot/latest.json

    Falls back to HTTP proxy against the Sqwaadrun gateway when filesystem
    miss + the lane is Sqwaadrun-backed. Returns graceful 'unavailable'
    payload so the hawk-ui renders empty state.
    """
    return await get_lane_cache(lane_id)


@app.get("/lanes/{lane_id}/drift", tags=["Lanes"], dependencies=[Depends(require_auth)])
async def get_lane_drift_endpoint(lane_id: str) -> dict:
    """Drift-guard report: Python IMPLEMENTED_STAGES vs JSON spec pipeline[].stage.

    status='ok' when implemented is a subset of spec (intended shape — score
    and synthesize stages run externally to Sqwaadrun). status='drift' when
    Python claims a stage the spec has dropped. status='spec_not_found' when
    the iCloud-workspace spec file isn't reachable from the host.
    """
    return get_lane_drift(lane_id)


# ---------------------------------------------------------------------------
# Phase-3 Print_Press view endpoints (2026-05-11 PM)
#
# /press/heartbeat   — daemon liveness
# /press/receipts    — delivery audit tail (?n=N, default 20, max 200)
# /press/auth        — configured platforms (no secrets — CLI omits them)
# /press/tokens      — caller-token presence index (NEVER returns secrets)
# ---------------------------------------------------------------------------


@app.get("/press/heartbeat", tags=["Press"], dependencies=[Depends(require_auth)])
async def get_press_heartbeat() -> dict:
    """Print_Press daemon liveness. HTTP-first, file-fallback."""
    return await press_get_heartbeat()


@app.get("/press/receipts", tags=["Press"], dependencies=[Depends(require_auth)])
async def get_press_receipts(n: int = 20) -> dict:
    """Last N Print_Press delivery receipts (audit trail)."""
    return await press_get_receipts(n=n)


@app.get("/press/auth", tags=["Press"], dependencies=[Depends(require_auth)])
async def get_press_auth() -> dict:
    """Configured publishing platforms — names only, never secrets."""
    return await press_get_auth_list()


@app.get("/press/tokens", tags=["Press"], dependencies=[Depends(require_auth)])
async def get_press_tokens() -> dict:
    """HMAC caller-token presence index. Never returns the secret value."""
    return press_get_token_index()


# ---------------------------------------------------------------------------
# Phase-4 deploy history endpoint (2026-05-11 PM)
# ---------------------------------------------------------------------------


@app.get("/deploy/history", tags=["Deploy"], dependencies=[Depends(require_auth)])
async def get_deploy_history(n: int = 20) -> dict:
    """Recent deploy receipts (timestamp, target, verdict, elapsed, exit_code)."""
    return deploy_read_history(n=n)


# ---------------------------------------------------------------------------
# Phase-4b builder endpoint (2026-05-11 PM)
# ---------------------------------------------------------------------------


@app.get("/sandbox/executions", tags=["Sandbox"], dependencies=[Depends(require_auth)])
async def list_sandbox_executions(limit: int = 25) -> dict:
    """List the most recent sandbox executions (slim projection)."""
    return await sandbox_list_recent_jobs(limit=limit)


@app.get("/sandbox/executions/{execution_id}", tags=["Sandbox"], dependencies=[Depends(require_auth)])
async def get_sandbox_execution(execution_id: str) -> dict:
    """Fetch a single sandbox execution by id (full slim projection)."""
    return await sandbox_get_job_status(execution_id)


@app.get("/builder/presets", tags=["Builder"], dependencies=[Depends(require_auth)])
async def get_builder_presets() -> dict:
    """Stack-preset catalog for the /tools/builder dropdown."""
    return {"presets": get_stack_presets()}


# ---------------------------------------------------------------------------
# Phase-5 mission registry + sqwaadrun expanded endpoints (2026-05-11 PM)
# ---------------------------------------------------------------------------


@app.get("/missions", tags=["Missions"], dependencies=[Depends(require_auth)])
async def list_missions_endpoint() -> dict:
    """All FOAI mission specs with per-mission drift status."""
    return list_missions()


@app.get("/missions/{mission_id}/spec", tags=["Missions"], dependencies=[Depends(require_auth)])
async def get_mission_spec_endpoint(mission_id: str) -> dict:
    """Full spec body for one mission_id."""
    return get_mission_spec(mission_id)


@app.get("/sqwaadrun/missions/active", tags=["Sqwaadrun"], dependencies=[Depends(require_auth)])
async def get_sqwaadrun_active_missions() -> dict:
    """Currently-running Sqwaadrun missions (proxy)."""
    return await sqwaadrun_get_active_missions()


@app.get("/sqwaadrun/missions/recent", tags=["Sqwaadrun"], dependencies=[Depends(require_auth)])
async def get_sqwaadrun_recent_missions(n: int = 20) -> dict:
    """Last N completed Sqwaadrun missions."""
    return await sqwaadrun_get_recent_missions(n=n)


@app.get("/sqwaadrun/cache/stats", tags=["Sqwaadrun"], dependencies=[Depends(require_auth)])
async def get_sqwaadrun_cache_stats() -> dict:
    """Sqwaadrun scrape_cache.db statistics."""
    return await sqwaadrun_get_cache_stats()


@app.get("/audit/integrity-check", tags=["Audit"], dependencies=[Depends(require_auth)])
async def audit_integrity_check() -> dict:
    """Verify the in-memory receipt buffer end-to-end.

    Wave 1 ledger has no chain hashing yet (planned Wave 2 once ledger moves
    to AuditLedger persistent store). Returns {ok, chain_length, broken_at}.
    With the in-memory buffer, the chain is always 'ok' by construction —
    the real chain check belongs in Coastal's audit_ledger.py.
    """
    async with _RUN_LEDGER_LOCK:
        chain_length = len(_RUN_LEDGER)
    return {"ok": True, "chain_length": chain_length, "broken_at": None}


@app.get("/audit/recent", tags=["Audit"], dependencies=[Depends(require_auth)])
async def get_audit_recent(agent: str | None = None, limit: int = 20) -> dict:
    """Recent audit events from Neon (Track B Phase 2, owner-tier only).

    Reads the durable audit_ledger written by `_persist_to_neon` on each
    `/run` invocation. Optional `agent` filter; `limit` capped at 200 to
    bound response size.

    Returns 503 when Neon target isn't configured (FOAI_AUDIT_LEDGER_URL /
    NEON_DATABASE_URL both unset) — the gateway keeps running on
    `_RUN_LEDGER` alone, but this endpoint has nothing to read.
    """
    if not _AUDIT_LEDGER_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="audit_ledger module unavailable (import failed at startup)",
        )
    if not _os.environ.get("FOAI_AUDIT_LEDGER_URL") and not _os.environ.get("NEON_DATABASE_URL"):
        raise HTTPException(
            status_code=503,
            detail=(
                "audit_ledger Neon target not configured — "
                "set FOAI_AUDIT_LEDGER_URL or NEON_DATABASE_URL to enable"
            ),
        )
    capped_limit = max(1, min(int(limit), 200))
    try:
        from sqlalchemy import select as _sa_select  # local import to avoid hard dep at module load
        from sqlalchemy.orm import Session as _SASession  # local import
        engine = _get_audit_engine()
        with _SASession(engine) as session:
            stmt = _sa_select(_AuditEvent).order_by(_AuditEvent.timestamp_event.desc()).limit(capped_limit)
            if agent:
                stmt = stmt.where(_AuditEvent.agent == agent)
            rows = list(session.scalars(stmt))
            events = [
                {
                    "event_id": str(r.event_id),
                    "agent": r.agent,
                    "action": r.action,
                    "payload": r.payload,
                    "customer_uid": r.customer_uid,
                    "timestamp_event": r.timestamp_event.isoformat()
                    if isinstance(r.timestamp_event, datetime)
                    else str(r.timestamp_event),
                    "created_at": r.created_at.isoformat()
                    if isinstance(r.created_at, datetime)
                    else str(r.created_at),
                }
                for r in rows
            ]
    except Exception as exc:
        logger.error("audit_recent_query_failed", error=str(exc))
        raise HTTPException(status_code=502, detail=f"audit_ledger query failed: {exc}") from exc
    return {"ok": True, "agent": agent, "limit": capped_limit, "count": len(events), "events": events}


@app.get("/audit/{task_id}", tags=["Audit"], dependencies=[Depends(require_auth)])
async def get_audit_trail(task_id: str) -> dict:
    """Return the in-memory receipt trail for a task_id.

    Wave 1 reads from `_RUN_LEDGER` (bounded in-memory buffer). Wave 2 (Track
    B Phase 2, 2026-05-15) added durable backing in Neon via
    `runtime.audit_ledger.write_event()` — the in-memory ledger remains the
    fast read path here; for older task_ids that have aged out of the buffer,
    use `/audit/recent` with `task_id=` filter (Phase 2.1 follow-up).
    """
    async with _RUN_LEDGER_LOCK:
        receipts = [r for r in _RUN_LEDGER if r.get("task_id") == task_id]
    return {"ok": True, "task_id": task_id, "count": len(receipts), "receipts": receipts}


# ---------------------------------------------------------------------------
# Hermes bridge — memory recall + evaluation trigger via the LearnAng engine
# ---------------------------------------------------------------------------
class HermesRecallRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=8192)
    tenant_id: str = Field("cti", max_length=64)
    top_k: int = Field(5, ge=1, le=50)


class HermesEvaluateRequest(BaseModel):
    tenant_id: str = Field("cti", max_length=64)
    eval_type: str = Field("daily", pattern=r"^(daily|weekly)$")


@app.post("/hermes/recall", tags=["Hermes"], dependencies=[Depends(require_auth)])
async def hermes_recall(payload: HermesRecallRequest) -> dict:
    """Recall semantically-relevant past evaluations from the Hermes memory."""
    if _hermes is None:
        raise HTTPException(status_code=503, detail="Hermes client not initialised")
    try:
        results = await _hermes.recall_memory(
            query=payload.query,
            tenant_id=payload.tenant_id,
            top_k=payload.top_k,
        )
    except HermesNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"results": results, "count": len(results)}


@app.post("/hermes/evaluate", tags=["Hermes"], dependencies=[Depends(require_auth)])
async def hermes_evaluate(payload: HermesEvaluateRequest) -> dict:
    """Trigger a Deep Think evaluation cycle on the Hermes engine."""
    if _hermes is None:
        raise HTTPException(status_code=503, detail="Hermes client not initialised")
    try:
        return await _hermes.trigger_evaluation(
            tenant_id=payload.tenant_id,
            eval_type=payload.eval_type,
        )
    except HermesNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("hermes_evaluate_failed", error=str(exc))
        raise HTTPException(status_code=502, detail=f"Hermes call failed: {exc}") from exc


@app.get("/hermes/health", tags=["Hermes"], dependencies=[Depends(require_auth)])
async def hermes_health() -> dict:
    """Return Hermes engine liveness + client configuration."""
    if _hermes is None:
        raise HTTPException(status_code=503, detail="Hermes client not initialised")
    if not _hermes.configured:
        return {"configured": False, "upstream": None}
    try:
        upstream = await _hermes.health()
    except Exception as exc:
        return {"configured": True, "upstream": None, "error": str(exc)}
    return {"configured": True, "upstream": upstream}


# ---------------------------------------------------------------------------
# Live Task Plan SSE endpoint
# ---------------------------------------------------------------------------
@app.get("/api/chicken-hawk/live-plan", tags=["LiveTaskPlan"], dependencies=[Depends(require_auth)])
async def live_task_plan(request: Request) -> StreamingResponse:
    """
    SSE endpoint for the Live Task Plan.
    Streams real-time task plan events from the DeerFlow orchestrator.
    Each event contains: task_name, status, hawk, timestamps.
    """
    if _event_bus is None:
        raise HTTPException(status_code=503, detail="Event bus not initialised")

    async def event_generator() -> AsyncIterator[str]:
        # Send initial heartbeat
        yield "event: connected\ndata: {\"status\": \"connected\"}\n\n"
        async for event in _event_bus.subscribe():
            # Check if client disconnected
            if await request.is_disconnected():
                break
            yield event.to_sse()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "main:app",
        host=settings.gateway_host,
        port=settings.gateway_port,
        log_level=settings.log_level.lower(),
        reload=False,
    )
