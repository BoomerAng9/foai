/**
 * LUC SDK - LocalStorage Adapter (Browser)
 *
 * Persists LUC data to browser localStorage.
 * Useful for client-side applications.
 */

import { LUCStorageAdapter, LUCAccountRecord, QuotaRecord } from '../types';

const DEFAULT_PREFIX = 'luc:account:';

export class LocalStorageAdapter<K extends string = string>
  implements LUCStorageAdapter<K>
{
  private prefix: string;

  constructor(prefix: string = DEFAULT_PREFIX) {
    this.prefix = prefix;
  }

  private getKey(accountId: string): string {
    return `${this.prefix}${accountId}`;
  }

  async get(accountId: string): Promise<LUCAccountRecord<K> | null> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    const key = this.getKey(accountId);
    const data = localStorage.getItem(key);

    if (!data) return null;

    try {
      return this.deserialize(JSON.parse(data));
    } catch {
      return null;
    }
  }

  async set(account: LUCAccountRecord<K>): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) {
      throw new Error('localStorage is not available');
    }

    const key = this.getKey(account.id);
    localStorage.setItem(key, JSON.stringify(this.serialize(account)));
  }

  async delete(accountId: string): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    const key = this.getKey(accountId);
    localStorage.removeItem(key);
  }

  /**
   * Get all stored accounts
   */
  async getAll(): Promise<LUCAccountRecord<K>[]> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }

    const accounts: LUCAccountRecord<K>[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            accounts.push(this.deserialize(JSON.parse(data)));
          } catch {
            // Skip invalid entries
          }
        }
      }
    }

    return accounts;
  }

  /**
   * Clear all LUC data
   */
  async clear(): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  private serialize(account: LUCAccountRecord<K>): object {
    return {
      ...account,
      billingCycleStart: account.billingCycleStart.toISOString(),
      billingCycleEnd: account.billingCycleEnd.toISOString(),
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
      quotas: Object.fromEntries(
        Object.entries(account.quotas).map(([key, quota]) => {
          const q = quota as QuotaRecord;
          return [
            key,
            {
              limit: q.limit,
              used: q.used,
              overage: q.overage,
              lastUpdated: q.lastUpdated.toISOString(),
            },
          ];
        })
      ),
    };
  }

  private deserialize(data: any): LUCAccountRecord<K> {
    return {
      ...data,
      billingCycleStart: new Date(data.billingCycleStart),
      billingCycleEnd: new Date(data.billingCycleEnd),
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      quotas: Object.fromEntries(
        Object.entries(data.quotas).map(([key, quota]: [string, any]) => [
          key,
          {
            ...quota,
            lastUpdated: new Date(quota.lastUpdated),
          },
        ])
      ),
    };
  }
}

export function createLocalStorageAdapter<K extends string>(
  prefix?: string
): LocalStorageAdapter<K> {
  return new LocalStorageAdapter<K>(prefix);
}

export default LocalStorageAdapter;
