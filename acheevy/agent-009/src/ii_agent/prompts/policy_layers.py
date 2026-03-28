"""Policy-layer orchestration for ACHEEVY prompts.

Loads markdown layers with deterministic precedence:
brain -> agent -> hooks/task/skills overlays.
Selection uses hybrid NLP routing:
- rules/allowlist first
- IntakeClassifier fallback for ambiguous inputs
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

from ii_agent.pipeline.acheevy_pipeline import IntakeClassifier

PROMPTS_DIR = Path(__file__).resolve().parent
REPO_ROOT = PROMPTS_DIR.parents[2]

LAYER_FILES: Dict[str, str] = {
    "brain": "acheevy-brain.md",
    "agent": "agent.md",
    "skills": "skills.md",
    "hooks": "hooks.md",
    "task": "task.md",
}

AIMS_BEST_PRACTICE_SOURCES: Dict[str, tuple[str, ...]] = {
    "agent": (
        "include/aims/aims-skills/skills/claude-agent-loop.skill.md",
        "include/aims/docs/ACHEEVY_ROLE_BASED_OPERATING_SPEC.md",
        "include/aims/docs/AIMS_ROLE_BINDINGS.md",
    ),
    "skills": (
        "include/aims/aims-skills/skills/skill-router.md",
        "include/aims/aims-skills/skills/orchestrate-turn.skill.md",
        "include/aims/docs/skills/GROWTH_SPECIALIST_EXECUTOR.SKILL.md",
        "include/aims/docs/design/DESIGN_SYSTEM_RULES.md",
        "include/aims/docs/design/UCD_MANUAL.md",
    ),
    "hooks": (
        "include/aims/aims-skills/hooks/session-start.hook.md",
        "include/aims/aims-skills/hooks/search-provider-priority.hook.md",
        "include/aims/docs/ACHEEVY_ROLE_BASED_OPERATING_SPEC.md",
    ),
    "task": (
        "include/aims/aims-skills/skills/app-factory/start-process.skill.md",
        "include/aims/aims-skills/skills/deployment-hub/perform-session.skill.md",
        "include/aims/docs/ACHEEVY_ROLE_BASED_OPERATING_SPEC.md",
    ),
}

RULE_KEYWORDS: Dict[str, tuple[str, ...]] = {
    "skills": (
        "api",
        "integrat",
        "oauth",
        "database",
        "schema",
        "frontend",
        "backend",
        "design",
        "ui",
        "ux",
        "research",
        "brand",
        "token",
        "component",
        "accessib",
        "color",
        "layout",
        "typograph",
    ),
    "hooks": (
        "hook",
        "trigger",
        "event",
        "webhook",
        "session",
        "lifecycle",
        "on ",
        "when ",
        "if ",
    ),
    "task": (
        "task",
        "implement",
        "fix",
        "build",
        "create",
        "deploy",
        "ship",
        "production",
        "release",
        "rollback",
    ),
}


@dataclass
class PolicySelection:
    selected_layers: List[str]
    strategy: str
    reason_codes: List[str]


def _read_layer(layer_name: str) -> str:
    file_name = LAYER_FILES[layer_name]
    layer_path = PROMPTS_DIR / file_name
    local_content = ""
    if layer_path.exists():
        local_content = layer_path.read_text(encoding="utf-8").strip()

    imported = _import_aims_best_practices(layer_name)
    if imported:
        if local_content:
            return f"{local_content}\n\n{imported}".strip()
        return imported.strip()

    return local_content


def _extract_best_practice_lines(text: str, limit: int = 18) -> List[str]:
    results: List[str] = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith(("- ", "* ", "1.", "2.", "3.", "4.", "5.")):
            if len(line) > 260:
                line = line[:257] + "..."
            results.append(line)
        if len(results) >= limit:
            break
    return results


def _import_aims_best_practices(layer_name: str) -> str:
    source_paths = AIMS_BEST_PRACTICE_SOURCES.get(layer_name, ())
    if not source_paths:
        return ""

    sections: List[str] = []
    for relative_path in source_paths:
        absolute_path = REPO_ROOT / relative_path
        if not absolute_path.exists():
            continue

        try:
            content = absolute_path.read_text(encoding="utf-8")
        except Exception:
            continue

        extracted = _extract_best_practice_lines(content)
        if not extracted:
            continue

        lines = "\n".join(extracted)
        sections.append(
            f"### Imported Best Practices: {relative_path}\n{lines}"
        )

    if not sections:
        return ""

    return "\n\n## Imported AIMS Best Practices\n" + "\n\n".join(sections)


def _rules_select_layers(user_query: str) -> List[str]:
    query = (user_query or "").lower()
    selected: List[str] = []
    for layer in ("hooks", "task", "skills"):
        if any(keyword in query for keyword in RULE_KEYWORDS[layer]):
            selected.append(layer)
    return selected


def _classifier_select_layers(user_query: str) -> List[str]:
    query = (user_query or "").strip()
    if not query:
        return []

    classification = IntakeClassifier.classify(query)
    selected: List[str] = []

    if classification.get("needs_research") or classification.get("needs_build"):
        selected.append("skills")
    if classification.get("needs_deploy") or classification.get("needs_build"):
        selected.append("task")
    if classification.get("needs_deploy"):
        selected.append("hooks")

    # Keep deterministic order and uniqueness
    return [layer for layer in ("hooks", "task", "skills") if layer in selected]


def select_policy_layers(
    user_query: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> PolicySelection:
    metadata = metadata or {}

    forced_layers = metadata.get("policy_layers_selected")
    if isinstance(forced_layers, list) and forced_layers:
        forced = [
            layer
            for layer in ("hooks", "task", "skills")
            if layer in set(str(item).lower() for item in forced_layers)
        ]
        return PolicySelection(
            selected_layers=forced,
            strategy="metadata",
            reason_codes=["metadata_forced"],
        )

    selected = _rules_select_layers(user_query)
    if selected:
        return PolicySelection(
            selected_layers=selected,
            strategy="rules",
            reason_codes=["rules_match"],
        )

    selected = _classifier_select_layers(user_query)
    if selected:
        return PolicySelection(
            selected_layers=selected,
            strategy="classifier",
            reason_codes=["classifier_fallback"],
        )

    return PolicySelection(
        selected_layers=["task"],
        strategy="default",
        reason_codes=["default_task"],
    )


def build_policy_layer_prompt(
    metadata: Optional[Dict[str, Any]] = None,
) -> tuple[str, Dict[str, Any]]:
    metadata = metadata or {}
    policy_layers_enabled = bool(metadata.get("policy_layers_enabled", True))
    policy_layers_shadow_mode = bool(metadata.get("policy_layers_shadow_mode", False))

    if not policy_layers_enabled:
        return "", {
            "policy_layers_selected": [],
            "policy_strategy": "disabled",
            "policy_reason_codes": ["policy_layers_disabled"],
            "policy_layers_loaded": [],
        }

    user_query = str(metadata.get("user_query", ""))

    selection = select_policy_layers(user_query=user_query, metadata=metadata)

    if policy_layers_shadow_mode:
        return "", {
            "policy_layers_selected": selection.selected_layers,
            "policy_strategy": selection.strategy,
            "policy_reason_codes": [*selection.reason_codes, "policy_layers_shadow_mode"],
            "policy_layers_loaded": [],
            "policy_shadow_selected": selection.selected_layers,
        }

    ordered_layers = ["brain", "agent", *selection.selected_layers]
    sections: List[str] = []

    for layer in ordered_layers:
        content = _read_layer(layer)
        if not content:
            continue
        sections.append(f"\n<acheevy_policy_layer name=\"{layer}\">\n{content}\n</acheevy_policy_layer>")

    if not sections:
        return "", {
            "policy_layers_selected": selection.selected_layers,
            "policy_strategy": selection.strategy,
            "policy_reason_codes": selection.reason_codes,
            "policy_layers_loaded": [],
        }

    policy_prompt = (
        "\n\n<acheevy_policy_package precedence=\"brain>agent>dynamic\">"
        "\nThe following policy layers are mandatory."
        "\nIf conflicts occur, higher-precedence layers override lower layers."
        f"\nSelection strategy: {selection.strategy}."
        + "".join(sections)
        + "\n</acheevy_policy_package>"
    )

    return policy_prompt, {
        "policy_layers_selected": selection.selected_layers,
        "policy_strategy": selection.strategy,
        "policy_reason_codes": selection.reason_codes,
        "policy_layers_loaded": ordered_layers,
    }
