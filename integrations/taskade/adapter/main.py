"""FastAPI adapter for Taskade — wraps REST v1 behind the v2 Open Source
Agent Intake skill §6 wrapper contract.

Endpoints:
  GET  /health             — liveness + Taskade upstream reachability
  POST /invoke             — synchronous capability dispatch
  POST /jobs               — async job dispatch
  GET  /jobs/{job_id}      — poll job status
  POST /jobs/{job_id}/cancel — best-effort cancel

Auth model:
  - Inbound:  Bearer ADAPTER_BEARER_SECRET (Chicken Hawk gateway shares the secret)
  - Outbound: Bearer TASKADE_API_KEY (per-call to api.taskade.com)
"""
from __future__ import annotations

import asyncio
import logging
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from . import capabilities as caps
from . import schemas

# ─── Setup ────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "info").upper(),
    format="%(asctime)s [%(levelname)s] %(name)s :: %(message)s",
)
log = logging.getLogger("taskade.adapter.main")

ADAPTER_VERSION = "0.1.0"
TRUST_STATUS = "APPROVED_SANDBOX_ONLY"  # see foai/integrations/taskade/TRUST_REPORT.md

# Env config — fail fast at startup if anything required is missing.
TASKADE_API_BASE = os.environ.get("TASKADE_API_BASE", "https://www.taskade.com/api/v1")
TASKADE_API_KEY = os.environ.get("TASKADE_API_KEY", "")
TASKADE_SYNC_TOKEN = os.environ.get("TASKADE_SYNC_TOKEN", "")
TASKADE_PII_SALT = os.environ.get("TASKADE_PII_SALT", "")
ADAPTER_BEARER_SECRET = os.environ.get("ADAPTER_BEARER_SECRET", "")
SACRED_SEPARATION_SURFACE_DEFAULT = os.environ.get(
    "SACRED_SEPARATION_SURFACE_DEFAULT", "client_tier"
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── App + state ──────────────────────────────────────────────────────────

app = FastAPI(
    title="Taskade Adapter (FOAI)",
    description="v2 Open Source Agent Intake skill §6 wrapper around Taskade REST v1",
    version=ADAPTER_VERSION,
)

# Shared Taskade client (per-process). Uses Deploy token by default; capability
# functions can pick the sync token via os.environ if they need scope-limited
# access (sync worker bypasses the adapter and uses its own client anyway).
_client = caps.TaskadeClient(
    api_base=TASKADE_API_BASE,
    api_token=TASKADE_API_KEY or "MISSING",
)

# In-memory job ledger. Phase 5 sync worker has its own persistent state in
# Neon; this ledger is only for adapter-side async invocations from Chicken
# Hawk. Bounded TTL keeps memory growth in check.
_JOBS: dict[str, dict[str, Any]] = {}
_JOB_TTL_SECONDS = 3600
_LAST_INVOKE_AT: Optional[str] = None


def _gc_jobs() -> None:
    """Drop completed/failed/cancelled jobs older than _JOB_TTL_SECONDS."""
    now = time.time()
    stale = [
        jid
        for jid, job in _JOBS.items()
        if job.get("completed_unix") and (now - job["completed_unix"]) > _JOB_TTL_SECONDS
    ]
    for jid in stale:
        _JOBS.pop(jid, None)


# ─── Auth ─────────────────────────────────────────────────────────────────

_bearer_scheme = HTTPBearer(auto_error=False)


def _require_inbound_bearer(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> None:
    """Reject any /invoke or /jobs call that doesn't present the shared bearer.

    ADAPTER_BEARER_SECRET must be set in env. If unset, the adapter refuses
    ALL calls (fail-closed) rather than silently allowing.
    """
    if not ADAPTER_BEARER_SECRET:
        log.error("ADAPTER_BEARER_SECRET is empty — refusing all calls (fail-closed)")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "adapter_misconfigured",
                "message": "ADAPTER_BEARER_SECRET not provisioned",
            },
        )
    if creds is None or creds.credentials != ADAPTER_BEARER_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "unauthorized", "message": "invalid_bearer"},
        )


# ─── Dispatch core ────────────────────────────────────────────────────────


def _dispatch(capability: str, raw_params: dict[str, Any]) -> dict[str, Any]:
    global _LAST_INVOKE_AT
    if capability not in caps.CAPABILITY_REGISTRY:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "unknown_capability",
                "message": f"capability '{capability}' not registered",
                "registered": sorted(caps.CAPABILITY_REGISTRY.keys()),
            },
        )

    schema_cls = schemas.CAPABILITY_PARAM_SCHEMAS[capability]
    try:
        validated = schema_cls(**raw_params)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_params", "message": str(exc)},
        )

    fn = caps.CAPABILITY_REGISTRY[capability]
    # Pure functions accept pii_salt kwarg; Taskade-API functions don't.
    try:
        if capability in caps.PURE_FUNCTION_CAPABILITIES:
            result = fn(_client, validated.model_dump(), pii_salt=TASKADE_PII_SALT)
        elif capability == "coaching_note.append":
            result = fn(_client, validated.model_dump(), pii_salt=TASKADE_PII_SALT)
        else:
            result = fn(_client, validated.model_dump())
    except HTTPException:
        raise
    except Exception as exc:  # broad — wrap Taskade upstream errors
        log.exception("capability %s raised", capability)
        # Classify into a stable error code; details for owner-tier debugging.
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "code": "taskade_upstream_error",
                "message": str(exc),
                "capability": capability,
            },
        )

    _LAST_INVOKE_AT = _now_iso()
    return result


