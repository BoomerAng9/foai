"""
Sqwaadrun HTTP Gateway
=========================
Minimal aiohttp.web service exposing the full ACHEEVY → General_Ang →
Chicken_Hawk → Sqwaadrun stack over HTTP. Per|Form, Deploy Platform,
CTI Hub, and any other FOAI service can call this.

Endpoints:
    GET  /health              — liveness check
    GET  /roster              — full Hawk roster + stats
    POST /scrape              — natural language intent + targets
                                body: {intent, targets[], config{}}
    POST /mission             — typed mission dispatch
                                body: {type, targets[], config{}}
    GET  /status              — pending, quota, doctrine journal
    POST /approve/{mission_id}
    POST /deny/{mission_id}   — body: {reason}

Auth: Bearer token via SQWAADRUN_API_KEY env var.
      If unset, service runs unauthenticated (dev mode only).

Launch:
    python -m sqwaadrun.service --host 0.0.0.0 --port 7700
"""

from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from aiohttp import web

from sqwaadrun.lil_scrapp_hawk import FullScrappHawkSquadrun, Mission, MissionType
from sqwaadrun.general_ang import GeneralAng, AcheevyBridge, Policy
from sqwaadrun.storage import SmelterStorage, get_storage
from sqwaadrun.security import (
    validate_targets,
    sanitize_intent,
    sanitize_config,
    sanitize_output,
    SSRFError,
    mission_limiter,
    scrape_limiter,
    health_limiter,
    audit_log,
    check_dependencies,
)

logger = logging.getLogger("Sqwaadrun.Service")


# ═════════════════════════════════════════════════════════════════════════
#  AUTH MIDDLEWARE
# ═════════════════════════════════════════════════════════════════════════

@web.middleware
async def auth_middleware(request: web.Request, handler):
    # Health check is always open
    if request.path in ("/health", "/"):
        return await handler(request)

    expected = os.environ.get("SQWAADRUN_API_KEY", "")
    if not expected:
        logger.warning("SQWAADRUN_API_KEY not set — rejecting request. Set it to enable the gateway.")
        return web.json_response({"error": "gateway not configured"}, status=503)

    got = request.headers.get("Authorization", "").replace("Bearer ", "")
    if got != expected:
        return web.json_response({"error": "unauthorized"}, status=401)

    return await handler(request)


# ═════════════════════════════════════════════════════════════════════════
#  HANDLERS
# ═════════════════════════════════════════════════════════════════════════

def _hawk_status(hawk) -> str:
    """Derive the public status string from BaseLilHawk internals."""
    if not getattr(hawk, "_active", False):
        return "standby"
    # Lil_Snap_Hawk reports STANDBY when Playwright is unavailable
    if hasattr(hawk, "is_available") and not hawk.is_available:
        return "standby"
    return "active"


async def health(request: web.Request) -> web.Response:
    squad: FullScrappHawkSquadrun = request.app["squad"]
    online = sum(1 for h in squad._hawks if _hawk_status(h) == "active")
    return web.json_response({
        "status": "ok",
        "service": "sqwaadrun-gateway",
        "version": "2.0.0",
        "hawks_online": online,
        "hawks_total": len(squad._hawks),
    })


async def roster(request: web.Request) -> web.Response:
    squad: FullScrappHawkSquadrun = request.app["squad"]
    return web.json_response({
        "total_hawks": len(squad._hawks),
        "hawks": [
            {
                "name": h.hawk_name,
                "color": h.hawk_color,
                "status": _hawk_status(h),
                "tasks_completed": h.stats.get("tasks_completed", 0),
                "tasks_failed": h.stats.get("tasks_failed", 0),
            }
            for h in squad._hawks
        ],
        "chicken_hawk": "online",
    })


