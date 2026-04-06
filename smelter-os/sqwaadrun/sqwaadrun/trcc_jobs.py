"""
TRCC Default Job Registry
=============================
Concrete TRCCJob definitions for the Per|Form data factory. These are
the jobs the gateway daemon registers with Lil_Sched_Hawk on startup.

Each job points at a real public source and runs on a cadence. Edit
this file to add new sources; the gateway picks them up on next
restart.

Cadences are conservative — recruiting sites change a few times a day,
NIL valuations refresh daily, sitemaps weekly. Bump intervals only
after the source proves it can take the traffic without 429s.
"""

from typing import List
from sqwaadrun.trcc_pipeline import TRCCJob


# ─── Promotion job (special — no scrape, just runs promote_all) ───
PROMOTION_JOB_ID = "trcc::promotion"
PROMOTION_INTERVAL_SECONDS = 1800  # every 30 minutes


# ─── Real enrichment jobs ───
DEFAULT_TRCC_JOBS: List[TRCCJob] = [
    # ─── 2026 NFL Draft top prospects — Wikipedia (most stable, has JSON-LD) ───
    TRCCJob(
        job_id="2026_top_prospects_wiki",
        sources=[
            "https://en.wikipedia.org/wiki/Carson_Beck",
            "https://en.wikipedia.org/wiki/Jeremiyah_Love",
            "https://en.wikipedia.org/wiki/Caleb_Downs",
            "https://en.wikipedia.org/wiki/Drew_Allar",
        ],
        target_athlete=None,  # batch — multiple targets
        target_school=None,
        interval_seconds=86400,  # daily
        description="Wikipedia enrichment for 2026 top prospects (stable JSON-LD)",
    ),

    # ─── 247Sports composite snapshots ───
    TRCCJob(
        job_id="247sports_2026_composite",
        sources=[
            "https://247sports.com/college/football/season/2026-football/compositeteamrankings/",
        ],
        interval_seconds=43200,  # every 12 hours
        description="247Sports 2026 composite team rankings",
    ),

    # ─── On3 NIL valuations index ───
    TRCCJob(
        job_id="on3_nil_top100",
        sources=[
            "https://www.on3.com/nil/rankings/player/nil-100/",
        ],
        interval_seconds=86400,  # daily — NIL doesn't move much intra-day
        description="On3 NIL Top 100 valuations",
    ),

    # ─── Sitemap surveillance — pick up newly published prospect pages ───
    TRCCJob(
        job_id="247sports_sitemap_survey",
        sources=[
            "https://247sports.com/sitemap.xml",
        ],
        interval_seconds=604800,  # weekly
        description="247Sports sitemap survey — discover new prospect URLs",
    ),
]


def all_jobs() -> List[TRCCJob]:
    """Return the full default job registry."""
    return list(DEFAULT_TRCC_JOBS)


def by_id(job_id: str) -> TRCCJob | None:
    for j in DEFAULT_TRCC_JOBS:
        if j.job_id == job_id:
            return j
    return None
