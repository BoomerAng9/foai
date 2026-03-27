"""Ops_Ang — Health monitoring and reporting Boomer_Ang.

Polls /health on all live services every 5 minutes.
Dept: PMO-LENS (QA/review). Emits events to Live Look In State Engine.
"""

import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI
from google.cloud import firestore

import state_emitter as se

AGENT_NAME = "Ops_Ang"
DEPT = "PMO-LENS"

MONEY_ENGINE_URL = os.getenv(
    "MONEY_ENGINE_URL",
    "https://money-engine-api-939270059361.us-central1.run.app",
)
DEFAULT_TENANT = os.getenv("DEFAULT_TENANT", "cti")
PORT = int(os.getenv("PORT", "8080"))

SERVICES = {
    "money-engine-api": "https://money-engine-api-939270059361.us-central1.run.app",
    "nemoclaw": "https://nemoclaw-service-939270059361.us-central1.run.app",
    "openclaw": "https://openclaw-service-939270059361.us-central1.run.app",
    "hermes-agent": "https://hermes-agent-939270059361.us-central1.run.app",
}

POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "300"))

logger = logging.getLogger("ops_ang")
_poll_task: asyncio.Task | None = None
_last_task_id: str | None = None


async def _heartbeat(status: str = "online", task: str = "idle"):
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{MONEY_ENGINE_URL}/agent/status",
                json={
                    "name": AGENT_NAME,
                    "status": status,
                    "current_task": task,
                    "tenant_id": DEFAULT_TENANT,
                },
            )
    except httpx.HTTPError:
        pass


async def poll_health():
    """Poll all services and write results to Firestore."""
    global _last_task_id
    t0 = time.monotonic()

    task_id = await se.task_assigned(AGENT_NAME, DEPT, "Fleet health check", "medium")
    await se.task_started(AGENT_NAME, DEPT, task_id, {
        "plan": f"Poll /health on {len(SERVICES)} infrastructure services",
        "steps": ["poll_endpoints", "aggregate_results", "write_firestore", "report"],
        "services": list(SERVICES.keys()),
    })

    await se.task_progress(AGENT_NAME, DEPT, task_id, 10, "Starting health poll cycle")
    async with httpx.AsyncClient(timeout=10.0) as client:
        results = {}
        checked = 0
        for name, url in SERVICES.items():
            try:
                resp = await client.get(f"{url}/health")
                results[name] = {
                    "status": "healthy" if resp.status_code == 200 else "unhealthy",
                    "http_code": resp.status_code,
                    "url": url,
                }
            except httpx.HTTPError:
                results[name] = {
                    "status": "unreachable",
                    "http_code": None,
                    "url": url,
                }
            checked += 1
            progress = int((checked / len(SERVICES)) * 60) + 20
            await se.task_progress(AGENT_NAME, DEPT, task_id, progress, f"Checked {name}")

    now = datetime.now(timezone.utc).isoformat()
    healthy = sum(1 for r in results.values() if r["status"] == "healthy")
    total = len(results)

    await se.task_progress(AGENT_NAME, DEPT, task_id, 85, "Writing results to Firestore")
    db = firestore.Client(project="foai-aims")
    db.collection("agents").document(DEFAULT_TENANT).collection(
        "Ops_Ang"
    ).document("status").set({
        "name": AGENT_NAME,
        "status": "monitoring",
        "currentTask": f"health_check:{healthy}/{total}_healthy",
        "lastUpdated": now,
        "services": results,
    })

    db.collection("healthChecks").document(DEFAULT_TENANT).collection(
        "snapshots"
    ).add({
        "services": results,
        "healthy_count": healthy,
        "total_count": total,
        "checked_at": now,
    })

    duration = int((time.monotonic() - t0) * 1000)
    score = int((healthy / total) * 100) if total > 0 else 0
    grade = "A" if score >= 90 else "B" if score >= 70 else "C" if score >= 50 else "F"
    await se.task_completed(AGENT_NAME, DEPT, task_id, score, grade, duration)
    await _heartbeat("monitoring", f"health_check:{healthy}/{total}_healthy")
    _last_task_id = task_id
    await se.agent_break(AGENT_NAME, DEPT, task_id)
    return results


async def _poll_loop():
    """Background polling loop — runs every POLL_INTERVAL seconds."""
    while True:
        try:
            await poll_health()
        except Exception:
            logger.exception("Health poll failed")
        await asyncio.sleep(POLL_INTERVAL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _poll_task
    await _heartbeat("online", "startup_complete")
    await se.agent_online(AGENT_NAME, DEPT, "Fleet health monitoring & QA reporting")
    _poll_task = asyncio.create_task(_poll_loop())
    yield
    if _poll_task:
        _poll_task.cancel()
    await se.agent_break(AGENT_NAME, DEPT, _last_task_id)
    await se.close()
    await _heartbeat("offline", "shutting_down")


app = FastAPI(
    title="Ops_Ang",
    description="Health monitoring & reporting — Boomer_Ang deployed by ACHEEVY.",
    version="0.2.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ops-ang", "agent": AGENT_NAME, "version": "0.2.0"}


@app.get("/status")
async def fleet_status():
    """Run an immediate health check and return results."""
    results = await poll_health()
    return {"checked_at": datetime.now(timezone.utc).isoformat(), "services": results}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
