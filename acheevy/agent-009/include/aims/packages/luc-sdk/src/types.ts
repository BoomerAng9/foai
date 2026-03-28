/**
 * LUC SDK - Type Definitions
 *
 * Layered Usage Calculator - A framework-agnostic usage tracking,
 * quota gating, and cost estimation library.
 */

// ─────────────────────────────────────────────────────────────
// Core Types
// ─────────────────────────────────────────────────────────────

/**
 * Service bucket definition - describes a trackable resource
 */
export interface ServiceBucket<K extends string = string> {
  key: K;
  name: string;
  unit: string;
  overageRate: number; // $ per unit over quota
  description?: string;
}

/**
 * Quota record for a single service
 */
export interface QuotaRecord {
  limit: number;
  used: number;
  overage: number;
  lastUpdated: Date;
}

/**
 * User/account record with all quota information
 */
export interface LUCAccountRecord<K extends string = string> {
  id: string;
  planId: string;
  planName: string;
  quotas: Record<K, QuotaRecord>;
  totalOverageCost: number;
  billingCycleStart: Date;
  billingCycleEnd: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Plan definition with quotas and overage rules
 */
export interface LUCPlan<K extends string = string> {
  id: string;
  name: string;
  quotas: Record<K, number>;
  monthlyPrice: number;
  overageThreshold: number; // Allow this % over before hard block (0.1 = 10%)
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────
// Operation Results
// ─────────────────────────────────────────────────────────────

/**
 * Result of canExecute() pre-flight check
 */
export interface CanExecuteResult {
  allowed: boolean;
  reason?: string;
  currentUsed: number;
  limit: number;
  requested: number;
  wouldExceedBy?: number;
  overageAllowed: number;
  projectedCost?: number;
}

/**
 * Result of debit() operation
 */
export interface DebitResult {
  success: boolean;
  newUsed: number;
  newOverage: number;
  overageCost: number;
  quotaPercent: number;
  warning?: string;
}

/**
 * Result of credit() operation (for rollbacks)
 */
export interface CreditResult {
  success: boolean;
  newUsed: number;
  newOverage: number;
  amountCredited: number;
}

/**
 * Quote for a planned operation (estimate without debiting)
 */
export interface LUCQuote<K extends string = string> {
  service: K;
  amount: number;
  currentUsed: number;
  limit: number;
  wouldExceed: boolean;
  projectedOverage: number;
  projectedCost: number;
  allowed: boolean;
}

/**
 * Service status in summary
 */
export type ServiceStatus = 'ok' | 'warning' | 'critical' | 'blocked';

/**
 * Individual service summary
 */
export interface ServiceSummary<K extends string = string> {
  key: K;
  name: string;
  used: number;
  limit: number;
  overage: number;
  percentUsed: number;
  overageCost: number;
  status: ServiceStatus;
}

/**
 * Complete account summary
 */
export interface LUCSummary<K extends string = string> {
  accountId: string;
  planName: string;
  billingCycleStart: Date;
  billingCycleEnd: Date;
  services: ServiceSummary<K>[];
  totalOverageCost: number;
  overallPercentUsed: number;
  warnings: string[];
}

// ─────────────────────────────────────────────────────────────
// Configuration Types
// ─────────────────────────────────────────────────────────────

/**
 * LUC Engine configuration
 */
export interface LUCConfig<K extends string = string> {
  services: Record<K, ServiceBucket<K>>;
  plans: Record<string, LUCPlan<K>>;
  defaultPlanId?: string;
  warningThreshold?: number; // Default 0.8 (80%)
  criticalThreshold?: number; // Default 0.9 (90%)
}

/**
 * Storage adapter interface for persistence
 */
export interface LUCStorageAdapter<K extends string = string> {
  get(accountId: string): Promise<LUCAccountRecord<K> | null>;
  set(account: LUCAccountRecord<K>): Promise<void>;
  delete(accountId: string): Promise<void>;
}

// ─────────────────────────────────────────────────────────────
// Event Types
// ─────────────────────────────────────────────────────────────

export type LUCEventType =
  | 'quota_warning'
  | 'quota_critical'
  | 'quota_blocked'
  | 'overage_incurred'
  | 'plan_changed'
  | 'cycle_reset';

export interface LUCEvent<K extends string = string> {
  type: LUCEventType;
  accountId: string;
  service?: K;
  message: string;
  data?: Record<string, unknown>;
  timestamp: Date;
}

export type LUCEventHandler<K extends string = string> = (event: LUCEvent<K>) => void;
