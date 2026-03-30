"""Hermes LearnAng V0.5 — Deep Think evaluation engine for FOAI-AIMS.

Multi-model consensus scoring, daily + weekly evaluations,
trend tracking, CFO_Ang cost integration, structured logging.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from config import PORT, VERSION
from logging_config import setup_logging
from routers import compare, evaluate, history, hr_pmo, memory_routes, trends
from scheduler import start_scheduler, stop_scheduler

setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="Hermes LearnAng",
    description=(
        "Deep Think evaluation engine V0.5 — multi-model consensus scoring, "
        "RAG-based memory, trend tracking, and daily + weekly agent performance "
        "analysis for FOAI-AIMS."
    ),
    version=VERSION,
    lifespan=lifespan,
)

app.include_router(evaluate.router)
app.include_router(history.router)
app.include_router(trends.router)
app.include_router(compare.router)
app.include_router(memory_routes.router)
app.include_router(hr_pmo.router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "hermes-agent",
        "engine": "LearnAng",
        "version": VERSION,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT)
