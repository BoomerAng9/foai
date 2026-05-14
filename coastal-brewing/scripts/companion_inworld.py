"""WebSocket proxy from coastal-runner to the Inworld Model Gateway.

The Companion's translation path:

  Phone/Web ──ws──► coastal-runner ──ws──► Inworld Gateway ──ws──► OpenAI Realtime

We act as a man-in-the-middle that (a) attaches the customer's BYOK
key on the upstream connection, (b) lets a higher layer record minutes
for billing caps, (c) terminates the upstream cleanly on user
disconnect, and (d) never logs raw audio frames (privacy canon).

NOTE: protocol-frame parsing (turn detection, partial-transcript
events, etc.) is owned by `companion_session_relay` (a separate
module not yet built). This module only handles socket-level
lifecycle + auth header attachment.
"""
from __future__ import annotations

import logging
import os

import websockets

log = logging.getLogger("coastal.companion.inworld")


def _gateway_url() -> str:
    url = os.environ.get("COASTAL_INWORLD_GATEWAY_URL", "").strip()
    if not url:
        raise RuntimeError("COASTAL_INWORLD_GATEWAY_URL not configured")
    return url


async def open_upstream(
    *,
    user_api_key: str,
    source_lang: str,
    target_lang: str,
):
    """Open a WebSocket to the Inworld Gateway with the user's BYOK
    Inworld key attached as auth. Returns the connected socket; caller
    drives the recv/send loop. Raises on connection failure."""
    headers = {
        "Authorization": f"Bearer {user_api_key}",
        "X-Realtime-Mode": "translation",
        "X-Source-Lang": source_lang,
        "X-Target-Lang": target_lang,
    }
    return await websockets.connect(
        _gateway_url(),
        additional_headers=headers,
        max_size=4 * 1024 * 1024,
        open_timeout=15,
        ping_interval=20,
        ping_timeout=20,
    )
