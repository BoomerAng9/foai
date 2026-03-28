"""Authentication middleware for FastAPI."""

import logging
import traceback
from typing import Callable
from uuid import uuid4
from fastapi import HTTPException, Request, Response
from fastapi.responses import JSONResponse
from ii_agent.core.exceptions import NotFoundException, PermissionException
from ii_agent.core.logger import clear_request_id, set_request_id


logger = logging.getLogger(__name__)


async def exception_logging_middleware(
    request: Request, call_next: Callable
) -> Response:
    """Middleware to log unhandled exceptions.

    Args:
    ----
        request (Request): The incoming request.
        call_next (Callable): The next middleware in the chain.

    Returns:
    -------
        Response: The response to the incoming request.

    """
    request_id = request.headers.get("X-Request-ID") or str(uuid4())
    token = set_request_id(request_id)
    request.state.request_id = request_id
    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
    except HTTPException as exc:
        response = JSONResponse(status_code=exc.status_code, content={"error": exc.detail})
        response.headers["X-Request-ID"] = request_id
        return response
    except Exception as _:
        logger.error(traceback.format_exc(), exc_info=True)
        response = JSONResponse(
            status_code=500, content={"detail": "Internal Server Error"}
        )
        response.headers["X-Request-ID"] = request_id
        return response
    finally:
        clear_request_id(token)


async def permission_exception_handler(
    request: Request, exc: PermissionException
) -> JSONResponse:
    """Exception handler for PermissionException.

    Args:
    ----
        request (Request): The incoming request that triggered the exception.
        exc (PermissionException): The exception object that was raised.

    Returns:
    -------
        JSONResponse: A 403 Forbidden status response that details the error message.

    """
    return JSONResponse(status_code=403, content={"detail": str(exc)})


async def not_found_exception_handler(
    request: Request, exc: NotFoundException
) -> JSONResponse:
    """Exception handler for NotFoundException.

    Args:
    ----
        request (Request): The incoming request that triggered the exception.
        exc (NotFoundException): The exception object that was raised.

    Returns:
    -------
        JSONResponse: A 404 Not Found status response that details the error message.

    """
    return JSONResponse(status_code=404, content={"detail": str(exc)})
