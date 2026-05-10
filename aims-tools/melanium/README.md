# @aims/melanium

**Melanium Ingot A2P currency.** Every agent-to-agent transaction in the
ACHIEVEMOR ecosystem appends a **$0.99 Digital Maintenance Fee** split
70% / 30%:

- **70% → ACHIEVEMOR Melanium vault** ($0.693) — funds A2P operations,
  infrastructure credits, tool-warehouse expansion.
- **30% → customer platform currency balance** ($0.297) — accumulates as
  Deploy credits, marketplace balance, referral rewards. **This is the
  Savings Plan allocation under the Melanium branding.**

**Charter (customer-facing):** one line — `Digital Maintenance Fee: $0.99`.

**Ledger (internal):** full split — `provider_cost`, `achievemor_margin`,
`subtotal`, `digital_maintenance_fee`, `achievemor_vault_amount`,
`customer_balance_amount`, `vault_id`, customer balance trail.

See `docs/canon/sivis_governance.md#dual-surface-coupling-charter--ledger`
+ the 2026-04-17 Rish arbitration
(`project_deploy_docs_arbitration_2026_04_17` in memory) for canon.

## Scope of this PR

- `migrations/001_init.up.sql` — 3 tables (`melanium_transactions`,
  `customer_balances`, `customer_balance_events`).
- `src/schema.ts` — zod types matching the canonical Ledger Melanium
  allocation shape from `@aims/contracts/ledger-schema`.
- `src/pricing.ts` — pure `calculateTransactionCost(provider, margin)`
  helper. Constants: `DIGITAL_MAINTENANCE_FEE = 0.99`, `VAULT_SPLIT = 0.70`,
  `CUSTOMER_SPLIT = 0.30`.
- `src/queries.ts` — `recordMelaniumTransaction(...)` writes to all three
  tables in one transaction + cross-writes to the Charter/Ledger pair via
  `@aims/contracts`.
- `src/client.ts` — postgres wrapper, same pattern as `@aims/contracts`.

## Not yet wired

- Middleware that appends the fee to every A2P op — lives in Spinner (PR 4)
  and Picker_Ang (PR 4) once those are built.
- Vault withdrawal paths — the ACHIEVEMOR operations side is out of scope
  for PR 3.
- Referral bonus double-match logic — stub hook exists in
  `customer_balance_events.event_type` enum but the workflow lives in the
  referral engine (later PR).

## Environment

Reads connection in order:
`MELANIUM_DATABASE_URL` → `NEON_DATABASE_URL` → `DATABASE_URL`.

## Usage (post-migration)

```ts
import { calculateTransactionCost, recordMelaniumTransaction } from '@aims/melanium';

const cost = calculateTransactionCost({
  providerCost: 1.05,
  achievemorMargin: 3.15,
});
// → {
//     subtotal: 4.20,
//     digitalMaintenanceFee: 0.99,
//     totalCustomerCharge: 5.19,
//     melaniumSplit: { achievemorVault: 0.693, customerBalance: 0.297 }
//   }

await recordMelaniumTransaction({
  transactionId: 'txn_abc123',
  customerId: 'cust_xyz789',
  engagementId: 'eng_2026_04_17_001',                  // optional
  cost,
});
```

## Projection (canon planning figure)

Per 2026-04-17 arbitration: **$78.4M/year** combined at 10K users
— $54.9M ACHIEVEMOR vault + $23.5M customer balances.
