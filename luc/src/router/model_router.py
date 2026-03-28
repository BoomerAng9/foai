"""LUC Model Router — picks the cheapest model that meets quality requirements.

Initiative-aware routing for FOAI-AIMS:
  - Vision tasks → Gemini 3.1 Pro (best vision) or GPT-5.4 Mini (budget vision)
  - Scrape/clean → DeepSeek V3.2 (cheapest) or Qwen3-Coder (free)
  - Code → Qwen3-Coder (free, strong) or Claude Sonnet 4.6 (best)
  - Chat → DeepSeek V3.2 (cheapest good quality)
  - Routing/classification → GPT-5.4 Nano (fastest, cheapest)
  - Content → MiniMax M2.7 (strong writer, low cost)
  - Evaluation → Gemini 3 Flash (balanced)
"""

from ..engine.catalog import (
    ModelSpec,
    CATALOG,
    cheapest_for_task,
    list_models_for_task,
    TASK_SCRAPE_CLEAN,
    TASK_CHAT,
    TASK_CODE,
    TASK_ANALYSIS,
    TASK_EVALUATION,
    TASK_CONTENT,
    TASK_ROUTING,
    TASK_VISION,
)

QUALITY_PRESETS = {
    "best": 1,
    "good": 2,
    "fast": 3,
    "cheapest": 5,
}

# Default quality per task — tuned for our initiatives
DEFAULT_TASK_QUALITY = {
    TASK_VISION: "best",        # Gemini 3.1 Pro — essential for scraping productivity
    TASK_SCRAPE_CLEAN: "fast",  # DeepSeek V3.2 or Qwen3-Coder — volume work
    TASK_CHAT: "good",          # DeepSeek V3.2 — interactive, low cost
    TASK_CODE: "best",          # Qwen3-Coder (free) or Claude Sonnet 4.6
    TASK_ANALYSIS: "good",      # Gemini 3 Flash — balanced
    TASK_EVALUATION: "good",    # Gemini 3 Flash — balanced
    TASK_CONTENT: "good",       # MiniMax M2.7 — strong writer
    TASK_ROUTING: "fast",       # GPT-5.4 Nano — fastest classification
}

_pinned: dict[str, str] = {}


def pin_model(task: str, model_id: str):
    if model_id in CATALOG:
        _pinned[task] = model_id


def unpin_model(task: str):
    _pinned.pop(task, None)


def pick(task: str, quality: str | None = None, min_context: int = 0, require_vision: bool = False) -> str:
    """Pick the best model for a task. Returns OpenRouter model ID."""
    if task in _pinned:
        return _pinned[task]

    # Vision tasks always require vision capability
    if task == TASK_VISION:
        require_vision = True

    q = quality or DEFAULT_TASK_QUALITY.get(task, "good")
    max_tier = QUALITY_PRESETS.get(q, 3)

    candidates = [
        m for m in CATALOG.values()
        if task in m.tasks
        and m.quality_tier <= max_tier
        and m.max_context >= min_context
        and (not require_vision or m.vision)
    ]

    if not candidates:
        return "deepseek/deepseek-v3.2"

    candidates.sort(key=lambda m: (m.cost_out_per_m, m.cost_in_per_m))
    return candidates[0].id


def pick_with_budget(task: str, estimated_tokens: int, budget_remaining: float, quality: str | None = None) -> str:
    """Pick cheapest model that fits within remaining budget."""
    q = quality or DEFAULT_TASK_QUALITY.get(task, "good")
    max_tier = QUALITY_PRESETS.get(q, 3)
    require_vision = task == TASK_VISION

    candidates = [
        m for m in CATALOG.values()
        if task in m.tasks
        and m.quality_tier <= max_tier
        and (not require_vision or m.vision)
    ]

    if not candidates:
        return "deepseek/deepseek-v3.2"

    affordable = []
    for m in candidates:
        est_cost = (estimated_tokens / 1_000_000) * (m.cost_in_per_m + m.cost_out_per_m) / 2
        if est_cost <= budget_remaining:
            affordable.append((est_cost, m))

    if not affordable:
        candidates.sort(key=lambda m: m.cost_out_per_m)
        return candidates[0].id

    affordable.sort(key=lambda x: x[0])
    return affordable[0][1].id


def explain_pick(task: str, quality: str | None = None) -> dict:
    model_id = pick(task, quality)
    spec = CATALOG.get(model_id)
    q = quality or DEFAULT_TASK_QUALITY.get(task, "good")

    return {
        "task": task,
        "quality_preset": q,
        "selected_model": model_id,
        "provider": spec.provider if spec else "unknown",
        "cost_in_per_m": spec.cost_in_per_m if spec else 0,
        "cost_out_per_m": spec.cost_out_per_m if spec else 0,
        "quality_tier": spec.quality_tier if spec else 0,
        "speed_tier": spec.speed_tier if spec else 0,
        "vision": spec.vision if spec else False,
        "pinned": task in _pinned,
    }
