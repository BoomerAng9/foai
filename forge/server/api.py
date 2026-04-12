"""Forge server — FastAPI surface for CTI Hub (owner-only)."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml
from fastapi import Depends, FastAPI, HTTPException, Request, status
from pydantic import BaseModel, Field

from forge.core.schema import Workflow

WORKFLOWS_DIR = Path(__file__).resolve().parent.parent / "workflows"
FORGE_API_SECRET = os.getenv("FORGE_API_SECRET", "")

app = FastAPI(
    title="Forge Harness API",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


async def require_auth(request: Request) -> None:
    if not FORGE_API_SECRET:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Not configured")
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer ") or auth[7:] != FORGE_API_SECRET:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Unauthorized")


class RunRequest(BaseModel):
    workflow_id: str
    task_id: str
    inputs: dict[str, Any] = Field(default_factory=dict)


class ValidateRequest(BaseModel):
    yaml_content: str


def _load_workflows() -> dict[str, Workflow]:
    wfs: dict[str, Workflow] = {}
    if not WORKFLOWS_DIR.exists():
        return wfs
    for p in sorted(WORKFLOWS_DIR.glob("*.yaml")):
        data = yaml.safe_load(p.read_text())
        try:
            wfs[data["id"]] = Workflow(**data)
        except Exception:
            pass
    return wfs


@app.get("/forge/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "forge-harness"}


@app.get("/forge/workflows", dependencies=[Depends(require_auth)])
async def list_workflows() -> list[dict[str, Any]]:
    return [
        {"id": w.id, "version": str(w.version), "owner": w.owner,
         "description": w.description, "steps": len(w.steps)}
        for w in _load_workflows().values()
    ]


@app.post("/forge/run", dependencies=[Depends(require_auth)], status_code=202)
async def create_run(req: RunRequest) -> dict[str, Any]:
    wfs = _load_workflows()
    if req.workflow_id not in wfs:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workflow not found")
    return {"status": "accepted", "workflow_id": req.workflow_id,
            "task_id": req.task_id, "steps": len(wfs[req.workflow_id].steps)}


@app.get("/forge/runs", dependencies=[Depends(require_auth)])
async def list_runs() -> dict[str, Any]:
    return {"runs": [], "total": 0}


@app.get("/forge/runs/{run_id}", dependencies=[Depends(require_auth)])
async def get_run(run_id: str) -> dict[str, Any]:
    return {"run_id": run_id, "status": "not_connected"}


@app.post("/forge/validate", dependencies=[Depends(require_auth)])
async def validate_workflow(req: ValidateRequest) -> dict[str, Any]:
    try:
        data = yaml.safe_load(req.yaml_content)
        wf = Workflow(**data)
        return {"valid": True, "id": wf.id, "steps": len(wf.steps)}
    except Exception as exc:
        return {"valid": False, "error": str(exc)}
