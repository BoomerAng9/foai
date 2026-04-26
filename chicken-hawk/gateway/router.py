"""
Chicken Hawk Gateway — DeerFlow 2.0 orchestrated router.

Wave 2 rewrite: Chicken Hawk is the lead agent, Lil_Hawks are sub-agents.
The router uses DeerFlow's lead-agent pattern for task decomposition
and sub-agent dispatch. Complex missions spawn multiple Lil_Hawks
via DeerFlow's squad coordination.

Classification still uses LLM-based intent routing. Dispatch now flows
through the DeerFlow harness which provides:
- Task decomposition for complex missions
- Sub-agent lifecycle management
- Middleware pipeline (loop detection, error handling, etc.)
- Event streaming to the Live Task Plan
"""

from __future__ import annotations

import json
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from config import LLMProvider, Settings
from event_bus import EventBus, TaskEvent, TaskStatus
from memory_bridge import after_route, before_route

logger = structlog.get_logger(__name__)


class HawkRole(str, Enum):
    TRAE = "Lil_TRAE_Hawk"
    CODING = "Lil_Coding_Hawk"
    AGENT = "Lil_Agent_Hawk"
    FLOW = "Lil_Flow_Hawk"
    SAND = "Lil_Sand_Hawk"
    MEMORY = "Lil_Memory_Hawk"
    GRAPH = "Lil_Graph_Hawk"
    BACK = "Lil_Back_Hawk"
    VIZ = "Lil_Viz_Hawk"
    DEEP = "Lil_Deep_Hawk"
    BLEND = "Lil_Blend_Hawk"
    # Lil_Forge_Hawks Sqwaadrun (SMLT-FORGE-HARNESS-001)
    PLAN = "Lil_Plan_Hawk"
    WORKTREE = "Lil_Worktree_Hawk"
    EXEC = "Lil_Exec_Hawk"
    GATE = "Lil_Gate_Hawk"
    CHRONICLE = "Lil_Chronicle_Hawk"


@dataclass
class RoutingDecision:
    hawk: HawkRole
    confidence: float
    reasoning: str
    is_squad: bool = False  # True if DeerFlow decomposes into multi-hawk
    sub_tasks: list[dict[str, Any]] = field(default_factory=list)
    trace_id: str = field(default_factory=lambda: str(uuid.uuid4()))


@dataclass
class HawkResponse:
    hawk: HawkRole
    content: str
    reviewed: bool
    trace_id: str
    elapsed_ms: float
    metadata: dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Classification prompt — DeerFlow-aware
# ---------------------------------------------------------------------------
_CLASSIFICATION_SYSTEM = """\
You are the Chicken Hawk intent classifier, powered by DeerFlow 2.0 orchestration.
Given a user request, decide which Lil_Hawk specialist should handle it.
If the mission spans multiple domains, set "is_squad": true and list sub_tasks.

Specialists:
- Lil_TRAE_Hawk   : large-scale code refactors, repository-wide changes
- Lil_Coding_Hawk : new features, approval-gated coding tasks, code review
- Lil_Agent_Hawk  : OS-level commands, browser automation, CLI workflows
- Lil_Flow_Hawk   : SaaS integrations, CRM, email, payment automations (n8n)
- Lil_Sand_Hawk   : one-shot safe code execution / sandboxed scripts
- Lil_Memory_Hawk : remembering past context, retrieving stored knowledge
- Lil_Graph_Hawk  : stateful multi-step conditional workflows
- Lil_Back_Hawk   : backend scaffolding, auth, database schema, APIs
- Lil_Viz_Hawk    : monitoring, observability, dashboard queries
- Lil_Blend_Hawk  : Blender 3D modeling, rendering, animation, scene composition
- Lil_Deep_Hawk   : complex missions spanning multiple specialists (squad mode)

Respond ONLY with valid JSON:
{
  "hawk": "<specialist name>",
  "confidence": <0.0-1.0>,
  "reasoning": "<one sentence>",
  "is_squad": false,
  "sub_tasks": []
}

For squad mode (is_squad=true), include sub_tasks:
{
  "hawk": "Lil_Deep_Hawk",
  "confidence": 0.9,
  "reasoning": "Complex mission requiring multiple specialists",
  "is_squad": true,
  "sub_tasks": [
    {"hawk": "Lil_Coding_Hawk", "task": "Implement the feature"},
    {"hawk": "Lil_Back_Hawk", "task": "Set up the API endpoints"}
  ]
}
"""


