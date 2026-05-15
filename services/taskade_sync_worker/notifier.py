"""Telegram fallback notifier — pings Chicken Hawk gateway on persistent failures."""
from __future__ import annotations

import logging

import httpx

log = logging.getLogger("taskade.sync_worker.notifier")


def send_alert(*, notifier_url: str, bearer: str, subject: str, body: str) -> bool:
    """Best-effort POST to Chicken Hawk's internal notify endpoint.

    Returns True on 2xx, False otherwise. Never raises — notifier failures
    must not crash the sync loop.
    """
    if not notifier_url or not bearer:
        log.warning("notifier not configured — alert dropped: %s", subject)
        return False
    try:
        with httpx.Client(timeout=15.0) as c:
            r = c.post(
                notifier_url,
                headers={"Authorization": f"Bearer {bearer}"},
                json={"subject": subject, "body": body, "channel": "telegram"},
            )
        if 200 <= r.status_code < 300:
            return True
        log.warning("notifier returned %s: %s", r.status_code, r.text[:200])
        return False
    except httpx.HTTPError as e:
        log.warning("notifier request failed: %s", e)
        return False
