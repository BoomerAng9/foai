"""Ops_Ang — Health monitoring and reporting Boomer_Ang.

Polls /health on all live services every 5 minutes.
Writes status to Firestore agents/cti/Ops_Ang/status.
Reports heartbeat via /agent/status on Money Engine.
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI
from google.cloud import firestore

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

POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "300"))  # 5 minutes

logger = logging.getLogger("ops_ang")
_poll_task: asyncio.Task | None = None


async def _heartbeat(status: str = "online", task: str = "idle"):
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{MONEY_ENGINE_URL}/agent/status",
                json={
                    "name": "Ops_Ang",
                    "status": status,
                    "current_task": task,
                    "tenant_id": DEFAULT_TENANT,
                },
            )
    except httpx.HTTPError:
        pass


async def poll_health():
    """Poll all services and write results to Firestore."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        results = {}
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

    now = datetime.now(timezone.utc).isoformat()
    healthy = sum(1 for r in results.values() if r["status"] == "healthy")
    total = len(results)

    db = firestore.Client(project="foai-aims")

    # Write latest health snapshot
    db.collection("agents").document(DEFAULT_TENANT).collection(
        "Ops_Ang"
    ).document("status").set({
        "name": "Ops_Ang",
        "status": "monitoring",
        "currentTask": f"health_check:{healthy}/{total}_healthy",
        "lastUpdated": now,
        "services": results,
    })

    # Write to health history
    db.collection("healthChecks").document(DEFAULT_TENANT).collection(
        "snapshots"
    ).add({
        "services": results,
        "healthy_count": healthy,
        "total_count": total,
        "checked_at": now,
    })

    await _heartbeat("monitoring", f"health_check:{healthy}/{total}_healthy")
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
    _poll_task = asyncio.create_task(_poll_loop())
    yield
    if _poll_task:
        _poll_task.cancel()
    await _heartbeat("offline", "shutting_down")


app = FastAPI(
    title="Ops_Ang",
    description="Health monitoring & reporting — Boomer_Ang deployed by ACHEEVY.",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ops-ang", "agent": "Ops_Ang", "version": "0.1.0"}


@app.get("/status")
async def fleet_status():
    """Run an immediate health check and return results."""
    results = await poll_health()
    return {"checked_at": datetime.now(timezone.utc).isoformat(), "services": results}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
