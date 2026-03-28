"""Execution lane planning for run-level routing decisions."""

from typing import Any, Literal, Optional

from pydantic import BaseModel

from ii_agent.core.config.ii_agent_config import config


ExecutionLane = Literal[
    "direct_ii_agent", "platform_workflow", "delegated_execution"
]
RuntimeExecutionMode = Literal[
    "direct_ii_agent", "platform_workflow", "delegated_execution"
]


class ExecutionLanePlan(BaseModel):
    requested_execution_lane: ExecutionLane = "direct_ii_agent"
    runtime_execution_mode: RuntimeExecutionMode = "direct_ii_agent"
    runtime_execution_allowed: bool = True
    external_dispatch_required: bool = False
    policy_action: Literal["execute", "fallback_to_direct", "block"] = "execute"
    policy_reason: Optional[str] = None
    fallback_reason: Optional[str] = None
    platform_workflow_available: bool = False
    delegated_execution_available: bool = False

    def to_metadata(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True)


class ExecutionLaneService:
    """Resolves the executable runtime plan for a routing decision."""

    @staticmethod
    def _normalize_execution_lane(routing_decision: Optional[dict[str, Any]]) -> ExecutionLane:
        execution_lane = (routing_decision or {}).get("execution_lane")
        if execution_lane in {
            "direct_ii_agent",
            "platform_workflow",
            "delegated_execution",
        }:
            return execution_lane
        return "direct_ii_agent"

    @classmethod
    def build_plan(
        cls, routing_decision: Optional[dict[str, Any]] = None
    ) -> ExecutionLanePlan:
        requested_execution_lane = cls._normalize_execution_lane(routing_decision)

        # Current live runtime only has a verified direct ii-agent execution path.
        # The bridge is inbound and callback-oriented, not a general outbound lane dispatcher.
        platform_workflow_available = False
        delegated_execution_available = False

        runtime_execution_allowed = True
        policy_action: Literal["execute", "fallback_to_direct", "block"] = "execute"
        policy_reason = None
        fallback_reason = None
        if requested_execution_lane == "platform_workflow":
            if config.aims_bridge_enabled and config.aims_gateway_url:
                policy_reason = (
                    "platform_workflow requested but no outbound platform workflow "
                    "dispatcher is implemented in the live runtime"
                )
            else:
                policy_reason = (
                    "platform_workflow requested but the AIMS bridge is not fully configured "
                    "for outbound dispatch"
                )
        elif requested_execution_lane == "delegated_execution":
            policy_reason = (
                "delegated_execution requested but no delegated executor is wired in the "
                "live runtime"
            )

        if policy_reason is not None:
            if config.execution_lane_policy == "fail_closed":
                runtime_execution_allowed = False
                policy_action = "block"
            else:
                policy_action = "fallback_to_direct"
                fallback_reason = (
                    f"{policy_reason}; falling back to direct_ii_agent"
                )

        runtime_execution_mode: RuntimeExecutionMode = "direct_ii_agent"
        if not runtime_execution_allowed:
            runtime_execution_mode = requested_execution_lane

        return ExecutionLanePlan(
            requested_execution_lane=requested_execution_lane,
            runtime_execution_mode=runtime_execution_mode,
            runtime_execution_allowed=runtime_execution_allowed,
            external_dispatch_required=requested_execution_lane != "direct_ii_agent",
            policy_action=policy_action,
            policy_reason=policy_reason,
            fallback_reason=fallback_reason,
            platform_workflow_available=platform_workflow_available,
            delegated_execution_available=delegated_execution_available,
        )

    @classmethod
    def build_runtime_metadata(
        cls,
        *,
        routing_decision: Optional[dict[str, Any]],
        base_metadata: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        plan = cls.build_plan(routing_decision)
        routing_decision_payload = dict(routing_decision or {})

        return {
            **(base_metadata or {}),
            "routing_decision": routing_decision_payload or None,
            **plan.to_metadata(),
            "routing_intent_type": routing_decision_payload.get("intent_type") or "chat",
            "routing_research_level": routing_decision_payload.get("research_level") or "none",
            "routing_task_complexity": routing_decision_payload.get("task_complexity") or "simple",
            "delegation_required": bool(
                routing_decision_payload.get("delegation_required", False)
            ),
        }