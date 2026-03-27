"""GuardAng (NemoClaw) middleware — all routes pass through tenant enforcement."""

import httpx
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from config import GUARDANG_URL

# Routes that bypass GuardAng entirely
WHITELIST = {"/health", "/docs", "/openapi.json", "/redoc"}


class GuardAngMiddleware(BaseHTTPMiddleware):
    """Validates every request against GuardAng before processing.

    Sends tenant_id and route info to NemoClaw for policy enforcement.
    Fail-closed: if GuardAng is unreachable, the request is denied.
    Whitelisted paths skip validation entirely.
    """

    async def dispatch(self, request: Request, call_next):
        # Skip GuardAng for whitelisted paths
        if request.url.path in WHITELIST:
            return await call_next(request)

        # All security checks BEFORE call_next
        tenant_id = request.query_params.get("tenant_id", "cti")

        payload = {
            "tenant_id": tenant_id,
            "path": request.url.path,
            "method": request.method,
        }

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(
                    f"{GUARDANG_URL}/validate", json=payload
                )
            if resp.status_code != 200:
                return JSONResponse(
                    status_code=403,
                    content={"detail": f"GuardAng denied: {resp.text}"},
                )
        except httpx.ConnectError:
            return JSONResponse(
                status_code=503,
                content={"detail": "GuardAng unreachable — fail closed"},
            )

        return await call_next(request)
