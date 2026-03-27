"""Hermes LearnAng — Deep Think evaluation engine for FOAI-AIMS.

Weekly Gemini-powered agent performance analysis.
Stores results in Firestore, posts directives to Money Engine.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from config import PORT
from routers import evaluate, history
from scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="Hermes LearnAng",
    description="Deep Think evaluation engine — weekly Gemini-powered agent performance analysis for FOAI-AIMS.",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(evaluate.router)
app.include_router(history.router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "hermes-agent",
        "engine": "LearnAng",
        "version": "0.1.0",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT)
