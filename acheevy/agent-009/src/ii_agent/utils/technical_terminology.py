"""Prompt intelligence and technical terminology helpers.

Builds a lightweight domain vocabulary for internal prompt enhancement.
"""

from dataclasses import dataclass
import re
from typing import Any


@dataclass(frozen=True)
class TechnicalTerm:
    term: str
    category: str
    preferred_phrase: str
    definition: str
    aliases: tuple[str, ...]
    signals: tuple[str, ...]


CATEGORY_METADATA: dict[str, dict[str, str]] = {
    "computer-science": {
        "label": "Computer Science",
        "description": "Core systems, algorithms, architecture, and data structures.",
    },
    "prompt-engineering": {
        "label": "Prompt Engineering",
        "description": "Instruction design, constraints, evaluation, and prompt shaping.",
    },
    "vibe-coding": {
        "label": "Vibe Coding",
        "description": "Fast iteration patterns for AI-assisted prototyping and refinement.",
    },
    "frontend-systems": {
        "label": "Frontend Systems",
        "description": "UI architecture, interaction design, and component behavior.",
    },
    "backend-systems": {
        "label": "Backend Systems",
        "description": "APIs, data contracts, persistence, orchestration, and services.",
    },
    "ai-agents": {
        "label": "AI Agents",
        "description": "Agent loops, tool use, planning, context, and execution controls.",
    },
}


TECHNICAL_TERMS: tuple[TechnicalTerm, ...] = (
    TechnicalTerm(
        term="abstraction boundary",
        category="computer-science",
        preferred_phrase="well-defined abstraction boundary",
        definition="A clean separation where one layer exposes behavior without leaking internal implementation details.",
        aliases=("abstraction", "boundary"),
        signals=("abstraction", "boundary", "layer", "interface"),
    ),
    TechnicalTerm(
        term="state machine",
        category="computer-science",
        preferred_phrase="explicit state machine",
        definition="A model that enumerates valid states and transitions so the system behaves predictably.",
        aliases=("workflow state", "transition model"),
        signals=("state", "transition", "status", "lifecycle"),
    ),
    TechnicalTerm(
        term="idempotency",
        category="backend-systems",
        preferred_phrase="idempotent request handling",
        definition="A guarantee that repeating the same operation does not create duplicate side effects.",
        aliases=("deduplication", "safe retry"),
        signals=("retry", "duplicate", "dedupe", "idempotent"),
    ),
    TechnicalTerm(
        term="contract-first api",
        category="backend-systems",
        preferred_phrase="contract-first API design",
        definition="Defining request and response schemas before implementing endpoint logic.",
        aliases=("api contract", "schema-first api"),
        signals=("schema", "contract", "endpoint", "request", "response", "api"),
    ),
    TechnicalTerm(
        term="observability",
        category="backend-systems",
        preferred_phrase="observability instrumentation",
        definition="Logs, metrics, traces, and diagnostics that make runtime behavior inspectable.",
        aliases=("telemetry", "instrumentation"),
        signals=("logging", "metrics", "trace", "telemetry", "monitoring"),
    ),
    TechnicalTerm(
        term="retrieval-augmented generation",
        category="ai-agents",
        preferred_phrase="retrieval-augmented generation (RAG)",
        definition="Injecting retrieved context into model input so responses use relevant external knowledge.",
        aliases=("rag",),
        signals=("rag", "retrieval", "knowledge base", "embedding", "vector"),
    ),
    TechnicalTerm(
        term="tool orchestration",
        category="ai-agents",
        preferred_phrase="tool orchestration pipeline",
        definition="A controlled sequence for selecting, invoking, and validating tool calls during agent execution.",
        aliases=("tool chain", "tool loop"),
        signals=("tool", "orchestrate", "plan", "pipeline", "execution"),
    ),
    TechnicalTerm(
        term="context window budgeting",
        category="ai-agents",
        preferred_phrase="context window budgeting",
        definition="Selecting and compressing context so the model sees the highest-value information within token limits.",
        aliases=("context budget", "token budget"),
        signals=("context", "token", "window", "budget", "history"),
    ),
    TechnicalTerm(
        term="prompt constraints",
        category="prompt-engineering",
        preferred_phrase="prompt constraints and success criteria",
        definition="Explicit boundaries that define allowed behavior, exclusions, and what counts as a correct result.",
        aliases=("guardrails", "constraints"),
        signals=("constraint", "guardrail", "criteria", "success", "must", "should"),
    ),
    TechnicalTerm(
        term="few-shot prompting",
        category="prompt-engineering",
        preferred_phrase="few-shot prompting",
        definition="Providing concise examples so the model copies the intended output pattern.",
        aliases=("examples in prompt", "demonstration prompting"),
        signals=("example", "few-shot", "sample output", "pattern"),
    ),
    TechnicalTerm(
        term="prompt decomposition",
        category="prompt-engineering",
        preferred_phrase="task decomposition",
        definition="Breaking a large request into smaller steps with explicit intermediate objectives.",
        aliases=("stepwise prompt", "decompose task"),
        signals=("step", "break down", "decompose", "phases", "subtask"),
    ),
    TechnicalTerm(
        term="rapid prototyping loop",
        category="vibe-coding",
        preferred_phrase="rapid prototyping loop",
        definition="A tight cycle of prompt, generate, inspect, and refine used for fast AI-assisted building.",
        aliases=("iterate quickly", "prototype loop"),
        signals=("prototype", "iterate", "vibe", "quickly", "fast feedback"),
    ),
    TechnicalTerm(
        term="design system tokenization",
        category="frontend-systems",
        preferred_phrase="design system tokenization",
        definition="Encoding spacing, color, radius, and typography as reusable tokens instead of one-off values.",
        aliases=("design tokens", "token system"),
        signals=("token", "theme", "design system", "spacing", "color"),
    ),
    TechnicalTerm(
        term="interaction fidelity",
        category="frontend-systems",
        preferred_phrase="high-fidelity interaction design",
        definition="A UI that preserves the intended motion, state transitions, and polish across user flows.",
        aliases=("polish", "micro-interactions"),
        signals=("interaction", "animation", "motion", "transition", "polish"),
    ),
)


