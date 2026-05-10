# Stepper workflow — customer_confirmation

## Trigger
Owner approves a customer-facing send (order confirmation, subscription welcome, shipment notification, refund notice) via `owner_approval_decision`.

## Inputs
- task_id (parent)
- approval_id (from the parent approval)
- customer_email
- email_subject (from the draft)
- email_body_path (`drafts/<task_id>_customer_<type>.md`)

## Workflow
1. Stepper reads the approved draft from `drafts/<task_id>_customer_<type>.md`.
2. Renders the body against `templates/support_macro_low_risk.md` if applicable, or uses the draft as-is.
3. Build a task packet:
   ```json
   {
     "task_id": "conf_<uuid>",
     "owner_goal": "Send approved customer comms",
     "objective": "Transmit the approved email to the customer",
     "department": "boomer_cx",
     "task_type": "draft_email",
     "risk_tags": [],
     "approval_required": false,
     "desired_output": "email transmitted; AuditLedger action receipt"
   }
   ```
4. POST to `https://brewing.foai.cloud/run`.
5. Until live email channel is authorized, the draft is shown to the owner for manual send.
6. Once live (post-Phase-5), Stepper sends via the configured channel (SendGrid / Resend / Hostinger Mail) and writes a AuditLedger `action_receipts` row with `status='sent'` + transmission details.

## Outputs
- AuditLedger route receipt
- (post-live) AuditLedger `action_receipts` row with status `sent`
- Customer-side email landing in their inbox

## Risk tags applied
- (none — sending an OWNER-APPROVED draft is not a risk event itself)

## Owner approval gate
Inherited from the upstream workflow. This workflow does NOT add a new gate — it transmits what was already approved.

## Failure modes
- Email channel rejects the send (bounce, hard fail) → Stepper writes failure to AuditLedger, notifies Boomer_CX, no retry without owner approval
- Customer email invalid → mark customer record `email_status='invalid'`; alert owner
- Draft path not found → 404 from runner; abort transmission

## When this workflow simplifies
With a single canonical email channel wired (e.g., Resend), the manual-send fallback disappears; transmission becomes deterministic.
