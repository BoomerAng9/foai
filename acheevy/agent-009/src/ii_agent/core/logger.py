import json
import logging
import os
from contextvars import ContextVar
from datetime import datetime, timezone

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_FORMAT = os.getenv("LOG_FORMAT", "json" if os.getenv("ENVIRONMENT") == "production" else "text").lower()

request_id_context: ContextVar[str] = ContextVar("request_id", default="")


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_context.get("")
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.fromtimestamp(record.created, timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "") or None,
        }
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def set_request_id(request_id: str):
    return request_id_context.set(request_id)


def clear_request_id(token) -> None:
    request_id_context.reset(token)


def configure_logging() -> logging.Logger:
    root_logger = logging.getLogger()
    level = getattr(logging, LOG_LEVEL, logging.INFO)
    handler = logging.StreamHandler()
    handler.addFilter(RequestIdFilter())

    if LOG_FORMAT == "json":
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(request_id)s - %(message)s"
            )
        )

    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(level)

    app_logger = logging.getLogger("ii_agent")
    app_logger.setLevel(level)

    logging.getLogger("mcp.server.lowlevel.server").setLevel(logging.WARNING)
    logging.getLogger("mcp.server").setLevel(logging.WARNING)
    logging.getLogger("mcp").setLevel(logging.WARNING)
    logging.getLogger("fastmcp").setLevel(logging.WARNING)
    return app_logger


logger = configure_logging()
