"""Outbound multi-channel notifier — Wave 2 placeholder.

Wave 1 Step C (Path 1) repositioning: NousResearch Hermes Agent is the
INBOUND owner command surface (owner chats Telegram/Slack/etc → Hermes
invokes chicken-hawk tools). It is NOT an outbound /notify dispatcher —
the upstream API doesn't expose that shape.

This module stays as a stub for Wave 2 when we ship outbound multi-channel
notifications (proactive pings to Slack/Discord/email/SMS without owner
prompting). For Wave 1, magic-link delivery stays on the direct Telegram
path in auth._send_telegram. Calling notify_owner() always returns False
so auth.py's existing fallback chain transparently routes around it.

Wave 2 implementation will dispatch directly to channel SDKs (python-
telegram-bot, slack_sdk, discord.py-self, twilio, etc.) — no Hermes
Agent involvement, since Hermes is purpose-built for inbound chat.
"""
from __future__ import annotations

import structlog

logger = structlog.get_logger("chicken_hawk.notifier")


async def notify_owner(channel: str, message: str, urgency: str = "normal") -> bool:
    """Wave 1 stub — always returns False. Caller falls back to direct path.

    Wave 2 will replace this with per-channel SDK dispatch. Keeping the
    interface stable now so auth.py doesn't need editing later.
    """
    logger.debug(
        "notifier_wave1_stub",
        channel=channel,
        urgency=urgency,
        note="auth.py falls back to direct Telegram; Wave 2 fills this in",
    )
    return False


def is_configured() -> bool:
    """Wave 1: never configured. Wave 2: returns True when channel SDKs are wired."""
    return False
