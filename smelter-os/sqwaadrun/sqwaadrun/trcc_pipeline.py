"""
TRCC Enrichment Pipeline
============================
Background data factory that runs Sqwaadrun missions on a schedule
and lands the results in the Neon staging schema. The promotion
function then merges the freshest clean rows into perform_players.

Per|Form NEVER calls into this module. It runs entirely on the
sqwaadrun-vm (or wherever the gateway lives), with its own DB
connection and its own schedule.

Flow per mission:
    1. Sched_Hawk fires a registered job
    2. Chicken_Hawk dispatches a HARVEST or RECON mission
    3. Each result is written to sqwaadrun_staging.scrape_artifact
    4. Per-source parsers extract athlete_enrichment / nil_signal rows
    5. After the mission completes, call promote_all() in Postgres
    6. Per|Form sees fresh data on its next read

Env:
    NEON_INGEST_DSN  — Postgres connection string for the ingest user
                       (must have write access to sqwaadrun_staging)
    SQWAADRUN_DATA_DIR — local persistence path
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

from sqwaadrun.lil_scrapp_hawk import (
    FullScrappHawkSquadrun,
    Mission,
    MissionType,
    ScrapeResult,
)
from sqwaadrun.general_ang import GeneralAng, Policy

logger = logging.getLogger("TRCC_Pipeline")


# ═════════════════════════════════════════════════════════════════════════
#  POSTGRES CLIENT (psycopg, no ORM)
# ═════════════════════════════════════════════════════════════════════════

try:
    import psycopg
    from psycopg.rows import dict_row
    PSYCOPG_AVAILABLE = True
except ImportError:
    PSYCOPG_AVAILABLE = False
    psycopg = None  # type: ignore


def _get_dsn() -> str:
    dsn = os.environ.get("NEON_INGEST_DSN", "")
    if not dsn:
        raise RuntimeError("NEON_INGEST_DSN env var not set")
    return dsn


async def _run_async(fn, *args, **kwargs):
    """Run a sync DB call off the event loop."""
    return await asyncio.get_event_loop().run_in_executor(None, lambda: fn(*args, **kwargs))


def _conn():
    if not PSYCOPG_AVAILABLE:
        raise RuntimeError(
            "psycopg not installed — install with `pip install psycopg[binary]`"
        )
    return psycopg.connect(_get_dsn(), row_factory=dict_row)


# ═════════════════════════════════════════════════════════════════════════
#  PARSERS — convert raw scrape results into staging records
# ═════════════════════════════════════════════════════════════════════════

@dataclass
class ParsedAthlete:
    name: str
    school: Optional[str] = None
    position: Optional[str] = None
    class_year: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    hometown: Optional[str] = None
    star_rating: Optional[float] = None
    composite_rating: Optional[float] = None
    national_rank: Optional[int] = None
    position_rank: Optional[int] = None
    state_rank: Optional[int] = None
    bio: Optional[str] = None
    highlight_url: Optional[str] = None
    twitter_handle: Optional[str] = None
    instagram_handle: Optional[str] = None
    raw_payload: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ParsedNILSignal:
    athlete_name: str
    school: Optional[str]
    platform: str
    metric: str
    value_text: str
    value_numeric: Optional[float] = None


def _domain_from_url(url: str) -> str:
    return urlparse(url).netloc.lower().replace("www.", "")


def parse_athlete_from_result(result: ScrapeResult) -> Optional[ParsedAthlete]:
    """
    Parse an athlete record from a ScrapeResult by inspecting the
    structured_data (JSON-LD / OG / microdata) first, then falling back
    to per-source heuristics on the markdown.

    Per|Form-specific. Source mappings:
      on3.com         → JSON-LD Person + custom schema
      247sports.com   → meta tags + body parse
      rivals.com      → JSON-LD + meta
      espn.com        → JSON-LD WebPage / Article
      maxpreps.com    → meta + body
    """
    domain = _domain_from_url(result.url)
    structured = result.structured_data or {}

    athlete = ParsedAthlete(name="", raw_payload={"domain": domain})

    # ─── 1. JSON-LD Person ───
    person = _find_json_ld_type(structured, "Person") or _find_json_ld_type(structured, "Athlete")
    if person:
        athlete.name = person.get("name", "") or athlete.name
        athlete.bio = person.get("description")
        athlete.height = person.get("height")
        athlete.weight = person.get("weight")
        affiliation = person.get("affiliation") or person.get("memberOf")
        if isinstance(affiliation, dict):
            athlete.school = affiliation.get("name")
        athlete.raw_payload["json_ld_person"] = person

    # ─── 2. Open Graph fallback ───
    og = structured.get("opengraph", {}) if isinstance(structured, dict) else {}
    if og:
        if not athlete.name:
            athlete.name = og.get("title", "") or athlete.name
        if not athlete.bio:
            athlete.bio = og.get("description")
        athlete.raw_payload["og"] = og

    # ─── 3. Title fallback ───
    if not athlete.name and result.title:
        # Clean common patterns: "Name | School | Position - Site"
        cleaned = re.sub(r'\s*[\|—–-]\s*', ' | ', result.title)
        parts = [p.strip() for p in cleaned.split('|')]
        if parts:
            athlete.name = parts[0]
            if len(parts) > 1:
                athlete.school = athlete.school or parts[1]

    if not athlete.name:
        return None

    # ─── 4. Star rating heuristic ───
    text = (result.clean_text or result.markdown or "")[:8000]
    star_match = re.search(r'(\d(?:\.\d)?)\s*[★⭐]', text) or re.search(r'(\d(?:\.\d)?)\s*[- ]?star\b', text, re.I)
    if star_match:
        try:
            athlete.star_rating = float(star_match.group(1))
        except ValueError:
            pass

    # ─── 5. Composite rating ───
    comp_match = re.search(r'composite[:\s]+(\d{2,3}(?:\.\d{1,2})?)', text, re.I)
    if comp_match:
        try:
            athlete.composite_rating = float(comp_match.group(1))
        except ValueError:
            pass

    # ─── 6. Height / weight ───
    if not athlete.height:
        h_match = re.search(r"\b(\d['\u2019]\d{1,2}\")", text)
        if h_match:
            athlete.height = h_match.group(1)
    if not athlete.weight:
        w_match = re.search(r"\b(\d{2,3})\s*lbs\b", text, re.I)
        if w_match:
            athlete.weight = f"{w_match.group(1)} lbs"

    # ─── 7. Position ───
    pos_match = re.search(r"\bPosition[:\s]+([A-Z]{1,4})\b", text)
    if pos_match:
        athlete.position = pos_match.group(1)

    # ─── 8. Social handles ───
    twitter_match = re.search(r"twitter\.com/([A-Za-z0-9_]{1,15})", result.markdown or "", re.I)
    if twitter_match:
        athlete.twitter_handle = twitter_match.group(1)
    insta_match = re.search(r"instagram\.com/([A-Za-z0-9_.]{1,30})", result.markdown or "", re.I)
    if insta_match:
        athlete.instagram_handle = insta_match.group(1)

    return athlete


def _find_json_ld_type(structured: Any, type_name: str) -> Optional[Dict[str, Any]]:
    """Recursively search structured_data for an object whose @type matches."""
    if isinstance(structured, dict):
        t = structured.get("@type")
        if t == type_name or (isinstance(t, list) and type_name in t):
            return structured
        for v in structured.values():
            found = _find_json_ld_type(v, type_name)
            if found:
                return found
    elif isinstance(structured, list):
        for item in structured:
            found = _find_json_ld_type(item, type_name)
            if found:
                return found
    return None


def parse_nil_signals(result: ScrapeResult, athlete_name: str, school: Optional[str]) -> List[ParsedNILSignal]:
    """Heuristic NIL signal extraction from a scraped page."""
    signals: List[ParsedNILSignal] = []
    text = result.clean_text or result.markdown or ""
    domain = _domain_from_url(result.url)

    # Followers
    for platform, pattern in [
        ("twitter", r"(\d[\d,\.]*[KMB]?)\s+(?:Twitter|X)\s+followers"),
        ("instagram", r"(\d[\d,\.]*[KMB]?)\s+Instagram\s+followers"),
        ("tiktok", r"(\d[\d,\.]*[KMB]?)\s+TikTok\s+followers"),
    ]:
        m = re.search(pattern, text, re.I)
        if m:
            value_text = m.group(1)
            signals.append(ParsedNILSignal(
                athlete_name=athlete_name,
                school=school,
                platform=platform,
                metric="followers",
                value_text=value_text,
                value_numeric=_normalize_count(value_text),
            ))

    # NIL valuation
    val_match = re.search(r"NIL\s+(?:valuation|value)[:\s]+\$?\s*([\d,\.]+)([KMB]?)", text, re.I)
    if val_match:
        value_text = f"${val_match.group(1)}{val_match.group(2)}"
        signals.append(ParsedNILSignal(
            athlete_name=athlete_name,
            school=school,
            platform=domain,
            metric="valuation",
            value_text=value_text,
            value_numeric=_normalize_count(val_match.group(1) + val_match.group(2)),
        ))

    return signals


def _normalize_count(text: str) -> Optional[float]:
    """'1.2M' → 1_200_000.0  /  '450K' → 450_000.0  /  '6,789' → 6789.0"""
    text = text.strip().replace(",", "")
    multiplier = 1.0
    if text.endswith("K"):
        multiplier = 1_000
        text = text[:-1]
    elif text.endswith("M"):
        multiplier = 1_000_000
        text = text[:-1]
    elif text.endswith("B"):
        multiplier = 1_000_000_000
        text = text[:-1]
    try:
        return float(text) * multiplier
    except ValueError:
        return None


# ═════════════════════════════════════════════════════════════════════════
#  STAGING WRITES
# ═════════════════════════════════════════════════════════════════════════

def write_mission_log(mission: Mission, signed_off_by: Optional[str] = "auto") -> None:
    if not PSYCOPG_AVAILABLE:
        logger.warning("psycopg unavailable; skipping mission_log write")
        return
    primary_domain = (
        urlparse(mission.targets[0]).netloc if mission.targets else None
    )
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO sqwaadrun_staging.mission_log (
                mission_id, mission_type, intent, target_count, status,
                signed_off_by, primary_domain, results_count,
                elapsed_seconds, throughput_pps, error, kpi_snapshot,
                created_at, completed_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (mission_id) DO UPDATE SET
                status = EXCLUDED.status,
                results_count = EXCLUDED.results_count,
                elapsed_seconds = EXCLUDED.elapsed_seconds,
                throughput_pps = EXCLUDED.throughput_pps,
                error = EXCLUDED.error,
                kpi_snapshot = EXCLUDED.kpi_snapshot,
                completed_at = EXCLUDED.completed_at
            """,
            (
                mission.mission_id,
                mission.mission_type.value,
                mission.config.get("intent"),
                len(mission.targets),
                mission.status,
                signed_off_by,
                primary_domain,
                len(mission.results),
                mission.kpis.get("elapsed_seconds"),
                mission.kpis.get("throughput_pages_per_sec"),
                mission.error,
                json.dumps(mission.kpis),
                datetime.now(timezone.utc),
                datetime.now(timezone.utc) if mission.status in ("completed", "failed") else None,
            ),
        )
        conn.commit()


