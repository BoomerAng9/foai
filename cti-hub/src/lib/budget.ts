/**
 * Platform budget service — tracks spending per-user against tier credits.
 * Every LLM call deducts from the user's credit balance. When exhausted, blocks operations.
 * Owner bypass: owner accounts are never blocked.
 */
import { sql } from '@/lib/insforge';
import { isOwner } from '@/lib/allowlist';

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

export async function checkBudget(email?: string | null): Promise<void> {
  // Owner bypass — platform budget never blocks owners
  if (isOwner(email)) return;
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

// ── Tier-based credit enforcement ────────────────────────

/**
 * Check if a user can make a paid API call.
 * Owner accounts always pass. Other users checked against tier credits.
 */
export async function checkUserCredits(userId: string, email: string): Promise<{
  allowed: boolean;
  remaining: number;
  tier: string;
  reason?: string;
}> {
  // Owner bypass — always allowed
  if (isOwner(email)) {
    return { allowed: true, remaining: Infinity, tier: 'owner' };
  }

  if (!sql) {
    return { allowed: true, remaining: 0, tier: 'unknown' };
  }

  try {
    const rows = await sql`
      SELECT tier, credits_remaining, credits_total
      FROM profiles
      WHERE firebase_uid = ${userId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return { allowed: false, remaining: 0, tier: 'none', reason: 'No profile found. Sign up for a plan.' };
    }

    const tier = String(rows[0].tier || 'free');
    const remaining = Number(rows[0].credits_remaining ?? 0);

    if (tier === 'free' || remaining <= 0) {
      return {
        allowed: false,
        remaining: Math.max(0, remaining),
        tier,
        reason: remaining <= 0
          ? 'Credits exhausted. Upgrade your plan to continue.'
          : 'Free tier has limited access. Upgrade to unlock.',
      };
    }

    return { allowed: true, remaining, tier };
  } catch {
    // Fail open for now — don't block users due to DB issues
    return { allowed: true, remaining: 0, tier: 'unknown' };
  }
}

/**
 * Deduct credits from a user's balance after a successful LLM call.
 */
export async function deductUserCredits(
  userId: string,
  credits: number,
  action: string,
  email?: string | null,
): Promise<void> {
  // Owner bypass — never deduct from owner accounts
  if (isOwner(email)) return;
  if (!sql || credits <= 0) return;

  try {
    await sql`
      UPDATE profiles
      SET credits_remaining = GREATEST(0, credits_remaining - ${credits})
      WHERE firebase_uid = ${userId}
    `;
  } catch (err) {
    console.error('[Credits] Deduction failed:', err instanceof Error ? err.message : err);
  }
}
