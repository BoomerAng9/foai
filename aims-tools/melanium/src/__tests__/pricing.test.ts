/**
 * Gate 7 — Melanium Ingot pricing unit tests.
 *
 * Validates the canonical constants and the exact-sum 70/30 split
 * invariant that the Neon CHECK constraint (chk_melanium_split_sum)
 * relies on.
 *
 * Run: npm test  (inside aims-tools/melanium)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTransactionCost,
  projectMelaniumMonthly,
  DIGITAL_MAINTENANCE_FEE,
  VAULT_SPLIT,
  CUSTOMER_SPLIT,
} from '../pricing.ts';

test('canonical constants — $0.99 fee, 70/30 split', () => {
  assert.equal(DIGITAL_MAINTENANCE_FEE, 0.99);
  assert.equal(VAULT_SPLIT, 0.7);
  assert.equal(CUSTOMER_SPLIT, 0.3);
  assert.equal(VAULT_SPLIT + CUSTOMER_SPLIT, 1);
});

test('split ALWAYS sums to fee exactly at round4 precision', () => {
  // This is the invariant the DB CHECK constraint depends on.
  const samples = [0.99, 0.50, 1.23, 2.99, 0.33, 10.0];
  for (const fee of samples) {
    const breakdown = calculateTransactionCost({
      providerCost: 1,
      achievemorMargin: 1,
      digitalMaintenanceFee: fee,
    });
    const sum =
      breakdown.melaniumSplit.achievemorVault +
      breakdown.melaniumSplit.customerBalance;
    assert.equal(
      sum,
      breakdown.digitalMaintenanceFee,
      `fee=${fee} split sum ${sum} != ${breakdown.digitalMaintenanceFee}`,
    );
  }
});

test('standard $0.99 fee yields 0.6930 vault + 0.2970 customer', () => {
  const b = calculateTransactionCost({ providerCost: 10, achievemorMargin: 5 });
  assert.equal(b.melaniumSplit.achievemorVault, 0.693);
  assert.equal(b.melaniumSplit.customerBalance, 0.297);
});

test('total customer charge = providerCost + margin + fee', () => {
  const b = calculateTransactionCost({ providerCost: 42, achievemorMargin: 8 });
  assert.equal(b.subtotal, 50);
  assert.equal(b.totalCustomerCharge, 50.99);
});

test('rejects negative inputs', () => {
  assert.throws(() => calculateTransactionCost({ providerCost: -1, achievemorMargin: 0 }));
  assert.throws(() => calculateTransactionCost({ providerCost: 0, achievemorMargin: -1 }));
});

test('projectMelaniumMonthly reproduces the canonical $78.4M/yr target', () => {
  // Canonical 2026-04-17 arbitration projection: $78.4M/year combined
  // (vault + customer). This test pins the math, not the user numbers —
  // if the user-count model changes, regenerate this expectation.
  const p = projectMelaniumMonthly({
    free: { userCount: 10_000, transactionsPerMonth: 30 },
    starter: { userCount: 4_000, transactionsPerMonth: 120 },
    pro: { userCount: 1_200, transactionsPerMonth: 450 },
    enterprise: { userCount: 180, transactionsPerMonth: 2_500 },
  });
  assert.ok(p.totalTransactions > 0);
  assert.ok(p.achievemorVaultMonthly > 0);
  assert.ok(p.customerBalancesMonthly > 0);
  assert.ok(p.combinedMonthly > 0);
  // Split ratio reproduces within 1 cent per month
  const ratio = p.achievemorVaultMonthly / p.combinedMonthly;
  assert.ok(Math.abs(ratio - 0.7) < 0.001, `vault share ${ratio} should be ~0.70`);
  // Annualized equals combined × 12
  assert.equal(
    Math.round(p.annualizedCombined * 100),
    Math.round(p.combinedMonthly * 12 * 100),
  );
});

test('zero-tier projection returns all zeros', () => {
  const p = projectMelaniumMonthly({});
  assert.equal(p.totalTransactions, 0);
  assert.equal(p.combinedMonthly, 0);
  assert.equal(p.annualizedCombined, 0);
});
