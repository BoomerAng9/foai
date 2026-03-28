"""Live Look In — Animated workspace viewer for FOAI-AIMS.

Polls agent statuses from Firestore every 10 seconds, maps each Boomer_Ang
to a room/department and task, broadcasts world state diffs over WebSocket
to drive the animated floor plan renderer.
"""

import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from google.cloud import firestore

GCP_PROJECT = os.getenv("GCP_PROJECT", "foai-aims")
DEFAULT_TENANT = os.getenv("DEFAULT_TENANT", "cti")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "10"))
PORT = int(os.getenv("PORT", "8080"))

# ── Department / Room Mapping ───────────────────────────────────────

AGENT_DEPARTMENTS = {
    "Edu_Ang": {
        "department": "Education Sales",
        "room": "edu_office",
        "color": "#3b82f6",
        "emoji": "🪃",
        "home_x": 60,
        "home_y": 120,
    },
    "Scout_Ang": {
        "department": "University Contracting",
        "room": "scout_office",
        "color": "#22c55e",
        "emoji": "🪃",
        "home_x": 220,
        "home_y": 120,
    },
    "Content_Ang": {
        "department": "SEO & Content",
        "room": "content_lab",
        "color": "#a855f7",
        "emoji": "🪃",
        "home_x": 380,
        "home_y": 120,
    },
    "Ops_Ang": {
        "department": "Platform Ops",
        "room": "ops_center",
        "color": "#f59e0b",
        "emoji": "🪃",
        "home_x": 540,
        "home_y": 120,
    },
    "Biz_Ang": {
        "department": "Client Growth",
        "room": "biz_suite",
        "color": "#ec4899",
        "emoji": "🪃",
        "home_x": 700,
        "home_y": 120,
    },
}

ROOMS = {
    "edu_office":    {"label": "Education Sales",       "x": 20,  "y": 60,  "w": 160, "h": 140},
    "scout_office":  {"label": "University Contracting", "x": 190, "y": 60,  "w": 160, "h": 140},
    "content_lab":   {"label": "SEO & Content Lab",     "x": 360, "y": 60,  "w": 160, "h": 140},
    "ops_center":    {"label": "Platform Ops Center",   "x": 530, "y": 60,  "w": 160, "h": 140},
    "biz_suite":     {"label": "Client Growth Suite",   "x": 700, "y": 60,  "w": 160, "h": 140},
    "break_room":    {"label": "Break Room",            "x": 280, "y": 260, "w": 300, "h": 100},
    "acheevy_office":{"label": "ACHEEVY's Office",      "x": 20,  "y": 260, "w": 200, "h": 100},
    "server_room":   {"label": "Server Room",           "x": 640, "y": 260, "w": 220, "h": 100},
}

SERVICES = {
    "money-engine-api": "https://money-engine-api-939270059361.us-central1.run.app",
    "nemoclaw":         "https://nemoclaw-service-939270059361.us-central1.run.app",
    "openclaw":         "https://openclaw-service-939270059361.us-central1.run.app",
    "hermes-agent":     "https://hermes-agent-939270059361.us-central1.run.app",
    "edu-ang":          "https://edu-ang-939270059361.us-central1.run.app",
    "scout-ang":        "https://scout-ang-939270059361.us-central1.run.app",
    "content-ang":      "https://content-ang-939270059361.us-central1.run.app",
    "ops-ang":          "https://ops-ang-939270059361.us-central1.run.app",
    "biz-ang":          "https://biz-ang-939270059361.us-central1.run.app",
}

AGENT_NAMES = list(AGENT_DEPARTMENTS.keys())

logger = logging.getLogger("live-look-in")

# ── World State ─────────────────────────────────────────────────────

_world_state: dict = {
    "agents": {},
    "rooms": ROOMS,
    "services": {},
    "metrics": {},
    "jobs_log": [],
    "kpi_grades": {},
    "last_poll": None,
}
_prev_state: dict = {}
_connected_clients: set[WebSocket] = set()
_poll_task: asyncio.Task | None = None


def _determine_room(agent_name: str, status: str, task: str) -> str:
    """Map agent status/task to a room on the floor plan."""
    if status in ("offline", "shutting_down"):
        return "break_room"
    if status == "directive_received":
        return "acheevy_office"
    if "health_check" in task or "monitoring" in task:
        return "server_room"
    dept = AGENT_DEPARTMENTS.get(agent_name, {})
    return dept.get("room", "break_room")


def _compute_kpi_grade(agent_name: str, data: dict) -> dict:
    """Compute simple KPI grade based on agent activity."""
    status = data.get("status", "no_data")
    task = data.get("currentTask", "")

    if status in ("active", "monitoring"):
        score = 85
        grade = "A"
    elif status in ("online", "directive_received"):
        score = 70
        grade = "B"
    elif status == "idle":
        score = 50
        grade = "C"
    else:
        score = 0
        grade = "N/A"

    return {"agent": agent_name, "score": score, "grade": grade, "status": status}


