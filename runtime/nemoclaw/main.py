"""NemoClaw GuardAng V0.1 — risk-review and policy-enforcement layer for FOAI.

Composite role: Chicken Hawk = NemoClaw + autoresearch + Hermes.
This service exposes /check (action validation), /risk-event (record), /risk-events (list).
Mirrors the Hermes service shape: FastAPI + bearer-token middleware + routers.
"""
from fastapi import FastAPI

from auth_middleware import ApiKeyMiddleware
from config import PORT, VERSION
from routers import check, risk_events

app = FastAPI(
    title="NemoClaw GuardAng",
    description=(
        "Risk review and policy enforcement layer for FOAI runtime. "
        "Verdicts: allow | deny | escalate. Pure-policy v0; future versions "
        "consult Hermes to verify approval_id validity."
    ),
    version=VERSION,
)
app.add_middleware(ApiKeyMiddleware)
app.include_router(check.router)
app.include_router(risk_events.router)


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "service": "nemoclaw-guardang",
        "engine": "GuardAng",
        "version": VERSION,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT)
