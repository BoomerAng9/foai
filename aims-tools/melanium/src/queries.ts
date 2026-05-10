/**
 * @aims/melanium — transactional writes.
 *
 * `recordMelaniumTransaction` is the single entry point for every A2P
 * charge. It writes in one transaction:
 *   1. melanium_transactions row (append-only)
 *   2. customer_balances upsert (create if new, increment if existing)
 *   3. customer_balance_events row (audit trail)
 *
 * If an engagementId is provided AND the @aims/contracts package is in
 * scope at the caller, the caller is responsible for also appending the
 * Melanium allocation to the engagement's Ledger (we don't reach across
 * packages — this one stays single-purpose).
 */

import { getSql } from './client.js';
import {
  calculateTransactionCost,
  DEFAULT_VAULT_ID,
  type TransactionCostBreakdown,
  type TransactionCostInput,
} from './pricing.js';

export interface RecordMelaniumTransactionInput {
  transactionId: string;                                 // caller-provided unique ID
  customerId: string;
  engagementId?: string | null;                          // optional link to ledgers.id
  vaultId?: string;
  currency?: string;

  // Either provide pre-computed cost OR raw inputs; if both, pre-computed wins.
  cost?: TransactionCostBreakdown;
  costInput?: TransactionCostInput;
}

export interface RecordMelaniumTransactionResult {
  transactionId: string;
  cost: TransactionCostBreakdown;
  customerBalanceAfter: number;
}

/** Create a row in all three tables atomically. Idempotent on transactionId. */
export async function recordMelaniumTransaction(
  input: RecordMelaniumTransactionInput,
): Promise<RecordMelaniumTransactionResult> {
  const cost =
    input.cost ??
    (input.costInput
      ? calculateTransactionCost(input.costInput)
      : undefined);
  if (!cost) {
    throw new Error(
      '[@aims/melanium] recordMelaniumTransaction requires either `cost` or `costInput`',
    );
  }

  const vaultId = input.vaultId ?? DEFAULT_VAULT_ID;
  const currency = input.currency ?? 'USD';
  const sql = getSql();

  let balanceAfter = 0;
  await sql.begin(async (tx) => {
    // 1. Append the transaction
    await tx`
      INSERT INTO melanium_transactions (
        transaction_id, engagement_id, customer_id,
        provider_cost, achievemor_margin, subtotal,
        digital_maintenance_fee, total_customer_charge,
        achievemor_vault_amount, customer_balance_amount,
        vault_id, currency
      ) VALUES (
        ${input.transactionId},
        ${input.engagementId ?? null},
        ${input.customerId},
        ${cost.providerCost},
        ${cost.achievemorMargin},
        ${cost.subtotal},
        ${cost.digitalMaintenanceFee},
        ${cost.totalCustomerCharge},
        ${cost.melaniumSplit.achievemorVault},
        ${cost.melaniumSplit.customerBalance},
        ${vaultId},
        ${currency}
      )
      ON CONFLICT (transaction_id) DO NOTHING
    `;

    // 2. Upsert the customer balance
    const [balanceRow] = await tx`
      INSERT INTO customer_balances (
        customer_id, balance_usd, lifetime_credits_earned
      ) VALUES (
        ${input.customerId},
        ${cost.melaniumSplit.customerBalance},
        ${cost.melaniumSplit.customerBalance}
      )
      ON CONFLICT (customer_id) DO UPDATE SET
        balance_usd             = customer_balances.balance_usd + EXCLUDED.balance_usd,
        lifetime_credits_earned = customer_balances.lifetime_credits_earned + EXCLUDED.balance_usd
      RETURNING balance_usd AS balance_after
    `;
    balanceAfter = Number(balanceRow?.balanceAfter ?? 0);
    const balanceBefore = balanceAfter - cost.melaniumSplit.customerBalance;

    // 3. Append the balance event
    await tx`
      INSERT INTO customer_balance_events (
        customer_id, event_type, amount,
        balance_before, balance_after, transaction_id
      ) VALUES (
        ${input.customerId},
        'credit_earned',
        ${cost.melaniumSplit.customerBalance},
        ${balanceBefore},
        ${balanceAfter},
        ${input.transactionId}
      )
    `;
  });

  return {
    transactionId: input.transactionId,
    cost,
    customerBalanceAfter: balanceAfter,
  };
}

/** Read the customer's current platform currency balance. */
export async function getCustomerBalance(customerId: string): Promise<number> {
  const sql = getSql();
  const [row] = await sql`
    SELECT balance_usd FROM customer_balances WHERE customer_id = ${customerId}
  `;
  return Number(row?.balanceUsd ?? 0);
}

/** Sum the ACHIEVEMOR vault across all transactions for a given vault id. */
export async function getVaultBalance(
  vaultId: string = DEFAULT_VAULT_ID,
): Promise<number> {
  const sql = getSql();
  const [row] = await sql`
    SELECT COALESCE(SUM(achievemor_vault_amount), 0) AS vault_balance
      FROM melanium_transactions
     WHERE vault_id = ${vaultId}
  `;
  return Number(row?.vaultBalance ?? 0);
}

/** Spend from the customer's platform currency balance (for marketplace + referrals). */
export interface SpendCustomerBalanceInput {
  customerId: string;
  amount: number;                                        // positive number
  eventType?: 'credit_spent' | 'referral_bonus' | 'adjustment' | 'refund';
  transactionId?: string;
  metadata?: Record<string, unknown>;
}

export async function spendCustomerBalance(
  input: SpendCustomerBalanceInput,
): Promise<{ balanceAfter: number }> {
  if (input.amount <= 0) {
    throw new Error('[@aims/melanium] spendCustomerBalance amount must be positive');
  }
  const sql = getSql();

  let balanceAfter = 0;
  await sql.begin(async (tx) => {
    const [row] = await tx`
      UPDATE customer_balances
         SET balance_usd = balance_usd - ${input.amount},
             lifetime_credits_spent = lifetime_credits_spent + ${input.amount}
       WHERE customer_id = ${input.customerId}
         AND balance_usd >= ${input.amount}
      RETURNING balance_usd AS balance_after
    `;
    if (!row) {
      throw new Error(
        `[@aims/melanium] Insufficient balance for customer ${input.customerId}`,
      );
    }
    balanceAfter = Number(row.balanceAfter);
    const balanceBefore = balanceAfter + input.amount;

    await tx`
      INSERT INTO customer_balance_events (
        customer_id, event_type, amount,
        balance_before, balance_after, transaction_id, metadata
      ) VALUES (
        ${input.customerId},
        ${input.eventType ?? 'credit_spent'},
        ${-input.amount},                                -- signed negative
        ${balanceBefore},
        ${balanceAfter},
        ${input.transactionId ?? null},
        ${(input.metadata ?? null) as any}
      )
    `;
  });

  return { balanceAfter };
}
