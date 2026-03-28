/**
 * LUC SDK - Utilities
 *
 * Import/export, serialization, and helper functions.
 */

import { LUCAccountRecord, QuotaRecord, LUCConfig, LUCSummary } from './types';

// ─────────────────────────────────────────────────────────────
// Serialization (for JSON/Firestore/etc.)
// ─────────────────────────────────────────────────────────────

/**
 * Serialize a LUC account for storage (converts Dates to ISO strings)
 */
export function serializeAccount<K extends string>(
  account: LUCAccountRecord<K>
): Record<string, unknown> {
  return {
    ...account,
    billingCycleStart: account.billingCycleStart.toISOString(),
    billingCycleEnd: account.billingCycleEnd.toISOString(),
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
    quotas: Object.fromEntries(
      Object.entries(account.quotas).map(([key, quota]) => [
        key,
        {
          ...(quota as QuotaRecord),
          lastUpdated: (quota as QuotaRecord).lastUpdated.toISOString(),
        },
      ])
    ),
  };
}

/**
 * Deserialize a LUC account from storage (converts ISO strings to Dates)
 */
export function deserializeAccount<K extends string>(
  data: Record<string, unknown>
): LUCAccountRecord<K> {
  const quotas = data.quotas as Record<string, unknown>;

  return {
    id: data.id as string,
    planId: data.planId as string,
    planName: data.planName as string,
    totalOverageCost: data.totalOverageCost as number,
    metadata: data.metadata as Record<string, unknown> | undefined,
    billingCycleStart: new Date(data.billingCycleStart as string),
    billingCycleEnd: new Date(data.billingCycleEnd as string),
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
    quotas: Object.fromEntries(
      Object.entries(quotas).map(([key, quota]: [string, any]) => [
        key,
        {
          limit: quota.limit,
          used: quota.used,
          overage: quota.overage,
          lastUpdated: new Date(quota.lastUpdated),
        },
      ])
    ) as Record<K, QuotaRecord>,
  };
}

// ─────────────────────────────────────────────────────────────
// Import / Export
// ─────────────────────────────────────────────────────────────

export interface LUCExportData<K extends string = string> {
  version: string;
  exportedAt: string;
  accounts: Array<ReturnType<typeof serializeAccount<K>>>;
  config?: LUCConfig<K>;
}

/**
 * Export accounts to a portable JSON format
 */
export function exportAccounts<K extends string>(
  accounts: LUCAccountRecord<K>[],
  config?: LUCConfig<K>
): LUCExportData<K> {
  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    accounts: accounts.map((a) => serializeAccount(a)),
    config,
  };
}

/**
 * Export accounts to JSON string
 */
