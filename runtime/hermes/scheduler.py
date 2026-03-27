"""Weekly scheduler for Deep Think evaluation loops.

Uses APScheduler to trigger evaluations every Sunday at 02:00 UTC.
"""

import asyncio
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from config import DEFAULT_TENANT
from deep_think import run_evaluation

logger = logging.getLogger("hermes.scheduler")

_scheduler: BackgroundScheduler | None = None


def _run_weekly_evaluation():
    """Sync wrapper to run the async evaluation in the scheduler thread."""
    logger.info("Weekly Deep Think evaluation starting")
    loop = asyncio.new_event_loop()
    try:
        result = loop.run_until_complete(run_evaluation(DEFAULT_TENANT))
        logger.info(
            "Weekly evaluation complete: ecosystem_score=%s, id=%s",
            result.get("ecosystem_score"),
            result.get("evaluation_id"),
        )
    except Exception:
        logger.exception("Weekly evaluation failed")
    finally:
        loop.close()


def start_scheduler():
    """Start the weekly Deep Think scheduler."""
    global _scheduler
    if _scheduler is not None:
        return

    _scheduler = BackgroundScheduler()
    _scheduler.add_job(
        _run_weekly_evaluation,
        trigger=CronTrigger(day_of_week="sun", hour=2, minute=0),
        id="weekly_deep_think",
        name="Weekly Deep Think Evaluation",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("Hermes scheduler started — weekly Deep Think every Sunday 02:00 UTC")


def stop_scheduler():
    """Stop the scheduler gracefully."""
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("Hermes scheduler stopped")
