"""Scheduler for Deep Think evaluation loops — daily + weekly.

Daily: Lightweight single-model check at 06:00 UTC.
Weekly: Full multi-model consensus evaluation every Sunday at 02:00 UTC.
"""

import asyncio

import structlog
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from config import DEFAULT_TENANT
from deep_think import run_evaluation

logger = structlog.get_logger("hermes.scheduler")

_scheduler: BackgroundScheduler | None = None


def _run_eval(eval_type: str, multi_model: bool):
    """Sync wrapper to run the async evaluation in the scheduler thread."""
    logger.info("scheduled_evaluation_starting", eval_type=eval_type)
    loop = asyncio.new_event_loop()
    try:
        result = loop.run_until_complete(
            run_evaluation(DEFAULT_TENANT, eval_type=eval_type, multi_model=multi_model)
        )
        logger.info(
            "scheduled_evaluation_complete",
            eval_type=eval_type,
            ecosystem_score=result.get("ecosystem_score"),
            models_used=result.get("models_used"),
            eval_id=result.get("evaluation_id"),
        )
    except Exception:
        logger.exception("scheduled_evaluation_failed", eval_type=eval_type)
    finally:
        loop.close()


def start_scheduler():
    """Start the daily + weekly Deep Think schedulers."""
    global _scheduler
    if _scheduler is not None:
        return

    _scheduler = BackgroundScheduler()

    # Weekly full multi-model consensus — Sunday 02:00 UTC
    _scheduler.add_job(
        _run_eval,
        args=["weekly", True],
        trigger=CronTrigger(day_of_week="sun", hour=2, minute=0),
        id="weekly_deep_think",
        name="Weekly Deep Think — Multi-Model Consensus",
        replace_existing=True,
    )

    # Daily lightweight single-model check — 06:00 UTC
    _scheduler.add_job(
        _run_eval,
        args=["daily", False],
        trigger=CronTrigger(hour=6, minute=0),
        id="daily_deep_think",
        name="Daily Deep Think — Single-Model Check",
        replace_existing=True,
    )

    # Weekly AutoResearch model-currency scan — Monday 06:00 UTC
    _scheduler.add_job(
        _run_autoresearch,
        trigger=CronTrigger(day_of_week="mon", hour=6, minute=0),
        id="weekly_autoresearch",
        name="Weekly AutoResearch — Model Currency Scan",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info(
        "scheduler_started",
        jobs=[
            "weekly_deep_think (Sun 02:00 UTC)",
            "daily_deep_think (06:00 UTC)",
            "weekly_autoresearch (Mon 06:00 UTC)",
        ],
    )


def _run_autoresearch():
    """Sync wrapper for the async AutoResearch scan."""
    logger.info("scheduled_autoresearch_starting")
    loop = asyncio.new_event_loop()
    try:
        from autoresearch.engine import scan_all

        report = loop.run_until_complete(scan_all())
        logger.info(
            "scheduled_autoresearch_complete",
            total_tracked=report.total_tracked,
            total_checked=report.total_checked,
            upgrade_candidates=[e.family for e in report.upgrade_candidates],
        )
    except Exception:
        logger.exception("scheduled_autoresearch_failed")
    finally:
        loop.close()


def stop_scheduler():
    """Stop the scheduler gracefully."""
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("scheduler_stopped")
