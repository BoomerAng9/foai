"""Hermes API key auth middleware."""
import os
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

HERMES_API_KEY = os.getenv("HERMES_API_KEY", "")

# Public routes — reachable without an API key. The landing route at "/"
# exists so Cloud Run doesn't surface a raw "Forbidden" to first-time
# visitors; it returns a JSON service manifest instead.
EXEMPT_PATHS: frozenset[str] = frozenset({"/", "/health"})


class ApiKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        if path in EXEMPT_PATHS:
            return await call_next(request)

        if path in ("/docs", "/redoc", "/openapi.json"):
            if os.getenv("ENV", "production") == "production":
                return JSONResponse({"error": "Not found"}, status_code=404)

        if not HERMES_API_KEY:
            return JSONResponse({"error": "Service not configured"}, status_code=503)

        auth = request.headers.get("authorization", "")
        if not auth.startswith("Bearer ") or auth[7:] != HERMES_API_KEY:
            return JSONResponse({"error": "Authentication required"}, status_code=401)

        return await call_next(request)