def write_artifact(mission_id: str, result: ScrapeResult) -> Optional[int]:
    if not PSYCOPG_AVAILABLE:
        return None
    import hashlib
    url_hash = hashlib.sha256(result.url.encode()).hexdigest()[:32]
    content_hash = hashlib.sha256((result.clean_text or "").encode()).hexdigest()[:32]
    domain = _domain_from_url(result.url)
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO sqwaadrun_staging.scrape_artifact (
                mission_id, url, url_hash, content_hash, source_domain,
                status_code, title, meta_description, markdown, clean_text,
                links, images, structured_data, scraped_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING id
            """,
            (
                mission_id,
                result.url,
                url_hash,
                content_hash,
                domain,
                result.status_code,
                result.title,
                result.meta_description,
                result.markdown,
                result.clean_text,
                json.dumps(result.links or []),
                json.dumps(result.images or []),
                json.dumps(result.structured_data or {}),
            ),
        )
        artifact_id = cur.fetchone()["id"]
        conn.commit()
        return artifact_id


def write_athlete_enrichment(artifact_id: int, athlete: ParsedAthlete) -> None:
    if not PSYCOPG_AVAILABLE:
        return
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO sqwaadrun_staging.athlete_enrichment (
                artifact_id, source_domain, name, school, position, class_year,
                height, weight, hometown, star_rating, composite_rating,
                national_rank, position_rank, state_rank, bio, highlight_url,
                twitter_handle, instagram_handle, raw_payload
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                artifact_id,
                athlete.raw_payload.get("domain", "unknown"),
                athlete.name,
                athlete.school,
                athlete.position,
                athlete.class_year,
                athlete.height,
                athlete.weight,
                athlete.hometown,
                athlete.star_rating,
                athlete.composite_rating,
                athlete.national_rank,
                athlete.position_rank,
                athlete.state_rank,
                athlete.bio,
                athlete.highlight_url,
                athlete.twitter_handle,
                athlete.instagram_handle,
                json.dumps(athlete.raw_payload),
            ),
        )
        conn.commit()


def write_nil_signal(artifact_id: int, signal: ParsedNILSignal) -> None:
    if not PSYCOPG_AVAILABLE:
        return
    domain = (urlparse("https://" + signal.platform).netloc if "." in signal.platform else signal.platform)
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO sqwaadrun_staging.nil_signal (
                artifact_id, athlete_name, school, source_domain,
                platform, metric, value_text, value_numeric
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                artifact_id,
                signal.athlete_name,
                signal.school,
                domain,
                signal.platform,
                signal.metric,
                signal.value_text,
                signal.value_numeric,
            ),
        )
        conn.commit()


def run_promotion() -> Tuple[int, int]:
    """Call sqwaadrun_staging.promote_all() and return (athletes, nil)."""
    if not PSYCOPG_AVAILABLE:
        return (0, 0)
    with _conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM sqwaadrun_staging.promote_all()")
        row = cur.fetchone()
        conn.commit()
        return (row["athlete_count"], row["nil_count"])


# ═════════════════════════════════════════════════════════════════════════
#  PIPELINE ORCHESTRATION
# ═════════════════════════════════════════════════════════════════════════

@dataclass
class TRCCJob:
    """A registered scheduled enrichment job."""
    job_id: str
    sources: List[str]                # URLs to scrape
    target_athlete: Optional[str] = None
    target_school: Optional[str] = None
    interval_seconds: int = 21600     # default 6h
    description: str = ""


class TRCCPipeline:
    """
    The background data factory. Wraps a Sqwaadrun + General_Ang stack
    and runs registered enrichment jobs on a schedule. After each
    mission, parses → writes to staging → calls promote_all().
    """

    def __init__(self, squad: FullScrappHawkSquadrun, general: GeneralAng):
        self.squad = squad
        self.general = general
        self.logger = logger
        self.jobs: Dict[str, TRCCJob] = {}

    def register(self, job: TRCCJob) -> None:
        self.jobs[job.job_id] = job
        self.logger.info(f"Registered TRCC job: {job.job_id} ({len(job.sources)} sources)")

    async def run_job(self, job_id: str) -> Dict[str, Any]:
        """Run one job end-to-end and return a summary."""
        job = self.jobs.get(job_id)
        if not job:
            return {"error": f"Unknown job_id: {job_id}"}

        self.logger.info(f"Running TRCC job {job_id}")

        # Dispatch as a HARVEST mission
        mission = await self.general.accept_intent(
            intent=f"harvest enrichment for {job.target_athlete or job_id}",
            targets=job.sources,
            requested_by="trcc_pipeline",
        )

        # If General_Ang held it for sign-off, auto-approve as the
        # background pipeline (the schedule itself is the standing
        # authorization).
        if mission.status == "pending_signoff":
            mission = await self.general.approve(
                mission.mission_id, approver="trcc_pipeline_auto"
            )

        # Persist mission audit
        try:
            await _run_async(write_mission_log, mission)
        except Exception as e:
            self.logger.warning(f"mission_log write failed: {e}")

        artifacts_written = 0
        athletes_written = 0
        signals_written = 0

        # Walk results — each one becomes an artifact + parsed records
        for r_dict in mission.results:
            try:
                # Reconstruct a ScrapeResult-shaped object from dict
                result = _result_from_dict(r_dict)
                if not result:
                    continue

                artifact_id = await _run_async(write_artifact, mission.mission_id, result)
                if artifact_id is None:
                    continue
                artifacts_written += 1

                athlete = parse_athlete_from_result(result)
                if athlete:
                    await _run_async(write_athlete_enrichment, artifact_id, athlete)
                    athletes_written += 1

                    signals = parse_nil_signals(result, athlete.name, athlete.school)
                    for s in signals:
                        await _run_async(write_nil_signal, artifact_id, s)
                        signals_written += 1
            except Exception as e:
                self.logger.warning(f"Result processing failed for {r_dict.get('url')}: {e}")

        # Promotion
        athletes_promoted = 0
        nil_promoted = 0
        try:
            athletes_promoted, nil_promoted = await _run_async(run_promotion)
        except Exception as e:
            self.logger.warning(f"promote_all failed: {e}")

        summary = {
            "job_id": job_id,
            "mission_id": mission.mission_id,
            "mission_status": mission.status,
            "artifacts_written": artifacts_written,
            "athletes_written": athletes_written,
            "nil_signals_written": signals_written,
            "athletes_promoted": athletes_promoted,
            "nil_promoted": nil_promoted,
        }
        self.logger.info(f"TRCC job {job_id} complete: {summary}")
        return summary

    async def run_all(self) -> List[Dict[str, Any]]:
        """Run every registered job once."""
        results = []
        for job_id in self.jobs:
            results.append(await self.run_job(job_id))
        return results

    async def register_with_sched_hawk(self) -> None:
        """
        Hand each registered job to Lil_Sched_Hawk so the daemon's
        background loop runs them on the configured interval. Caller
        must keep the squad alive (e.g. inside the gateway daemon).
        """
        from sqwaadrun.lil_scrapp_hawk import ScheduledJob

        for job in self.jobs.values():
            scheduled = ScheduledJob(
                job_id=f"trcc::{job.job_id}",
                url=job.sources[0],
                interval_seconds=job.interval_seconds,
                job_type="scrape",
                payload={
                    "trcc": True,
                    "all_sources": job.sources,
                    "target_athlete": job.target_athlete,
                    "description": job.description,
                },
            )
            await self.squad.sched_hawk.execute(job=scheduled)


def _result_from_dict(d: Dict[str, Any]) -> Optional[ScrapeResult]:
    """Reconstruct a ScrapeResult from the dict form Chicken_Hawk returns."""
    if not d.get("url"):
        return None
    return ScrapeResult(
        url=d.get("url"),
        status_code=d.get("status_code", 0),
        title=d.get("title"),
        meta_description=d.get("meta_description"),
        markdown=d.get("markdown"),
        clean_text=d.get("clean_text"),
        raw_html=d.get("raw_html"),
        links=d.get("links", []),
        images=d.get("images", []),
        structured_data=d.get("structured_data", {}),
        scraped_at=d.get("scraped_at", datetime.now(timezone.utc).isoformat()),
        elapsed_ms=d.get("elapsed_ms", 0),
        error=d.get("error"),
    )


# ═════════════════════════════════════════════════════════════════════════
#  CLI ENTRY — for ad-hoc + cron-style runs
# ═════════════════════════════════════════════════════════════════════════

async def _cli_main():
    import argparse
    parser = argparse.ArgumentParser(description="TRCC enrichment pipeline runner")
    parser.add_argument("command", choices=["run-once", "run-all", "promote-only", "register-defaults"])
    parser.add_argument("--job-id")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)

    squad = FullScrappHawkSquadrun()
    await squad.startup()
    general = GeneralAng(
        squad,
        policy=Policy(sign_off_threshold=10_000, daily_quota_per_domain=5_000),
    )
    pipeline = TRCCPipeline(squad, general)

    # Default starter jobs — replace with real source list later
    pipeline.register(TRCCJob(
        job_id="example_athlete_enrichment",
        sources=["https://example.com/"],
        description="Smoke-test enrichment job",
        interval_seconds=21600,
    ))

    try:
        if args.command == "run-once":
            if not args.job_id:
                print("--job-id required for run-once")
                return
            print(json.dumps(await pipeline.run_job(args.job_id), indent=2))
        elif args.command == "run-all":
            results = await pipeline.run_all()
            print(json.dumps(results, indent=2))
        elif args.command == "promote-only":
            athletes, nil = await _run_async(run_promotion)
            print(f"Promoted {athletes} athlete rows, {nil} NIL signals")
        elif args.command == "register-defaults":
            await pipeline.register_with_sched_hawk()
            print(f"Registered {len(pipeline.jobs)} jobs with Lil_Sched_Hawk")
    finally:
        await squad.shutdown()


if __name__ == "__main__":
    asyncio.run(_cli_main())
