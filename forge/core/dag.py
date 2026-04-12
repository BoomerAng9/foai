"""Forge DAG — topological task resolution for workflow step ordering."""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from forge.core.schema import StepDefinition


class CycleDetectedError(Exception):
    """Raised when a cycle is detected in the task DAG."""


@dataclass
class TaskDAG:
    """Directed acyclic graph for Forge workflow step dependencies.

    Steps are mostly sequential in v1 workflows, but the DAG supports
    parallel branches for future use. Each node is a step ID; edges
    represent "must complete before" relationships.
    """

    nodes: dict[str, "StepDefinition"] = field(default_factory=dict)
    edges: dict[str, list[str]] = field(default_factory=lambda: defaultdict(list))
    _in_degree: dict[str, int] = field(default_factory=lambda: defaultdict(int))

    def add_node(self, step: "StepDefinition") -> None:
        """Register a step as a node in the DAG."""
        self.nodes[step.id] = step
        if step.id not in self._in_degree:
            self._in_degree[step.id] = 0

    def add_edge(self, from_id: str, to_id: str) -> None:
        """Add a dependency edge: from_id must complete before to_id."""
        self.edges[from_id].append(to_id)
        self._in_degree[to_id] = self._in_degree.get(to_id, 0) + 1

    def resolve(self, steps: list["StepDefinition"]) -> list["StepDefinition"]:
        """Build the DAG from a step list and return topologically sorted steps.

        For sequential workflows (v1), each step depends on the previous one.
        Cycles raise CycleDetectedError.

        Args:
            steps: Ordered list of StepDefinition from the workflow.

        Returns:
            Topologically sorted list of steps.

        Raises:
            CycleDetectedError: If a cycle is detected.
        """
        # Reset state
        self.nodes.clear()
        self.edges.clear()
        self._in_degree.clear()

        # Add all nodes
        for step in steps:
            self.add_node(step)

        # Build sequential edges (each step depends on the previous)
        for i in range(1, len(steps)):
            self.add_edge(steps[i - 1].id, steps[i].id)

        # Also wire on_failure back-edges for validation only (not for sort)
        # On-failure loops are handled at runtime, not in the DAG sort.

        return self._topological_sort()

    def _topological_sort(self) -> list["StepDefinition"]:
        """Kahn's algorithm for topological sorting.

        Returns:
            Sorted list of StepDefinition.

        Raises:
            CycleDetectedError: If not all nodes are visited (cycle exists).
        """
        in_degree: dict[str, int] = dict(self._in_degree)
        queue: deque[str] = deque()
        result: list["StepDefinition"] = []

        # Seed queue with zero-degree nodes
        for node_id in self.nodes:
            if in_degree.get(node_id, 0) == 0:
                queue.append(node_id)

        while queue:
            current_id = queue.popleft()
            result.append(self.nodes[current_id])

            for neighbor_id in self.edges.get(current_id, []):
                in_degree[neighbor_id] -= 1
                if in_degree[neighbor_id] == 0:
                    queue.append(neighbor_id)

        if len(result) != len(self.nodes):
            visited_ids = {s.id for s in result}
            remaining = set(self.nodes.keys()) - visited_ids
            msg = f"Cycle detected in DAG. Remaining nodes: {sorted(remaining)}"
            raise CycleDetectedError(msg)

        return result

    def get_ready_steps(self, completed: set[str]) -> list["StepDefinition"]:
        """Return steps whose dependencies are all completed.

        Args:
            completed: Set of step IDs that have finished.

        Returns:
            List of steps ready for execution.
        """
        ready: list["StepDefinition"] = []
        for node_id, step in self.nodes.items():
            if node_id in completed:
                continue
            # Check all predecessors are completed
            predecessors_met = True
            for from_id, to_ids in self.edges.items():
                if node_id in to_ids and from_id not in completed:
                    predecessors_met = False
                    break
            if predecessors_met:
                ready.append(step)
        return ready
