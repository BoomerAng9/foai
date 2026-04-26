# Stepper workflow — supplier_order_drafted

## Trigger
A `customer_order_intake`, `customer_subscription_start`, or routine restock event produced a supplier order draft in `drafts/<task_id>_supplier_email.md`.

## Inputs
- task_id (parent)
- supplier_id
- product_skus + quantities
- shipping address (customer or warehouse)
- requested_ship_date

## Workflow
1. Boomer_Ops verifies the draft is complete (all fields populated, no claim language without verification).
2. Build a task packet:
   ```json
   {
     "task_id": "supdraft_<uuid>",
     "owner_goal": "Validate supplier order draft before owner approval",
     "objective": "Render the draft, run claim audit, queue owner approval",
     "department": "boomer_ops",
     "task_type": "supplier_order_transmit",
     "risk_tags": ["supplier_change", "money"],
     "approval_required": true,
     "desired_output": "validated supplier order draft + claim-audit verdict + owner approval request"
   }
   ```
3. POST to `https://brewing.foai.cloud/run`.
4. Boomer_Quality runs claim audit (no organic / fair-trade / health language unless paired with a verified Feynman receipt). Strike entries flagged.
5. Chicken_Hawk reviews the strike list and the supplier order body.
6. Owner approval request fires.

## Outputs
- Hermes route receipt
- Validated supplier order draft (claim-audit'd) at `drafts/<task_id>_supplier_email_audited.md`
- Claim audit row in `claim_verification_receipts` for any flagged term
- Owner approval request at `owner_approvals/<task_id>_request.md`

## Risk tags applied
- `supplier_change` — first transmission to a new supplier
- `money` — supplier orders commit money

## Owner approval gate
Mandatory. Owner reviews the audited draft + the claim-audit verdict + the supplier email body. Only after approval does `order_to_supplier` fire.

## Failure modes
- Claim audit produces strikes that block the order → Boomer_Marketing redrafts; not transmitted to supplier
- Owner rejects → order goes back to drafts queue; customer notified of delay
- Supplier portal not reachable (post-live-channel) → retry per `order_to_supplier`'s policy

## When this workflow simplifies
With Hostinger Ecommerce + supplier API: claim audit still happens; supplier transmission becomes a direct API POST gated on owner approval. No email composition step.