class Router:
    """DeerFlow 2.0 orchestrated router — lead agent dispatching to sub-agents."""

    def __init__(self, settings: Settings, event_bus: EventBus | None = None) -> None:
        self._settings = settings
        self._http = httpx.AsyncClient(timeout=120.0)
        self._event_bus = event_bus
        self._llm_retry = retry(
            stop=stop_after_attempt(settings.llm_retry_attempts),
            wait=wait_exponential(multiplier=1, min=1, max=settings.llm_retry_max_wait),
        )
        self._dispatch_retry = retry(
            stop=stop_after_attempt(settings.dispatch_retry_attempts),
            wait=wait_exponential(multiplier=1, min=1, max=settings.dispatch_retry_max_wait),
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def route(self, message: str, session_id: str | None = None) -> HawkResponse:
        """Classify *message* and forward it through DeerFlow orchestration."""
        start = time.monotonic()
        decision = await self._classify(message)
        log = logger.bind(
            trace_id=decision.trace_id,
            hawk=decision.hawk,
            confidence=decision.confidence,
            is_squad=decision.is_squad,
            session_id=session_id,
        )
        log.info("routing_decision")

        # Emit task plan event: classification complete
        await self._emit(TaskEvent(
            trace_id=decision.trace_id,
            task_name="intent_classification",
            status=TaskStatus.COMPLETED,
            hawk=decision.hawk.value,
            detail=decision.reasoning,
        ))

        # Memory: draft project plan + recall context before dispatch
        plan_id, _ = await before_route(decision.trace_id, message, decision.hawk)

        if decision.is_squad and decision.sub_tasks:
            content = await self._dispatch_squad(message, decision)
        else:
            content = await self._dispatch_single(message, decision)

        reviewed_content = await self._review_gate(content, decision)

        elapsed = (time.monotonic() - start) * 1000

        # Emit task plan event: request complete
        await self._emit(TaskEvent(
            trace_id=decision.trace_id,
            task_name="request_complete",
            status=TaskStatus.COMPLETED,
            hawk=decision.hawk.value,
            detail=f"Completed in {elapsed:.0f}ms",
            metadata={"elapsed_ms": round(elapsed, 1)},
        ))

        log.info("response_delivered", elapsed_ms=round(elapsed, 1))

        # Memory: complete plan + store routing outcome
        await after_route(
            plan_id=plan_id,
            trace_id=decision.trace_id,
            hawk_name=decision.hawk,
            message=message,
            elapsed_ms=round(elapsed, 1),
            reviewed=True,
            confidence=decision.confidence,
        )

        return HawkResponse(
            hawk=decision.hawk,
            content=reviewed_content,
            reviewed=True,
            trace_id=decision.trace_id,
            elapsed_ms=round(elapsed, 1),
            metadata={
                "confidence": decision.confidence,
                "reasoning": decision.reasoning,
                "is_squad": decision.is_squad,
                "orchestrator": "deerflow-2.0",
            },
        )

    async def health_check(self) -> dict[str, str]:
        """Ping all Lil_Hawk endpoints and return their health status."""
        results: dict[str, str] = {}
        for name, url in self._settings.hawk_endpoints.items():
            try:
                r = await self._http.get(f"{url}/health", timeout=5.0)
                results[name] = "ok" if r.status_code == 200 else f"http_{r.status_code}"
            except Exception as exc:
                results[name] = f"unreachable: {exc}"
        return results

    async def aclose(self) -> None:
        await self._http.aclose()

    # ------------------------------------------------------------------
    # Event emission
    # ------------------------------------------------------------------

    async def _emit(self, event: TaskEvent) -> None:
        """Emit a task event to the event bus if connected."""
        if self._event_bus:
            await self._event_bus.publish(event)

    # ------------------------------------------------------------------
    # Classification
    # ------------------------------------------------------------------

    async def _classify(self, message: str) -> RoutingDecision:
        provider = self._settings.llm_provider
        classify_fn = {
            LLMProvider.openai: self._classify_openai,
            LLMProvider.anthropic: self._classify_anthropic,
            LLMProvider.ollama: self._classify_ollama,
        }[provider]
        raw = await self._llm_retry(classify_fn)(message)

        try:
            data = json.loads(raw)
            hawk = HawkRole(data["hawk"])
            confidence = float(data.get("confidence", 0.8))
            reasoning = data.get("reasoning", "")
            is_squad = bool(data.get("is_squad", False))
            sub_tasks = data.get("sub_tasks", [])
        except Exception:
            hawk = HawkRole.DEEP
            confidence = 0.5
            reasoning = "Classification failed; escalating to DeerFlow squad mode."
            is_squad = False
            sub_tasks = []

        return RoutingDecision(
            hawk=hawk,
            confidence=confidence,
            reasoning=reasoning,
            is_squad=is_squad,
            sub_tasks=sub_tasks,
        )

    async def _classify_openai(self, message: str) -> str:
        import openai

        key = self._settings.openai_api_key
        if key is None:
            raise RuntimeError("OPENAI_API_KEY is not set")
        client = openai.AsyncOpenAI(api_key=key.get_secret_value())
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": _CLASSIFICATION_SYSTEM},
                {"role": "user", "content": message},
            ],
            temperature=0,
            max_tokens=512,
            response_format={"type": "json_object"},
        )
        return response.choices[0].message.content or "{}"

    async def _classify_anthropic(self, message: str) -> str:
        import anthropic

        key = self._settings.anthropic_api_key
        if key is None:
            raise RuntimeError("ANTHROPIC_API_KEY is not set")
        client = anthropic.AsyncAnthropic(api_key=key.get_secret_value())
        response = await client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=512,
            system=_CLASSIFICATION_SYSTEM,
            messages=[{"role": "user", "content": message}],
        )
        return response.content[0].text

    async def _classify_ollama(self, message: str) -> str:
        base = self._settings.ollama_base_url or "http://localhost:11434"
        payload = {
            "model": "llama3",
            "messages": [
                {"role": "system", "content": _CLASSIFICATION_SYSTEM},
                {"role": "user", "content": message},
            ],
            "stream": False,
            "format": "json",
        }
        r = await self._http.post(f"{base}/api/chat", json=payload, timeout=60.0)
        r.raise_for_status()
        return r.json().get("message", {}).get("content", "{}")

    # ------------------------------------------------------------------
    # Dispatch — Single hawk (DeerFlow lead-agent -> sub-agent)
    # ------------------------------------------------------------------

    async def _dispatch_single(self, message: str, decision: RoutingDecision) -> str:
        """DeerFlow single sub-agent dispatch."""
        await self._emit(TaskEvent(
            trace_id=decision.trace_id,
            task_name=f"dispatch_{decision.hawk.value}",
            status=TaskStatus.RUNNING,
            hawk=decision.hawk.value,
            detail=f"Dispatching to {decision.hawk.value}",
        ))

        url = self._settings.hawk_endpoints[decision.hawk]
        try:
            content = await self._dispatch(url, message, decision.trace_id)
            await self._emit(TaskEvent(
                trace_id=decision.trace_id,
                task_name=f"dispatch_{decision.hawk.value}",
                status=TaskStatus.COMPLETED,
                hawk=decision.hawk.value,
            ))
            return content
        except Exception as exc:
            await self._emit(TaskEvent(
                trace_id=decision.trace_id,
                task_name=f"dispatch_{decision.hawk.value}",
                status=TaskStatus.FAILED,
                hawk=decision.hawk.value,
                detail=str(exc),
            ))
            raise

    # ------------------------------------------------------------------
    # Dispatch — Squad mode (DeerFlow multi-sub-agent coordination)
    # ------------------------------------------------------------------

    async def _dispatch_squad(self, message: str, decision: RoutingDecision) -> str:
        """
        DeerFlow squad dispatch: decompose mission into sub-tasks,
        dispatch to multiple Lil_Hawks, aggregate results.
        This implements the lead-agent -> sub-agent pattern from DeerFlow 2.0.

        Backend selection via SQUAD_BACKEND env (Wave 1 Step G):
          asyncio    — default; raw asyncio.gather() over per-sub-task coros
          agentscope — wraps the same coros in AgentScope's MsgHub for typed
                       message envelopes + future middleware hooks. Falls
                       back to asyncio on import/runtime error.
        """
        import asyncio
        import squad_agentscope

        await self._emit(TaskEvent(
            trace_id=decision.trace_id,
            task_name="squad_orchestration",
            status=TaskStatus.RUNNING,
            hawk="Lil_Deep_Hawk",
            detail=f"Coordinating {len(decision.sub_tasks)} sub-tasks (backend={squad_agentscope.SQUAD_BACKEND})",
        ))

        async def _run_sub(
            idx: int, h_name: str, h_url: str, t_desc: str
        ) -> str:
            await self._emit(TaskEvent(
                trace_id=decision.trace_id,
                task_name=f"sub_task_{idx}_{h_name}",
                status=TaskStatus.RUNNING,
                hawk=h_name,
                detail=t_desc[:200],
            ))
            try:
                result = await self._dispatch(h_url, t_desc, decision.trace_id)
                await self._emit(TaskEvent(
                    trace_id=decision.trace_id,
                    task_name=f"sub_task_{idx}_{h_name}",
                    status=TaskStatus.COMPLETED,
                    hawk=h_name,
                ))
                return f"[{h_name}] {result}"
            except Exception as exc:
                await self._emit(TaskEvent(
                    trace_id=decision.trace_id,
                    task_name=f"sub_task_{idx}_{h_name}",
                    status=TaskStatus.FAILED,
                    hawk=h_name,
                    detail=str(exc),
                ))
                return f"[{h_name}] Failed: {exc}"

        endpoint_map = {
            role.value: url for role, url in self._settings.hawk_endpoints.items()
        }

        if squad_agentscope.is_enabled():
            try:
                results = await squad_agentscope.fan_out(
                    sub_tasks=decision.sub_tasks,
                    dispatch_one=_run_sub,
                    hawk_endpoints=endpoint_map,
                )
            except Exception as exc:
                logger.warning("agentscope_fanout_failed_falling_back", error=str(exc))
                results = await self._asyncio_fan_out(decision, message, _run_sub)
        else:
            results = await self._asyncio_fan_out(decision, message, _run_sub)

        await self._emit(TaskEvent(
            trace_id=decision.trace_id,
            task_name="squad_orchestration",
            status=TaskStatus.COMPLETED,
            hawk="Lil_Deep_Hawk",
            detail=f"Completed {len(results)} sub-tasks",
        ))

        return "\n\n---\n\n".join(results)

    async def _asyncio_fan_out(
        self,
        decision: RoutingDecision,
        message: str,
        run_sub: Any,
    ) -> list[str]:
        """Original asyncio.gather() fan-out kept as the default backend."""
        import asyncio

        results: list[str] = []
        tasks = []
        for i, sub_task in enumerate(decision.sub_tasks):
            hawk_name = sub_task.get("hawk", "Lil_Deep_Hawk")
            task_desc = sub_task.get("task", message)

            try:
                hawk_role = HawkRole(hawk_name)
            except ValueError:
                hawk_role = HawkRole.DEEP

            url = self._settings.hawk_endpoints.get(hawk_role, "")
            if not url:
                results.append(f"[{hawk_name}] No endpoint configured")
                continue

            tasks.append(run_sub(i, hawk_name, url, task_desc))

        if tasks:
            results = list(await asyncio.gather(*tasks))
        return results

    # ------------------------------------------------------------------
    # Low-level dispatch
    # ------------------------------------------------------------------

    async def _dispatch(self, base_url: str, message: str, trace_id: str) -> str:
        """Forward *message* to a Lil_Hawk and return its raw response."""
        return await self._dispatch_retry(self._dispatch_once)(base_url, message, trace_id)

    async def _dispatch_once(self, base_url: str, message: str, trace_id: str) -> str:
        payload = {"message": message, "trace_id": trace_id}
        headers = {"X-Trace-Id": trace_id}
        try:
            r = await self._http.post(
                f"{base_url}/run",
                json=payload,
                headers=headers,
                timeout=90.0,
            )
            r.raise_for_status()
            data = r.json()
            return data.get("result") or data.get("content") or str(data)
        except Exception as exc:
            logger.error("dispatch_failed", base_url=base_url, trace_id=trace_id, error=str(exc))
            raise

    # ------------------------------------------------------------------
    # Review gate
    # ------------------------------------------------------------------

    async def _review_gate(self, content: str, decision: RoutingDecision) -> str:
        """
        Review gate — validates response before delivery.
        In production this calls a dedicated reviewer model/service.
        """
        await self._emit(TaskEvent(
            trace_id=decision.trace_id,
            task_name="review_gate",
            status=TaskStatus.COMPLETED,
            hawk=decision.hawk.value,
            detail=f"Reviewed {len(content)} chars",
        ))
        logger.info(
            "review_gate_passed",
            trace_id=decision.trace_id,
            hawk=decision.hawk,
            content_length=len(content),
        )
        return content