async def scrape_intent(request: web.Request) -> web.Response:
    bridge: AcheevyBridge = request.app["bridge"]
    squad: FullScrappHawkSquadrun = request.app["squad"]
    storage: SmelterStorage = request.app["storage"]

    # ── Rate limiting ──
    client_ip = request.remote or "unknown"
    allowed, remaining = scrape_limiter.check(client_ip)
    if not allowed:
        audit_log("rate_limited", client_ip, details={"endpoint": "/scrape"})
        return web.json_response(
            {"error": "rate limit exceeded. Try again in 60 seconds."},
            status=429,
            headers={"Retry-After": "60"},
        )

    try:
        body = await request.json()
    except Exception:
        return web.json_response({"error": "invalid JSON body"}, status=400)

    intent = sanitize_intent(body.get("intent", ""))
    raw_targets = body.get("targets", [])
    config = sanitize_config(body.get("config", {}))

    if not raw_targets or not isinstance(raw_targets, list):
        return web.json_response({"error": "targets required (list of URLs)"}, status=400)
    if len(raw_targets) > 100:
        return web.json_response({"error": "too many targets per request (max 100)"}, status=400)
    if not intent:
        return web.json_response({"error": "intent required"}, status=400)

    # ── SSRF validation — block internal/metadata URLs ──
    try:
        targets = validate_targets(raw_targets)
    except SSRFError as e:
        audit_log("ssrf_blocked", client_ip, targets=raw_targets[:5], details={"reason": str(e)})
        return web.json_response({"error": f"target validation failed: {e}"}, status=400)

    audit_log("scrape_start", client_ip, targets=targets[:5], details={"intent": intent[:100]})

    try:
        result = await bridge.scrape_intent(intent, targets, **config)

        # ── Write-through to Puter + GCS if the mission actually ran ──
        mission_id = result.get("mission_id")
        if mission_id and result.get("status") in ("completed", "failed"):
            mission_obj = _find_mission(squad, mission_id)
            await _persist_mission(storage, mission_id, mission_obj, result)

        return web.json_response(result)
    except Exception as e:
        logger.exception("scrape_intent failed")
        return web.json_response({"error": "internal error"}, status=500)


def _find_mission(squad: FullScrappHawkSquadrun, mission_id: str) -> Optional[Mission]:
    """Look up a full Mission object from Chicken Hawk's in-memory log."""
    try:
        for m in squad.chicken_hawk._mission_log:  # type: ignore[attr-defined]
            if m.mission_id == mission_id:
                return m
    except Exception:
        pass
    return None


async def _persist_mission(
    storage: SmelterStorage,
    mission_id: str,
    mission_obj: Optional[Mission],
    api_result: Dict[str, Any],
) -> None:
    """
    Fire-and-log the mission persistence. Never raises — storage
    failures are logged but don't break the API response.
    """
    try:
        # Manifest (intent + targets + config)
        manifest: Dict[str, Any] = {
            "mission_id": mission_id,
            "intent": api_result.get("type") or (mission_obj.mission_type.value if mission_obj else None),
            "targets": mission_obj.targets if mission_obj else [],
            "config": mission_obj.config if mission_obj else {},
            "created_at": mission_obj.created_at if mission_obj else None,
        }
        await storage.store_mission_manifest(mission_id, manifest)

        # Full result payload — includes all scraped artifacts
        payload: Dict[str, Any] = {
            "mission_id": mission_id,
            "status": api_result.get("status"),
            "target_count": api_result.get("target_count"),
            "results_count": api_result.get("results_count"),
            "kpis": api_result.get("kpis", {}),
            "results": mission_obj.results if mission_obj else [],
            "error": api_result.get("error"),
        }
        storage_result = await storage.store_mission_result(mission_id, payload)
        logger.info(
            f"Mission {mission_id} persistence: "
            f"puter={storage_result['puter']} gcs={storage_result['gcs']}"
        )
    except Exception as e:
        logger.warning(f"Mission {mission_id} persistence failed: {e}")


