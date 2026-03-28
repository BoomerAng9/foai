from types import SimpleNamespace

from ii_agent.server.services.agent_run_service import AgentRunService
from ii_agent.server.services.execution_lane_service import ExecutionLaneService


def test_build_plan_direct_lane_has_no_fallback():
    routing_decision = {
        "execution_lane": "direct_ii_agent",
        "intent_type": "chat",
        "research_level": "none",
        "task_complexity": "simple",
    }

    plan = ExecutionLaneService.build_plan(routing_decision)

    assert plan.requested_execution_lane == "direct_ii_agent"
    assert plan.runtime_execution_mode == "direct_ii_agent"
    assert plan.runtime_execution_allowed is True
    assert plan.external_dispatch_required is False
    assert plan.policy_action == "execute"
    assert plan.policy_reason is None
    assert plan.fallback_reason is None


def test_build_plan_platform_workflow_returns_structured_fallback():
    routing_decision = {
        "execution_lane": "platform_workflow",
        "intent_type": "build",
        "research_level": "grounded",
        "task_complexity": "moderate",
    }

    plan = ExecutionLaneService.build_plan(routing_decision)

    assert plan.requested_execution_lane == "platform_workflow"
    assert plan.runtime_execution_mode == "direct_ii_agent"
    assert plan.runtime_execution_allowed is True
    assert plan.external_dispatch_required is True
    assert plan.platform_workflow_available is False
    assert plan.policy_action == "fallback_to_direct"
    assert plan.policy_reason is not None
    assert plan.fallback_reason is not None
    assert "falling back to direct_ii_agent" in plan.fallback_reason


def test_build_plan_delegated_execution_returns_structured_fallback():
    routing_decision = {
        "execution_lane": "delegated_execution",
        "intent_type": "build",
        "research_level": "deep",
        "task_complexity": "complex",
        "delegation_required": True,
    }

    plan = ExecutionLaneService.build_plan(routing_decision)

    assert plan.requested_execution_lane == "delegated_execution"
    assert plan.runtime_execution_mode == "direct_ii_agent"
    assert plan.runtime_execution_allowed is True
    assert plan.external_dispatch_required is True
    assert plan.delegated_execution_available is False
    assert plan.policy_action == "fallback_to_direct"
    assert plan.policy_reason is not None
    assert plan.fallback_reason is not None
    assert "delegated_execution requested" in plan.fallback_reason


def test_build_plan_can_fail_closed(monkeypatch):
    monkeypatch.setattr(
        "ii_agent.server.services.execution_lane_service.config.execution_lane_policy",
        "fail_closed",
    )

    routing_decision = {
        "execution_lane": "delegated_execution",
        "intent_type": "build",
    }

    plan = ExecutionLaneService.build_plan(routing_decision)

    assert plan.requested_execution_lane == "delegated_execution"
    assert plan.runtime_execution_mode == "delegated_execution"
    assert plan.runtime_execution_allowed is False
    assert plan.policy_action == "block"
    assert plan.policy_reason is not None
    assert plan.fallback_reason is None


def test_build_runtime_metadata_preserves_routing_fields():
    routing_decision = {
        "execution_lane": "platform_workflow",
        "intent_type": "build",
        "research_level": "grounded",
        "task_complexity": "moderate",
        "delegation_required": False,
    }

    metadata = ExecutionLaneService.build_runtime_metadata(
        routing_decision=routing_decision,
        base_metadata={"source": "socket"},
    )

    assert metadata["source"] == "socket"
    assert metadata["routing_decision"] == routing_decision
    assert metadata["requested_execution_lane"] == "platform_workflow"
    assert metadata["runtime_execution_mode"] == "direct_ii_agent"
    assert metadata["external_dispatch_required"] is True
    assert metadata["routing_intent_type"] == "build"
    assert metadata["routing_research_level"] == "grounded"
    assert metadata["routing_task_complexity"] == "moderate"


def test_agent_run_service_build_runtime_metadata_uses_task_routing_decision():
    task = SimpleNamespace(
        routing_decision={
            "execution_lane": "delegated_execution",
            "intent_type": "build",
            "research_level": "deep",
            "task_complexity": "complex",
            "delegation_required": True,
        }
    )

    metadata = AgentRunService.build_runtime_metadata(
        task=task,
        base_metadata={"policy_layers_enabled": True},
    )

    assert metadata["policy_layers_enabled"] is True
    assert metadata["requested_execution_lane"] == "delegated_execution"
    assert metadata["runtime_execution_mode"] == "direct_ii_agent"
    assert metadata["external_dispatch_required"] is True
    assert metadata["delegation_required"] is True
    assert metadata["fallback_reason"] is not None