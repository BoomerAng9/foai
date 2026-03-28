"""Service layer exports for the server package.

Keep imports lazy so focused modules can be imported without pulling in the full
runtime dependency graph.
"""

from importlib import import_module
from typing import Any


_SERVICE_EXPORTS = {
    "AgentService": ".agent_service",
    "SessionService": ".session_service",
    "SandboxService": ".sandbox_service",
    "BillingService": ".billing_service",
    "FileService": ".file_service",
    "AgentRunService": ".agent_run_service",
}


def __getattr__(name: str) -> Any:
    module_name = _SERVICE_EXPORTS.get(name)
    if module_name is None:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

    module = import_module(module_name, __name__)
    return getattr(module, name)


__all__ = list(_SERVICE_EXPORTS)
