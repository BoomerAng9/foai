"""Product-owned session context contracts for chat state persistence."""

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class ContextPackInfo(BaseModel):
    """Reusable pack of sources and guidance selected by the user."""

    id: str
    name: str
    kind: str
    source_ids: list[str] = Field(default_factory=list)
    description: Optional[str] = None


class WorkingNotebookInfo(BaseModel):
    """Session-specific composition produced from selected Context Packs."""

    id: Optional[str] = None
    context_pack_ids: list[str] = Field(default_factory=list)
    status: Literal["idle", "grounded", "composed"] = "idle"


class BuildSpecInfo(BaseModel):
    """Intent and prompt-reconstruction metadata for the active session."""

    intent: Optional[str] = None
    terminology_engine_enabled: Optional[bool] = None
    prompt_enhancement_enabled: Optional[bool] = None
    model_id: Optional[str] = None


class RoutingDecisionInfo(BaseModel):
    """Structured routing output produced by NTNTN and ACHEEVY lane selection."""

    intent_type: str
    task_complexity: Literal["simple", "moderate", "complex"]
    direct_ii_agent_capable: bool
    platform_workflow_capable: bool
    delegation_required: bool
    research_level: Literal["none", "grounded", "deep"]
    execution_lane: Literal[
        "direct_ii_agent", "platform_workflow", "delegated_execution"
    ]


class ChannelDispatchContextInfo(BaseModel):
    """Optional metadata when a session was dispatched from an external channel."""

    provider: Literal["copaw"]
    channel: str
    user_id: str
    thread_id: Optional[str] = None


class SessionSnapshotInfo(BaseModel):
    """Persisted record of active session context and execution state."""

    version: int = 1
    selected_context_pack_ids: list[str] = Field(default_factory=list)
    active_model_id: Optional[str] = None
    speech_output_enabled: bool = False
    working_notebook_id: Optional[str] = None
    session_intent: Optional[str] = None
    attachment_ids: list[str] = Field(default_factory=list)
    channel_context: Optional[ChannelDispatchContextInfo] = None
    updated_at: str


class SessionContextInfo(BaseModel):
    """Expanded context state for a recoverable chat session."""

    context_packs: list[ContextPackInfo] = Field(default_factory=list)
    selected_context_pack_ids: list[str] = Field(default_factory=list)
    working_notebook: Optional[WorkingNotebookInfo] = None


class SessionSettingsEnvelope(BaseModel):
    """Known product-owned fields stored inside session.settings."""

    session_snapshot: Optional[SessionSnapshotInfo] = None
    session_context: Optional[SessionContextInfo] = None
    build_spec: Optional[BuildSpecInfo] = None
    routing_decision: Optional[RoutingDecisionInfo] = None


def validate_session_settings_payload(
    settings: Optional[dict[str, Any]],
) -> Optional[dict[str, Any]]:
    """Validate known session settings keys while preserving unknown fields."""
    if settings is None:
        return None

    validated_settings = dict(settings)

    if "session_snapshot" in validated_settings:
        snapshot = validated_settings["session_snapshot"]
        validated_settings["session_snapshot"] = (
            SessionSnapshotInfo.model_validate(snapshot).model_dump(exclude_none=True)
            if snapshot is not None
            else None
        )

    if "session_context" in validated_settings:
        session_context = validated_settings["session_context"]
        validated_settings["session_context"] = (
            SessionContextInfo.model_validate(session_context).model_dump(
                exclude_none=True
            )
            if session_context is not None
            else None
        )

    if "build_spec" in validated_settings:
        build_spec = validated_settings["build_spec"]
        validated_settings["build_spec"] = (
            BuildSpecInfo.model_validate(build_spec).model_dump(exclude_none=True)
            if build_spec is not None
            else None
        )

    if "routing_decision" in validated_settings:
        routing_decision = validated_settings["routing_decision"]
        validated_settings["routing_decision"] = (
            RoutingDecisionInfo.model_validate(routing_decision).model_dump(
                exclude_none=True
            )
            if routing_decision is not None
            else None
        )

    return validated_settings


def merge_session_settings_payload(
    existing_settings: Optional[dict[str, Any]],
    *,
    session_snapshot: Optional[dict[str, Any]] = None,
    session_context: Optional[dict[str, Any]] = None,
    build_spec: Optional[dict[str, Any]] = None,
    routing_decision: Optional[dict[str, Any]] = None,
) -> Optional[dict[str, Any]]:
    """Merge known session settings fields into an existing settings payload."""

    next_settings = dict(existing_settings or {})

    if session_snapshot is not None:
        next_settings["session_snapshot"] = session_snapshot

    if session_context is not None:
        next_settings["session_context"] = session_context

    if build_spec is not None:
        next_settings["build_spec"] = build_spec

    if routing_decision is not None:
        next_settings["routing_decision"] = routing_decision

    return validate_session_settings_payload(next_settings)