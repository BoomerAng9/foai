"""LUC Dispatch Tree — internal routing for the FOAI-AIMS ecosystem.

Maps user intents to service chains. Every request flows through:
  CTI HUB → Chicken Hawk (OpenClaw) → dispatch tree → services

The tree decides:
  1. Which service handles this intent
  2. Which model to use (via LUC router)
  3. Whether budget allows it (via LUC meter)
  4. What the execution chain looks like

Initiative-aware routing:
  - Scraping/data: Firecrawl + Apify → LLM clean → Sheets export
  - Vision tasks: Gemini 3.1 (sees screenshots, PDFs, images)
  - Lead gen/sales: ACHEEVY Digital CEO upstream
  - Security: NemoClaw validation
  - Evaluation: Hermes Deep Think
"""

from dataclasses import dataclass
from .model_router import pick, QUALITY_PRESETS
from ..engine.catalog import (
    TASK_SCRAPE_CLEAN,
    TASK_CHAT,
    TASK_CODE,
    TASK_ANALYSIS,
    TASK_EVALUATION,
    TASK_CONTENT,
    TASK_ROUTING,
    TASK_VISION,
)


@dataclass
class DispatchRoute:
    intent: str
    chain: list[str]        # ordered service chain
    model_task: str         # LUC task type for model selection
    quality: str            # quality preset
    description: str


# ─── Route Table ─────────────────────────────────────────────

ROUTES: dict[str, DispatchRoute] = {
    # Data pipeline
    "scrape": DispatchRoute(
        intent="scrape",
        chain=["nemoclaw.validate", "firecrawl.scrape", "luc.record"],
        model_task=TASK_SCRAPE_CLEAN,
        quality="fast",
        description="Scrape URLs via Firecrawl/Apify",
    ),
    "clean": DispatchRoute(
        intent="clean",
        chain=["luc.pick_model", "openrouter.complete", "luc.record"],
        model_task=TASK_SCRAPE_CLEAN,
        quality="fast",
        description="Clean and segment raw data into structured rows via LLM",
    ),
    "export_sheets": DispatchRoute(
        intent="export_sheets",
        chain=["google_sheets.append", "luc.record"],
        model_task=TASK_SCRAPE_CLEAN,
        quality="fast",
        description="Export cleaned data to Google Sheets",
    ),
    "full_pipeline": DispatchRoute(
        intent="full_pipeline",
        chain=["nemoclaw.validate", "firecrawl.scrape", "luc.pick_model", "openrouter.complete", "google_sheets.append", "luc.record", "hermes.evaluate"],
        model_task=TASK_SCRAPE_CLEAN,
        quality="fast",
        description="Full scrape → clean → export pipeline",
    ),

    # Vision (Gemini 3.1)
    "vision_analyze": DispatchRoute(
        intent="vision_analyze",
        chain=["luc.pick_model", "openrouter.complete", "luc.record"],
        model_task=TASK_VISION,
        quality="best",
        description="Analyze image/screenshot/PDF via Gemini 3.1 vision",
    ),
    "vision_scrape": DispatchRoute(
        intent="vision_scrape",
        chain=["playwright.screenshot", "luc.pick_model", "openrouter.complete", "luc.record"],
        model_task=TASK_VISION,
        quality="best",
        description="Screenshot a page then extract data via vision model",
    ),

    # Agent operations
    "chat": DispatchRoute(
        intent="chat",
        chain=["luc.pick_model", "openrouter.complete", "luc.record"],
        model_task=TASK_CHAT,
        quality="good",
        description="General agent chat",
    ),
    "content_generate": DispatchRoute(
        intent="content_generate",
        chain=["luc.pick_model", "openrouter.complete", "luc.record"],
        model_task=TASK_CONTENT,
        quality="good",
        description="Generate SEO content for foai.cloud",
    ),
    "code": DispatchRoute(
        intent="code",
        chain=["luc.pick_model", "openrouter.complete", "luc.record"],
        model_task=TASK_CODE,
        quality="best",
        description="Code generation or review",
    ),

    # Evaluation + learning
    "evaluate": DispatchRoute(
        intent="evaluate",
        chain=["hermes.evaluate", "luc.record"],
        model_task=TASK_EVALUATION,
        quality="good",
        description="Hermes Deep Think evaluation",
    ),

    # Sales + client-facing (ACHEEVY upstream)
    "lead_gen": DispatchRoute(
        intent="lead_gen",
        chain=["acheevy.dispatch", "luc.record"],
        model_task=TASK_ANALYSIS,
        quality="good",
        description="ACHEEVY handles lead generation and sales management",
    ),
    "client_docs": DispatchRoute(
        intent="client_docs",
        chain=["acheevy.dispatch", "luc.record"],
        model_task=TASK_CONTENT,
        quality="best",
        description="ACHEEVY generates client-facing documents and proposals",
    ),

    # Security
    "security_check": DispatchRoute(
        intent="security_check",
        chain=["nemoclaw.validate"],
        model_task=TASK_ROUTING,
        quality="fast",
        description="NemoClaw security validation",
    ),
}


def resolve(intent: str) -> DispatchRoute | None:
    """Resolve an intent to a dispatch route."""
    return ROUTES.get(intent)


def resolve_model(intent: str) -> str:
    """Resolve intent directly to the optimal model ID."""
    route = ROUTES.get(intent)
    if not route:
        return pick(TASK_CHAT, "good")
    return pick(route.model_task, route.quality)


def classify_intent(user_message: str) -> str:
    """Simple keyword-based intent classification.

    In production, Chicken Hawk uses an LLM for this.
    This is the fast fallback for direct routing.
    """
    msg = user_message.lower()

    if any(w in msg for w in ["screenshot", "image", "photo", "pdf", "see", "look at", "visual"]):
        return "vision_analyze"
    if any(w in msg for w in ["scrape", "crawl", "extract", "pull data"]):
        return "scrape"
    if any(w in msg for w in ["clean", "segment", "organize", "structure"]):
        return "clean"
    if any(w in msg for w in ["sheet", "export", "google sheet", "spreadsheet"]):
        return "export_sheets"
    if any(w in msg for w in ["pipeline", "full run", "scrape and clean"]):
        return "full_pipeline"
    if any(w in msg for w in ["lead", "prospect", "outreach", "sales"]):
        return "lead_gen"
    if any(w in msg for w in ["proposal", "contract", "document", "client"]):
        return "client_docs"
    if any(w in msg for w in ["evaluate", "score", "performance", "deep think"]):
        return "evaluate"
    if any(w in msg for w in ["code", "build", "implement", "function"]):
        return "code"
    if any(w in msg for w in ["content", "blog", "seo", "article"]):
        return "content_generate"
    if any(w in msg for w in ["security", "validate", "check"]):
        return "security_check"

    return "chat"


def list_routes() -> list[dict]:
    """List all available routes."""
    return [
        {
            "intent": r.intent,
            "chain": r.chain,
            "model_task": r.model_task,
            "quality": r.quality,
            "model": pick(r.model_task, r.quality),
            "description": r.description,
        }
        for r in ROUTES.values()
    ]
