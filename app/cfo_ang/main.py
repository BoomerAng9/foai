"""CFO_Ang — LUC Ledger Usage Calculator for FOAI-AIMS.

All metering math in aims_tools/luc/luc_engine.py.
Plans are policy loaded from Firestore. No hardcoded limits.
"""

import os
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI

from routers.luc_api import router as luc_router

AGENT_NAME = "CFO_Ang"
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
    await _heartbeat("online", "luc_engine_ready")
    yield
    await _heartbeat("offline", "shutting_down")


app = FastAPI(
    title="CFO_Ang — LUC Engine",
    description="Liquid Utility Credits: metering, gating, and billing for FOAI-AIMS.",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(luc_router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "cfo-ang",
        "agent": AGENT_NAME,
        "version": "0.1.0",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
