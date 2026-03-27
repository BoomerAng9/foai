"""Biz_Ang — SaaS client growth tracking Boomer_Ang.

Reads enrollment and open seat data from Firestore for growth dashboards.
Dept: PMO-LAUNCH (deployment/biz dev). Emits events to Live Look In State Engine.
"""

import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI, Query
from google.cloud import firestore

import state_emitter as se
from luc_middleware import luc_gate

AGENT_NAME = "Biz_Ang"
DEPT = "PMO-LAUNCH"
LUC_ACCOUNT = os.getenv("LUC_ACCOUNT", "cti-default")

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
    await se.agent_online(AGENT_NAME, DEPT, "SaaS client growth tracking & pipeline analytics")
    yield
    await se.agent_break(AGENT_NAME, DEPT)
    await se.close()
    await _heartbeat("offline", "shutting_down")


app = FastAPI(
    title="Biz_Ang",
    description="SaaS client growth tracking — Boomer_Ang deployed by ACHEEVY.",
    version="0.2.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "biz-ang", "agent": AGENT_NAME, "version": "0.2.0"}


@app.get("/dashboard")
async def growth_dashboard(tenant_id: str = Query(default=DEFAULT_TENANT)):
    """Aggregate enrollment revenue and open seat pipeline metrics."""
    t0 = time.monotonic()
    task_id = await se.task_assigned(AGENT_NAME, DEPT, "Build growth dashboard", "high")
    await se.task_started(AGENT_NAME, DEPT, task_id, {
        "plan": "Aggregate enrollments, open seats, and campaigns into growth dashboard",
        "steps": ["query_enrollments", "query_open_seats", "query_campaigns", "aggregate"],
    })
    await _heartbeat("active", "building_dashboard")

    await se.task_progress(AGENT_NAME, DEPT, task_id, 10, "LUC gate check: swarm_cycles")
    await luc_gate(LUC_ACCOUNT, "swarm_cycles", 1, AGENT_NAME, task_id)

    db = firestore.Client(project="foai-aims")

    # Enrollment metrics
    await se.task_progress(AGENT_NAME, DEPT, task_id, 20, "Querying enrollment data")
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
    await se.task_progress(AGENT_NAME, DEPT, task_id, 45, "Querying open seat pipeline")
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
    await se.task_progress(AGENT_NAME, DEPT, task_id, 70, "Querying campaign performance")
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

    await se.task_progress(AGENT_NAME, DEPT, task_id, 90, "Aggregating dashboard metrics")
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

    duration = int((time.monotonic() - t0) * 1000)
    await se.task_completed(AGENT_NAME, DEPT, task_id, 88, "B+", duration)
    await _heartbeat("active", "dashboard_generated")
    await se.agent_break(AGENT_NAME, DEPT, task_id)
    return dashboard


@app.get("/pipeline")
async def pipeline_detail(
    tenant_id: str = Query(default=DEFAULT_TENANT),
    institution: str | None = Query(default=None),
):
    """Detailed open seat pipeline by institution."""
    t0 = time.monotonic()
    task_id = await se.task_assigned(AGENT_NAME, DEPT, f"Pipeline detail: {institution or 'all'}", "medium")
    await se.task_started(AGENT_NAME, DEPT, task_id, {
        "plan": f"Query open seat pipeline detail for {institution or 'all institutions'}",
        "steps": ["query_firestore", "filter_institution", "format_results"],
    })
    await _heartbeat("active", "building_pipeline")

    await se.task_progress(AGENT_NAME, DEPT, task_id, 20, "LUC gate check: swarm_cycles")
    await luc_gate(LUC_ACCOUNT, "swarm_cycles", 1, AGENT_NAME, task_id)

    await se.task_progress(AGENT_NAME, DEPT, task_id, 40, "Querying Firestore openSeats")
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

    duration = int((time.monotonic() - t0) * 1000)
    await se.task_completed(AGENT_NAME, DEPT, task_id, 90, "A", duration)
    await se.agent_break(AGENT_NAME, DEPT, task_id)
    return {"tenant_id": tenant_id, "institution_filter": institution, "seats": results}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
