"""Port Authority — LUC API routes.

POST /api/luc/estimate
POST /api/luc/can-execute
POST /api/luc/record-usage
POST /api/luc/credit-usage
GET  /api/luc/state/{useramountid}
"""

from fastapi import APIRouter, HTTPException

from aims_tools.luc import (
    EstimateRequest,
    EstimateResponse,
    CanExecuteRequest,
    CanExecuteResponse,
    RecordUsageRequest,
    RecordUsageResponse,
    CreditUsageRequest,
    CreditUsageResponse,
    AccountState,
    estimate,
    can_execute,
    record_usage,
    credit_usage,
    get_account_state,
)

router = APIRouter(prefix="/api/luc", tags=["LUC Engine"])


@router.post("/estimate", response_model=EstimateResponse)
async def api_estimate(req: EstimateRequest):
    """Estimate cost and quota impact before execution."""
    try:
        return estimate(req)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/can-execute", response_model=CanExecuteResponse)
async def api_can_execute(req: CanExecuteRequest):
    """Gate check — does this account have quota?"""
    try:
        return can_execute(req)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/record-usage", response_model=RecordUsageResponse)
async def api_record_usage(req: RecordUsageRequest):
    """Record actual usage after execution."""
    try:
        return record_usage(req)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/credit-usage", response_model=CreditUsageResponse)
async def api_credit_usage(req: CreditUsageRequest):
    """Credit back usage (refund, error correction)."""
    try:
        return credit_usage(req)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/state/{useramountid}", response_model=AccountState)
async def api_account_state(useramountid: str):
    """Full account state with usage, limits, remaining, overage."""
    try:
        return get_account_state(useramountid)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
