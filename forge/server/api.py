"""Forge server — FastAPI surface for CTI Hub (owner-only).

Phase 7 implementation. Defines the API structure; endpoints will be
wired to the runtime in Phase 7.
"""

from __future__ import annotations

from fastapi import FastAPI

app = FastAPI(
    title="Forge Harness API",
    description="Smelter OS native workflow engine — owner-only surface for CTI Hub",
    version="1.0.0",
    docs_url="/forge/docs",
    redoc_url="/forge/redoc",
)


@app.get("/forge/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "service": "forge-harness"}


@app.get("/forge/workflows")
async def list_workflows() -> dict[str, str]:
    """List available workflows. Phase 7."""
    return {"status": "phase_7_pending"}


@app.post("/forge/run")
async def create_run() -> dict[str, str]:
    """Trigger a workflow run. Phase 7."""
    return {"status": "phase_7_pending"}


@app.get("/forge/runs/{run_id}")
async def get_run(run_id: str) -> dict[str, str]:
    """Get run status. Phase 7."""
    return {"status": "phase_7_pending", "run_id": run_id}
