"""Scout_Ang — Open Seat scraping Boomer_Ang.

Triggers Firecrawl scans via Money Engine and monitors scrape results.
Dept: PMO-PULSE (data ops). Emits events to Live Look In State Engine.
"""

import os
import time
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Query
from google.cloud import firestore
from pydantic import BaseModel

import state_emitter as se
from memory_hooks import MemoryHooks

AGENT_NAME = "Scout_Ang"
DEPT = "PMO-PULSE"
memory = MemoryHooks(AGENT_NAME, "boomer_ang", DEPT)

MONEY_ENGINE_URL = os.getenv(
    "MONEY_ENGINE_URL",
    "https://money-engine-api-939270059361.us-central1.run.app",
)
DEFAULT_TENANT = os.getenv("DEFAULT_TENANT", "cti")
PORT = int(os.getenv("PORT", "8080"))


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


@asynccontextmanager
async def lifespan(app: FastAPI):
    await _heartbeat("online", "startup_complete")
    await se.agent_online(AGENT_NAME, DEPT, "Open Seat university scraping & data ops")
    yield
    await se.agent_break(AGENT_NAME, DEPT)
    await se.close()
    await _heartbeat("offline", "shutting_down")


app = FastAPI(
    title="Scout_Ang",
    description="Open Seat scraping — Boomer_Ang deployed by ACHEEVY.",
    version="0.2.0",
    lifespan=lifespan,
)


class ScrapeRequest(BaseModel):
    institution: str | None = None
    tenant_id: str = DEFAULT_TENANT


@app.get("/health")
async def health():
    return {"status": "ok", "service": "scout-ang", "agent": AGENT_NAME, "version": "0.2.0"}


@app.post("/scrape", status_code=202)
async def trigger_scrape(req: ScrapeRequest):
    """Trigger Open Seat scrape via Money Engine."""
    t0 = time.monotonic()
    target = req.institution or "all_institutions"
    task_id = await se.task_assigned(AGENT_NAME, DEPT, f"Scrape: {target}", "high")

    plan_id, _ = await memory.before_task(
        task_id=task_id, title=f"Scrape: {target}",
        role="Open Seat data sourcing specialist",
        mission=f"Launch Firecrawl scan for open university seats at {target}",
        vision="Comprehensive, fresh open seat data for all target institutions",
        objective=f"Queue scrape jobs for {target} and return job status",
        steps=["validate_target", "call_money_engine_scrape", "queue_jobs"],
    )

    await se.task_started(AGENT_NAME, DEPT, task_id, {
        "plan": f"Launch Firecrawl scan for open seats at {target}",
        "steps": ["validate_target", "call_money_engine_scrape", "queue_jobs"],
    })
    await _heartbeat("active", "triggering_scrape")

    await se.task_progress(AGENT_NAME, DEPT, task_id, 30, "Sending scrape request to Money Engine")
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{MONEY_ENGINE_URL}/scrape/trigger",
            json=req.model_dump(),
        )
    result = resp.json()

    await se.task_progress(AGENT_NAME, DEPT, task_id, 80, "Scrape jobs queued successfully")
    duration = int((time.monotonic() - t0) * 1000)
    await se.task_completed(AGENT_NAME, DEPT, task_id, 85, "B+", duration)
    await memory.after_task(plan_id, task_id, 85, "B+", duration, f"Scrape queued for {target}")
    await _heartbeat("active", "scrape_queued")
    await se.agent_break(AGENT_NAME, DEPT, task_id)
    return result


@app.get("/seats")
async def list_open_seats(
    tenant_id: str = Query(default=DEFAULT_TENANT),
    limit: int = Query(default=50, le=200),
):
    """List scraped open seat records from Firestore."""
    t0 = time.monotonic()
    task_id = await se.task_assigned(AGENT_NAME, DEPT, "List open seats", "low")
    await se.task_started(AGENT_NAME, DEPT, task_id, {
        "plan": "Query Firestore for latest open seat records",
        "steps": ["query_firestore", "format_results"],
    })
    await _heartbeat("active", "listing_seats")

    await se.task_progress(AGENT_NAME, DEPT, task_id, 50, "Querying Firestore openSeats collection")
    db = firestore.Client(project="foai-aims")
    docs = (
        db.collection("openSeats")
        .document(tenant_id)
        .collection("items")
        .order_by("scraped_at", direction=firestore.Query.DESCENDING)
        .limit(limit)
        .stream()
    )
    results = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        results.append(data)

    duration = int((time.monotonic() - t0) * 1000)
    await se.task_completed(AGENT_NAME, DEPT, task_id, 90, "A", duration)
    await _heartbeat("active", f"listed_{len(results)}_seats")
    await se.agent_break(AGENT_NAME, DEPT, task_id)
    return results


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
