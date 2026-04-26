# 08 — Hostinger Ecommerce Path (future storefront)

The planned storefront for Coastal Brewing is **Hostinger Ecommerce** at https://hpanel.hostinger.com/ecommerce. Until it is available and provisioned for the `brewing.foai.cloud` (or sibling) surface, the company runs storefront-less: intake via Stepper, fulfillment via supplier with owner approval.

## When Hostinger Ecommerce is available

1. Provision the store under the AIMS Hostinger account.
2. Decide the customer-facing domain:
   - Option A: `brewing.foai.cloud` becomes the storefront; the runner moves to a private subdomain (e.g., `runner.brewing.foai.cloud`).
   - Option B: `brewing.foai.cloud` stays the runner; the storefront takes a sibling like `shop.brewing.foai.cloud` or `coastalbrewing.com` (owned domain).
3. Populate `HOSTINGER_ECOMMERCE_API_BASE`, `HOSTINGER_ECOMMERCE_API_KEY`, `HOSTINGER_ECOMMERCE_STORE_ID` in the runner `.env`.
4. Author Stepper workflows that mirror the current intake flow but use Hostinger Ecommerce's webhook events (`order.created`, `subscription.charged`, `customer.created`) as triggers instead of Stepper forms.
5. Map every Hostinger Ecommerce product to a Coastal Brewing product page template (`templates/product_page_template.md`); no claim ships without a verified receipt.
6. Replace the static landing page with the Hostinger Ecommerce storefront.

## What stays the same

- The runner — `coastal-runner` keeps doing routing, receipts, approvals, drafts.
- The model lanes — Feynman / NVIDIA / premium / owner.
- The one-direction flow — Hostinger Ecommerce becomes another upstream surface, not a new operator.
- Hermes — every Hostinger Ecommerce event lands as a receipt.
- OpenClaw policy — no auto-publish, no auto-send, no auto-refund.

## What changes

| Surface | Pre-Hostinger | Post-Hostinger |
|---|---|---|
| Customer intake | Stepper form | Hostinger Ecommerce checkout |
| Product catalog | `templates/product_page_template.md` (paper) | Hostinger Ecommerce product objects |
| Order fulfillment trigger | Stepper webhook → runner | Hostinger Ecommerce webhook → runner |
| Refund processing | Manual via owner approval | Hostinger Ecommerce refund API gated on owner approval |
| Subscription billing | (deferred) | Hostinger Ecommerce subscription module |

## Migration gate

Do not migrate until:

1. Hostinger Ecommerce is generally available with documented webhooks
2. Subscription billing module is live (or owner accepts deferred subscriptions)
3. Owner approves the storefront layout, copy, and policies
4. Boomer_Quality has signed off on every product page
5. A test purchase end-to-end has been completed and receipts written

## Risk register entries to open at migration time

- Inventory drift between supplier capacity and Hostinger Ecommerce listings
- Refund policy alignment between Hostinger Ecommerce and Coastal terms
- Tax-collection coverage for owner's nexus states
- Cookie / privacy policy update for Hostinger Ecommerce surface
- Domain redirect path if storefront takes the apex
