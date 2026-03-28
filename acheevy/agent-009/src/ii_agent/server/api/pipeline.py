"""
Pipeline API endpoints — exposes ACHEEVY pipeline to frontend and bridge.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from ii_agent.pipeline.acheevy_pipeline import AcheevyPipeline
from ii_agent.pipeline.router import TaskRouter

router = APIRouter(prefix="/pipeline", tags=["pipeline"])

# Singleton instances (initialized on first use)
_pipeline: Optional[AcheevyPipeline] = None
_router_instance: Optional[TaskRouter] = None


def get_pipeline() -> AcheevyPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = AcheevyPipeline()
    return _pipeline


def get_task_router() -> TaskRouter:
    global _router_instance
    if _router_instance is None:
        _router_instance = TaskRouter()
    return _router_instance


class PipelineRequest(BaseModel):
    query: str
    context: Optional[dict] = None


class PipelineResponse(BaseModel):
    task_id: str
    route: str
    status: str
    stages: list[dict]


@router.get("/health")
async def pipeline_health():
    """Pipeline liveness check."""
    return {"status": "ok", "engine": "ACHEEVY Pipeline"}


@router.post("/run", response_model=PipelineResponse)
async def run_pipeline(req: PipelineRequest):
    """Execute a task through the full ACHEEVY pipeline."""
    pipeline = get_pipeline()
    task = await pipeline.run(query=req.query, context=req.context)
    return PipelineResponse(
        task_id=task.task_id,
        route=task.route.value,
        status=task.status,
        stages=[s.to_dict() for s in task.stages],
    )


@router.get("/tasks")
async def list_tasks():
    """List all pipeline tasks."""
    pipeline = get_pipeline()
    return {"tasks": pipeline.list_tasks()}


@router.get("/tasks/{task_id}")
async def get_task(task_id: str):
    """Get status of a specific pipeline task."""
    pipeline = get_pipeline()
    task = pipeline.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task.to_dict()


@router.get("/capabilities")
async def get_capabilities():
    """Return capability map showing what routes where."""
    task_router = get_task_router()
    return task_router.get_capability_map()