# ─── Routes ───────────────────────────────────────────────────────────────


@app.get("/health", response_model=schemas.HealthResponse)
def health() -> schemas.HealthResponse:
    """Public — no auth required. Returns adapter liveness + Taskade reachability."""
    reachable = _client.healthcheck() if TASKADE_API_KEY else False
    return schemas.HealthResponse(
        ok=True,
        taskade_api_reachable=reachable,
        last_invoke_at=_LAST_INVOKE_AT,
        version=ADAPTER_VERSION,
        trust_status=TRUST_STATUS,
    )


@app.post(
    "/invoke",
    response_model=schemas.InvokeResponse,
    dependencies=[Depends(_require_inbound_bearer)],
)
def invoke(req: schemas.InvokeRequest) -> schemas.InvokeResponse:
    """Synchronous capability dispatch. Use /jobs for long-running ops."""
    result = _dispatch(req.capability, req.params)
    return schemas.InvokeResponse(ok=True, capability=req.capability, result=result)


@app.post(
    "/jobs",
    response_model=schemas.JobCreateResponse,
    dependencies=[Depends(_require_inbound_bearer)],
)
async def jobs_create(req: schemas.InvokeRequest) -> schemas.JobCreateResponse:
    """Async job creation. Dispatcher runs in background; caller polls /jobs/{id}."""
    _gc_jobs()
    job_id = uuid.uuid4().hex
    _JOBS[job_id] = {
        "status": "queued",
        "started_at": _now_iso(),
        "capability": req.capability,
    }

    async def _run() -> None:
        _JOBS[job_id]["status"] = "running"
        try:
            result = await asyncio.get_running_loop().run_in_executor(
                None, lambda: _dispatch(req.capability, req.params)
            )
            if _JOBS[job_id]["status"] == "cancelled_by_caller":
                return
            _JOBS[job_id].update(
                {
                    "status": "completed",
                    "result": result,
                    "completed_at": _now_iso(),
                    "completed_unix": time.time(),
                }
            )
        except HTTPException as exc:
            _JOBS[job_id].update(
                {
                    "status": "failed",
                    "error": exc.detail if isinstance(exc.detail, dict)
                    else {"message": str(exc.detail)},
                    "completed_at": _now_iso(),
                    "completed_unix": time.time(),
                }
            )
        except Exception as exc:  # pragma: no cover — defensive
            _JOBS[job_id].update(
                {
                    "status": "failed",
                    "error": {"message": str(exc)},
                    "completed_at": _now_iso(),
                    "completed_unix": time.time(),
                }
            )

    asyncio.create_task(_run())
    return schemas.JobCreateResponse(ok=True, job_id=job_id, status="queued")


@app.get(
    "/jobs/{job_id}",
    response_model=schemas.JobStatusResponse,
    dependencies=[Depends(_require_inbound_bearer)],
)
def jobs_get(job_id: str) -> schemas.JobStatusResponse:
    job = _JOBS.get(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "unknown_job", "message": "job_id not found"},
        )
    return schemas.JobStatusResponse(
        ok=True,
        job_id=job_id,
        status=job["status"],
        result=job.get("result"),
        error=job.get("error"),
        started_at=job.get("started_at"),
        completed_at=job.get("completed_at"),
    )


@app.post(
    "/jobs/{job_id}/cancel",
    response_model=schemas.JobStatusResponse,
    dependencies=[Depends(_require_inbound_bearer)],
)
def jobs_cancel(job_id: str) -> schemas.JobStatusResponse:
    """Best-effort cancel. Taskade REST doesn't support cancel, so this just
    marks the job as cancelled_by_caller — any pending result is discarded.
    """
    job = _JOBS.get(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "unknown_job", "message": "job_id not found"},
        )
    if job["status"] in ("completed", "failed", "cancelled_by_caller"):
        return schemas.JobStatusResponse(
            ok=True,
            job_id=job_id,
            status=job["status"],
            result=job.get("result"),
            error=job.get("error"),
            started_at=job.get("started_at"),
            completed_at=job.get("completed_at"),
        )
    job["status"] = "cancelled_by_caller"
    job["completed_at"] = _now_iso()
    job["completed_unix"] = time.time()
    return schemas.JobStatusResponse(
        ok=True,
        job_id=job_id,
        status="cancelled_by_caller",
        started_at=job.get("started_at"),
        completed_at=job["completed_at"],
    )
