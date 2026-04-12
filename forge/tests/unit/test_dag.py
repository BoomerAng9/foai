"""Tests for forge.core.dag — DAG resolution and cycle detection."""

from __future__ import annotations

import pytest

from forge.core.dag import CycleDetectedError, TaskDAG
from forge.core.schema import StepDefinition


class TestTaskDAG:
    def test_resolve_sequential(self) -> None:
        """Sequential steps should resolve in order."""
        steps = [
            StepDefinition(id="a", hawk="H1", action="do_a"),
            StepDefinition(id="b", hawk="H2", action="do_b"),
            StepDefinition(id="c", hawk="H3", emit=["charter"]),
        ]
        dag = TaskDAG()
        result = dag.resolve(steps)
        assert [s.id for s in result] == ["a", "b", "c"]

    def test_resolve_single_step(self) -> None:
        steps = [StepDefinition(id="only", hawk="H1", emit=["ledger"])]
        dag = TaskDAG()
        result = dag.resolve(steps)
        assert len(result) == 1
        assert result[0].id == "only"

    def test_get_ready_steps_initial(self) -> None:
        """With nothing completed, the first step should be ready."""
        steps = [
            StepDefinition(id="a", hawk="H1", action="do_a"),
            StepDefinition(id="b", hawk="H2", action="do_b"),
            StepDefinition(id="c", hawk="H3", emit=["charter"]),
        ]
        dag = TaskDAG()
        dag.resolve(steps)

        ready = dag.get_ready_steps(set())
        assert len(ready) == 1
        assert ready[0].id == "a"

    def test_get_ready_steps_after_first(self) -> None:
        """After completing 'a', 'b' should be ready."""
        steps = [
            StepDefinition(id="a", hawk="H1", action="do_a"),
            StepDefinition(id="b", hawk="H2", action="do_b"),
            StepDefinition(id="c", hawk="H3", emit=["charter"]),
        ]
        dag = TaskDAG()
        dag.resolve(steps)

        ready = dag.get_ready_steps({"a"})
        assert len(ready) == 1
        assert ready[0].id == "b"

    def test_get_ready_steps_all_completed(self) -> None:
        """With all completed, nothing should be ready."""
        steps = [
            StepDefinition(id="a", hawk="H1", action="do_a"),
            StepDefinition(id="b", hawk="H2", emit=["charter"]),
        ]
        dag = TaskDAG()
        dag.resolve(steps)

        ready = dag.get_ready_steps({"a", "b"})
        assert len(ready) == 0

    def test_cycle_detection(self) -> None:
        """Manually creating a cycle should raise CycleDetectedError."""
        dag = TaskDAG()
        s1 = StepDefinition(id="x", hawk="H1", action="x")
        s2 = StepDefinition(id="y", hawk="H2", action="y")
        dag.add_node(s1)
        dag.add_node(s2)
        dag.add_edge("x", "y")
        dag.add_edge("y", "x")

        with pytest.raises(CycleDetectedError, match="Cycle detected"):
            dag._topological_sort()
