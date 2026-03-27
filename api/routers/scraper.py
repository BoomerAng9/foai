"""Open Seat Scraper API — Scout_Ang tool.

Triggers Firecrawl scans against target institutions and stores results
in Firestore: openSeats/{tenant_id}/{id}
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from config import DEFAULT_TENANT, get_secret
from firestore_client import get_db

router = APIRouter(prefix="/scrape", tags=["Open Seat Scraper"])

TARGET_INSTITUTIONS = [
    "Savannah State University",
    "SCAD",
    "Armstrong State University",
    "Georgia Southern University",
    "Savannah Technical College",
]


# ── Models ──────────────────────────────────────────────────────────

class ScrapeRequest(BaseModel):
    institution: Optional[str] = None  # None = scrape all targets
    tenant_id: str = DEFAULT_TENANT


class SeatRecord(BaseModel):
    institution: str
    course_name: str
    seats_remaining: int
    price: float
    start_date: str
    contact_email: str
    scraped_at: str


class ScrapeResponse(BaseModel):
    status: str
    institutions_queued: list[str]
    tenant_id: str


# ── Routes ──────────────────────────────────────────────────────────

@router.post("/trigger", response_model=ScrapeResponse, status_code=202)
async def trigger_scrape(req: ScrapeRequest):
    """Launch Firecrawl scan for open seat data.

    Targets configured Savannah-area institutions. Results are stored in
    Firestore under openSeats/{tenant_id}/{id}.
    """
    if req.institution:
        targets = [req.institution]
    else:
        targets = TARGET_INSTITUTIONS

    # Fetch Firecrawl API key from Secret Manager at runtime
    firecrawl_key = get_secret("firecrawl-api-key")

    db = get_db()
    batch = db.batch()
    now = datetime.now(timezone.utc).isoformat()

    for institution in targets:
        # Queue a scrape job record in Firestore
        job_ref = (
            db.collection("scrapeJobs")
            .document(req.tenant_id)
            .collection("jobs")
            .document()
        )
        batch.set(job_ref, {
            "institution": institution,
            "status": "queued",
            "queued_at": now,
            "firecrawl_key_ref": "firecrawl-api-key",
        })

    batch.commit()

    return ScrapeResponse(
        status="queued",
        institutions_queued=targets,
        tenant_id=req.tenant_id,
    )


def store_seat_record(tenant_id: str, record: SeatRecord) -> str:
    """Store a scraped open seat record in Firestore.

    Called by the Firecrawl callback or background worker.
    Collection: openSeats/{tenant_id}/{id}
    """
    db = get_db()
    doc_ref = (
        db.collection("openSeats")
        .document(tenant_id)
        .collection("items")
        .document()
    )
    doc_ref.set({
        "institution": record.institution,
        "course_name": record.course_name,
        "seats_remaining": record.seats_remaining,
        "price": record.price,
        "start_date": record.start_date,
        "contact_email": record.contact_email,
        "scraped_at": record.scraped_at,
    })
    return doc_ref.id
