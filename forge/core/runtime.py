"""Forge runtime — async workflow executor and state machine."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Callable, Coroutine, Optional, Protocol
from uuid import UUID

from forge.core.dag import TaskDAG
from forge.core.schema import (
    ForgeRun,
    RunState,
    StepDefinition,
    StepType,
    Workflow,
)
from forge.core.state import ForgeStateStore

logger = logging.getLogger("forge.runtime")


class ExecutorAdapterProtocol(Protocol):
    """Protocol that all execution adapters must satisfy."""

    @property
    def name(self) -> str: ...

    async def execute(
        self, prompt: str, context: dict[str, Any], cwd: str
    ) -> Any: ...


class AdapterRegistry:
    """Registry of available MoEx execution adapters."""

    def __init__(self) -> None:
        self._adapters: dict[str, ExecutorAdapterProtocol] = {}

    def register(self, adapter: ExecutorAdapterProtocol) -> None:
        """Register an adapter by its name."""
        self._adapters[adapter.name] = adapter
        logger.info("Registered adapter: %s", adapter.name)

    def get(self, name: str) -> Optional[ExecutorAdapterProtocol]:
        """Get an adapter by name."""
        return self._adapters.get(name)

    def list_adapters(self) -> list[str]:
        """List all registered adapter names."""
        return list(self._adapters.keys())

    def __contains__(self, name: str) -> bool:
        return name in self._adapters

    def __len__(self) -> int:
        return len(self._adapters)


# Event callback type: called with (event_name, run_id, payload)
EventCallback = Callable[[str, UUID, dict[str, Any]], Coroutine[Any, Any, None]]


async def _noop_callback(event: str, run_id: UUID, payload: dict[str, Any]) -> None:
    """Default no-op event callback."""


class ForgeRuntime:
    """Core runtime engine that executes Forge workflows.

    State machine: pending -> running -> (gate_failed -> running retry) -> completed/aborted

    The runtime iterates through steps sequentially, delegating to the appropriate
    hawk/adapter for each step. On gate failure, it loops back to the implement step
    (up to max_iterations). On completion, it fires a BAMARAM event if applicable.
    """

    def __init__(
        self,
        state_store: ForgeStateStore,
        adapter_registry: AdapterRegistry,
        event_callback: Optional[EventCallback] = None,
    ) -> None:
        self._state = state_store
        self._adapters = adapter_registry
        self._on_event = event_callback or _noop_callback

    async def execute_workflow(
        self,
        workflow: Workflow,
        inputs: dict[str, Any],
        task_id: str = "manual",
    ) -> ForgeRun:
        """Execute a full workflow from start to finish.

        Args:
            workflow: The parsed Workflow definition.
            inputs: Input parameters for this run.
            task_id: External task identifier (RFP fragment, etc.).

        Returns:
            The completed ForgeRun.
        """
        # Resolve step order via DAG
        dag = TaskDAG()
        sorted_steps = dag.resolve(workflow.steps)

        # Create the run record
        run = await self._state.create_run(
            workflow_id=workflow.id,
            task_id=task_id,
            inputs=inputs,
        )

        # Transition to running
        now = datetime.now(tz=timezone.utc)
        await self._state.update_run(
            run.id,
            state=RunState.running,
            started_at=now,
        )
        run.state = RunState.running
        run.started_at = now

        await self._on_event("run_started", run.id, {"workflow_id": workflow.id})

        # Execute steps sequentially
        step_index = 0
        iteration_counts: dict[str, int] = {}

        while step_index < len(sorted_steps):
            step = sorted_steps[step_index]
            run.current_step_index = step_index

            await self._state.update_run(run.id, current_step_index=step_index)

            logger.info(
                "Executing step %d/%d: %s (hawk=%s)",
                step_index + 1,
                len(sorted_steps),
                step.id,
                step.hawk,
            )

            try:
                result = await self.execute_step(run, step)
            except Exception as exc:
                error_msg = f"Step '{step.id}' failed: {exc}"
                logger.error(error_msg)
                await self._state.update_run(
                    run.id,
                    state=RunState.aborted,
                    error=error_msg,
                    completed_at=datetime.now(tz=timezone.utc),
                )
                run.state = RunState.aborted
                run.error = error_msg
                await self._on_event("run_aborted", run.id, {"error": error_msg})
                return run

            # Store step output
            run.outputs[step.id] = result

            # Handle gate failure with retry loop
            step_type = step.inferred_type()
            if step_type == StepType.gate and not result.get("passed", True):
                iteration_key = step.id
                iteration_counts[iteration_key] = iteration_counts.get(iteration_key, 0) + 1

                # Find the implement step to loop back to
                implement_index = self._find_implement_step(sorted_steps, step_index)
                max_iter = self._get_max_iterations(sorted_steps, implement_index)

                if iteration_counts[iteration_key] >= max_iter:
                    error_msg = (
                        f"Gate '{step.id}' failed after {max_iter} iterations"
                    )
                    logger.error(error_msg)
                    await self._state.update_run(
                        run.id,
                        state=RunState.aborted,
                        error=error_msg,
                        completed_at=datetime.now(tz=timezone.utc),
                    )
                    run.state = RunState.aborted
                    run.error = error_msg
                    await self._on_event("run_aborted", run.id, {"error": error_msg})
                    return run

                logger.info(
                    "Gate '%s' failed (iteration %d/%d), returning to step %d",
                    step.id,
                    iteration_counts[iteration_key],
                    max_iter,
                    implement_index,
                )
                await self._state.update_run(run.id, state=RunState.gate_failed)
                run.state = RunState.gate_failed

                await self._on_event(
                    "gate_failed",
                    run.id,
                    {
                        "gate": step.id,
                        "iteration": iteration_counts[iteration_key],
                        "max_iterations": max_iter,
                    },
                )

                # Loop back to the implement step
                step_index = implement_index
                await self._state.update_run(run.id, state=RunState.running)
                run.state = RunState.running
                continue

            # Handle BAMARAM emission
            if step_type == StepType.bamaram:
                if self._should_fire_bamaram(step, run):
                    await self._on_event(
                        "bamaram",
                        run.id,
                        {
                            "workflow_id": workflow.id,
                            "task_id": task_id,
                        },
                    )
                    logger.info("BAMARAM fired for run %s", run.id)

            step_index += 1

        # Mark completed
        await self._state.update_run(
            run.id,
            state=RunState.completed,
            outputs=run.outputs,
            completed_at=datetime.now(tz=timezone.utc),
        )
        run.state = RunState.completed
        await self._on_event(
            "run_completed",
            run.id,
            {"workflow_id": workflow.id, "outputs": run.outputs},
        )

        return run

    async def execute_step(
        self,
        run: ForgeRun,
        step: StepDefinition,
    ) -> dict[str, Any]:
        """Execute a single workflow step.

        Routes to the appropriate handler based on step type.

        Args:
            run: The current ForgeRun context.
            step: The step definition to execute.

        Returns:
            Dict of step results/outputs.
        """
        step_type = step.inferred_type()

        if step_type == StepType.plan:
            return await self._execute_plan(run, step)
        if step_type == StepType.isolate:
            return await self._execute_isolate(run, step)
        if step_type == StepType.implement:
            return await self._execute_implement(run, step)
        if step_type == StepType.gate:
            return await self._execute_gate(run, step)
        if step_type == StepType.promote:
            return await self._execute_promote(run, step)
        if step_type == StepType.chronicle:
            return await self._execute_chronicle(run, step)
        if step_type == StepType.bamaram:
            return {"fired": True}

        return {"status": "unknown_step_type", "step_id": step.id}

    # ------------------------------------------------------------------
    # Step handlers (each returns a dict of results)
    # ------------------------------------------------------------------

    async def _execute_plan(
        self, run: ForgeRun, step: StepDefinition
    ) -> dict[str, Any]:
        """Plan step: decompose RFP into a task DAG."""
        logger.info("Plan step '%s': decomposing inputs into task DAG", step.id)
        return {
            "status": "planned",
            "task_dag": {"steps": list(run.inputs.keys())},
        }

    async def _execute_isolate(
        self, run: ForgeRun, step: StepDefinition
    ) -> dict[str, Any]:
        """Isolate step: create a git worktree for this run."""
        branch = step.branch or f"forge/run-{run.id}"
        branch = branch.replace("{run_id}", str(run.id))
        logger.info("Isolate step '%s': creating worktree on branch %s", step.id, branch)
        return {
            "status": "isolated",
            "branch": branch,
            "auto_prune_on_exit": step.auto_prune_on_exit or False,
        }

    async def _execute_implement(
        self, run: ForgeRun, step: StepDefinition
    ) -> dict[str, Any]:
        """Implement step: execute code generation via the assigned adapter."""
        adapter_name = self._resolve_adapter(step)
        adapter = self._adapters.get(adapter_name) if adapter_name else None

        if adapter is None:
            logger.warning(
                "No adapter '%s' found for step '%s', returning stub result",
                adapter_name,
                step.id,
            )
            return {"status": "no_adapter", "adapter_requested": adapter_name}

        context: dict[str, Any] = {
            "run_id": str(run.id),
            "workflow_id": run.workflow_id,
            "inputs": run.inputs,
            "step_id": step.id,
        }
        cwd = run.inputs.get("target_repo_path", ".")
        prompt = run.inputs.get("prompt", f"Execute action: {step.action}")

        result = await adapter.execute(prompt, context, cwd)
        return {
            "status": "implemented",
            "adapter": adapter_name,
            "result": {
                "stdout": result.stdout,
                "stderr": result.stderr,
                "exit_code": result.exit_code,
                "files_changed": result.files_changed,
                "duration_ms": result.duration_ms,
            },
        }

    async def _execute_gate(
        self, run: ForgeRun, step: StepDefinition
    ) -> dict[str, Any]:
        """Gate step: run validation gates and return pass/fail."""
        gates = step.gates or []
        results: dict[str, bool] = {}
        all_passed = True

        for gate in gates:
            # In Phase 5, these will delegate to gates/five_gate.py
            # For now, mark as passed (stub)
            results[gate.value] = True
            logger.info("Gate '%s' check: %s -> passed (stub)", step.id, gate.value)

        return {
            "status": "gated",
            "passed": all_passed,
            "gate_results": results,
        }

    async def _execute_promote(
        self, run: ForgeRun, step: StepDefinition
    ) -> dict[str, Any]:
        """Promote step: advance the ingot tier."""
        from_tier = step.from_tier or "Raw"
        to_tier = step.to_tier or "Forged"
        logger.info(
            "Promote step '%s': %s -> %s",
            step.id,
            from_tier,
            to_tier,
        )
        return {
            "status": "promoted",
            "from_tier": str(from_tier),
            "to_tier": str(to_tier),
        }

    async def _execute_chronicle(
        self, run: ForgeRun, step: StepDefinition
    ) -> dict[str, Any]:
        """Chronicle step: emit charter and/or ledger artifacts."""
        emissions = step.emit or ["charter", "ledger"]
        logger.info("Chronicle step '%s': emitting %s", step.id, emissions)
        return {
            "status": "chronicled",
            "emitted": emissions,
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _find_implement_step(steps: list[StepDefinition], gate_index: int) -> int:
        """Find the most recent implement step before the given gate index."""
        for i in range(gate_index - 1, -1, -1):
            if steps[i].inferred_type() == StepType.implement:
                return i
        # Fallback: return the step before the gate
        return max(0, gate_index - 1)

    @staticmethod
    def _get_max_iterations(steps: list[StepDefinition], implement_index: int) -> int:
        """Get max_iterations from the implement step, defaulting to 5."""
        step = steps[implement_index]
        return step.max_iterations or 5

    @staticmethod
    def _resolve_adapter(step: StepDefinition) -> Optional[str]:
        """Resolve the adapter name from a step definition.

        Handles both direct names and ${ENV_VAR} references.
        """
        if step.adapter is None:
            return None
        adapter_ref = step.adapter
        if adapter_ref.startswith("${") and adapter_ref.endswith("}"):
            import os

            env_var = adapter_ref[2:-1]
            return os.environ.get(env_var)
        if adapter_ref.startswith("$"):
            import os

            env_var = adapter_ref[1:]
            return os.environ.get(env_var)
        return adapter_ref

    @staticmethod
    def _should_fire_bamaram(step: StepDefinition, run: ForgeRun) -> bool:
        """Determine if BAMARAM should fire based on step condition."""
        # If there's a 'when' condition, evaluate it simply
        if step.when:
            # Check for "Forged" in the condition and in outputs
            if "Forged" in step.when:
                for output in run.outputs.values():
                    if isinstance(output, dict) and output.get("to_tier") == "Forged":
                        return True
                return False
        # Default: fire if no condition
        return True
