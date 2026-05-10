"""/autoresearch router — FastAPI endpoints surfacing the currency report.

Mounts alongside Hermes' existing compare/evaluate/history/... routers.
Consumers: Hermes dashboard, alerting pipelines, HR PMO surface, any
service that wants to check "am I running the current flagship?" at runtime.

Endpoints:
  GET /autoresearch/registry              → registry contents
  GET /autoresearch/report                → full scan (expensive — ~30s)
  GET /autoresearch/report/{family}       → scan + filter to one family
  GET /autoresearch/status                → quick health (no scrape)
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from autoresearch.engine import scan_all
from autoresearch.registry import REGISTRY, by_family

router = APIRouter(prefix="/autoresearch", tags=["autoresearch"])


@router.get("/status")
def status() -> dict:
    """Liveness + registry size. Does not run the scrape."""
    return {
        "status": "ok",
        "tracked_families": len(REGISTRY),
        "families": [m.family for m in REGISTRY],
    }


@router.get("/registry")
def registry_dump() -> dict:
    return {
        "registry": [
            {
                "family": m.family,
                "pinned_id": m.pinned_id,
                "role": m.role,
                "consumers": list(m.consumers),
                "source": m.source,
                "upgrade_blocker": m.upgrade_blocker,
                "notes": m.notes,
                "added": m.added,
                "updated": m.updated,
            }
            for m in REGISTRY
        ]
    }


@router.get("/report")
async def report_full() -> dict:
    r = await scan_all()
    return r.to_dict()


@router.get("/report/{family}")
async def report_family(family: str) -> dict:
    model = by_family(family)
    if model is None:
        raise HTTPException(status_code=404, detail=f"unknown family: {family}")
    r = await scan_all()
    match = next((e for e in r.entries if e.family == family), None)
    if match is None:
        raise HTTPException(
            status_code=500,
            detail=f"family '{family}' registered but no scan entry produced",
        )
    from dataclasses import asdict

    return {"scanned_at": r.scanned_at, "entry": asdict(match)}
