# Stepper workflow — order_to_supplier

## Trigger
Owner approval of a `customer_order_intake` task packet (POST to `/approve` with `decision='approved'`).

## Workflow
1. On owner approval, Stepper reads the supplier order draft from `drafts/<task_id>_supplier_email.md`.
2. Renders the draft against `templates/supplier_certification_request.md` if cert info is needed, or against a plain order template otherwise.
3. Builds a task packet:
   ```json
   {
     "task_id": "supply_<uuid>",
     "owner_goal": "Transmit owner-approved supplier order",
     "objective": "Send supplier order email and record transmission",
     "department": "boomer_ops",
     "task_type": "supplier_order_transmit",
     "risk_tags": ["supplier_change", "money"],
     "approval_required": true,
     "desired_output": "supplier order transmitted; AuditLedger receipt with timestamp + recipient"
   }
   ```
4. POST to `https://brewing.foai.cloud/run`.
5. Until owner authorizes a live email channel, the workflow stops at draft and notifies owner with the rendered email body for manual send.
6. After live channel is authorized, the workflow sends via the configured channel and writes a AuditLedger `model_call_receipts` row with `provider='manual'` or `provider='taskade'` plus the supplier acknowledgement payload.

## Outputs
- Supplier order email body in `drafts/<task_id>_supplier_email.md`
- AuditLedger receipt at `receipts/<task_id>_route_receipt.json`
- Owner approval request at `owner_approvals/<task_id>_request.md` (one for the transmission step itself)
- After transmission: `action_receipts` row with status `transmitted`

## Risk tags applied
- `supplier_change` — first transmission to a new supplier triggers this
- `money` — supplier orders commit money

## Owner approval gate
Mandatory at two layers:
1. Order itself was approved upstream (`customer_order_intake`).
2. Transmission to the supplier is a separate approval to keep the owner in the loop on every outbound action.

## Failure modes
- Owner rejects transmission → order goes back to drafts pile; customer notified of delay.
- Supplier acknowledgement timeout → Boomer_Ops escalates to owner; manual recovery path.
- Supplier rejects the order → owner notified with reason; refund flow if any payment was captured.

## When this workflow simplifies
Once Hostinger Ecommerce is live AND the supplier has an API:
- Transmission becomes an automated POST to the supplier portal.
- Owner approval still gates the first transmission per supplier and any supplier change.
- Retry / acknowledgement / escalation logic becomes the supplier API's domain instead of email.
