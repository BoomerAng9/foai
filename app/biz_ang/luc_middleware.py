"""LUC Middleware — drop-in for Boomer_Angs to gate billable calls.

Usage in any Boomer_Ang:
  from luc_middleware import luc_gate

  result = await luc_gate(
      user_account_id="cti-default",
      service_key="llm_tokens_out",
      quantity=500,
      agent_name="Content_Ang",
      task_id=task_id,
  )
  # If quota exceeded, raises HTTPException 429

This is a lightweight HTTP client that calls CFO_Ang's API.
No Firestore dependency needed in the calling agent.
"""

import os

import httpx
from fastapi import HTTPException

CFO_ANG_URL = os.getenv(
    "CFO_ANG_URL",
    "https://cfo-ang-939270059361.us-central1.run.app",
)


async def luc_gate(
    user_account_id: str,
    service_key: str,
    quantity: float,
    agent_name: str,
    task_id: str | None = None,
    metadata: dict | None = None,
) -> dict:
    """Gate + record usage via CFO_Ang API. Raises 429 if denied."""

    # Step 1: Can we execute?
    async with httpx.AsyncClient(timeout=5.0) as client:
        gate_resp = await client.post(
            f"{CFO_ANG_URL}/api/luc/can-execute",
            json={
                "user_account_id": user_account_id,
                "service_key": service_key,
                "quantity": quantity,
            },
        )

    if gate_resp.status_code != 200:
        raise HTTPException(status_code=502, detail="LUC gate check failed")

    gate_data = gate_resp.json()
    if not gate_data["allowed"]:
        raise HTTPException(
            status_code=429,
            detail=gate_data.get("denial_reason", "Quota exceeded"),
        )

    # Step 2: Record usage
    async with httpx.AsyncClient(timeout=5.0) as client:
        record_resp = await client.post(
            f"{CFO_ANG_URL}/api/luc/record-usage",
            json={
                "user_account_id": user_account_id,
                "service_key": service_key,
                "quantity": quantity,
                "agent_name": agent_name,
                "task_id": task_id,
                "metadata": metadata,
            },
        )

    if record_resp.status_code != 200:
        raise HTTPException(status_code=502, detail="LUC record usage failed")

    return record_resp.json()
