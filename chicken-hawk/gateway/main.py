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
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from starlette.middleware.base import BaseHTTPMiddleware

from config import get_settings
from event_bus import EventBus, TaskEvent, TaskStatus, get_event_bus
from router import HawkResponse, Router

# Pre-flight wiring (Wave 1, ecosystem-wide): NemoClaw policy gate + magic-link auth.
# Both modules already implement their FastAPI routers; main.py mounts them below.
from auth import router as auth_router, _send_telegram  # noqa: E402
from nemoclaw import router as nemoclaw_router, _evaluate, _append_event  # noqa: E402

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


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    global _router, _event_bus
    settings = get_settings()
    _event_bus = get_event_bus()
    _router = Router(settings, event_bus=_event_bus)
    logger.info("gateway_started", provider=settings.llm_provider)
    yield
    if _event_bus:
        await _event_bus.close()
    if _router:
        await _router.aclose()
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
    """Add security headers to every response."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Server"] = "ACHEEVY"
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

    # Check session cookie
    session_token = request.cookies.get("session_token")
    if session_token and session_token == secret:
        return

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing or invalid authentication",
        headers={"WWW-Authenticate": "Bearer"},
    )


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

# In-memory receipt ledger (Wave 1). Keyed by task_id; bounded buffer.
_RUN_LEDGER: list[dict] = []
_RUN_LEDGER_MAX = 5000
_RUN_LEDGER_LOCK = asyncio.Lock()


class RunRequest(BaseModel):
    action: str = Field(..., min_length=1, max_length=128)
    payload: dict = Field(default_factory=dict)


async def _record_run_receipt(receipt: dict) -> None:
    async with _RUN_LEDGER_LOCK:
        _RUN_LEDGER.append(receipt)
        if len(_RUN_LEDGER) > _RUN_LEDGER_MAX:
            del _RUN_LEDGER[: len(_RUN_LEDGER) - _RUN_LEDGER_MAX]


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

    # Verdict == allow: receipt the action; runtime dispatch is action-specific
    # and handled by callers' own /chat round-trip. Wave 2 wires action→Lil_Hawk
    # mapping inside this handler.
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


@app.get("/audit/{task_id}", tags=["Audit"], dependencies=[Depends(require_auth)])
async def get_audit_trail(task_id: str) -> dict:
    """Return the in-memory receipt trail for a task_id.

    Wave 1 reads from `_RUN_LEDGER` (bounded in-memory buffer). Wave 2
    upgrades to AuditLedger (the renamed Coastal SQLite, migrated to Neon).
    """
    async with _RUN_LEDGER_LOCK:
        receipts = [r for r in _RUN_LEDGER if r.get("task_id") == task_id]
    return {"ok": True, "task_id": task_id, "count": len(receipts), "receipts": receipts}


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
