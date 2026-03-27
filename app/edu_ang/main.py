"""Edu_Ang — MindEdge enrollment tracking Boomer_Ang.

Manages affiliate links and tracks enrollment conversions.
Calls Money Engine /links endpoints. Reports heartbeat via /agent/status.
"""

import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI, Query
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
                    "name": "Edu_Ang",
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
    title="Edu_Ang",
    description="MindEdge enrollment tracking — Boomer_Ang deployed by ACHEEVY.",
    version="0.1.0",
    lifespan=lifespan,
)


class LinkCreate(BaseModel):
    category: str
    base_url: str
    sku: str | None = None
    course_name: str | None = None
    tenant_id: str = DEFAULT_TENANT


class EnrollmentRecord(BaseModel):
    sku: str
    course: str
    revenue: float
    source_utm: str
    tenant_id: str = DEFAULT_TENANT


@app.get("/health")
async def health():
    return {"status": "ok", "service": "edu-ang", "agent": "Edu_Ang", "version": "0.1.0"}


@app.get("/links/{category}")
async def get_links(category: str, tenant_id: str = Query(default=DEFAULT_TENANT)):
    """Proxy to Money Engine GET /links/{category}."""
    await _heartbeat("active", f"fetching_links:{category}")
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{MONEY_ENGINE_URL}/links/{category}",
            params={"tenant_id": tenant_id},
        )
    return resp.json()


@app.post("/links/create", status_code=201)
async def create_link(link: LinkCreate):
    """Proxy to Money Engine POST /links/create."""
    await _heartbeat("active", "creating_link")
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{MONEY_ENGINE_URL}/links/create",
            json=link.model_dump(),
        )
    return resp.json()


@app.post("/enroll", status_code=201)
async def record_enrollment(record: EnrollmentRecord):
    """Record an enrollment conversion in Firestore via Money Engine."""
    await _heartbeat("active", f"recording_enrollment:{record.sku}")
    from google.cloud import firestore

    db = firestore.Client(project="foai-aims")
    now = datetime.now(timezone.utc).isoformat()
    doc_ref = (
        db.collection("enrollments")
        .document(record.tenant_id)
        .collection("items")
        .document()
    )
    doc_ref.set({
        "sku": record.sku,
        "course": record.course,
        "revenue": record.revenue,
        "source_utm": record.source_utm,
        "timestamp": now,
    })
    await _heartbeat("active", "enrollment_recorded")
    return {"id": doc_ref.id, "timestamp": now}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
