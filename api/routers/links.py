"""MindEdge Link Manager API — Edu_Ang tool.

Manages affiliate Buy Now links with automatic UTM tagging.
Firestore collection: enrollments/{tenant_id}/{id}
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from google.cloud.firestore_v1 import FieldFilter
from pydantic import BaseModel, HttpUrl

from config import DEFAULT_TENANT
from firestore_client import get_db

router = APIRouter(prefix="/links", tags=["MindEdge Links"])

UTM_TEMPLATE = (
    "utm_source=foai&utm_medium=agent&utm_campaign={category}"
)


# ── Models ──────────────────────────────────────────────────────────

class LinkCreate(BaseModel):
    category: str
    base_url: HttpUrl
    sku: Optional[str] = None
    course_name: Optional[str] = None
    tenant_id: str = DEFAULT_TENANT


class LinkResponse(BaseModel):
    category: str
    base_url: str
    tagged_url: str
    sku: Optional[str] = None
    course_name: Optional[str] = None


class CampaignStats(BaseModel):
    campaign_id: str
    clicks: int
    conversions: int
    revenue: float


# ── Helpers ─────────────────────────────────────────────────────────

def _append_utm(url: str, category: str) -> str:
    separator = "&" if "?" in url else "?"
    return f"{url}{separator}{UTM_TEMPLATE.format(category=category)}"


# ── Routes ──────────────────────────────────────────────────────────

@router.get("/{category}", response_model=list[LinkResponse])
async def get_links(
    category: str,
    tenant_id: str = Query(default=DEFAULT_TENANT),
):
    """Return active MindEdge Buy Now links for a category with UTM params."""
    db = get_db()
    docs = (
        db.collection("links")
        .document(tenant_id)
        .collection("items")
        .where(filter=FieldFilter("category", "==", category))
        .where(filter=FieldFilter("active", "==", True))
        .stream()
    )

    results = []
    for doc in docs:
        data = doc.to_dict()
        results.append(
            LinkResponse(
                category=data["category"],
                base_url=data["base_url"],
                tagged_url=_append_utm(data["base_url"], category),
                sku=data.get("sku"),
                course_name=data.get("course_name"),
            )
        )

    if not results:
        raise HTTPException(status_code=404, detail=f"No active links for category: {category}")
    return results


@router.post("/create", response_model=LinkResponse, status_code=201)
async def create_link(link: LinkCreate):
    """Add a new MindEdge affiliate link."""
    db = get_db()
    base_url_str = str(link.base_url)
    tagged = _append_utm(base_url_str, link.category)

    doc_data = {
        "category": link.category,
        "base_url": base_url_str,
        "tagged_url": tagged,
        "sku": link.sku,
        "course_name": link.course_name,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    db.collection("links").document(link.tenant_id).collection(
        "items"
    ).add(doc_data)

    return LinkResponse(
        category=link.category,
        base_url=base_url_str,
        tagged_url=tagged,
        sku=link.sku,
        course_name=link.course_name,
    )


@router.get("/campaign/{campaign_id}/stats", response_model=CampaignStats)
async def campaign_stats(
    campaign_id: str,
    tenant_id: str = Query(default=DEFAULT_TENANT),
):
    """Return click and conversion stats for a campaign."""
    db = get_db()
    doc = (
        db.collection("campaigns")
        .document(tenant_id)
        .collection("items")
        .document(campaign_id)
        .get()
    )

    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"Campaign not found: {campaign_id}")

    data = doc.to_dict()
    return CampaignStats(
        campaign_id=campaign_id,
        clicks=data.get("clicks", 0),
        conversions=data.get("conversions", 0),
        revenue=data.get("revenue", 0.0),
    )
