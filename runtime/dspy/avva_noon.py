"""
AVVA NOON Reasoning Spine — DSPy Signatures & Modules

Three reasoning modes:
  Simple  — single-pass AVVAExecutor
  Deep    — 5 parallel chains + MultiChainComparison + NOONValidator
  Heavy   — LATS tree search with NOONValidator scoring
"""

from __future__ import annotations

import json
import os
import sys
import time
import uuid
from pathlib import Path
from typing import Any

import dspy

# ---------------------------------------------------------------------------
# DSPy Signatures
# ---------------------------------------------------------------------------

class AVVAExecutor(dspy.Signature):
    """Produce a structured reasoning chain and candidate answer for a task."""
    task: str = dspy.InputField(desc="The task or question to reason about")
    context: str = dspy.InputField(desc="Supporting context, data, or constraints")
    reasoning_chain: str = dspy.OutputField(desc="Step-by-step reasoning trace")
    candidate_answer: str = dspy.OutputField(desc="The proposed answer")


class NOONValidator(dspy.Signature):
    """Validate a candidate answer against a set of assertions."""
    reasoning_chain: str = dspy.InputField(desc="The reasoning chain to validate")
    candidate_answer: str = dspy.InputField(desc="The candidate answer to validate")
    assertions: list[str] = dspy.InputField(desc="Assertions the answer must satisfy")
    passed: bool = dspy.OutputField(desc="Whether all assertions pass")
    critique: str = dspy.OutputField(desc="Detailed critique of the answer")
    refined_answer: str = dspy.OutputField(desc="Improved answer if validation fails, otherwise same as candidate")


# ---------------------------------------------------------------------------
# Reflexion memory (append-only failures log)
# ---------------------------------------------------------------------------

FAILURES_PATH = Path(__file__).parent / "reflexion" / "failures.jsonl"


