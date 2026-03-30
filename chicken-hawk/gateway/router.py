"""
Chicken Hawk Gateway — intent classification and Lil_Hawk router.

The router classifies incoming natural-language requests and dispatches them
to the appropriate Lil_Hawk specialist.  Complex missions that touch multiple
domains are escalated to Lil_Deep_Hawk (DeerFlow 2.0), which decomposes the
goal into a Squad of Lil_Hawks.
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


@dataclass
class RoutingDecision:
    hawk: HawkRole
    confidence: float
    reasoning: str
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
# Classification prompt
# ---------------------------------------------------------------------------
_CLASSIFICATION_SYSTEM = """\
You are the Chicken Hawk intent classifier. Given a user request, decide which
single Lil_Hawk specialist should handle it, or whether the mission is complex
enough to warrant Lil_Deep_Hawk (which orchestrates multiple specialists).

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
- Lil_Deep_Hawk   : complex missions spanning multiple specialists

Respond ONLY with valid JSON matching this schema:
{
  "hawk": "<specialist name exactly as listed above>",
  "confidence": <0.0-1.0>,
  "reasoning": "<one sentence>"
}
"""


class Router:
    """Classifies intent and routes requests to the appropriate Lil_Hawk."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._http = httpx.AsyncClient(timeout=120.0)
        # Build retry decorators from settings so they are consistent and tunable
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
        """Classify *message* and forward it to the right Lil_Hawk."""
        start = time.monotonic()
        decision = await self._classify(message)
        log = logger.bind(
            trace_id=decision.trace_id,
            hawk=decision.hawk,
            confidence=decision.confidence,
            session_id=session_id,
        )
        log.info("routing_decision")

        # Memory: draft project plan + recall context before dispatch
        plan_id, _ = await before_route(decision.trace_id, message, decision.hawk)

        url = self._settings.hawk_endpoints[decision.hawk]
        content = await self._dispatch(url, message, decision.trace_id)
        reviewed_content = await self._review_gate(content, decision)

        elapsed = (time.monotonic() - start) * 1000
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
            metadata={"confidence": decision.confidence, "reasoning": decision.reasoning},
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
    # Classification
    # ------------------------------------------------------------------

    async def _classify(self, message: str) -> RoutingDecision:
        provider = self._settings.llm_provider
        classify_fn = {
            LLMProvider.openai: self._classify_openai,
            LLMProvider.anthropic: self._classify_anthropic,
            LLMProvider.ollama: self._classify_ollama,
        }[provider]
        # Apply LLM retry policy at call site
        raw = await self._llm_retry(classify_fn)(message)

        try:
            data = json.loads(raw)
            hawk = HawkRole(data["hawk"])
            confidence = float(data.get("confidence", 0.8))
            reasoning = data.get("reasoning", "")
        except Exception:
            # Fallback: send everything to DeerFlow if classification fails
            hawk = HawkRole.DEEP
            confidence = 0.5
            reasoning = "Classification failed; escalating to DeerFlow."

        return RoutingDecision(hawk=hawk, confidence=confidence, reasoning=reasoning)

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
            max_tokens=256,
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
            max_tokens=256,
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
    # Dispatch
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
        Placeholder review gate.  In production this calls a dedicated
        reviewer model/service that checks for hallucinations, policy
        violations, and quality before the response is delivered.
        The result is always logged for auditability.
        """
        logger.info(
            "review_gate_passed",
            trace_id=decision.trace_id,
            hawk=decision.hawk,
            content_length=len(content),
        )
        return content
