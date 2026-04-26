# fulfillment/

Stepper-based fulfillment for Coastal Brewing. Replaces a traditional storefront platform until Hostinger Ecommerce is wired in (see `docs/08_hostinger_ecommerce_path.md`).

Every fulfillment action either:

1. Is allowed without owner approval (drafts, internal notes, classifications), OR
2. Has an `approval_required=true` row in Hermes with `decision='approved'` before OpenClaw executes.

Nothing publishes, sends, orders, refunds, or spends without that gate.

## Layout

```
fulfillment/
├── README.md                              # this file
└── stepper_workflows/                     # Taskade workflow specs (one per workflow)
    ├── customer_order_intake.md
    └── order_to_supplier.md
```

Each workflow spec describes:

- Trigger
- Inputs (form fields or upstream payload)
- Calls to the runner (`POST /run`, `POST /approve`)
- Outputs (Hermes receipts, drafts, owner approval requests)
- Risk tags applied
- Owner approval gate

## Adding a new fulfillment workflow

1. Add a Markdown spec to `stepper_workflows/<name>.md` using the existing files as a shape.
2. Author the actual workflow in Taskade (UI or API).
3. Configure the workflow to webhook into the runner with header `X-Coastal-Token: $COASTAL_GATEWAY_TOKEN`.
4. Add the workflow id to `automations/README.md` once it is live.
5. Add an example task packet under `examples/task_packets/` that the workflow emits.
6. Update the smoke test if the new flow needs a routing assertion.

## Why Stepper not n8n

Stepper is the canonical FOAI automation surface (Taskade-backed). Per the Sqwaadrun precedent (`~/foai/cti-hub/src/lib/billing/stepper-billing-proxy.ts`), every plug rides this spine.

n8n-style JSON skeletons in `automations/n8n/` are kept as topology reference only. The actual workflows live in Taskade and call the runner over HTTPS.