def _diff(old: dict, new: dict) -> dict:
    """Shallow diff for broadcasting changes."""
    diff = {}
    for key in set(list(old.keys()) + list(new.keys())):
        if old.get(key) != new.get(key):
            diff[key] = new.get(key)
    return diff


async def _poll_world_state():
    """Poll Firestore + service health, build full world state."""
    global _world_state, _prev_state
    import httpx

    while True:
        try:
            now = datetime.now(timezone.utc).isoformat()
            new_agents = {}
            new_kpi = {}
            new_jobs = list(_world_state.get("jobs_log", []))[-50:]  # keep last 50

            db = firestore.Client(project=GCP_PROJECT)

            # Poll agent statuses
            for agent_name in AGENT_NAMES:
                doc = (
                    db.collection("agents")
                    .document(DEFAULT_TENANT)
                    .collection(agent_name)
                    .document("status")
                    .get()
                )
                if doc.exists:
                    data = doc.to_dict()
                else:
                    data = {"name": agent_name, "status": "no_data", "currentTask": "awaiting_deployment"}

                status = data.get("status", "no_data")
                task = data.get("currentTask", "idle")
                room = _determine_room(agent_name, status, task)
                dept = AGENT_DEPARTMENTS.get(agent_name, {})

                new_agents[agent_name] = {
                    **data,
                    "room": room,
                    "department": dept.get("department", "Unassigned"),
                    "color": dept.get("color", "#6b7280"),
                    "emoji": dept.get("emoji", "🪃"),
                    "x": ROOMS.get(room, {}).get("x", 0) + 40,
                    "y": ROOMS.get(room, {}).get("y", 0) + 50,
                }

                new_kpi[agent_name] = _compute_kpi_grade(agent_name, data)

                # Log task changes
                prev_task = _world_state.get("agents", {}).get(agent_name, {}).get("currentTask")
                if task != prev_task and task != "idle":
                    new_jobs.append({
                        "agent": agent_name,
                        "task": task,
                        "status": status,
                        "room": room,
                        "timestamp": now,
                    })

            # Poll service health
            new_services = {}
            async with httpx.AsyncClient(timeout=5.0) as client:
                for svc_name, url in SERVICES.items():
                    try:
                        resp = await client.get(f"{url}/health")
                        new_services[svc_name] = {
                            "url": url,
                            "status": "healthy" if resp.status_code == 200 else "unhealthy",
                            "http_code": resp.status_code,
                        }
                    except httpx.HTTPError:
                        new_services[svc_name] = {
                            "url": url,
                            "status": "unreachable",
                            "http_code": None,
                        }

            # Metrics
            enrollments = db.collection("enrollments").document(DEFAULT_TENANT).collection("items").limit(100).stream()
            revenue = 0.0
            enroll_count = 0
            for doc in enrollments:
                d = doc.to_dict()
                revenue += d.get("revenue", 0.0)
                enroll_count += 1

            seats_docs = db.collection("openSeats").document(DEFAULT_TENANT).collection("items").limit(200).stream()
            seat_count = sum(1 for _ in seats_docs)

            new_state = {
                "agents": new_agents,
                "rooms": ROOMS,
                "services": new_services,
                "metrics": {
                    "total_revenue": revenue,
                    "enrollment_count": enroll_count,
                    "open_seats_tracked": seat_count,
                },
                "jobs_log": new_jobs[-50:],
                "kpi_grades": new_kpi,
                "last_poll": now,
            }

            _prev_state = deepcopy(_world_state)
            _world_state = new_state

            # Broadcast to clients
            if _connected_clients:
                diff = _diff(
                    {k: json.dumps(v, default=str) for k, v in _prev_state.items()},
                    {k: json.dumps(v, default=str) for k, v in new_state.items()},
                )
                if diff:
                    message = json.dumps({"type": "diff", "timestamp": now, "data": new_state}, default=str)
                    dead = set()
                    for ws in _connected_clients:
                        try:
                            await ws.send_text(message)
                        except Exception:
                            dead.add(ws)
                    _connected_clients -= dead

        except Exception:
            logger.exception("World state poll failed")

        await asyncio.sleep(POLL_INTERVAL)


# ── App ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _poll_task
    _poll_task = asyncio.create_task(_poll_world_state())
    yield
    if _poll_task:
        _poll_task.cancel()


app = FastAPI(
    title="Live Look In",
    description="Animated workspace viewer for the FOAI-AIMS Boomer_Ang fleet.",
    version="0.2.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "live-look-in",
        "version": "0.2.0",
        "connected_clients": len(_connected_clients),
    }


@app.get("/state")
async def get_state():
    return _world_state


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    _connected_clients.add(ws)
    try:
        await ws.send_text(json.dumps({
            "type": "full",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": _world_state,
        }, default=str))
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        _connected_clients.discard(ws)


# Serve React SPA — must be last
STATIC_DIR = Path(__file__).parent / "static"
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = STATIC_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(STATIC_DIR / "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
