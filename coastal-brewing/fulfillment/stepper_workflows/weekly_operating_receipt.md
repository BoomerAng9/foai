# Stepper workflow — weekly_operating_receipt

## Trigger
Cron at Monday 09:00 local time (Stepper schedule).

## Inputs
- (none — pulls from AuditLedger + Hostinger Ecommerce when live)

## Workflow
1. Stepper queries AuditLedger for the prior 7 days:
   - all metrics from `daily_operating_digest` aggregated
   - week-over-week deltas
   - open approvals (pending > 24h)
   - resolved approvals (count + decisions)
   - active risk events (severity ≥ medium)
2. Build a task packet:
   ```json
   {
     "task_id": "weekly_<YYYY_WW>",
     "owner_goal": "Weekly operating receipt for owner review",
     "objective": "Produce a weekly_operating_receipt rendered against templates/weekly_operating_receipt.md",
     "department": "boomer_ops",
     "task_type": "summarize_daily_ops",
     "risk_tags": [],
     "approval_required": true,
     "desired_output": "rendered weekly receipt + 3 next-week priorities + owner go/no-go on plan"
   }
   ```
3. POST to `https://brewing.foai.cloud/run`.
4. Boomer_Ops authors the weekly receipt against `templates/weekly_operating_receipt.md`.
5. NVIDIA fills in summary fields; Boomer_Ops fills in priorities and anomalies.
6. Owner reviews and approves the next-week plan via `owner_approval_decision`.

## Outputs
- AuditLedger route receipt
- Rendered weekly receipt at `drafts/<task_id>_weekly_receipt.md`
- Owner approval request — required to lock the next-week plan
- After approval: AuditLedger `approval_receipts` row with `decision='approved'` and the plan as `note`

## Risk tags applied
- (none on the receipt itself; any embedded action items inherit their own risk tags when they fire)

## Owner approval gate
Mandatory on the next-week plan. The receipt itself is informational; the plan is owner-bound.

## Failure modes
- Aggregation query fails → receipt renders with "data partial" header; owner alerted
- NVIDIA unavailable → premium_review fallback (or manual draft)
- Owner doesn't approve by Tuesday EOD → receipt auto-escalates as a Taskade task to the owner board

## Cadence escalation
If 4 consecutive weeks show declining subscription growth or rising support volume, the workflow attaches a "concerning trend" flag that goes into the receipt headline and triggers a side `risk_event` with `severity='high'`.

## When this workflow simplifies
Hostinger Ecommerce provides canonical revenue/churn/cohort numbers; the receipt's metrics tab fills in automatically. Manual narrative + priority-setting still requires Boomer_Ops + owner.
