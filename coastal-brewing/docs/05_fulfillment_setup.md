# 05 — Fulfillment Setup (Stepper, no Shopify)

Coastal Brewing fulfills orders through a Stepper-backed pipeline that runs entirely on Taskade workflows webhooking into the runner. Hostinger Ecommerce is the planned storefront destination; until it lands, this is the full path from customer intent to supplier ship.

## End-to-end flow

```
customer intent
  → Taskade Stepper form (intake)
    → POST https://brewing.foai.cloud/run
      → router → boomer_ops + boomer_quality
        → if any public claim involved → feynman + owner
        → else → nvidia draft for confirmation copy
    → owner approval gate (refunds, supplier orders, anything money)
  → templates/supplier_certification_request.md → manual supplier email (owner-sent until live channel approved)
  → supplier fulfills + ships
  → customer confirmation routed back through Stepper
  → AuditLedger records every step
```

## Stepper workflows required

Author each in Taskade. Each posts to the runner with `X-Coastal-Token: $COASTAL_GATEWAY_TOKEN`.

| Workflow | Trigger | Endpoint | Risk tags |
|---|---|---|---|
| customer_order_intake | Stepper form submit | `POST /run` | (none initially; high if any claim made) |
| customer_subscription_start | Stepper form submit | `POST /run` | `money` |
| supplier_order_drafted | Internal Boomer_Ops | `POST /run` | `supplier_change`, `money` |
| owner_approval_decision | Owner email reply | `POST /approve` | (records decision) |
| customer_confirmation | Routed by router | `POST /run` | (none) |
| daily_operating_digest | Cron 06:00 | `POST /run` | (none) |
| weekly_operating_receipt | Cron Mon 09:00 | `POST /run` | (none) |

## Supplier

- Default: Temecula Coffee Roasters
- Lead time: TBD via supplier_due_diligence packet
- Wholesale account: opened only after Feynman due-diligence receipt is green and owner approves
- First order: small owner-approved test order; result logged in `supplier_records`
- The supplier may not see the public Coastal Brewing surface (`brewing.foai.cloud`) until the test order completes successfully

## What requires owner approval

Per `docs/04_owner_approval_boundaries.md`. For fulfillment specifically:

- First test order with the supplier
- Every wholesale order over a threshold (owner sets)
- Any refund over a threshold
- Any subscription billing change
- Any change of supplier
- Any change to the public product page (when storefront comes online)

## Storefront — interim posture

Until Hostinger Ecommerce is live, the customer-facing surface is:

- Single landing page at `brewing.foai.cloud` (static or runner-rendered)
- Stepper-hosted product/order forms linked from the landing
- Confirmation emails drafted by NVIDIA route, sent only after owner approval

When Hostinger Ecommerce is available, see `docs/08_hostinger_ecommerce_path.md`.

## Customer comms

- All customer email is **drafted only** in `drafts/` until owner approves a send-policy
- Boomer_CX classifies and drafts; nothing leaves the runner without owner approval
- Refund replies go to owner approval queue

## Why no Shopify

- Owner directive: no Shopify build
- Storefront destination is Hostinger Ecommerce (planned)
- Bridge layer = Stepper, which we already operate
- Avoids a Shopify migration cost when Hostinger Ecommerce ships
