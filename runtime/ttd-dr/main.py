"""FastAPI entrypoint for TTD-DR.

Endpoints:
  GET  /health  — liveness + DB reachability probe
  POST /cycle   — run one k-step cycle and persist to Ledger
  POST /run     — run the full loop until converged or max_cycles

Every POST requires HMAC auth (TTD_DR_HMAC_SECRET). Internal-only service.
"""

from __future__ import annotations

import os

import structlog
from fastapi import FastAPI, HTTPException, Request

from auth import verify_signature
from core import StageNotAllowedError, run_loop, run_single_cycle
from schemas import CycleRequest, CycleResponse, RunRequest, RunResponse

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ]
)
logger = structlog.get_logger("ttd_dr.main")

app = FastAPI(title="TTD-DR — Test-Time Diffusion Deep-Researcher", version="0.1.0")


async def _auth_or_403(request: Request) -> bytes:
    raw = await request.body()
    sig = request.headers.get("x-ttd-dr-signature")
    ts = request.headers.get("x-ttd-dr-timestamp")
    result = verify_signature(sig, ts, raw)
    if not result.ok:
        logger.warning("auth_rejected", reason=result.reason)
        raise HTTPException(status_code=403, detail=f"auth: {result.reason}")
    return raw


@app.get("/health")
async def health() -> dict[str, object]:
    return {
        "status": "ok",
        "service": "ttd-dr",
        "version": "0.1.0",
        "hmac_configured": bool(os.getenv("TTD_DR_HMAC_SECRET")),
    }


@app.post("/cycle", response_model=CycleResponse)
async def cycle_endpoint(request: Request) -> CycleResponse:
    await _auth_or_403(request)
    body = CycleRequest.model_validate_json(await request.body())
    try:
        cycle = run_single_cycle(body.context_pack, cycle_index=body.cycle_index)
    except StageNotAllowedError as e:
        raise HTTPException(status_code=400, detail=str(e))

    continue_loop = not cycle.review.passed and not cycle.review.fdh_ticket_opened
    reason = (
        "converged"
        if cycle.review.passed
        else "fdh_opened"
        if cycle.review.fdh_ticket_opened
        else "cycle_again"
    )
    return CycleResponse(
        engagement_id=body.engagement_id,
        stage=body.stage,
        cycle=cycle,
        continue_loop=continue_loop,
        reason=reason,
    )


@app.post("/run", response_model=RunResponse)
async def run_endpoint(request: Request) -> RunResponse:
    await _auth_or_403(request)
    body = RunRequest.model_validate_json(await request.body())
    try:
        cycles, converged, final_conf = run_loop(
            body.context_pack,
            max_cycles=body.max_cycles,
            confidence_threshold=body.confidence_threshold,
        )
    except StageNotAllowedError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return RunResponse(
        engagement_id=body.engagement_id,
        stage=body.stage,
        cycles_executed=len(cycles),
        cycles=cycles,
        converged=converged,
        final_confidence=final_conf,
    )