export function exportToJSON<K extends string>(
  accounts: LUCAccountRecord<K>[],
  config?: LUCConfig<K>,
  pretty = true
): string {
  const data = exportAccounts(accounts, config);
  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

/**
 * Import accounts from exported JSON
 */
export function importAccounts<K extends string>(
  data: LUCExportData<K>
): LUCAccountRecord<K>[] {
  return data.accounts.map((a) => deserializeAccount<K>(a as Record<string, unknown>));
}

/**
 * Import accounts from JSON string
 */
export function importFromJSON<K extends string>(json: string): {
  accounts: LUCAccountRecord<K>[];
  config?: LUCConfig<K>;
  version: string;
  exportedAt: Date;
} {
  const data = JSON.parse(json) as LUCExportData<K>;
  return {
    accounts: importAccounts(data),
    config: data.config,
    version: data.version,
    exportedAt: new Date(data.exportedAt),
  };
}

// ─────────────────────────────────────────────────────────────
// CSV Export (for spreadsheets)
// ─────────────────────────────────────────────────────────────

/**
 * Export a summary to CSV format
 */
export function summaryToCSV<K extends string>(summary: LUCSummary<K>): string {
  const headers = ['Service', 'Name', 'Used', 'Limit', 'Overage', '% Used', 'Overage Cost', 'Status'];
  const rows = summary.services.map((s) => [
    s.key,
    s.name,
    s.used.toString(),
    s.limit.toString(),
    s.overage.toString(),
    s.percentUsed.toFixed(2),
    s.overageCost.toFixed(4),
    s.status,
  ]);

  const csvRows = [headers.join(','), ...rows.map((r) => r.join(','))];

  // Add summary info
  csvRows.push('');
  csvRows.push(`Account ID,${summary.accountId}`);
  csvRows.push(`Plan,${summary.planName}`);
  csvRows.push(`Overall Usage %,${summary.overallPercentUsed.toFixed(2)}`);
  csvRows.push(`Total Overage Cost,$${summary.totalOverageCost.toFixed(2)}`);
  csvRows.push(`Billing Cycle,${summary.billingCycleStart.toISOString()} - ${summary.billingCycleEnd.toISOString()}`);

  return csvRows.join('\n');
}

/**
 * Export multiple accounts to CSV
 */
export function accountsToCSV<K extends string>(accounts: LUCAccountRecord<K>[]): string {
  if (accounts.length === 0) return '';

  // Get all unique service keys
  const serviceKeys = new Set<K>();
  accounts.forEach((a) => {
    Object.keys(a.quotas).forEach((k) => serviceKeys.add(k as K));
  });

  const headers = [
    'Account ID',
    'Plan',
    'Total Overage Cost',
    'Billing Start',
    'Billing End',
    ...Array.from(serviceKeys).flatMap((k) => [`${k}_used`, `${k}_limit`, `${k}_overage`]),
  ];

  const rows = accounts.map((a) => {
    const baseFields = [
      a.id,
      a.planName,
      a.totalOverageCost.toFixed(2),
      a.billingCycleStart.toISOString(),
      a.billingCycleEnd.toISOString(),
    ];

    const quotaFields = Array.from(serviceKeys).flatMap((k) => {
      const q = a.quotas[k];
      return q ? [q.used.toString(), q.limit.toString(), q.overage.toString()] : ['0', '0', '0'];
    });

    return [...baseFields, ...quotaFields];
  });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

// ─────────────────────────────────────────────────────────────
// Calculation Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Calculate days remaining in billing cycle
 */
export function daysRemainingInCycle(account: LUCAccountRecord<any>): number {
  const now = new Date();
  const end = new Date(account.billingCycleEnd);
  const diffMs = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Calculate projected usage at end of cycle based on current rate
 */
export function projectUsage<K extends string>(
  account: LUCAccountRecord<K>,
  service: K
): { projected: number; willExceed: boolean; projectedOverage: number } {
  const quota = account.quotas[service];
  if (!quota) {
    return { projected: 0, willExceed: false, projectedOverage: 0 };
  }

  const start = new Date(account.billingCycleStart);
  const end = new Date(account.billingCycleEnd);
  const now = new Date();

  const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  const elapsedDays = Math.max(1, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  const dailyRate = quota.used / elapsedDays;
  const projected = dailyRate * totalDays;
  const willExceed = projected > quota.limit;
  const projectedOverage = Math.max(0, projected - quota.limit);

  return { projected, willExceed, projectedOverage };
}

/**
 * Get usage trend (increasing, decreasing, stable)
 */
export type UsageTrend = 'increasing' | 'decreasing' | 'stable';

export function getUsageTrend<K extends string>(
  account: LUCAccountRecord<K>,
  service: K
): UsageTrend {
  const { projected } = projectUsage(account, service);
  const quota = account.quotas[service];

  if (!quota) return 'stable';

  const currentPercent = (quota.used / quota.limit) * 100;
  const projectedPercent = (projected / quota.limit) * 100;

  if (projectedPercent > currentPercent + 5) return 'increasing';
  if (projectedPercent < currentPercent - 5) return 'decreasing';
  return 'stable';
}
