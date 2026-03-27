"""Scout_Ang — Open Seat scraping Boomer_Ang.

Triggers Firecrawl scans via Money Engine and monitors scrape results.
Calls POST /scrape/trigger. Reports heartbeat via /agent/status.
"""

import os
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Query
from google.cloud import firestore
from pydantic import BaseModel

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
                    "name": "Scout_Ang",
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
    yield
    await _heartbeat("offline", "shutting_down")


app = FastAPI(
    title="Scout_Ang",
    description="Open Seat scraping — Boomer_Ang deployed by ACHEEVY.",
    version="0.1.0",
    lifespan=lifespan,
)


class ScrapeRequest(BaseModel):
    institution: str | None = None
    tenant_id: str = DEFAULT_TENANT


@app.get("/health")
async def health():
    return {"status": "ok", "service": "scout-ang", "agent": "Scout_Ang", "version": "0.1.0"}


@app.post("/scrape", status_code=202)
async def trigger_scrape(req: ScrapeRequest):
    """Trigger Open Seat scrape via Money Engine."""
    await _heartbeat("active", "triggering_scrape")
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{MONEY_ENGINE_URL}/scrape/trigger",
            json=req.model_dump(),
        )
    await _heartbeat("active", "scrape_queued")
    return resp.json()


@app.get("/seats")
async def list_open_seats(
    tenant_id: str = Query(default=DEFAULT_TENANT),
    limit: int = Query(default=50, le=200),
):
    """List scraped open seat records from Firestore."""
    await _heartbeat("active", "listing_seats")
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
    await _heartbeat("active", f"listed_{len(results)}_seats")
    return results


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
