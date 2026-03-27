"""GuardAng (NemoClaw) middleware — all routes pass through tenant enforcement."""

import httpx
from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware

from config import GUARDANG_URL


class GuardAngMiddleware(BaseHTTPMiddleware):
    """Validates every request against GuardAng before processing.

    Sends tenant_id and route info to NemoClaw for policy enforcement.
    Fail-closed: if GuardAng is unreachable, the request is denied.
    """

    async def dispatch(self, request: Request, call_next):
        # Extract tenant_id from query, body, or default
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
                raise HTTPException(
                    status_code=403,
                    detail=f"GuardAng denied: {resp.text}",
                )
        except httpx.ConnectError:
            # Fail closed — if GuardAng is down, deny everything
            raise HTTPException(
                status_code=503,
                detail="GuardAng unreachable — fail closed",
            )

        response = await call_next(request)
        return response
