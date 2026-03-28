"""Routing helpers shared across HTTP chat and Socket.IO query intake."""

from datetime import datetime, timezone
from typing import Any, Literal, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from ii_agent.config.agent_types import AgentType
from ii_agent.db.models import Session
from ii_agent.pipeline.acheevy_pipeline import IntakeClassifier, TaskRoute
from ii_agent.server.models.session_context import (
    RoutingDecisionInfo,
    merge_session_settings_payload,
)
from ii_agent.utils.ntntn_converter import needs_clarification, ntntn_translate


SPECIALIZED_AGENT_TYPES = {
    AgentType.SLIDE,
    AgentType.WEBSITE_BUILD,
    AgentType.RESEARCHER,
    AgentType.MEDIA,
    AgentType.BROWSER,
    AgentType.DESIGN_DOCUMENT,
    AgentType.CODEX,
    AgentType.CLAUDE_CODE,
}


def _normalize_agent_type(agent_type: Any) -> AgentType:
    if isinstance(agent_type, AgentType):
        return agent_type
    if isinstance(agent_type, str):
        try:
            return AgentType(agent_type)
        except ValueError:
            return AgentType.GENERAL
    return AgentType.GENERAL


def resolve_agent_type_for_routing(
    *,
    requested_agent_type: Any,
    routing_decision: Optional[dict[str, Any]],
    user_text: str,
) -> AgentType:
    """Resolve the runtime agent profile from routing hints and user intent.

    Preserve explicitly specialized callers, but upgrade generic/task-agent requests
    when the routing decision indicates a clearer execution mode.
    """

    normalized_requested_agent_type = _normalize_agent_type(requested_agent_type)
    if normalized_requested_agent_type in SPECIALIZED_AGENT_TYPES:
        return normalized_requested_agent_type

    routing = routing_decision or {}
    intent_type = str(routing.get("intent_type") or "").strip().lower()
    execution_lane = str(routing.get("execution_lane") or "direct_ii_agent").strip().lower()
    research_level = str(routing.get("research_level") or "none").strip().lower()
    task_complexity = str(routing.get("task_complexity") or "simple").strip().lower()
    text = user_text.strip().lower()

    if any(keyword in intent_type for keyword in ("slide", "slides", "presentation", "deck")) or any(
        keyword in text for keyword in ("slide", "slides", "presentation", "deck", "powerpoint", "ppt")
    ):
        return AgentType.SLIDE

    if any(keyword in intent_type for keyword in ("website", "landing", "frontend", "ui")) or any(
        keyword in text for keyword in ("website", "landing page", "frontend", "web app", "ui")
    ):
        return AgentType.WEBSITE_BUILD

    if research_level == "deep" or intent_type in {"research", "analysis"}:
        return AgentType.RESEARCHER

    if execution_lane in {"platform_workflow", "delegated_execution"}:
        return AgentType.TASK_AGENT

    if task_complexity in {"moderate", "complex"}:
        return AgentType.TASK_AGENT

    if normalized_requested_agent_type == AgentType.TASK_AGENT:
        return AgentType.TASK_AGENT

    return AgentType.GENERAL


def extract_user_text_from_chat_content(content: Any) -> str:
    """Extract plain user text from a chat request payload."""

    if isinstance(content, str):
        return content.strip()

    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                text = block.get("text")
                if isinstance(text, str) and text.strip():
                    parts.append(text.strip())
        return " ".join(parts).strip()

    return ""


def derive_routing_decision_payload(
    *,
    user_text: str,
    build_spec: Optional[dict[str, Any]] = None,
    attachment_ids: Optional[list[str]] = None,
    tools: Optional[dict[str, bool]] = None,
) -> Optional[dict[str, Any]]:
    """Derive a normalized routing decision for the current request."""

    normalized_text = user_text.strip()
    if not normalized_text:
        return None

    classification = IntakeClassifier.classify(normalized_text)
    attachment_count = len(attachment_ids or [])
    normalized_tools = tools or {}
    build_spec_payload = build_spec or {}

    technical_prompt = ntntn_translate(normalized_text)
    clarification_required = needs_clarification(normalized_text, technical_prompt)

    route = classification["route"]
    if route == TaskRoute.AIMS:
        execution_lane: Literal[
            "direct_ii_agent", "platform_workflow", "delegated_execution"
        ] = "platform_workflow"
    elif route == TaskRoute.HYBRID:
        execution_lane = "delegated_execution"
    else:
        execution_lane = "direct_ii_agent"

    research_level: Literal["none", "grounded", "deep"] = "none"
    if classification.get("needs_research"):
        research_level = "deep"
    elif attachment_count > 0 or build_spec_payload.get("terminology_engine_enabled"):
        research_level = "grounded"

    task_complexity: Literal["simple", "moderate", "complex"] = "simple"
    if route == TaskRoute.HYBRID or (
        classification.get("needs_research") and classification.get("needs_build")
    ):
        task_complexity = "complex"
    elif (
        classification.get("needs_research")
        or classification.get("needs_build")
        or classification.get("needs_deploy")
        or clarification_required
        or attachment_count > 0
        or normalized_tools.get("code_interpreter")
    ):
        task_complexity = "moderate"

    return RoutingDecisionInfo(
        intent_type=build_spec_payload.get("intent") or "chat",
        task_complexity=task_complexity,
        direct_ii_agent_capable=route == TaskRoute.ACHEEVY,
        platform_workflow_capable=route in (TaskRoute.AIMS, TaskRoute.HYBRID),
        delegation_required=execution_lane == "delegated_execution",
        research_level=research_level,
        execution_lane=execution_lane,
    ).model_dump(exclude_none=True)


async def persist_session_routing_decision(
    *,
    db_session: AsyncSession,
    session: Session,
    user_text: str,
    build_spec: Optional[dict[str, Any]] = None,
    attachment_ids: Optional[list[str]] = None,
    tools: Optional[dict[str, bool]] = None,
) -> Optional[dict[str, Any]]:
    """Persist a derived routing decision into the durable session envelope."""

    routing_decision = derive_routing_decision_payload(
        user_text=user_text,
        build_spec=build_spec,
        attachment_ids=attachment_ids,
        tools=tools,
    )
    if routing_decision is None:
        return None

    merged_settings = merge_session_settings_payload(
        session.settings,
        routing_decision=routing_decision,
    )
    if merged_settings is None or merged_settings == (session.settings or {}):
        return routing_decision

    session.settings = merged_settings
    session.updated_at = datetime.now(timezone.utc)
    await db_session.flush()

    return routing_decision