async def mission(request: web.Request) -> web.Response:
    """Typed mission dispatch — bypasses NL intent routing."""
    squad: FullScrappHawkSquadrun = request.app["squad"]
    storage: SmelterStorage = request.app["storage"]

    # ── Rate limiting ──
    client_ip = request.remote or "unknown"
    allowed, remaining = mission_limiter.check(client_ip)
    if not allowed:
        audit_log("rate_limited", client_ip, details={"endpoint": "/mission"})
        return web.json_response(
            {"error": "rate limit exceeded. Try again in 60 seconds."},
            status=429,
            headers={"Retry-After": "60"},
        )

    try:
        body = await request.json()
    except Exception:
        return web.json_response({"error": "invalid JSON body"}, status=400)

    mtype_str = body.get("type", "").lower()
    raw_targets = body.get("targets", [])
    config = sanitize_config(body.get("config", {}))

    valid_types = {m.value for m in MissionType}
    if mtype_str not in valid_types:
        return web.json_response(
            {"error": f"invalid mission type. valid: {sorted(valid_types)}"},
            status=400,
        )
    if not raw_targets:
        return web.json_response({"error": "targets required"}, status=400)

    # ── SSRF validation ──
    try:
        targets = validate_targets(raw_targets)
    except SSRFError as e:
        audit_log("ssrf_blocked", client_ip, targets=raw_targets[:5],
                  details={"reason": str(e), "mission_type": mtype_str})
        return web.json_response({"error": f"target validation failed: {e}"}, status=400)

    audit_log("mission_start", client_ip, targets=targets[:5],
              details={"mission_type": mtype_str})

    try:
        m = await squad.mission(mtype_str, targets, **config)

        api_result = {
            "mission_id": m.mission_id,
            "type": m.mission_type.value,
            "status": m.status,
            "target_count": len(m.targets),
            "results_count": len(m.results),
            "results": m.results[:50],  # cap to keep response size sane
            "kpis": m.kpis,
            "error": m.error,
        }

        # ── Write-through to Puter + GCS ──
        if m.status in ("completed", "failed"):
            await _persist_mission(storage, m.mission_id, m, api_result)

        return web.json_response(api_result)
    except Exception as e:
        logger.exception("mission failed")
        return web.json_response({"error": "internal error"}, status=500)


async def status_handler(request: web.Request) -> web.Response:
    bridge: AcheevyBridge = request.app["bridge"]
    return web.json_response(await bridge.status())


async def approve(request: web.Request) -> web.Response:
    bridge: AcheevyBridge = request.app["bridge"]
    mission_id = request.match_info["mission_id"]
    try:
        result = await bridge.approve(mission_id)
        return web.json_response(result)
    except ValueError as e:
        return web.json_response({"error": str(e)}, status=404)
    except Exception as e:
        logger.exception("approve failed")
        return web.json_response({"error": "internal error"}, status=500)


async def deny(request: web.Request) -> web.Response:
    bridge: AcheevyBridge = request.app["bridge"]
    mission_id = request.match_info["mission_id"]
    try:
        body = await request.json()
        reason = body.get("reason", "no reason given")
    except Exception:
        reason = "no reason given"
    try:
        result = await bridge.deny(mission_id, reason)
        return web.json_response(result)
    except ValueError as e:
        return web.json_response({"error": str(e)}, status=404)


# ═════════════════════════════════════════════════════════════════════════
#  LIFECYCLE
# ═════════════════════════════════════════════════════════════════════════

