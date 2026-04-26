"""Owner notification dispatcher — routes through Hermes Agent (NousResearch).

Wave 1 Step C: replaces the bare `_send_telegram` call in auth.py with a
multi-channel dispatcher. Hermes Agent v0.11.0 is the canonical HITL surface
for the FOAI ecosystem (15+ channels: Telegram, Slack, Discord, email, SMS,
etc.) and runs at `http://hermes:7080` on aims-vps inside the Coastal
compose project.

Degrade-gracefully pattern (matches `memory_bridge.py`):
- Primary: POST to Hermes /notify with channel + message + urgency.
- Fallback: direct Telegram via `auth._send_telegram` if Hermes is
  unreachable, returns non-2xx, or times out within 3s.
- Never blocks the magic-link flow on a notifier outage — owner login
  remains usable even if Hermes is down.

Env:
  HERMES_BASE_URL=http://hermes:7080   (Wave 1 default; internal Docker DNS)
  HERMES_BEARER=<32-byte hex>          (per-deployment shared secret)
  HERMES_TIMEOUT_SEC=3                 (cap; fall back faster than the 5s
                                        login timeout to avoid cascading)

Rollback (per Betty-Anne_Ang's coaching note):
  Set HERMES_BASE_URL="" and the dispatcher short-circuits to the direct
  Telegram fallback on every call. Zero code revert needed; one env-var
  flip on the host followed by `docker compose restart hawk-gateway`.
"""
from __future__ import annotations

import os
from typing import Literal

import httpx
import structlog

logger = structlog.get_logger("chicken_hawk.notifier")

HERMES_BASE_URL = os.getenv("HERMES_BASE_URL", "").strip()
HERMES_BEARER = os.getenv("HERMES_BEARER", "").strip()
HERMES_TIMEOUT_SEC = float(os.getenv("HERMES_TIMEOUT_SEC", "3"))

Channel = Literal["telegram", "slack", "discord", "email", "sms", "webhook"]
Urgency = Literal["low", "normal", "approval", "critical"]


async def notify_owner(
    channel: Channel,
    message: str,
    urgency: Urgency = "normal",
) -> bool:
    """Dispatch *message* to the owner via *channel* through Hermes Agent.

    Returns True on Hermes success. On Hermes failure (unconfigured,
    unreachable, non-2xx, timeout), returns False. Caller should treat
    False as "use direct fallback" — auth.py wires this to its existing
    `_send_telegram` for the Telegram channel.

    We never raise here. The caller's flow (e.g. magic-link login) is
    more important than telemetry on which path delivered.
    """
    if not HERMES_BASE_URL:
        logger.debug("hermes_not_configured", note="set HERMES_BASE_URL to enable")
        return False

    headers = {"content-type": "application/json"}
    if HERMES_BEARER:
        headers["authorization"] = f"Bearer {HERMES_BEARER}"

    try:
        async with httpx.AsyncClient(timeout=HERMES_TIMEOUT_SEC) as client:
            r = await client.post(
                f"{HERMES_BASE_URL.rstrip('/')}/notify",
                headers=headers,
                json={"channel": channel, "message": message, "urgency": urgency},
            )
            if 200 <= r.status_code < 300:
                logger.info(
                    "hermes_dispatch_ok",
                    channel=channel,
                    urgency=urgency,
                    status=r.status_code,
                )
                return True
            logger.warning(
                "hermes_dispatch_non2xx",
                channel=channel,
                status=r.status_code,
                body=r.text[:200],
            )
            return False
    except (httpx.TimeoutException, httpx.RequestError) as exc:
        logger.warning("hermes_unreachable", channel=channel, error=str(exc))
        return False
    except Exception as exc:
        # Catch-all — notifier failure must NEVER bubble into the auth
        # flow; degrade silently to the caller's fallback path.
        logger.warning("hermes_unexpected_error", channel=channel, error=str(exc))
        return False


def is_configured() -> bool:
    """Cheap predicate so callers can branch on backend availability."""
    return bool(HERMES_BASE_URL)
