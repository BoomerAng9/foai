"""
Chicken Hawk Gateway — FastAPI application entrypoint.

Exposes a single /chat endpoint that accepts natural-language requests,
routes them to the appropriate Lil_Hawk specialist via the Router, passes
the result through the review gate, and returns a governed response.
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncIterator

import structlog
import uvicorn
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from config import get_settings
from router import HawkResponse, Router

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


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    global _router
    settings = get_settings()
    _router = Router(settings)
    logger.info("gateway_started", provider=settings.llm_provider)
    yield
    if _router:
        await _router.aclose()
    logger.info("gateway_stopped")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Chicken Hawk Gateway",
    description=(
        "Intent-routing gateway for the Chicken Hawk AI operations platform. "
        "Classifies natural-language requests and dispatches them to the "
        "appropriate Lil_Hawk specialist agent."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ALLOW_ORIGINS", "").split(",") if os.getenv("CORS_ALLOW_ORIGINS") else ["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
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
    hawks: dict[str, str]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health", response_model=HealthResponse, tags=["Observability"])
async def health() -> HealthResponse:
    """Return the health status of the gateway and all Lil_Hawk endpoints."""
    if _router is None:
        raise HTTPException(status_code=503, detail="Gateway not initialised")
    hawk_health = await _router.health_check()
    gateway_status = "ok" if all(v == "ok" for v in hawk_health.values()) else "degraded"
    return HealthResponse(status=gateway_status, hawks=hawk_health)


@app.post("/chat", response_model=ChatResponse, tags=["Chat"])
async def chat(request: ChatRequest) -> ChatResponse:
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


@app.get("/hawks", tags=["Observability"])
async def list_hawks() -> dict:
    """Return the configured Lil_Hawk endpoints."""
    settings = get_settings()
    return {"hawks": list(settings.hawk_endpoints.keys())}


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
