"""Pydantic input/output schemas for every Taskade-adapter capability.

Per v2 Open Source Agent Intake skill §6: the orchestrator must never call the
wrapped service with unstructured input. Every capability has explicit input
+ output schemas validated at the FastAPI boundary.
"""
from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

# ─── Shared envelope shapes ────────────────────────────────────────────────


class InvokeRequest(BaseModel):
    """Inbound request to POST /invoke. The capability name selects the
    per-capability parameter schema applied to `params` inside the dispatcher.
    """
    capability: str = Field(
        ..., description="Canonical capability name — see capabilities.CAPABILITY_REGISTRY"
    )
    params: dict[str, Any] = Field(
        default_factory=dict, description="Per-capability parameters"
    )


class InvokeResponse(BaseModel):
    ok: bool
    capability: str
    result: Optional[dict[str, Any]] = None
    error: Optional[dict[str, Any]] = None


class JobCreateResponse(BaseModel):
    ok: bool
    job_id: str
    status: Literal["queued", "running", "completed", "failed", "cancelled_by_caller"]


class JobStatusResponse(BaseModel):
    ok: bool
    job_id: str
    status: Literal["queued", "running", "completed", "failed", "cancelled_by_caller"]
    result: Optional[dict[str, Any]] = None
    error: Optional[dict[str, Any]] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


class HealthResponse(BaseModel):
    ok: bool
    taskade_api_reachable: bool
    last_invoke_at: Optional[str] = None
    version: str
    trust_status: str


# ─── Per-capability param schemas ─────────────────────────────────────────


class WorkspaceListParams(BaseModel):
    """No params; returns all workspaces accessible to the token."""


class WorkspaceGetParams(BaseModel):
    workspace_id: str


class ProjectCreateParams(BaseModel):
    workspace_id: str
    title: str
    content_html: Optional[str] = None
    project_type: Literal["doc", "mindmap", "kanban", "calendar", "list"] = "doc"
    folder_id: Optional[str] = None


class ProjectUpdateParams(BaseModel):
    project_id: str
    title: Optional[str] = None
    content_html: Optional[str] = None


class ProjectArchiveParams(BaseModel):
    project_id: str


class ProjectGetParams(BaseModel):
    project_id: str


class TaskAddParams(BaseModel):
    project_id: str
    text: str
    parent_id: Optional[str] = None


class TaskUpdateParams(BaseModel):
    project_id: str
    task_id: str
    text: Optional[str] = None
    completed: Optional[bool] = None


class TaskCompleteParams(BaseModel):
    project_id: str
    task_id: str


class AuditEventRenderHtmlParams(BaseModel):
    """Pure function — no Taskade call. Renders an audit_event row as HTML
    suitable for embedding into a Taskade project, with Sacred Separation
    redaction applied based on `surface`.
    """
    event_id: str
    agent: str
    action: str
    payload: dict[str, Any] = Field(default_factory=dict)
    timestamp: str
    surface: Literal["owner_tier", "client_tier"] = "client_tier"
    customer_uid: Optional[str] = Field(
        default=None,
        description="If present, will be SHA-256 hashed with TASKADE_PII_SALT before render",
    )


class CoachingNoteAppendParams(BaseModel):
    """Appends a coaching-note HTML block to an HRPMO cycle project."""
    project_id: str
    agent_name: str
    week_iso: str = Field(..., description="ISO week like 2026-W20")
    body_md: str
    surface: Literal["owner_tier", "client_tier"] = "owner_tier"


# Map capability name → its param Pydantic model. Used by the dispatcher.
CAPABILITY_PARAM_SCHEMAS: dict[str, type[BaseModel]] = {
    "workspace.list": WorkspaceListParams,
    "workspace.get": WorkspaceGetParams,
    "project.create": ProjectCreateParams,
    "project.update": ProjectUpdateParams,
    "project.archive": ProjectArchiveParams,
    "project.get": ProjectGetParams,
    "task.add": TaskAddParams,
    "task.update": TaskUpdateParams,
    "task.complete": TaskCompleteParams,
    "audit_event.render_html": AuditEventRenderHtmlParams,
    "coaching_note.append": CoachingNoteAppendParams,
}
