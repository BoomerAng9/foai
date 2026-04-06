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
from typing import Any, Dict

from aiohttp import web

from sqwaadrun.lil_scrapp_hawk import FullScrappHawkSquadrun, MissionType
from sqwaadrun.general_ang import GeneralAng, AcheevyBridge, Policy

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
        return await handler(request)  # dev mode

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
    try:
        body = await request.json()
    except Exception:
        return web.json_response({"error": "invalid JSON body"}, status=400)

    intent = body.get("intent", "")
    targets = body.get("targets", [])
    config = body.get("config", {})

    if not targets or not isinstance(targets, list):
        return web.json_response({"error": "targets required (list of URLs)"}, status=400)
    if not intent:
        return web.json_response({"error": "intent required"}, status=400)

    try:
        result = await bridge.scrape_intent(intent, targets, **config)
        return web.json_response(result)
    except Exception as e:
        logger.exception("scrape_intent failed")
        return web.json_response({"error": str(e)}, status=500)


async def mission(request: web.Request) -> web.Response:
    """Typed mission dispatch — bypasses NL intent routing."""
    squad: FullScrappHawkSquadrun = request.app["squad"]
    try:
        body = await request.json()
    except Exception:
        return web.json_response({"error": "invalid JSON body"}, status=400)

    mtype_str = body.get("type", "").lower()
    targets = body.get("targets", [])
    config = body.get("config", {})

    valid_types = {m.value for m in MissionType}
    if mtype_str not in valid_types:
        return web.json_response(
            {"error": f"invalid mission type. valid: {sorted(valid_types)}"},
            status=400,
        )
    if not targets:
        return web.json_response({"error": "targets required"}, status=400)

    try:
        m = await squad.mission(mtype_str, targets, **config)
        return web.json_response({
            "mission_id": m.mission_id,
            "type": m.mission_type.value,
            "status": m.status,
            "target_count": len(m.targets),
            "results_count": len(m.results),
            "results": m.results[:50],  # cap to keep response size sane
            "kpis": m.kpis,
            "error": m.error,
        })
    except Exception as e:
        logger.exception("mission failed")
        return web.json_response({"error": str(e)}, status=500)


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
        return web.json_response({"error": str(e)}, status=500)


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
    data_dir = Path(os.environ.get("SQWAADRUN_DATA_DIR", "./data"))
    data_dir.mkdir(parents=True, exist_ok=True)

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

    app["squad"] = squad
    app["general"] = general
    app["bridge"] = bridge
    app["pipeline"] = pipeline
    app["sched_task"] = sched_task
    logger.info("Sqwaadrun gateway ready.")


async def on_cleanup(app: web.Application) -> None:
    sched_task = app.get("sched_task")
    if sched_task is not None:
        sched_task.cancel()
        try:
            await sched_task
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
