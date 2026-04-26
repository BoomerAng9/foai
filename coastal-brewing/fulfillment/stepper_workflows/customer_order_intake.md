# Stepper workflow — customer_order_intake

## Trigger
Stepper form submission on the public Coastal Brewing intake page (linked from `brewing.foai.cloud`).

## Form fields
- customer_email (required)
- customer_name (required)
- shipping_address (required, structured)
- product_selection (required, repeatable)
- quantity (per product, required)
- delivery_window_preference (optional)
- gift_message (optional, ≤ 280 chars)
- consent_to_receive_email (required, boolean)

## Workflow
1. Validate required fields. Reject submission with friendly Stepper error if any are missing.
2. Build a task packet:
   ```json
   {
     "task_id": "order_<uuid>",
     "owner_goal": "Process new customer order",
     "objective": "Route order, draft confirmation, queue supplier order draft",
     "department": "boomer_ops",
     "task_type": "draft_order_confirmation",
     "risk_tags": ["money"],
     "approval_required": true,
     "desired_output": "draft confirmation email + supplier order draft + Hermes receipt"
   }
   ```
3. POST to `https://brewing.foai.cloud/run` with header `X-Coastal-Token: $COASTAL_GATEWAY_TOKEN`.
4. Capture the returned `receipt_id` and `placeholder_path`.
5. Write a Taskade task in the operator board linking to the receipt path on the runner.
6. Owner-approval workflow fires (see `templates/owner_approval_request.md`).

## Outputs
- Hermes receipt at `receipts/<task_id>_route_receipt.json`
- Owner approval request at `owner_approvals/<task_id>_request.md`
- (after approval) supplier order draft at `drafts/<task_id>_supplier_email.md`
- (after approval) customer confirmation draft at `drafts/<task_id>_customer_confirmation.md`

## Risk tags applied
- `money` — every order moves money

## Owner approval gate
Mandatory. The order does not transmit to the supplier and the customer confirmation does not send until the owner approves both drafts.

## Failure modes
- Form validation fails → Stepper error to customer; no Hermes write.
- Runner unreachable → Stepper retries up to 3 times with exponential backoff; on final failure, Stepper queues a Taskade alert to owner.
- Owner rejects → customer is told the order cannot be fulfilled at this time; refund flow if any payment was captured.

## Open questions
- Payment capture: pre-Hostinger Ecommerce, payment is owner-handled out-of-band (invoice sent post-approval). Once Hostinger Ecommerce is live, payment is captured on form submission and refunds flow through the Hostinger refund API gated on owner approval.
