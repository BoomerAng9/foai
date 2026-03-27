"""Biz_Ang — SaaS client growth tracking Boomer_Ang.

Reads enrollment and open seat data from Firestore to generate
growth dashboards and pipeline metrics.
Reports heartbeat via /agent/status on Money Engine.
"""

import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI, Query
from google.cloud import firestore

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
                    "name": "Biz_Ang",
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
    title="Biz_Ang",
    description="SaaS client growth tracking — Boomer_Ang deployed by ACHEEVY.",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "biz-ang", "agent": "Biz_Ang", "version": "0.1.0"}


@app.get("/dashboard")
async def growth_dashboard(tenant_id: str = Query(default=DEFAULT_TENANT)):
    """Aggregate enrollment revenue and open seat pipeline metrics."""
    await _heartbeat("active", "building_dashboard")
    db = firestore.Client(project="foai-aims")

    # Enrollment metrics
    enrollment_docs = (
        db.collection("enrollments")
        .document(tenant_id)
        .collection("items")
        .order_by("timestamp", direction=firestore.Query.DESCENDING)
        .limit(100)
        .stream()
    )
    total_revenue = 0.0
    enrollment_count = 0
    for doc in enrollment_docs:
        data = doc.to_dict()
        total_revenue += data.get("revenue", 0.0)
        enrollment_count += 1

    # Open seat pipeline
    seat_docs = (
        db.collection("openSeats")
        .document(tenant_id)
        .collection("items")
        .limit(200)
        .stream()
    )
    total_seats = 0
    total_pipeline_value = 0.0
    institutions = set()
    for doc in seat_docs:
        data = doc.to_dict()
        seats = data.get("seats_remaining", 0)
        price = data.get("price", 0.0)
        total_seats += seats
        total_pipeline_value += seats * price
        institutions.add(data.get("institution", "unknown"))

    # Campaign performance
    campaign_docs = (
        db.collection("campaigns")
        .document(tenant_id)
        .collection("items")
        .limit(50)
        .stream()
    )
    total_clicks = 0
    total_conversions = 0
    for doc in campaign_docs:
        data = doc.to_dict()
        total_clicks += data.get("clicks", 0)
        total_conversions += data.get("conversions", 0)

    now = datetime.now(timezone.utc).isoformat()
    dashboard = {
        "generated_at": now,
        "tenant_id": tenant_id,
        "enrollments": {
            "count": enrollment_count,
            "total_revenue": total_revenue,
        },
        "open_seat_pipeline": {
            "total_seats": total_seats,
            "pipeline_value": total_pipeline_value,
            "institutions_tracked": len(institutions),
        },
        "campaigns": {
            "total_clicks": total_clicks,
            "total_conversions": total_conversions,
            "conversion_rate": (
                total_conversions / total_clicks if total_clicks > 0 else 0.0
            ),
        },
    }

    await _heartbeat("active", "dashboard_generated")
    return dashboard


@app.get("/pipeline")
async def pipeline_detail(
    tenant_id: str = Query(default=DEFAULT_TENANT),
    institution: str | None = Query(default=None),
):
    """Detailed open seat pipeline by institution."""
    await _heartbeat("active", "building_pipeline")
    db = firestore.Client(project="foai-aims")

    query = (
        db.collection("openSeats")
        .document(tenant_id)
        .collection("items")
    )
    if institution:
        from google.cloud.firestore_v1 import FieldFilter
        query = query.where(filter=FieldFilter("institution", "==", institution))

    docs = query.limit(200).stream()
    results = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        results.append(data)

    return {"tenant_id": tenant_id, "institution_filter": institution, "seats": results}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
