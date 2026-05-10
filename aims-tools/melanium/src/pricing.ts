/**
 * Melanium Ingot pricing — pure calculation.
 *
 * Constants are canonical and must not be changed without a new Rish
 * arbitration. The 70/30 split is the Savings Plan allocation rule.
 */

export const DIGITAL_MAINTENANCE_FEE = 0.99;
export const VAULT_SPLIT = 0.7;
export const CUSTOMER_SPLIT = 0.3;
export const DEFAULT_VAULT_ID = 'melanium_vault_001';

/** Round to 4 decimal places to match the Neon column precision. */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export interface TransactionCostInput {
  providerCost: number;
  achievemorMargin: number;
  digitalMaintenanceFee?: number;      // override — default 0.99
}

export interface TransactionCostBreakdown {
  providerCost: number;
  achievemorMargin: number;
  subtotal: number;
  digitalMaintenanceFee: number;
  totalCustomerCharge: number;
  melaniumSplit: {
    achievemorVault: number;           // 70% of the fee
    customerBalance: number;           // 30% of the fee
  };
}

/**
 * Compute the full transaction cost breakdown. Pure function — no I/O.
 * Matches the schema constraints in melanium_transactions
 * (chk_melanium_split_sum + chk_total_matches).
 */
export function calculateTransactionCost(input: TransactionCostInput): TransactionCostBreakdown {
  const { providerCost, achievemorMargin } = input;
  if (providerCost < 0 || achievemorMargin < 0) {
    throw new Error('[@aims/melanium] providerCost and achievemorMargin must be non-negative');
  }

  const fee = round4(input.digitalMaintenanceFee ?? DIGITAL_MAINTENANCE_FEE);
  const subtotal = round4(providerCost + achievemorMargin);
  const totalCustomerCharge = round4(subtotal + fee);

  // Split is exact at round4 precision because fee * 0.7 / * 0.3 both
  // produce 4-decimal results for fee = 0.99 (→ 0.6930 / 0.2970).
  const achievemorVault = round4(fee * VAULT_SPLIT);
  const customerBalance = round4(fee - achievemorVault);       // subtract so split always sums to fee

  return {
    providerCost: round4(providerCost),
    achievemorMargin: round4(achievemorMargin),
    subtotal,
    digitalMaintenanceFee: fee,
    totalCustomerCharge,
    melaniumSplit: { achievemorVault, customerBalance },
  };
}

/**
 * Monthly projection helper — supports the canonical $78.4M/year figure
 * from the 2026-04-17 arbitration. Given user tier counts and per-user
 * monthly transaction counts, returns the vault + customer-balance totals.
 */
export interface ProjectionTier {
  userCount: number;
  transactionsPerMonth: number;
}

export interface MonthlyProjection {
  totalTransactions: number;
  achievemorVaultMonthly: number;
  customerBalancesMonthly: number;
  combinedMonthly: number;
  annualizedCombined: number;
}

export function projectMelaniumMonthly(
  tiers: Record<string, ProjectionTier>,
  fee: number = DIGITAL_MAINTENANCE_FEE,
): MonthlyProjection {
  let totalTransactions = 0;
  let vault = 0;
  let customer = 0;
  for (const tier of Object.values(tiers)) {
    const tierTx = tier.userCount * tier.transactionsPerMonth;
    totalTransactions += tierTx;
    vault += tierTx * fee * VAULT_SPLIT;
    customer += tierTx * fee * CUSTOMER_SPLIT;
  }
  const combined = vault + customer;
  return {
    totalTransactions,
    achievemorVaultMonthly: round4(vault),
    customerBalancesMonthly: round4(customer),
    combinedMonthly: round4(combined),
    annualizedCombined: round4(combined * 12),
  };
}
