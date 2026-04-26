# Stepper workflow — owner_approval_decision

## Trigger
Owner replies to an approval-request email (sent by another workflow) OR clicks an approve/reject button in the Taskade owner board.

## Inputs
- approval_id (from the request)
- task_id (parent)
- decision (`approved` | `rejected`)
- decided_by (owner email)
- note (optional)

## Workflow
1. Stepper validates that `approval_id` corresponds to an open approval request in AuditLedger.
2. POST to `https://brewing.foai.cloud/approve` with `X-Coastal-Token` header and:
   ```json
   {
     "task_id": "<task_id>",
     "approval_id": "<approval_id>",
     "decision": "<approved|rejected>",
     "decided_by": "<owner_email>",
     "note": "<optional>"
   }
   ```
3. Runner writes a decision file at `owner_approvals/<approval_id>_decision.json` and updates the AuditLedger `approval_receipts` row.
4. Stepper notifies the originating workflow:
   - `approved` → originating workflow proceeds to its next step (transmit, send, publish)
   - `rejected` → originating workflow halts, files a `risk_event` with `severity='medium'` and `category='owner_rejected'`, notifies the originator (Boomer_Ang department) with the note

## Outputs
- Decision file at `owner_approvals/<approval_id>_decision.json`
- AuditLedger `approval_receipts` row with `decision` + `decided_at`
- Risk event row (if rejected)

## Risk tags applied
- (none — this workflow records a decision, not a risk event itself)

## Owner approval gate
This workflow IS the gate. It does not create new approval requests; it resolves them.

## Failure modes
- approval_id not found → reject Stepper input; alert owner
- runner unreachable → Stepper retries up to 3 times; on final failure, owner is alerted to retry manually
- decision not in (`approved`, `rejected`) → 400 from runner; Stepper re-prompts owner

## Idempotency
The runner accepts the same `approval_id + decision` pair multiple times without re-firing downstream effects. The decision file is overwritten with the latest `decided_at`. Downstream workflows MUST track whether they've already consumed the approval to avoid double-execution.

## Authentication
- Stepper webhook uses `X-Coastal-Token` from the runner's gateway secret
- Owner identity: matched against `OWNER_APPROVAL_EMAIL` in runner env. Mismatch → 403.
