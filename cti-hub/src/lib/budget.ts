/**
 * Platform budget service — tracks spending against a $20 POC dev budget.
 * Every paid API call deducts from the balance. When exhausted, blocks paid operations.
 */
import { sql } from '@/lib/insforge';

const BUDGET_ID = 'poc-dev';

export interface BudgetStatus {
  starting: number;
  remaining: number;
  exhausted: boolean;
}

export class BudgetExhaustedError extends Error {
  constructor() {
    super('Dev budget has been reached. Contact the admin to continue.');
    this.name = 'BudgetExhaustedError';
  }
}

export async function getBudget(): Promise<BudgetStatus> {
  if (!sql) return { starting: 20, remaining: 20, exhausted: false };

  try {
    const rows = await sql`
      SELECT starting_balance, remaining_balance, is_exhausted
      FROM platform_budget WHERE id = ${BUDGET_ID} LIMIT 1
    `;

    if (rows.length === 0) {
      return { starting: 20, remaining: 20, exhausted: false };
    }

    return {
      starting: Number(rows[0].starting_balance),
      remaining: Number(rows[0].remaining_balance),
      exhausted: Boolean(rows[0].is_exhausted),
    };
  } catch (err) {
    console.error('[Budget] Failed to read budget:', err instanceof Error ? err.message : err);
    return { starting: 20, remaining: 20, exhausted: false };
  }
}

export async function checkBudget(): Promise<void> {
  const budget = await getBudget();
  if (budget.exhausted || budget.remaining <= 0) {
    throw new BudgetExhaustedError();
  }
}

export async function deductCost(
  userId: string,
  action: string,
  cost: number,
): Promise<BudgetStatus> {
  if (!sql || cost <= 0) return getBudget();

  try {
    // Atomic deduction — only succeeds if sufficient balance remains
    const rows = await sql`
      UPDATE platform_budget
      SET remaining_balance = remaining_balance - ${cost},
          is_exhausted = (remaining_balance - ${cost}) <= 0
      WHERE id = ${BUDGET_ID} AND remaining_balance >= ${cost}
      RETURNING starting_balance, remaining_balance, is_exhausted
    `;

    if (rows.length === 0) {
      throw new BudgetExhaustedError();
    }

    const newBalance = Number(rows[0].remaining_balance);

    // Record in ledger
    await sql`
      INSERT INTO budget_ledger (user_id, action, cost, balance_after)
      VALUES (${userId}, ${action}, ${cost}, ${newBalance})
    `.catch(err => console.error('[Budget] Ledger write failed:', err instanceof Error ? err.message : err));

    return {
      starting: rows.length > 0 ? Number(rows[0].starting_balance) : 20,
      remaining: newBalance,
      exhausted: rows.length > 0 ? Boolean(rows[0].is_exhausted) : false,
    };
  } catch (err) {
    console.error('[Budget] Deduction failed:', err instanceof Error ? err.message : err);
    return getBudget();
  }
}

export async function resetBudget(startingBalance: number = 20): Promise<BudgetStatus> {
  if (!sql) return { starting: startingBalance, remaining: startingBalance, exhausted: false };

  await sql`
    UPDATE platform_budget
    SET starting_balance = ${startingBalance},
        remaining_balance = ${startingBalance},
        is_exhausted = false,
        last_reset = NOW()
    WHERE id = ${BUDGET_ID}
  `;

  return { starting: startingBalance, remaining: startingBalance, exhausted: false };
}
