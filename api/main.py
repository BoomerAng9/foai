"""FOAI-AIMS Money Engine API — FastAPI on Cloud Run.

All routes pass through GuardAng (NemoClaw) middleware for tenant enforcement.
"""

from fastapi import FastAPI

from config import PORT
from guardang import GuardAngMiddleware
from routers import agents, links, scraper

app = FastAPI(
    title="FOAI-AIMS Money Engine",
    description="Revenue backend for CTI Nerve Center — MindEdge links, Open Seat scraping, agent status.",
    version="0.1.0",
)

# GuardAng middleware — every request validated against NemoClaw
app.add_middleware(GuardAngMiddleware)

# Register route modules
app.include_router(links.router)
app.include_router(scraper.router)
app.include_router(agents.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "money-engine", "version": "0.1.0"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT)
