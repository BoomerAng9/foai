"""
moex.py — Mixture of Executors (MoEx) routing.

Given a task description, classify and route to the correct executor:
    - "claw"   — Rust/systems/low-level work (vendored Claw-Code CLI)
    - "codex"  — Python/data/ML work (OpenAI Codex CLI or equivalent)
    - "gemini" — Everything else (Gemini CLI)

Uses simple keyword classification, not LLM-based.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Optional


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
