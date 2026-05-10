# Gate 7 — Commercial Pipeline End-to-End Validation

Validates that the post-arbitration commercial pipeline (2026-04-17) is
wired together correctly: `@aims/contracts` + `@aims/picker-ang` +
`@aims/tool-warehouse` + `@aims/melanium`.

See `ACHEEVY_BRAIN.md` §36.4–§36.7 (AIMS repo) for the canon this gate
enforces.

## What this gate proves

1. **10-stage RFP → BAMARAM flow** — `createEngagement()` opens a
   matched `charters` + `ledgers` pair; `advanceStage()` walks the
   full ordinal path with HITL gating.
2. **Picker_Ang fires at Step 3 only** — `runPickerAngScan()` produces
   BoM (internal-full) + BoM (customer-safe) + Security Addendum + IIR
   scores, all persisted to the ledger.
3. **Customer-copy leak prevention** — internal-only tools (Manus AI)
   are relabeled through `customerSafeLabel`; the literal string
   "Manus" never appears in the customer BoM.
4. **IIR scoring math** — `0.45·Impact + 0.35·Integration + 0.20·(1−Risk)`
   with license-preference overrides, House of ANG bonus, and tier-
   aware risk tolerance.
5. **Melanium 70/30 split invariant** — `achievemorVault + customerBalance`
   sums to the fee *exactly* at round4 precision (what the DB
   `chk_melanium_split_sum` CHECK constraint depends on).
6. **Charter ↔ Ledger separation** — Charter-side query returns
   customer-safe stages only; Ledger retains full ICAR trail.

## How to run

### Unit tests (no DB required — run in any CI)

```bash
cd aims-tools/picker-ang      && npm test
cd aims-tools/tool-warehouse  && npm test
cd aims-tools/melanium        && npm test
```

All three use `tsx --test` (via `npx tsx`). No framework, no DB, no
secrets. `tsx` is listed as a devDependency; CI runs `npm install`
before `npm test`.

Current pass counts:

- `@aims/picker-ang`: 8/8
- `@aims/tool-warehouse`: 5/5
- `@aims/melanium`: 7/7

### End-to-end smoke (requires a throwaway Neon branch)

```bash
cd aims-tools/contracts
# Run migrations first so the schema exists on the test branch:
# psql $NEON_TEST_URL -f migrations/001_charter_ledger.sql (and others)

NEON_TEST_URL=postgres://user:pass@host/db npm run smoke:gate-7
```

Without `NEON_TEST_URL` set, the script prints a DRY-RUN banner
describing exactly what it would do and exits 0. This is intentional —
the unit tests alone are enough to block merges; the smoke is for
manual verification against a live schema.

## Test file map

| File | Scope |
|------|-------|
| `picker-ang/src/__tests__/scoring.test.ts` | IIR math + internal-only pinning |
| `tool-warehouse/src/__tests__/enforcement.test.ts` | Manus leak prevention |
| `melanium/src/__tests__/pricing.test.ts` | 70/30 split + $0.99 fee + projection |
| `contracts/scripts/smoke-commercial-pipeline.ts` | Full 10-stage walkthrough |

## What this gate does NOT cover (deferred)

- **TTD-DR integration** — the smoke simulates TTD-DR via a ledger
  entry but does not round-trip through `runtime/ttd-dr/`. A separate
  gate covers the FastAPI HMAC path.
- **Iller_Ang delivery artifacts** — rendering of the Charter PDF and
  attached creative assets is out-of-scope here; the smoke only
  verifies that the charter row exists with the expected stage count.
  Iller_Ang creative flow has its own skill-invoked validation path.
- **Inworld / Spinner voice** — the commercial pipeline can be walked
  silently via REST; voice is a delivery surface, not part of the
  gate.

## Closing Gate 7

Gate 7 passes when:

- [x] `npm test` green in `aims-tools/picker-ang`
- [x] `npm test` green in `aims-tools/tool-warehouse`
- [x] `npm test` green in `aims-tools/melanium`
- [ ] `npm run smoke:gate-7` green in `aims-tools/contracts` with a
      live `NEON_TEST_URL` (operator-run, not CI)

The unchecked box is intentional — it requires a throwaway Neon
branch the CI job can't safely create on its own.
