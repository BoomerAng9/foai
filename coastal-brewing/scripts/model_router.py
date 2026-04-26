#!/usr/bin/env python3
"""One Direction model router.

Routes tasks to NVIDIA, Feynman, premium review, or owner approval based on task type and risk tags.
This script can run without API credentials in dry-run mode.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict

NVIDIA_TYPES = {
    "draft_caption", "draft_email", "classify_support", "summarize_daily_ops",
    "cluster_reviews", "draft_faq", "draft_product_copy", "draft_outreach"
}
FEYNMAN_TYPES = {
    "supplier_due_diligence", "claim_verification", "market_watch",
    "competitor_research", "product_evidence", "copy_evidence_review"
}
OWNER_RISK_TAGS = {
    "legal", "money", "certification", "health", "fda", "final_public",
    "supplier_change", "ad_spend", "contract"
}
NVIDIA_BLOCKED_TAGS = OWNER_RISK_TAGS | {"customer_payment_data"}

def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()

def decide_route(packet: Dict[str, Any]) -> Dict[str, Any]:
    task_type = packet.get("task_type", "")
    risk_tags = set(packet.get("risk_tags", []))
    owner_risk = bool(risk_tags & OWNER_RISK_TAGS)

    # Important: evidence tasks still go to Feynman first even if owner approval is required later.
    if task_type in FEYNMAN_TYPES:
        return {
            "route": "feynman",
            "reason": "task requires research, evidence, or claim verification before owner approval",
            "approval_required": bool(owner_risk or packet.get("approval_required", False)),
            "execution_allowed": False,
        }

    if owner_risk or packet.get("approval_required", False):
        return {
            "route": "owner",
            "reason": "risk tag or approval flag requires owner approval",
            "approval_required": True,
            "execution_allowed": False,
        }

    if task_type in NVIDIA_TYPES and not (risk_tags & NVIDIA_BLOCKED_TAGS):
        return {
            "route": "nvidia",
            "reason": "low-risk, high-volume generation/classification task",
            "approval_required": False,
            "execution_allowed": False,
        }

    return {
        "route": "premium_review",
        "reason": "task type is unknown or needs higher-judgment review",
        "approval_required": True,
        "execution_allowed": False,
    }

def make_receipt(packet: Dict[str, Any], decision: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "receipt_type": "route_decision",
        "created_at": utc_now(),
        "task_id": packet.get("task_id"),
        "task_type": packet.get("task_type"),
        "department": packet.get("department"),
        "risk_tags": packet.get("risk_tags", []),
        "route": decision["route"],
        "reason": decision["reason"],
        "approval_required": decision["approval_required"],
        "execution_allowed": decision["execution_allowed"],
    }

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("task_packet", help="Path to task packet JSON")
    parser.add_argument("--receipt-dir", default="receipts")
    args = parser.parse_args()

    packet_path = Path(args.task_packet)
    packet = json.loads(packet_path.read_text(encoding="utf-8"))
    decision = decide_route(packet)
    receipt = make_receipt(packet, decision)

    out_dir = Path(args.receipt_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{packet.get('task_id', 'task')}_route_receipt.json"
    out_path.write_text(json.dumps(receipt, indent=2), encoding="utf-8")

    print(json.dumps(receipt, indent=2))
    print(f"Receipt: {out_path}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
