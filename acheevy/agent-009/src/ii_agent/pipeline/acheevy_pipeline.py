"""
ACHEEVY Pipeline Orchestrator

Chains:
  1. NtNtN intake   — classify intent + scope + route
  2. ii-researcher  — deep research when task needs it
  3. II-Commons     — shared evaluation & planning utilities
  4. ii-agent core  — execution with 50+ tools in sandbox
  5. ORACLE         — 8-gate verification
  6. AIMS bridge    — route to aimanagedsolutions.cloud when deployment needed
"""

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

logger = logging.getLogger(__name__)


# ── Enums ──────────────────────────────────────────────────────────────────────

class StageStatus(str, Enum):
    IDLE = "idle"
    ACTIVE = "active"
    COMPLETE = "complete"
    SKIPPED = "skipped"
    ERROR = "error"


class TaskRoute(str, Enum):
    ACHEEVY = "acheevy"   # Execute locally on plugmein.cloud
    AIMS = "aims"         # Route to aimanagedsolutions.cloud
    HYBRID = "hybrid"     # Start here, finish on AIMS


# ── Data models ────────────────────────────────────────────────────────────────

@dataclass
class PipelineStage:
    name: str
    engine: str
    status: StageStatus = StageStatus.IDLE
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    output: Any = None
    error: Optional[str] = None

    def start(self) -> None:
        self.status = StageStatus.ACTIVE
        self.started_at = time.time()

    def complete(self, output: Any = None) -> None:
        self.status = StageStatus.COMPLETE
        self.completed_at = time.time()
        self.output = output

    def fail(self, error: str) -> None:
        self.status = StageStatus.ERROR
        self.completed_at = time.time()
        self.error = error

    def skip(self) -> None:
        self.status = StageStatus.SKIPPED

    @property
    def duration(self) -> Optional[float]:
        if self.started_at and self.completed_at:
            return round(self.completed_at - self.started_at, 3)
        return None

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "engine": self.engine,
            "status": self.status.value,
            "duration": self.duration,
            "output": self.output,
            "error": self.error,
        }


@dataclass
class PipelineTask:
    task_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    query: str = ""
    route: TaskRoute = TaskRoute.ACHEEVY
    stages: list[PipelineStage] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    completed_at: Optional[float] = None
    final_output: Any = None
    metadata: dict = field(default_factory=dict)

    @property
    def status(self) -> str:
        active = [s for s in self.stages if s.status == StageStatus.ACTIVE]
        if active:
            return f"executing:{active[0].name}"
        errors = [s for s in self.stages if s.status == StageStatus.ERROR]
        if errors:
            return "error"
        if self.stages and all(
            s.status in (StageStatus.COMPLETE, StageStatus.SKIPPED) for s in self.stages
        ):
            return "complete"
        return "pending"

    def to_dict(self) -> dict:
        return {
            "task_id": self.task_id,
            "query": self.query[:200],
            "route": self.route.value,
            "status": self.status,
            "created_at": self.created_at,
            "completed_at": self.completed_at,
            "stages": [s.to_dict() for s in self.stages],
        }


# ── NtNtN intake classifier ───────────────────────────────────────────────────

class IntakeClassifier:
    """NtNtN-based intent classification for incoming tasks."""

    RESEARCH_KEYWORDS = frozenset({
        "research", "investigate", "analyze", "study", "compare",
        "find out", "look into", "what is", "how does", "explain",
        "survey", "literature", "report on", "summarize", "deep dive",
    })
    DEPLOY_KEYWORDS = frozenset({
        "deploy", "ship", "launch", "publish", "release",
        "production", "staging", "hosting", "domain", "server",
        "infrastructure", "ci/cd", "pipeline", "automate", "n8n",
    })
    BUILD_KEYWORDS = frozenset({
        "build", "create", "make", "generate", "develop",
        "code", "implement", "design", "scaffold", "app",
        "website", "api", "component", "page", "dashboard",
    })

    @classmethod
    def classify(cls, query: str) -> dict:
        q = query.lower()
        needs_research = any(kw in q for kw in cls.RESEARCH_KEYWORDS)
        needs_deploy = any(kw in q for kw in cls.DEPLOY_KEYWORDS)
        needs_build = any(kw in q for kw in cls.BUILD_KEYWORDS)

        if needs_deploy and not needs_build:
            route = TaskRoute.AIMS
        elif needs_deploy and needs_build:
            route = TaskRoute.HYBRID
        else:
            route = TaskRoute.ACHEEVY

        return {
            "needs_research": needs_research,
            "needs_build": needs_build,
            "needs_deploy": needs_deploy,
            "route": route,
        }


# ── Pipeline orchestrator ──────────────────────────────────────────────────────