def log_failure(task_id: str, failure_reason: str, suggested_fix: str) -> None:
    """Append a failure record to the reflexion log."""
    record = {
        "task_id": task_id,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "failure_reason": failure_reason,
        "suggested_fix": suggested_fix,
    }
    with open(FAILURES_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")


def read_failures() -> list[dict]:
    """Read all failure records."""
    if not FAILURES_PATH.exists():
        return []
    lines = FAILURES_PATH.read_text(encoding="utf-8").strip().split("\n")
    return [json.loads(line) for line in lines if line.strip()]


# ---------------------------------------------------------------------------
# Modules for each reasoning mode
# ---------------------------------------------------------------------------

class SimpleMode(dspy.Module):
    """Single-pass reasoning through AVVAExecutor."""

    def __init__(self):
        super().__init__()
        self.executor = dspy.ChainOfThought(AVVAExecutor)

    def forward(self, task: str, context: str) -> dspy.Prediction:
        result = self.executor(task=task, context=context)
        return dspy.Prediction(
            reasoning_chain=result.reasoning_chain,
            answer=result.candidate_answer,
            confidence=0.7,
            mode_used="simple",
        )


class DeepMode(dspy.Module):
    """5 parallel AVVAExecutor chains -> MultiChainComparison -> NOONValidator."""

    def __init__(self):
        super().__init__()
        self.chains = [dspy.ChainOfThought(AVVAExecutor) for _ in range(5)]
        self.comparator = dspy.MultiChainComparison(AVVAExecutor, M=5)
        self.validator = dspy.ChainOfThought(NOONValidator)

    def forward(self, task: str, context: str, assertions: list[str] | None = None) -> dspy.Prediction:
        assertions = assertions or ["Answer must be factually grounded in the provided context"]

        # Run 5 parallel chains
        completions = []
        for chain in self.chains:
            result = chain(task=task, context=context)
            completions.append(result)

        # Compare chains and select best
        compared = self.comparator(
            completions=completions,
            task=task,
            context=context,
        )

        # Validate via NOON
        validation = self.validator(
            reasoning_chain=compared.reasoning_chain,
            candidate_answer=compared.candidate_answer,
            assertions=assertions,
        )

        task_id = str(uuid.uuid4())[:8]

        if not validation.passed:
            log_failure(
                task_id=task_id,
                failure_reason=validation.critique,
                suggested_fix=validation.refined_answer,
            )

        final_answer = validation.refined_answer if not validation.passed else compared.candidate_answer

        return dspy.Prediction(
            reasoning_chain=compared.reasoning_chain,
            answer=final_answer,
            confidence=0.85 if validation.passed else 0.6,
            mode_used="deep",
            validation_passed=validation.passed,
            critique=validation.critique,
        )


class HeavyMode(dspy.Module):
    """
    LATS (Language Agent Tree Search) pattern.
    Tree search with backtracking, using NOONValidator as the scoring function.
    """

    MAX_DEPTH = 3
    BRANCH_FACTOR = 3

    def __init__(self):
        super().__init__()
        self.executor = dspy.ChainOfThought(AVVAExecutor)
        self.validator = dspy.ChainOfThought(NOONValidator)

    def _score_candidate(
        self, reasoning_chain: str, candidate_answer: str, assertions: list[str]
    ) -> tuple[float, str, str]:
        """Score a candidate using NOONValidator. Returns (score, critique, refined)."""
        validation = self.validator(
            reasoning_chain=reasoning_chain,
            candidate_answer=candidate_answer,
            assertions=assertions,
        )
        score = 1.0 if validation.passed else 0.3
        return score, validation.critique, validation.refined_answer

    def forward(
        self,
        task: str,
        context: str,
        assertions: list[str] | None = None,
    ) -> dspy.Prediction:
        assertions = assertions or [
            "Answer must be factually grounded in the provided context",
            "Reasoning chain must be logically consistent",
            "Answer must directly address the task",
        ]

        best_score = -1.0
        best_result: dict[str, Any] = {}
        search_trace: list[dict] = []
        task_id = str(uuid.uuid4())[:8]

        for depth in range(self.MAX_DEPTH):
            for branch in range(self.BRANCH_FACTOR):
                # Build augmented context with search history
                aug_context = context
                if search_trace:
                    last_critique = search_trace[-1].get("critique", "")
                    aug_context += f"\n\n[LATS backtrack — prior critique: {last_critique}]"

                result = self.executor(task=task, context=aug_context)
                score, critique, refined = self._score_candidate(
                    result.reasoning_chain,
                    result.candidate_answer,
                    assertions,
                )

                node = {
                    "depth": depth,
                    "branch": branch,
                    "score": score,
                    "critique": critique,
                }
                search_trace.append(node)

                if score > best_score:
                    best_score = score
                    best_result = {
                        "reasoning_chain": result.reasoning_chain,
                        "answer": refined if score < 1.0 else result.candidate_answer,
                        "critique": critique,
                    }

                # Early exit on perfect score
                if score >= 1.0:
                    break

            if best_score >= 1.0:
                break

        # Log failure if nothing passed
        if best_score < 1.0:
            log_failure(
                task_id=task_id,
                failure_reason=best_result.get("critique", "All LATS branches failed validation"),
                suggested_fix=best_result.get("answer", ""),
            )

        return dspy.Prediction(
            reasoning_chain=best_result.get("reasoning_chain", ""),
            answer=best_result.get("answer", ""),
            confidence=round(min(best_score, 1.0), 2),
            mode_used="heavy",
            search_depth=len(search_trace),
            search_trace=search_trace,
        )


# ---------------------------------------------------------------------------
# Unified entry point — JSON stdin/stdout protocol for LangGraph bridge
# ---------------------------------------------------------------------------

def configure_lm() -> None:
    """Configure DSPy LM from environment."""
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if api_key:
        lm = dspy.LM("gemini/gemini-2.5-flash", api_key=api_key)
        dspy.configure(lm=lm)
    else:
        raise RuntimeError(
            "No LM configured. Set GEMINI_API_KEY in environment."
        )


def run_mode(mode: str, task: str, context: str, assertions: list[str] | None = None) -> dict:
    """Run a reasoning mode and return structured output."""
    if mode == "simple":
        module = SimpleMode()
        result = module(task=task, context=context)
    elif mode == "deep":
        module = DeepMode()
        result = module(task=task, context=context, assertions=assertions)
    elif mode == "heavy":
        module = HeavyMode()
        result = module(task=task, context=context, assertions=assertions)
    else:
        raise ValueError(f"Unknown mode: {mode}")

    return {
        "reasoning_chain": result.reasoning_chain,
        "answer": result.answer,
        "confidence": result.confidence,
        "mode_used": result.mode_used,
    }


def main() -> None:
    """JSON stdin/stdout bridge for the LangGraph TypeScript process."""
    configure_lm()

    raw = sys.stdin.read()
    request = json.loads(raw)

    mode = request.get("mode", "simple")
    task = request.get("task", "")
    context = request.get("context", "")
    assertions = request.get("assertions")

    try:
        output = run_mode(mode, task, context, assertions)
        response = {"status": "ok", "data": output}
    except Exception as e:
        response = {"status": "error", "error": str(e)}

    sys.stdout.write(json.dumps(response))
    sys.stdout.flush()


if __name__ == "__main__":
    main()
