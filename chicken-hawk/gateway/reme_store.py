"""ReMe (AgentScope) memory store integration for Chicken Hawk gateway.

Wave 1 Step F: adds long-term, cross-session agent memory via ReMe.
Defaults to ReMeLight (file-based; markdown-as-memory) so no vector DB
is required. Vector backend opt-in via env vars when ready.

Why ReMe (not aims_memory):
- aims_memory tracks gateway-level routing decisions (per-request)
- ReMe tracks agent-tier long-term memory (across sessions, across BG'z)
  with three-axis split: Personal / Procedural / Tool
- Both can coexist; this module is additive

Repo: https://github.com/agentscope-ai/ReMe (Apache-2.0)
Package: https://pypi.org/project/reme-ai/

Environment:
  REME_BACKEND=light          (default; file-based)
  REME_LIGHT_DIR=/data/reme   (default storage path; bind-mount in compose)
  REME_VECTOR_URL=...         (opt-in: switches to vector backend)
"""
from __future__ import annotations

import os
from typing import Any, Optional

import structlog

logger = structlog.get_logger("chicken_hawk.reme")

REME_BACKEND = os.getenv("REME_BACKEND", "light")
REME_LIGHT_DIR = os.getenv("REME_LIGHT_DIR", "/data/reme")

# Lazy import — reme-ai is optional at import time so containers without
# the dep don't crash. Wave 1 ships it in requirements.txt; this stays
# defensive in case of environment skew.
_store: Optional[Any] = None
_unavailable: bool = False


def get_store() -> Optional[Any]:
    """Return a ReMeLight (or vector) store instance.

    First call lazily initializes; subsequent calls reuse. On import or
    init failure, returns None and logs once. Callers should treat None
    as "memory unavailable; proceed without recall."
    """
    global _store, _unavailable
    if _unavailable:
        return None
    if _store is not None:
        return _store
    try:
        if REME_BACKEND == "light":
            from reme_ai import ReMeLight  # type: ignore
            os.makedirs(REME_LIGHT_DIR, exist_ok=True)
            _store = ReMeLight(workspace_dir=REME_LIGHT_DIR)
            logger.info("reme_initialized", backend="light", workspace=REME_LIGHT_DIR)
        else:
            # Vector backend (opt-in)
            from reme_ai import ReMe  # type: ignore
            _store = ReMe()
            logger.info("reme_initialized", backend="vector")
        return _store
    except ImportError:
        logger.warning("reme_not_installed", backend=REME_BACKEND)
        _unavailable = True
        return None
    except Exception as exc:
        logger.warning("reme_init_failed", error=str(exc), backend=REME_BACKEND)
        _unavailable = True
        return None


def is_available() -> bool:
    """Cheap check: True if ReMe is installed and initialized successfully."""
    return get_store() is not None
