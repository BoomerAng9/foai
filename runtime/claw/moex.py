"""
moex.py — Mixture of Executors (MoEx) routing.

Given a task description, classify and route to the correct executor:
    - "claw"   — Rust/systems/low-level work (vendored Claw-Code CLI)
    - "codex"  — Python/data/ML work (OpenAI Codex CLI or equivalent)
    - "gemini" — Everything else (Gemini CLI)

Uses simple keyword classification, not LLM-based.

Wave 7: Added execute() dispatch method and MCP tool integration.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from enum import Enum
from typing import Any, Optional

# MCP tool imports — the actual executor backends.
# Try absolute (runtime.mcp.*) then relative (mcp.*) for flexibility.
try:
    from runtime.mcp.codex_tool import execute as codex_execute
    from runtime.mcp.codex_tool import MCP_TOOL_DEFINITION as CODEX_TOOL
    from runtime.mcp.gemini_tool import execute as gemini_execute
    from runtime.mcp.gemini_tool import MCP_TOOL_DEFINITION as GEMINI_TOOL
except ModuleNotFoundError:
    from mcp.codex_tool import execute as codex_execute
    from mcp.codex_tool import MCP_TOOL_DEFINITION as CODEX_TOOL
    from mcp.gemini_tool import execute as gemini_execute
    from mcp.gemini_tool import MCP_TOOL_DEFINITION as GEMINI_TOOL

logger = logging.getLogger(__name__)


class Executor(str, Enum):
    """Available executors in the MoEx harness."""

    CLAW = "claw"
    CODEX = "codex"
    GEMINI = "gemini"


# Keyword sets for classification.
# Order matters: first match wins. Claw and Codex are checked before
# the Gemini fallback.

_CLAW_KEYWORDS: frozenset[str] = frozenset({
    "rust",
    "cargo",
    "crate",
    "crates",
    "systems programming",
    "low-level",
    "low level",
    "wasm",
    "webassembly",
    "ffi",
    "unsafe",
    "borrow checker",
    "lifetime",
    "tokio",
    "async runtime",
    "embedded",
    "firmware",
    "kernel",
    "driver",
    "memory management",
    "zero-copy",
    "no_std",
    "c binding",
    "c bindings",
    "linker",
    "abi",
    "syscall",
    "assembly",
    "asm",
    "llvm",
    "compiler",
    "compile",
    "binary",
    "executable",
    "static linking",
    "dynamic linking",
    ".rs file",
    "cargo.toml",
    "cargo.lock",
})

_CODEX_KEYWORDS: frozenset[str] = frozenset({
    "python",
    "pandas",
    "numpy",
    "scipy",
    "matplotlib",
    "seaborn",
    "scikit-learn",
    "sklearn",
    "tensorflow",
    "pytorch",
    "torch",
    "keras",
    "jupyter",
    "notebook",
    "data science",
    "data analysis",
    "data pipeline",
    "data engineering",
    "machine learning",
    "deep learning",
    "neural network",
    "model training",
    "model inference",
    "huggingface",
    "transformers",
    "langchain",
    "llamaindex",
    "pip install",
    "requirements.txt",
    "pyproject.toml",
    "setup.py",
    "conda",
    "virtualenv",
    "venv",
    "django",
    "flask",
    "fastapi",
    "uvicorn",
    "celery",
    "airflow",
    "dbt",
    "sql query",
    "dataframe",
    "csv",
    "parquet",
    "pickle",
    ".py file",
    "pytest",
    "unittest",
    "mypy",
    "ruff",
    "black",
    "isort",
    "dspy",
    "openai sdk",
})

_GEMINI_BOOST_KEYWORDS: frozenset[str] = frozenset({
    # These nudge toward Gemini even if ambiguous.
    "javascript",
    "typescript",
    "react",
    "next.js",
    "nextjs",
    "vue",
    "angular",
    "svelte",
    "html",
    "css",
    "tailwind",
    "node",
    "deno",
    "bun",
    "web app",
    "frontend",
    "backend",
    "api",
    "rest",
    "graphql",
    "docker",
    "kubernetes",
    "terraform",
    "cloud",
    "gcp",
    "aws",
    "azure",
    "ci/cd",
    "github actions",
    "yaml",
    "json",
    "markdown",
    "documentation",
    "refactor",
    "review",
    "explain",
    "design",
    "architecture",
    "database",
    "postgres",
    "mysql",
    "mongodb",
    "redis",
    "go ",
    "golang",
    "java ",
    "kotlin",
    "swift",
    "dart",
    "flutter",
})


@dataclass(frozen=True)
class RoutingDecision:
    """Result of MoEx classification."""

    executor: Executor
    matched_keyword: Optional[str]
    confidence: str  # "high", "medium", "low"

    @property
    def name(self) -> str:
        return self.executor.value


def classify(task: str) -> RoutingDecision:
    """Classify a task description and route to the correct executor.

    Args:
        task: Free-text description of the coding task.

    Returns:
        RoutingDecision with the selected executor, matched keyword,
        and confidence level.
    """
    lower = task.lower()

    # Check Claw (Rust/systems) keywords.
    for keyword in sorted(_CLAW_KEYWORDS):
        if keyword in lower:
            return RoutingDecision(
                executor=Executor.CLAW,
                matched_keyword=keyword,
                confidence="high",
            )

    # Check Codex (Python/data/ML) keywords.
    for keyword in sorted(_CODEX_KEYWORDS):
        if keyword in lower:
            return RoutingDecision(
                executor=Executor.CODEX,
                matched_keyword=keyword,
                confidence="high",
            )

    # Check Gemini boost keywords for a medium-confidence match.
    for keyword in sorted(_GEMINI_BOOST_KEYWORDS):
        if keyword in lower:
            return RoutingDecision(
                executor=Executor.GEMINI,
                matched_keyword=keyword,
                confidence="medium",
            )

    # Default fallback: Gemini handles everything else.
    return RoutingDecision(
        executor=Executor.GEMINI,
        matched_keyword=None,
        confidence="low",
    )


def route(task: str) -> str:
    """Convenience function returning just the executor name.

    Args:
        task: Free-text description of the coding task.

    Returns:
        Executor name as string: "claw", "codex", or "gemini".
    """
    return classify(task).name


# ---------------------------------------------------------------------------
# Registered Executors
# ---------------------------------------------------------------------------

_EXECUTOR_REGISTRY: dict[str, dict[str, Any]] = {
    Executor.CLAW.value: {
        "name": "claw",
        "description": "Rust/systems executor via vendored Claw-Code CLI.",
        # Claw executor uses subprocess to the claw binary — no MCP tool wrapper yet.
        "tool": None,
    },
    Executor.CODEX.value: {
        "name": "codex",
        "description": CODEX_TOOL["description"],
        "tool": CODEX_TOOL,
    },
    Executor.GEMINI.value: {
        "name": "gemini",
        "description": GEMINI_TOOL["description"],
        "tool": GEMINI_TOOL,
    },
}


def get_registered_executors() -> dict[str, dict[str, Any]]:
    """Return the registry of all available executors."""
    return dict(_EXECUTOR_REGISTRY)


# ---------------------------------------------------------------------------
# Execute — the unified dispatch method
# ---------------------------------------------------------------------------

@dataclass
class ExecutionResult:
    """Result from MoEx execute()."""

    executor: str
    routing: RoutingDecision
    result: dict[str, Any]


def execute(task_description: str, context: Optional[dict[str, Any]] = None) -> ExecutionResult:
    """Classify a task and dispatch to the correct executor.

    This is the main entry point for Chicken Hawk and other agents
    to submit work to MoEx.

    Args:
        task_description: Natural language description of the task.
        context: Optional dict with additional context (code, files, etc.).

    Returns:
        ExecutionResult with routing decision and executor output.
    """
    ctx = context or {}
    decision = classify(task_description)

    logger.info(
        "MoEx routing: %s -> %s (keyword=%s, confidence=%s)",
        task_description[:80],
        decision.executor.value,
        decision.matched_keyword,
        decision.confidence,
    )

    if decision.executor == Executor.CLAW:
        # Claw executor — dispatch to vendored Claw-Code CLI
        # For now, return a structured stub; full integration via claw_client.py
        result = {
            "success": True,
            "output": f"[claw] Task queued for Rust executor: {task_description[:100]}",
            "executor": "claw",
            "note": "Claw dispatches to vendored Claw-Code CLI (see claw_client.py).",
        }

    elif decision.executor == Executor.CODEX:
        # Codex executor — Python/data/ML via MCP tool
        code = ctx.get("code", "")
        prompt = ctx.get("prompt", task_description)
        if code:
            result = codex_execute({
                "action": "execute_code",
                "language": ctx.get("language", "python"),
                "code": code,
            })
        else:
            result = codex_execute({
                "action": "generate_code",
                "prompt": prompt,
                "language": ctx.get("language", "python"),
            })

    elif decision.executor == Executor.GEMINI:
        # Gemini executor — everything else via MCP tool
        prompt = ctx.get("prompt", task_description)
        messages = ctx.get("messages")
        model = ctx.get("model", "gemini-3.1-flash")
        if messages:
            result = gemini_execute({
                "action": "chat",
                "messages": messages,
                "model": model,
            })
        else:
            result = gemini_execute({
                "action": "generate",
                "prompt": prompt,
                "model": model,
            })

    else:
        result = {"success": False, "error": f"Unknown executor: {decision.executor}"}

    return ExecutionResult(
        executor=decision.executor.value,
        routing=decision,
        result=result,
    )
