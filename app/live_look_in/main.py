"""Live Look In State Engine — real-time world state for FOAI-AIMS.

Polls agent statuses from Firestore every 10 seconds, builds world state,
streams diffs over WebSocket to connected clients.
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

SERVICES = {
    "money-engine-api": "https://money-engine-api-939270059361.us-central1.run.app",
    "nemoclaw": "https://nemoclaw-service-939270059361.us-central1.run.app",
    "openclaw": "https://openclaw-service-939270059361.us-central1.run.app",
    "hermes-agent": "https://hermes-agent-939270059361.us-central1.run.app",
    "edu-ang": "https://edu-ang-939270059361.us-central1.run.app",
    "scout-ang": "https://scout-ang-939270059361.us-central1.run.app",
    "content-ang": "https://content-ang-939270059361.us-central1.run.app",
    "ops-ang": "https://ops-ang-939270059361.us-central1.run.app",
    "biz-ang": "https://biz-ang-939270059361.us-central1.run.app",
}

AGENTS = [
    "Edu_Ang", "Scout_Ang", "Content_Ang", "Ops_Ang", "Biz_Ang",
    "Chicken_Hawk", "Hermes",
]

logger = logging.getLogger("live-look-in")

# ── World State ─────────────────────────────────────────────────────

_world_state: dict = {}
_prev_state: dict = {}
_connected_clients: set[WebSocket] = set()
_poll_task: asyncio.Task | None = None


def _compute_diff(old: dict, new: dict) -> dict:
    """Compute a shallow diff between old and new world state."""
    diff = {}
    all_keys = set(list(old.keys()) + list(new.keys()))
    for key in all_keys:
        old_val = old.get(key)
        new_val = new.get(key)
        if old_val != new_val:
            diff[key] = new_val
    return diff


async def _poll_world_state():
    """Poll Firestore for agent statuses and service health, build world state."""
    global _world_state, _prev_state
    import httpx

    while True:
        try:
            now = datetime.now(timezone.utc).isoformat()
            new_state = {"last_poll": now, "agents": {}, "services": {}, "metrics": {}}

            # Poll agent statuses from Firestore
            db = firestore.Client(project=GCP_PROJECT)
            for agent_name in AGENTS:
                doc = (
                    db.collection("agents")
                    .document(DEFAULT_TENANT)
                    .collection(agent_name)
                    .document("status")
                    .get()
                )
                if doc.exists:
                    new_state["agents"][agent_name] = doc.to_dict()
                else:
                    new_state["agents"][agent_name] = {
                        "name": agent_name,
                        "status": "no_data",
                        "currentTask": "unknown",
                    }

            # Poll service health endpoints
            async with httpx.AsyncClient(timeout=5.0) as client:
                for svc_name, url in SERVICES.items():
                    try:
                        resp = await client.get(f"{url}/health")
                        new_state["services"][svc_name] = {
                            "url": url,
                            "status": "healthy" if resp.status_code == 200 else "unhealthy",
                            "http_code": resp.status_code,
                        }
                    except httpx.HTTPError:
                        new_state["services"][svc_name] = {
                            "url": url,
                            "status": "unreachable",
                            "http_code": None,
                        }

            # Pull metrics summary
            enrollments = (
                db.collection("enrollments")
                .document(DEFAULT_TENANT)
                .collection("items")
                .limit(100)
                .stream()
            )
            revenue = 0.0
            enroll_count = 0
            for doc in enrollments:
                data = doc.to_dict()
                revenue += data.get("revenue", 0.0)
                enroll_count += 1

            seats_docs = (
                db.collection("openSeats")
                .document(DEFAULT_TENANT)
                .collection("items")
                .limit(200)
                .stream()
            )
            seat_count = sum(1 for _ in seats_docs)

            new_state["metrics"] = {
                "total_revenue": revenue,
                "enrollment_count": enroll_count,
                "open_seats_tracked": seat_count,
            }

            # Compute diff and broadcast
            _prev_state = deepcopy(_world_state)
            _world_state = new_state

            diff = _compute_diff(
                {"agents": _prev_state.get("agents", {}), "services": _prev_state.get("services", {}), "metrics": _prev_state.get("metrics", {})},
                {"agents": new_state["agents"], "services": new_state["services"], "metrics": new_state["metrics"]},
            )

            if diff and _connected_clients:
                message = json.dumps({"type": "diff", "timestamp": now, "data": diff})
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
    title="Live Look In State Engine",
    description="Real-time world state for FOAI-AIMS ecosystem.",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "live-look-in-state",
        "version": "0.1.0",
        "connected_clients": len(_connected_clients),
    }


@app.get("/state")
async def get_state():
    """Return current world state as JSON."""
    return _world_state


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """Stream world state diffs to connected clients."""
    await ws.accept()
    _connected_clients.add(ws)

    # Send full state on connect
    try:
        await ws.send_text(json.dumps({
            "type": "full",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": _world_state,
        }))
    except Exception:
        _connected_clients.discard(ws)
        return

    # Keep alive until disconnect
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        _connected_clients.discard(ws)


# Serve React frontend — must be last to avoid catching API routes
STATIC_DIR = Path(__file__).parent / "static"
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve React SPA — all non-API paths return index.html."""
        file_path = STATIC_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(STATIC_DIR / "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