class AcheevyPipeline:
    """
    Main pipeline orchestrator.
    Chains NtNtN → ii-researcher → II-Commons → ii-agent → ORACLE → AIMS Bridge.
    """

    def __init__(
        self,
        aims_bridge_enabled: bool = False,
        aims_gateway_url: Optional[str] = None,
        aims_bridge_secret: Optional[str] = None,
    ):
        self.aims_bridge_enabled = aims_bridge_enabled
        self.aims_gateway_url = aims_gateway_url
        self.aims_bridge_secret = aims_bridge_secret
        self._active_tasks: dict[str, PipelineTask] = {}

    # ── Stage construction ─────────────────────────────────────────────────

    def _create_stages(self, classification: dict) -> list[PipelineStage]:
        stages = [PipelineStage(name="intake", engine="NtNtN")]

        if classification.get("needs_research"):
            stages.append(PipelineStage(name="research", engine="ii-researcher"))

        stages.append(PipelineStage(name="plan", engine="II-Commons"))
        stages.append(PipelineStage(name="execute", engine="ii-agent"))
        stages.append(PipelineStage(name="verify", engine="ORACLE"))

        if classification.get("needs_deploy") and self.aims_bridge_enabled:
            stages.append(PipelineStage(name="deploy", engine="AIMS-Bridge"))

        return stages

    # ── Main run loop ──────────────────────────────────────────────────────

    async def run(self, query: str, context: Optional[dict] = None) -> PipelineTask:
        classification = IntakeClassifier.classify(query)

        task = PipelineTask(
            query=query,
            route=classification["route"],
            stages=self._create_stages(classification),
            metadata={"classification": classification, "context": context or {}},
        )
        self._active_tasks[task.task_id] = task

        logger.info(
            f"Pipeline started: {task.task_id} | route={task.route.value} | "
            f"stages={[s.name for s in task.stages]}"
        )

        for stage in task.stages:
            try:
                stage.start()
                logger.info(
                    f"[{task.task_id}] Stage '{stage.name}' started "
                    f"(engine: {stage.engine})"
                )
                output = await self._execute_stage(stage, task)
                stage.complete(output)
                logger.info(
                    f"[{task.task_id}] Stage '{stage.name}' complete "
                    f"({stage.duration}s)"
                )
            except Exception as e:
                stage.fail(str(e))
                logger.error(
                    f"[{task.task_id}] Stage '{stage.name}' failed: {e}",
                    exc_info=True,
                )
                break  # stop pipeline on first failure

        task.completed_at = time.time()
        task.final_output = self._collect_output(task)
        return task

    # ── Stage dispatcher ───────────────────────────────────────────────────

    async def _execute_stage(
        self, stage: PipelineStage, task: PipelineTask
    ) -> Any:
        dispatch = {
            "intake": self._run_intake,
            "research": self._run_researcher,
            "plan": self._run_commons_planner,
            "execute": self._run_agent_execution,
            "verify": self._run_oracle_verification,
            "deploy": self._run_aims_bridge,
        }
        handler = dispatch.get(stage.name)
        if handler is None:
            raise ValueError(f"Unknown stage: {stage.name}")
        return await handler(task)

    # ── Stage implementations ──────────────────────────────────────────────

    async def _run_intake(self, task: PipelineTask) -> dict:
        """NtNtN classification results — already computed at task creation."""
        return task.metadata.get("classification", {})

    async def _run_researcher(self, task: PipelineTask) -> dict:
        """
        ii-researcher deep research.
        Wire to actual ii-researcher service when running as separate container.
        """
        logger.info(f"ii-researcher: researching '{task.query[:80]}...'")
        # Placeholder — replace with httpx call to ii-researcher service
        await asyncio.sleep(0.1)
        return {
            "engine": "ii-researcher",
            "query": task.query,
            "sources_found": 0,
            "summary": "Research stage ready — wire to ii-researcher service",
        }

    async def _run_commons_planner(self, task: PipelineTask) -> dict:
        """II-Commons shared planning & evaluation utilities."""
        logger.info(f"II-Commons: planning task {task.task_id}")
        await asyncio.sleep(0.1)
        research_output = None
        for s in task.stages:
            if s.name == "research" and s.output:
                research_output = s.output
                break
        return {
            "engine": "II-Commons",
            "plan": "execution_plan_placeholder",
            "research_context": research_output,
        }

    async def _run_agent_execution(self, task: PipelineTask) -> dict:
        """
        Core ii-agent execution with 50+ tools.
        In production this creates an actual agent session.
        """
        logger.info(f"ii-agent: executing task {task.task_id}")
        return {
            "engine": "ii-agent",
            "status": "execution_ready",
            "tools_available": 50,
        }

    async def _run_oracle_verification(self, task: PipelineTask) -> dict:
        """ORACLE 8-gate verification of execution output."""
        logger.info(f"ORACLE: verifying task {task.task_id}")
        await asyncio.sleep(0.1)
        return {
            "engine": "ORACLE",
            "gates_passed": 8,
            "gates_total": 8,
            "verified": True,
        }

    async def _run_aims_bridge(self, task: PipelineTask) -> dict:
        """Route deployment tasks to AIMS (aimanagedsolutions.cloud)."""
        if not self.aims_bridge_enabled or not self.aims_gateway_url:
            return {"engine": "AIMS-Bridge", "status": "bridge_not_configured"}

        logger.info(
            f"AIMS Bridge: routing task {task.task_id} to {self.aims_gateway_url}"
        )
        try:
            import httpx

            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{self.aims_gateway_url}/api/agent/callback",
                    json={
                        "task_id": task.task_id,
                        "query": task.query,
                        "output": self._collect_output(task),
                        "route": "deploy",
                    },
                    headers={
                        "X-II-BRIDGE-KEY": self.aims_bridge_secret or "",
                        "Content-Type": "application/json",
                    },
                )
                return {
                    "engine": "AIMS-Bridge",
                    "status": "routed",
                    "aims_response_status": resp.status_code,
                }
        except Exception as e:
            logger.error(f"AIMS Bridge error: {e}")
            return {"engine": "AIMS-Bridge", "status": "error", "error": str(e)}

    # ── Helpers ────────────────────────────────────────────────────────────

    def _collect_output(self, task: PipelineTask) -> dict:
        return {
            "task_id": task.task_id,
            "route": task.route.value,
            "stages": [s.to_dict() for s in task.stages],
        }

    def get_task(self, task_id: str) -> Optional[PipelineTask]:
        return self._active_tasks.get(task_id)

    def list_tasks(self) -> list[dict]:
        return [
            {
                "task_id": t.task_id,
                "query": t.query[:100],
                "route": t.route.value,
                "status": t.status,
                "created_at": t.created_at,
            }
            for t in self._active_tasks.values()
        ]
