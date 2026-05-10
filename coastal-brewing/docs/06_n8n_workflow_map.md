# n8n Workflow Map

## Workflows included

1. `nvidia_bulk_content_generation.json`
2. `nvidia_support_classifier.json`
3. `feynman_claim_verification_gate.json`
4. `feynman_supplier_due_diligence.json`
5. `daily_operating_digest.json`
6. `owner_approval_request.json`
7. `shopify_order_to_supplier_stub.json`

## Test mode first

All workflows should begin in manual/test mode. Do not connect live publishing, live refunds, or live supplier changes until owner approval routing works.

## Receipt standard

Every workflow should write a receipt to AuditLedger or `/receipts`.