async def on_startup(app: web.Application) -> None:
    logger.info("Bringing Sqwaadrun online for HTTP gateway...")

    # ── Security checks at startup ──
    dep_audit = check_dependencies()
    if dep_audit["issues_found"] > 0:
        for issue in dep_audit["issues"]:
            logger.warning(
                f"SECURITY: vulnerable package {issue['package']} "
                f"v{issue['installed']} (min safe: {issue['minimum_safe']}, "
                f"{issue['cve']})"
            )
    else:
        logger.info(f"Security: {dep_audit['total_packages']} packages checked, no known vulnerabilities.")
    data_dir = Path(os.environ.get("SQWAADRUN_DATA_DIR", "./data"))
    data_dir.mkdir(parents=True, exist_ok=True)

    # ── Dual-backend storage (Puter + GCS) ──
    storage = get_storage()
    app["storage"] = storage

    squad = FullScrappHawkSquadrun(
        output_dir=str(data_dir / "output"),
        schedule_file=str(data_dir / "schedule.json"),
    )
    await squad.startup()

    # Quota + sign-off policy from env
    policy = Policy(
        daily_quota_per_domain=int(os.environ.get("SQWAADRUN_QUOTA_PER_DOMAIN", "500")),
        sign_off_threshold=int(os.environ.get("SQWAADRUN_SIGNOFF_THRESHOLD", "100")),
    )
    general = GeneralAng(
        squad,
        policy=policy,
        doctrine_path=str(data_dir / "doctrine.jsonl"),
    )
    # Inject storage so General_Ang's _log_doctrine fires a dual-write
    general.storage = storage  # type: ignore[attr-defined]

    bridge = AcheevyBridge(general)

    # ── TRCC pipeline + scheduled jobs ──
    # The pipeline registers default jobs with Lil_Sched_Hawk and
    # launches a background loop that dispatches them on cadence.
    # Disabled when SQWAADRUN_DISABLE_TRCC=1 (e.g. for ad-hoc gateway
    # instances that don't need the data factory running).
    sched_task = None
    pipeline = None
    if os.environ.get("SQWAADRUN_DISABLE_TRCC", "0") != "1":
        try:
            from sqwaadrun.trcc_pipeline import TRCCPipeline
            from sqwaadrun.trcc_jobs import all_jobs

            pipeline = TRCCPipeline(squad, general)
            for job in all_jobs():
                pipeline.register(job)
            await pipeline.register_with_sched_hawk()

            sched_task = asyncio.create_task(
                squad.sched_hawk.run_loop(
                    handler=pipeline.sched_handler,
                    check_interval=15.0,
                )
            )
            logger.info(f"TRCC pipeline online — {len(pipeline.jobs)} jobs registered")
        except Exception as e:
            logger.warning(f"TRCC pipeline failed to start: {e}")

    # ── Heartbeat loop ──
    # Writes a Chronicle Ledger entry to Puter every 90 seconds with
    # the gateway's current state. Puter-only per the directive —
    # never GCS, never customer-facing.
    heartbeat_interval = int(os.environ.get("SQWAADRUN_HEARTBEAT_INTERVAL_SECONDS", "90"))
    heartbeat_task = asyncio.create_task(
        _heartbeat_loop(storage, squad, heartbeat_interval)
    )

    app["squad"] = squad
    app["general"] = general
    app["bridge"] = bridge
    app["pipeline"] = pipeline
    app["sched_task"] = sched_task
    app["heartbeat_task"] = heartbeat_task
    logger.info("Sqwaadrun gateway ready.")


async def _heartbeat_loop(
    storage: SmelterStorage,
    squad: FullScrappHawkSquadrun,
    interval_seconds: int,
) -> None:
    """
    Write a gateway heartbeat to Puter (/chronicle/ledger/) on a
    fixed cadence. If Puter is unavailable, log a warning and keep
    trying — never crashes the daemon.
    """
    logger.info(f"Heartbeat loop started ({interval_seconds}s interval)")
    while True:
        try:
            active_hawks = sum(1 for h in squad._hawks if _hawk_status(h) == "active")
            report = {
                "timestamp": datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"),
                "gateway": "sqwaadrun",
                "version": "2.0.0",
                "hawks_online": active_hawks,
                "hawks_total": len(squad._hawks),
                "mission_log_size": len(squad.chicken_hawk._mission_log),  # type: ignore[attr-defined]
                "uptime_note": "heartbeat",
            }
            ok = await storage.log_heartbeat(report)
            if not ok:
                logger.debug("Heartbeat write skipped (Puter unavailable)")
        except Exception as e:
            logger.warning(f"Heartbeat error: {e}")

        try:
            await asyncio.sleep(interval_seconds)
        except asyncio.CancelledError:
            logger.info("Heartbeat loop cancelled")
            return


async def on_cleanup(app: web.Application) -> None:
    # Stop background tasks before the squad shuts down so their
    # next wakeups find the app still present.
    for key in ("heartbeat_task", "sched_task"):
        task = app.get(key)
        if task is not None:
            task.cancel()
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass

    squad: FullScrappHawkSquadrun = app["squad"]
    await squad.shutdown()


def build_app() -> web.Application:
    app = web.Application(middlewares=[auth_middleware])

    app.router.add_get("/", health)
    app.router.add_get("/health", health)
    app.router.add_get("/roster", roster)
    app.router.add_post("/scrape", scrape_intent)
    app.router.add_post("/mission", mission)
    app.router.add_get("/status", status_handler)
    app.router.add_post("/approve/{mission_id}", approve)
    app.router.add_post("/deny/{mission_id}", deny)

    app.on_startup.append(on_startup)
    app.on_cleanup.append(on_cleanup)
    return app


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Sqwaadrun HTTP Gateway")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=7700)
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)
    app = build_app()
    logger.info(f"Sqwaadrun gateway listening on http://{args.host}:{args.port}")
    web.run_app(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
