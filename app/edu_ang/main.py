"""Edu_Ang — MindEdge enrollment tracking Boomer_Ang.

Manages affiliate links and tracks enrollment conversions.
Dept: PMO-LAUNCH (enrollment). Emits events to Live Look In State Engine.
"""

import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI, Query
from pydantic import BaseModel

import state_emitter as se
from luc_middleware import luc_gate
from memory_hooks import MemoryHooks

AGENT_NAME = "Edu_Ang"
DEPT = "PMO-LAUNCH"
memory = MemoryHooks(AGENT_NAME, "boomer_ang", DEPT)
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
    await se.agent_online(AGENT_NAME, DEPT, "MindEdge enrollment tracking & affiliate links")
    yield
    await se.agent_break(AGENT_NAME, DEPT)
    await se.close()
    await _heartbeat("offline", "shutting_down")


app = FastAPI(
    title="Edu_Ang",
    description="MindEdge enrollment tracking — Boomer_Ang deployed by ACHEEVY.",
    version="0.2.0",
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
    return {"status": "ok", "service": "edu-ang", "agent": AGENT_NAME, "version": "0.2.0"}


@app.get("/links/{category}")
async def get_links(category: str, tenant_id: str = Query(default=DEFAULT_TENANT)):
    """Proxy to Money Engine GET /links/{category}."""
    t0 = time.monotonic()
    task_id = await se.task_assigned(AGENT_NAME, DEPT, f"Fetch links: {category}", "low")

    plan_id, _ = await memory.before_task(
        task_id=task_id, title=f"Fetch links: {category}",
        role="MindEdge enrollment operator",
        mission=f"Retrieve active affiliate links for category '{category}'",
        vision="Accurate, up-to-date affiliate links served instantly",
        objective=f"Return all active MindEdge links for '{category}'",
        steps=["call_money_engine", "return_tagged_links"],
    )

    await se.task_started(AGENT_NAME, DEPT, task_id, {
        "plan": f"Retrieve active MindEdge links for category '{category}'",
        "steps": ["call_money_engine", "return_tagged_links"],
    })
    await _heartbeat("active", f"fetching_links:{category}")

    await se.task_progress(AGENT_NAME, DEPT, task_id, 30, "Calling Money Engine /links")
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{MONEY_ENGINE_URL}/links/{category}",
            params={"tenant_id": tenant_id},
        )
    result = resp.json()

    duration = int((time.monotonic() - t0) * 1000)
    await se.task_completed(AGENT_NAME, DEPT, task_id, 90, "A", duration)
    await memory.after_task(plan_id, task_id, 90, "A", duration, f"Fetched links for {category}")
    await se.agent_break(AGENT_NAME, DEPT, task_id)
    return result


@app.post("/links/create", status_code=201)
async def create_link(link: LinkCreate):
    """Proxy to Money Engine POST /links/create."""
    t0 = time.monotonic()
    task_id = await se.task_assigned(AGENT_NAME, DEPT, f"Create link: {link.category}", "medium")
    await se.task_started(AGENT_NAME, DEPT, task_id, {
        "plan": f"Create new MindEdge affiliate link for '{link.category}'",
        "steps": ["validate_input", "call_money_engine", "confirm_creation"],
    })
    await _heartbeat("active", "creating_link")

    await se.task_progress(AGENT_NAME, DEPT, task_id, 50, "Posting to Money Engine /links/create")
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{MONEY_ENGINE_URL}/links/create",
            json=link.model_dump(),
        )
    result = resp.json()

    duration = int((time.monotonic() - t0) * 1000)
    await se.task_completed(AGENT_NAME, DEPT, task_id, 95, "A", duration)
    await se.agent_break(AGENT_NAME, DEPT, task_id)
    return result


@app.post("/enroll", status_code=201)
async def record_enrollment(record: EnrollmentRecord):
    """Record an enrollment conversion in Firestore."""
    t0 = time.monotonic()
    task_id = await se.task_assigned(AGENT_NAME, DEPT, f"Record enrollment: {record.sku}", "medium")

    plan_id, _ = await memory.before_task(
        task_id=task_id, title=f"Record enrollment: {record.sku}",
        role="MindEdge enrollment operator",
        mission=f"Record enrollment conversion for SKU '{record.sku}'",
        vision="Every enrollment tracked with revenue attribution",
        objective=f"Persist enrollment for SKU '{record.sku}' at ${record.revenue}",
        steps=["validate_record", "luc_gate_check", "write_firestore", "confirm_enrollment"],
    )

    await se.task_started(AGENT_NAME, DEPT, task_id, {
        "plan": f"Record MindEdge enrollment for SKU '{record.sku}', revenue ${record.revenue}",
        "steps": ["validate_record", "write_firestore", "confirm_enrollment"],
    })
    await _heartbeat("active", f"recording_enrollment:{record.sku}")

    await se.task_progress(AGENT_NAME, DEPT, task_id, 30, "LUC gate check: swarm_cycles")
    await luc_gate(LUC_ACCOUNT, "swarm_cycles", 1, AGENT_NAME, task_id)

    await se.task_progress(AGENT_NAME, DEPT, task_id, 50, "Writing enrollment to Firestore")
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

    duration = int((time.monotonic() - t0) * 1000)
    await se.task_completed(AGENT_NAME, DEPT, task_id, 95, "A", duration)
    await memory.after_task(
        plan_id, task_id, 95, "A", duration,
        f"Enrolled SKU {record.sku}, revenue ${record.revenue}, source {record.source_utm}",
    )
    await _heartbeat("active", "enrollment_recorded")
    await se.agent_break(AGENT_NAME, DEPT, task_id)
    return {"id": doc_ref.id, "timestamp": now}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
