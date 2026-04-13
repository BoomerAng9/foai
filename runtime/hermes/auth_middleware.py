"""Hermes API key auth middleware."""
import os
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

HERMES_API_KEY = os.getenv("HERMES_API_KEY", "")

class ApiKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Health check is always public
        if request.url.path == "/health":
            return await call_next(request)

        # Docs disabled in production
        if request.url.path in ("/docs", "/redoc", "/openapi.json"):
            if os.getenv("ENV", "production") == "production":
                return JSONResponse({"error": "Not found"}, status_code=404)

        # Require API key for all other routes
        if not HERMES_API_KEY:
            return JSONResponse({"error": "Service not configured"}, status_code=503)

        auth = request.headers.get("authorization", "")
        if not auth.startswith("Bearer ") or auth[7:] != HERMES_API_KEY:
            return JSONResponse({"error": "Authentication required"}, status_code=401)

        return await call_next(request)