BUILD_TRIGGERS = {
    "build",
    "create",
    "make",
    "design",
    "develop",
    "generate",
    "scaffold",
    "implement",
    "construct",
    "deploy",
    "ship",
}

TARGET_WORDS = {
    "website",
    "page",
    "app",
    "application",
    "dashboard",
    "portal",
    "component",
    "ui",
    "interface",
    "api",
    "backend",
    "server",
    "database",
    "platform",
}


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def detect_build_intent(text: str) -> bool:
    normalized = _normalize(text)
    words = set(re.findall(r"[a-z0-9-]+", normalized))
    return any(word in words for word in BUILD_TRIGGERS) and any(
        word in words for word in TARGET_WORDS
    )


def detect_scope_tier(text: str) -> str:
    normalized = _normalize(text)
    if any(keyword in normalized for keyword in ("platform", "saas", "enterprise", "marketplace", "multi-tenant", "billing")):
        return "platform"
    if any(keyword in normalized for keyword in ("app", "application", "dashboard", "portal", "routing", "auth")):
        return "application"
    if any(keyword in normalized for keyword in ("page", "landing", "form", "hero", "section", "screen")):
        return "page"
    return "component"


def extract_technical_terms(text: str, limit: int = 8) -> list[dict[str, Any]]:
    normalized = _normalize(text)
    matches: list[tuple[int, TechnicalTerm, list[str]]] = []

    for entry in TECHNICAL_TERMS:
        matched_signals = [signal for signal in entry.signals if signal in normalized]
        exact_match = entry.term in normalized or any(
            alias in normalized for alias in entry.aliases
        )
        if not exact_match and not matched_signals:
            continue
        score = len(matched_signals) + (3 if exact_match else 0)
        matches.append((score, entry, matched_signals))

    matches.sort(key=lambda item: (-item[0], item[1].term))

    return [
        {
            "term": entry.term,
            "category": entry.category,
            "preferred_phrase": entry.preferred_phrase,
            "definition": entry.definition,
            "aliases": list(entry.aliases),
            "matched_signals": matched_signals,
        }
        for _, entry, matched_signals in matches[:limit]
    ]


def classify_categories(text: str, limit: int = 4) -> list[dict[str, Any]]:
    term_matches = extract_technical_terms(text, limit=len(TECHNICAL_TERMS))
    category_scores: dict[str, int] = {}
    for match in term_matches:
        category_scores[match["category"]] = category_scores.get(match["category"], 0) + max(
            1, len(match["matched_signals"])
        )

    ranked = sorted(category_scores.items(), key=lambda item: (-item[1], item[0]))
    return [
        {
            "key": category,
            "label": CATEGORY_METADATA[category]["label"],
            "description": CATEGORY_METADATA[category]["description"],
            "score": score,
        }
        for category, score in ranked[:limit]
    ]


def build_terminology_guidance(text: str, limit: int = 6) -> str:
    terms = extract_technical_terms(text, limit=limit)
    if not terms:
        return ""

    lines = ["Technical terminology to preserve:"]
    for term in terms:
        lines.append(
            f"- {term['preferred_phrase']}: {term['definition']}"
        )
    return "\n".join(lines)


def get_terminology_catalog() -> dict[str, Any]:
    grouped_terms: dict[str, list[dict[str, Any]]] = {}
    for entry in TECHNICAL_TERMS:
        grouped_terms.setdefault(entry.category, []).append(
            {
                "term": entry.term,
                "preferred_phrase": entry.preferred_phrase,
                "definition": entry.definition,
                "aliases": list(entry.aliases),
            }
        )

    categories = []
    for key, metadata in CATEGORY_METADATA.items():
        categories.append(
            {
                "key": key,
                "label": metadata["label"],
                "description": metadata["description"],
                "terms": grouped_terms.get(key, []),
            }
        )

    return {"categories": categories}