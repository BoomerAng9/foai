"""LUC API — metering, routing, and metrics service.

Deployed as a Cloud Run service. Every other service in the ecosystem
calls LUC to pick models and record usage.
"""

import os
from fastapi import FastAPI, Query
from pydantic import BaseModel

from ..engine.meter import luc_meter
from ..router.model_router import pick, pick_with_budget, explain_pick, pin_model, unpin_model
from ..engine.catalog import CATALOG, ALL_TASKS

PORT = int(os.getenv("PORT", "8080"))

app = FastAPI(
    title="LUC — Locale Universal Calculator",
    description="Smart model routing + usage metering for FOAI-AIMS.",
    version="1.0.0",
)


# ─── Models ──────────────────────────────────────────────────

class PickRequest(BaseModel):
    task: str
    quality: str | None = None
    min_context: int = 0
    estimated_tokens: int | None = None

class RecordLLMRequest(BaseModel):
    service: str
    model: str
    tokens_in: int
    tokens_out: int
    metadata: dict | None = None

class RecordScrapeRequest(BaseModel):
    service: str
    url: str
    engine: str

class RecordSheetsRequest(BaseModel):
    service: str
    rows: int

class PinRequest(BaseModel):
    task: str
    model_id: str

class BudgetRequest(BaseModel):
    daily_limit_usd: float


# ─── Routes ──────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "luc",
        "version": "1.0.0",
        "daily_spend": luc_meter.daily_spend,
        "daily_remaining": luc_meter.daily_remaining,
    }


@app.post("/pick")
async def api_pick(req: PickRequest):
    """Pick the optimal model for a task."""
    if req.estimated_tokens:
        model_id = pick_with_budget(
            task=req.task,
            estimated_tokens=req.estimated_tokens,
            budget_remaining=luc_meter.daily_remaining,
            quality=req.quality,
        )
    else:
        model_id = pick(task=req.task, quality=req.quality, min_context=req.min_context)

    return {"model": model_id, "explanation": explain_pick(req.task, req.quality)}


@app.post("/record/llm")
async def api_record_llm(req: RecordLLMRequest):
    """Record an LLM call."""
    event = luc_meter.record_llm_call(
        service=req.service,
        model=req.model,
        tokens_in=req.tokens_in,
        tokens_out=req.tokens_out,
        metadata=req.metadata,
    )
    return event.to_dict()


@app.post("/record/scrape")
async def api_record_scrape(req: RecordScrapeRequest):
    event = luc_meter.record_scrape(req.service, req.url, req.engine)
    return event.to_dict()


@app.post("/record/sheets")
async def api_record_sheets(req: RecordSheetsRequest):
    event = luc_meter.record_sheets_export(req.service, req.rows)
    return event.to_dict()


@app.get("/can-spend")
async def api_can_spend(estimated_cost: float = Query(...)):
    """Budget gate check."""
    return {
        "allowed": luc_meter.can_spend(estimated_cost),
        "daily_spend": luc_meter.daily_spend,
        "daily_remaining": luc_meter.daily_remaining,
        "budget": luc_meter._budget_limit_usd,
    }


@app.post("/budget")
async def api_set_budget(req: BudgetRequest):
    luc_meter.set_budget(req.daily_limit_usd)
    return {"budget_set": req.daily_limit_usd}


@app.post("/pin")
async def api_pin(req: PinRequest):
    pin_model(req.task, req.model_id)
    return {"pinned": req.task, "model": req.model_id}


@app.delete("/pin/{task}")
async def api_unpin(task: str):
    unpin_model(task)
    return {"unpinned": task}


@app.get("/metrics")
async def api_metrics():
    return luc_meter.get_metrics()


@app.get("/events")
async def api_events(limit: int = Query(default=50, le=200)):
    return luc_meter.recent_events(limit)


@app.get("/catalog")
async def api_catalog():
    return {
        model_id: {
            "provider": spec.provider,
            "cost_in_per_m": spec.cost_in_per_m,
            "cost_out_per_m": spec.cost_out_per_m,
            "max_context": spec.max_context,
            "speed_tier": spec.speed_tier,
            "quality_tier": spec.quality_tier,
            "tasks": spec.tasks,
        }
        for model_id, spec in CATALOG.items()
    }


@app.get("/tasks")
async def api_tasks():
    return {"tasks": ALL_TASKS}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
