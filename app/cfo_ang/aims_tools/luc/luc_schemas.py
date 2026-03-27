"""LUC Schemas — ACP/MCP-safe input/output contracts.

All data flowing through the LUC engine must conform to these schemas.
"""

from pydantic import BaseModel, Field


# ── Input Contracts ─────────────────────────────────────────────────

class EstimateRequest(BaseModel):
    """Estimate cost before execution."""
    user_account_id: str
    service_key: str = Field(description="Key from SERVICE_CATALOG")
    quantity: float = Field(gt=0, description="Units to consume")


class CanExecuteRequest(BaseModel):
    """Check if user has quota to execute."""
    user_account_id: str
    service_key: str
    quantity: float = Field(gt=0)


class RecordUsageRequest(BaseModel):
    """Record actual usage after execution."""
    user_account_id: str
    service_key: str
    quantity: float = Field(gt=0)
    agent_name: str = Field(description="Which Boomer_Ang consumed this")
    task_id: str | None = None
    metadata: dict | None = None


class CreditUsageRequest(BaseModel):
    """Credit back usage (refund, error correction)."""
    user_account_id: str
    service_key: str
    quantity: float = Field(gt=0)
    reason: str
    agent_name: str


# ── Output Contracts ────────────────────────────────────────────────

class EstimateResponse(BaseModel):
    user_account_id: str
    service_key: str
    quantity: float
    estimated_cost: float
    current_usage: float
    quota_limit: float
    remaining_after: float
    within_quota: bool


class CanExecuteResponse(BaseModel):
    user_account_id: str
    service_key: str
    quantity: float
    allowed: bool
    current_usage: float
    quota_limit: float
    remaining: float
    denial_reason: str | None = None


class RecordUsageResponse(BaseModel):
    user_account_id: str
    service_key: str
    quantity_recorded: float
    new_usage_total: float
    quota_limit: float
    remaining: float
    event_id: str


class CreditUsageResponse(BaseModel):
    user_account_id: str
    service_key: str
    quantity_credited: float
    new_usage_total: float
    event_id: str


class AccountState(BaseModel):
    user_account_id: str
    plan_id: str
    usage: dict[str, float]
    limits: dict[str, float]
    remaining: dict[str, float]
    overage: dict[str, float]
    last_updated: str
