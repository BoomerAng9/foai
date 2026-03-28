"""LUC Model Catalog — OpenRouter pricing + capability matrix.

Accurate as of March 2026. Sources: openrouter.ai/models, openrouter.ai/pricing
Every model has: cost per 1M tokens (in/out), max context, speed tier,
quality tier, and supported task types.
"""

from dataclasses import dataclass

@dataclass
class ModelSpec:
    id: str
    provider: str
    cost_in_per_m: float    # $ per 1M input tokens
    cost_out_per_m: float   # $ per 1M output tokens
    max_context: int        # tokens
    speed_tier: int         # 1=fastest, 5=slowest
    quality_tier: int       # 1=best, 5=worst
    tasks: list[str]        # supported task types
    vision: bool = False    # can process images/screenshots

# Task types
TASK_SCRAPE_CLEAN = "scrape_clean"
TASK_CHAT = "chat"
TASK_CODE = "code"
TASK_ANALYSIS = "analysis"
TASK_EVALUATION = "evaluation"
TASK_CONTENT = "content"
TASK_ROUTING = "routing"
TASK_VISION = "vision"

ALL_TASKS = [TASK_SCRAPE_CLEAN, TASK_CHAT, TASK_CODE, TASK_ANALYSIS, TASK_EVALUATION, TASK_CONTENT, TASK_ROUTING]
ALL_TASKS_PLUS_VISION = ALL_TASKS + [TASK_VISION]

# ─── OpenRouter Model Catalog (March 2026) ────────────────────

CATALOG: dict[str, ModelSpec] = {

    # ── OpenAI GPT-5.4 Family ──────────────────────────────────

    "openai/gpt-5.4-nano": ModelSpec(
        id="openai/gpt-5.4-nano",
        provider="OpenAI",
        cost_in_per_m=0.20,
        cost_out_per_m=1.25,
        max_context=400_000,
        speed_tier=1,
        quality_tier=3,
        tasks=ALL_TASKS,
        vision=True,
    ),
    "openai/gpt-5.4-mini": ModelSpec(
        id="openai/gpt-5.4-mini",
        provider="OpenAI",
        cost_in_per_m=0.75,
        cost_out_per_m=4.50,
        max_context=400_000,
        speed_tier=1,
        quality_tier=2,
        tasks=ALL_TASKS_PLUS_VISION,
        vision=True,
    ),
    "openai/gpt-5.4": ModelSpec(
        id="openai/gpt-5.4",
        provider="OpenAI",
        cost_in_per_m=2.50,
        cost_out_per_m=15.00,
        max_context=1_000_000,
        speed_tier=2,
        quality_tier=1,
        tasks=ALL_TASKS_PLUS_VISION,
        vision=True,
    ),

    # ── Google Gemini 3.1 Family ───────────────────────────────

    "google/gemini-3.1-flash-lite-preview": ModelSpec(
        id="google/gemini-3.1-flash-lite-preview",
        provider="Google",
        cost_in_per_m=0.25,
        cost_out_per_m=1.50,
        max_context=1_000_000,
        speed_tier=1,
        quality_tier=3,
        tasks=ALL_TASKS_PLUS_VISION,
        vision=True,
    ),
    "google/gemini-3-flash-preview": ModelSpec(
        id="google/gemini-3-flash-preview",
        provider="Google",
        cost_in_per_m=0.50,
        cost_out_per_m=3.00,
        max_context=1_000_000,
        speed_tier=1,
        quality_tier=2,
        tasks=ALL_TASKS_PLUS_VISION,
        vision=True,
    ),
    "google/gemini-3.1-pro-preview": ModelSpec(
        id="google/gemini-3.1-pro-preview",
        provider="Google",
        cost_in_per_m=2.00,
        cost_out_per_m=12.00,
        max_context=1_000_000,
        speed_tier=3,
        quality_tier=1,
        tasks=ALL_TASKS_PLUS_VISION,
        vision=True,
    ),

    # ── Anthropic Claude 4.x ───────────────────────────────────

    "anthropic/claude-sonnet-4.6": ModelSpec(
        id="anthropic/claude-sonnet-4.6",
        provider="Anthropic",
        cost_in_per_m=3.00,
        cost_out_per_m=15.00,
        max_context=200_000,
        speed_tier=2,
        quality_tier=1,
        tasks=[TASK_CODE, TASK_ANALYSIS, TASK_EVALUATION, TASK_CONTENT, TASK_CHAT],
        vision=True,
    ),

    # ── MiniMax ────────────────────────────────────────────────

    "minimax/minimax-m2.7": ModelSpec(
        id="minimax/minimax-m2.7",
        provider="MiniMax",
        cost_in_per_m=0.30,
        cost_out_per_m=1.20,
        max_context=204_800,
        speed_tier=2,
        quality_tier=2,
        tasks=ALL_TASKS,
        vision=False,
    ),

    # ── DeepSeek ───────────────────────────────────────────────

    "deepseek/deepseek-v3.2": ModelSpec(
        id="deepseek/deepseek-v3.2",
        provider="DeepSeek",
        cost_in_per_m=0.27,
        cost_out_per_m=0.42,
        max_context=128_000,
        speed_tier=2,
        quality_tier=2,
        tasks=ALL_TASKS,
        vision=False,
    ),

    # ── Qwen ───────────────────────────────────────────────────

    "qwen/qwen3-coder": ModelSpec(
        id="qwen/qwen3-coder",
        provider="Qwen",
        cost_in_per_m=0.00,  # FREE on OpenRouter
        cost_out_per_m=0.00,
        max_context=262_000,
        speed_tier=2,
        quality_tier=2,
        tasks=[TASK_CODE, TASK_SCRAPE_CLEAN, TASK_ROUTING, TASK_CHAT],
        vision=False,
    ),
}


def get_model(model_id: str) -> ModelSpec | None:
    return CATALOG.get(model_id)

def list_models_for_task(task: str) -> list[ModelSpec]:
    return [m for m in CATALOG.values() if task in m.tasks]

def list_vision_models() -> list[ModelSpec]:
    return [m for m in CATALOG.values() if m.vision]

def cheapest_for_task(task: str, max_quality_tier: int = 3, require_vision: bool = False) -> ModelSpec | None:
    """Return the cheapest model that supports this task within quality threshold."""
    candidates = [
        m for m in CATALOG.values()
        if task in m.tasks
        and m.quality_tier <= max_quality_tier
        and (not require_vision or m.vision)
    ]
    if not candidates:
        return None
    candidates.sort(key=lambda m: (m.cost_out_per_m, m.cost_in_per_m))
    return candidates[0]
