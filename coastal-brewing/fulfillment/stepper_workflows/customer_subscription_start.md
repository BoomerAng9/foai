# Stepper workflow — customer_subscription_start

## Trigger
Stripe webhook `checkout.session.completed` for a Coastal Brewing subscription. Until billing is live, this trigger is a Stepper form submitted by Boomer_Finance after manual invoice payment.

## Inputs
- customer_email (required)
- customer_name (required)
- subscription_tier (required: `coffee_monthly` | `tea_monthly` | `combo_monthly`)
- shipping_address (required, structured)
- start_date (required, ISO date)
- stripe_customer_id (post-Phase-B)
- stripe_subscription_id (post-Phase-B)

## Workflow
1. Build a task packet:
   ```json
   {
     "task_id": "sub_<uuid>",
     "owner_goal": "Activate new Coastal subscription",
     "objective": "Schedule first shipment, draft welcome email, write subscription receipt",
     "department": "boomer_ops",
     "task_type": "draft_order_confirmation",
     "risk_tags": ["money"],
     "approval_required": true,
     "desired_output": "first shipment scheduled; welcome email draft; AuditLedger subscription row"
   }
   ```
2. POST to `https://brewing.foai.cloud/run` with `X-Coastal-Token` header.
3. Boomer_Ops drafts the supplier first-shipment order via `templates/supplier_certification_request.md` adapted for routine fulfillment.
4. Boomer_Marketing drafts a welcome email (NVIDIA route).
5. Owner approves both drafts before any send/transmit.

## Outputs
- AuditLedger route receipt at `receipts/<task_id>_route_receipt.json`
- Supplier first-shipment draft at `drafts/<task_id>_supplier_email.md`
- Welcome email draft at `drafts/<task_id>_welcome_email.md`
- Owner approval request at `owner_approvals/<task_id>_request.md`
- After approval: subscription row in AuditLedger `task_packets` with `status='active'`

## Risk tags applied
- `money` — every subscription moves money on a recurring basis

## Owner approval gate
Mandatory on both the supplier first-shipment transmission AND the welcome email send.

## Failure modes
- Stripe webhook signature mismatch (post-Phase-B) → reject; alert owner
- Supplier first-shipment rejected → owner-driven rollback; refund initiated through `owner_approval_decision` workflow
- Welcome email rejected by owner → re-draft loop with Boomer_Marketing

## When this workflow simplifies
Once Hostinger Ecommerce is live, the trigger becomes Hostinger's `subscription.created` event; the rest of the flow stays.
