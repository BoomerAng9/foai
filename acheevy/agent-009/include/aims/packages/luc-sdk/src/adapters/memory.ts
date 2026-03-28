/**
 * LUC SDK - In-Memory Storage Adapter
 *
 * Simple in-memory storage for development and testing.
 * Data is lost when the process ends.
 */

import { LUCStorageAdapter, LUCAccountRecord } from '../types';

export class MemoryStorageAdapter<K extends string = string>
  implements LUCStorageAdapter<K>
{
  private store: Map<string, LUCAccountRecord<K>> = new Map();

  async get(accountId: string): Promise<LUCAccountRecord<K> | null> {
    return this.store.get(accountId) || null;
  }

  async set(account: LUCAccountRecord<K>): Promise<void> {
    this.store.set(account.id, { ...account });
  }

  async delete(accountId: string): Promise<void> {
    this.store.delete(accountId);
  }

  /**
   * Get all accounts (for debugging/testing)
   */
  async getAll(): Promise<LUCAccountRecord<K>[]> {
    return Array.from(this.store.values());
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    this.store.clear();
  }

  /**
   * Get number of stored accounts
   */
  get size(): number {
    return this.store.size;
  }
}

export function createMemoryAdapter<K extends string>(): MemoryStorageAdapter<K> {
  return new MemoryStorageAdapter<K>();
}

export default MemoryStorageAdapter;
