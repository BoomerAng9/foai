# Stepper workflow — daily_operating_digest

## Trigger
Cron at 06:00 local time (Stepper schedule).

## Inputs
- (none — pulls from Hermes + Hostinger Ecommerce data feeds when live)

## Workflow
1. Stepper queries Hermes for the last 24h:
   - new task_packets (count + by route)
   - new approval_requests (count + status breakdown)
   - new model_call_receipts (count + by provider)
   - new risk_events (count + severity)
   - new claim_verification_receipts (kept / strike counts)
2. (Post-Hostinger): pull last-24h orders, support volume, marketing engagement, supplier alerts via Hostinger Ecommerce API.
3. Build a task packet:
   ```json
   {
     "task_id": "digest_<YYYYMMDD>",
     "owner_goal": "Daily operating visibility",
     "objective": "Summarize last 24h ops; surface anomalies; propose 3 next-day priorities",
     "department": "boomer_ops",
     "task_type": "summarize_daily_ops",
     "risk_tags": [],
     "approval_required": false,
     "desired_output": "1-page Markdown digest at drafts/<task_id>_digest.md"
   }
   ```
4. POST to `https://brewing.foai.cloud/run` — routes to nvidia.
5. NVIDIA (or premium fallback) drafts the digest from the pulled data.
6. Stepper saves the digest to `drafts/<task_id>_digest.md`.
7. Stepper emails the digest to `OWNER_APPROVAL_EMAIL` (read-only, no approval requested — owner consumes).

## Outputs
- Hermes route receipt
- Daily digest at `drafts/<task_id>_digest.md`
- Email to owner (read-only)

## Risk tags applied
- (none — internal-only summary)

## Owner approval gate
Not required (no external action). The digest is an internal daily read.

## Failure modes
- NVIDIA unavailable → fall through to premium_review route; owner gets a brief manual-author request instead
- Hermes query times out → digest renders with a "data partial" header; alert filed
- Email delivery fails → digest still on disk; owner pings if missed

## Cadence escalation
If 3 consecutive digests show high-risk events accumulating (red anomalies), the workflow upgrades severity to `weekly_operating_receipt`'s level and pages the owner directly instead of waiting for Monday.

## When this workflow simplifies
Hostinger Ecommerce gives canonical sales/refund/subscription data; the digest content widens but the trigger + format stay the same.
