"""Voice Relay auth — API key validation for WebSocket connections."""
import os
from fastapi import WebSocket

RELAY_API_KEY = os.getenv("VOICE_RELAY_API_KEY", "")
ALLOWED_ORIGINS = [
    "https://foai.cloud",
    "https://cti.foai.cloud",
    "https://deploy.foai.cloud",
    "http://localhost:3000",
    "http://localhost:3001",
]

async def authenticate_ws(ws: WebSocket) -> bool:
    """Check API key from query param or first message. Returns True if authenticated."""
    if not RELAY_API_KEY:
        return False  # Fail closed if key not configured
    # Check query param: ws://host/voice?key=xxx
    key = ws.query_params.get("key", "")
    return key == RELAY_API_KEY
