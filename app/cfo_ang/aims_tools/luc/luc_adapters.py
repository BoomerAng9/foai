"""LUC Adapters — bindings for ACHEEVY orchestration + Port Authority.

Provides middleware-compatible wrappers that Boomer_Angs call to gate
every billable operation through the LUC engine.
"""

from .luc_engine import can_execute, record_usage
from .luc_schemas import CanExecuteRequest, RecordUsageRequest


class LucGateError(Exception):
    """Raised when LUC denies execution due to quota."""
    def __init__(self, denial_reason: str, service_key: str, quantity: float):
        self.denial_reason = denial_reason
        self.service_key = service_key
        self.quantity = quantity
        super().__init__(denial_reason)


def gate_and_record(
    user_account_id: str,
    service_key: str,
    quantity: float,
    agent_name: str,
    task_id: str | None = None,
    metadata: dict | None = None,
) -> dict:
    """Gate check + record usage in one call. Raises LucGateError if denied.

    This is the primary adapter for Boomer_Ang middleware:
    1. Check canExecute()
    2. If denied, raise LucGateError
    3. If allowed, recordUsage() and return the response
    """
    # Gate check
    gate_result = can_execute(CanExecuteRequest(
        user_account_id=user_account_id,
        service_key=service_key,
        quantity=quantity,
    ))

    if not gate_result.allowed:
        raise LucGateError(
            denial_reason=gate_result.denial_reason,
            service_key=service_key,
            quantity=quantity,
        )

    # Record usage
    usage_result = record_usage(RecordUsageRequest(
        user_account_id=user_account_id,
        service_key=service_key,
        quantity=quantity,
        agent_name=agent_name,
        task_id=task_id,
        metadata=metadata,
    ))

    return usage_result.model_dump()


def estimate_only(user_account_id: str, service_key: str, quantity: float) -> dict:
    """Estimate without gating — for UI preview."""
    from .luc_engine import estimate
    from .luc_schemas import EstimateRequest

    result = estimate(EstimateRequest(
        user_account_id=user_account_id,
        service_key=service_key,
        quantity=quantity,
    ))
    return result.model_dump()


def get_state(user_account_id: str) -> dict:
    """Get full account state — for Port Authority GET endpoint."""
    from .luc_engine import get_account_state
    return get_account_state(user_account_id).model_dump()
