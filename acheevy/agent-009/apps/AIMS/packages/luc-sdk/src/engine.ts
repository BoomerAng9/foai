/**
 * LUC SDK - Core Engine
 *
 * Layered Usage Calculator - Framework-agnostic usage tracking,
 * quota gating, and cost estimation engine.
 *
 * Originally developed for real estate applications, re-engineered
 * for general-purpose usage tracking across any domain.
 */

import type {
  QuotaRecord,
  LUCAccountRecord,
  LUCPlan,
  LUCConfig,
  CanExecuteResult,
  DebitResult,
  CreditResult,
  LUCQuote,
  LUCSummary,
  ServiceSummary,
  LUCEvent,
  LUCEventHandler,
  LUCEventType,
} from './types';

// ─────────────────────────────────────────────────────────────
// LUC Engine Class
// ─────────────────────────────────────────────────────────────

export class LUCEngine<K extends string = string> {
  private account: LUCAccountRecord<K>;
  private plan: LUCPlan<K>;
  private config: LUCConfig<K>;
  private eventHandlers: Map<LUCEventType | '*', LUCEventHandler<K>[]> = new Map();

  constructor(account: LUCAccountRecord<K>, config: LUCConfig<K>) {
    this.account = account;
    this.config = config;
    this.plan = config.plans[account.planId] || Object.values(config.plans)[0];

    if (!this.plan) {
      throw new Error(`No valid plan found for planId: ${account.planId}`);
    }
  }

  // ─────────────────────────────────────────────────────────
  // Event System
  // ─────────────────────────────────────────────────────────

  /**
   * Subscribe to LUC events
   */
  on(event: LUCEventType | '*', handler: LUCEventHandler<K>): () => void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);

    // Return unsubscribe function
    return () => {
      const idx = handlers.indexOf(handler);
      if (idx > -1) handlers.splice(idx, 1);
    };
  }

  private emit(type: LUCEventType, service: K | undefined, message: string, data?: Record<string, unknown>): void {
    const event: LUCEvent<K> = {
      type,
      accountId: this.account.id,
      service,
      message,
      data,
      timestamp: new Date(),
    };

    // Emit to specific handlers
    const handlers = this.eventHandlers.get(type) || [];
    handlers.forEach((h) => h(event));

    // Emit to wildcard handlers
    const wildcardHandlers = this.eventHandlers.get('*') || [];
    wildcardHandlers.forEach((h) => h(event));
  }

  // ─────────────────────────────────────────────────────────
  // Pre-flight Gating
  // ─────────────────────────────────────────────────────────

  /**
   * Check if an operation can be executed given current quota.
   * Call this BEFORE running any quota-impacting action.
   */
  canExecute(service: K, amount: number): CanExecuteResult {
    const quota = this.account.quotas[service];
    const bucket = this.config.services[service];

    if (!quota || !bucket) {
      return {
        allowed: false,
        reason: `Unknown service: ${service}`,
        currentUsed: 0,
        limit: 0,
        requested: amount,
        overageAllowed: 0,
      };
    }

    const { limit, used } = quota;
    const maxAllowed = limit * (1 + this.plan.overageThreshold);
    const projectedUsed = used + amount;

    // Check if within quota
    if (projectedUsed <= limit) {
      return {
        allowed: true,
        currentUsed: used,
        limit,
        requested: amount,
        overageAllowed: maxAllowed - limit,
      };
    }

    // Check if within overage threshold
    if (projectedUsed <= maxAllowed) {
      const overageAmount = projectedUsed - limit;
      const projectedCost = overageAmount * bucket.overageRate;

      return {
        allowed: true,
        reason: 'Within overage threshold',
        currentUsed: used,
        limit,
        requested: amount,
        wouldExceedBy: projectedUsed - limit,
        overageAllowed: maxAllowed - limit,
        projectedCost,
      };
    }

    // Hard block
    return {
      allowed: false,
      reason: `Would exceed quota by ${(projectedUsed - maxAllowed).toFixed(2)} ${bucket.unit}s (max overage: ${(this.plan.overageThreshold * 100).toFixed(0)}%)`,
      currentUsed: used,
      limit,
      requested: amount,
      wouldExceedBy: projectedUsed - limit,
      overageAllowed: maxAllowed - limit,
    };
  }

  /**
   * Check multiple services at once (for batch operations)
   */
  canExecuteBatch(operations: Array<{ service: K; amount: number }>): {
    allAllowed: boolean;
    results: Array<{ service: K; amount: number; result: CanExecuteResult }>;
  } {
    const results = operations.map(({ service, amount }) => ({
      service,
      amount,
      result: this.canExecute(service, amount),
    }));

    return {
      allAllowed: results.every((r) => r.result.allowed),
      results,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Post-run Accounting: Debit
  // ─────────────────────────────────────────────────────────

  /**
   * Debit usage from a service quota.
   * Call this AFTER successful execution of a quota-impacting action.
   */
  debit(service: K, amount: number): DebitResult {
    const canExec = this.canExecute(service, amount);

    if (!canExec.allowed) {
      this.emit('quota_blocked', service, canExec.reason || 'Quota exceeded');
      return {
        success: false,
        newUsed: this.account.quotas[service]?.used || 0,
        newOverage: this.account.quotas[service]?.overage || 0,
        overageCost: 0,
        quotaPercent: 100,
        warning: canExec.reason,
      };
    }

    const quota = this.account.quotas[service];
    const bucket = this.config.services[service];

    // Update usage
    quota.used += amount;
    quota.lastUpdated = new Date();

    // Calculate overage
    let overageCost = 0;
    if (quota.used > quota.limit) {
      const newOverageAmount = Math.max(0, quota.used - quota.limit);
      const previousOverageAmount = quota.overage;
      const additionalOverage = newOverageAmount - previousOverageAmount;

      if (additionalOverage > 0) {
        overageCost = additionalOverage * bucket.overageRate;
        quota.overage = newOverageAmount;
        this.account.totalOverageCost += overageCost;

        this.emit('overage_incurred', service, `Overage incurred: $${overageCost.toFixed(4)}`, {
          amount: additionalOverage,
          cost: overageCost,
        });
      }
    }

    this.account.updatedAt = new Date();

    const quotaPercent = (quota.used / quota.limit) * 100;
    const warningThreshold = (this.config.warningThreshold || 0.8) * 100;
    const criticalThreshold = (this.config.criticalThreshold || 0.9) * 100;

    // Generate warnings and emit events
    let warning: string | undefined;
    if (quotaPercent >= criticalThreshold) {
      warning = `Critical: ${bucket.name} at ${quotaPercent.toFixed(1)}% of quota`;
      this.emit('quota_critical', service, warning, { percentUsed: quotaPercent });
    } else if (quotaPercent >= warningThreshold) {
      warning = `Warning: ${bucket.name} at ${quotaPercent.toFixed(1)}% of quota`;
      this.emit('quota_warning', service, warning, { percentUsed: quotaPercent });
    }

    return {
      success: true,
      newUsed: quota.used,
      newOverage: quota.overage,
      overageCost,
      quotaPercent,
      warning,
    };
  }

  /**
   * Debit multiple services in a batch
   */
  debitBatch(operations: Array<{ service: K; amount: number }>): {
    success: boolean;
    results: Array<{ service: K; amount: number; result: DebitResult }>;
  } {
    const results = operations.map(({ service, amount }) => ({
      service,
      amount,
      result: this.debit(service, amount),
    }));

    return {
      success: results.every((r) => r.result.success),
      results,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Post-run Accounting: Credit (for rollbacks)
  // ─────────────────────────────────────────────────────────

  /**
   * Credit usage back to a service quota.
   * Use this for rollbacks or corrections.
   */
  credit(service: K, amount: number): CreditResult {
    const quota = this.account.quotas[service];

    if (!quota) {
      return {
        success: false,
        newUsed: 0,
        newOverage: 0,
        amountCredited: 0,
      };
    }

    const previousUsed = quota.used;
    quota.used = Math.max(0, quota.used - amount);
    quota.lastUpdated = new Date();

    // Recalculate overage
    if (quota.used <= quota.limit) {
      quota.overage = 0;
    } else {
      quota.overage = quota.used - quota.limit;
    }

    this.account.updatedAt = new Date();

    return {
      success: true,
      newUsed: quota.used,
      newOverage: quota.overage,
      amountCredited: previousUsed - quota.used,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Quote (estimate without debiting)
  // ─────────────────────────────────────────────────────────

  /**
   * Get a quote for a planned operation without affecting quota.
   */
  quote(service: K, amount: number): LUCQuote<K> {
    const quota = this.account.quotas[service];
    const bucket = this.config.services[service];
    const canExec = this.canExecute(service, amount);

    const projectedUsed = (quota?.used || 0) + amount;
    const wouldExceed = projectedUsed > (quota?.limit || 0);
    const projectedOverage = wouldExceed ? projectedUsed - (quota?.limit || 0) : 0;
    const projectedCost = projectedOverage * (bucket?.overageRate || 0);

    return {
      service,
      amount,
      currentUsed: quota?.used || 0,
      limit: quota?.limit || 0,
      wouldExceed,
      projectedOverage,
      projectedCost,
      allowed: canExec.allowed,
    };
  }

  /**
   * Get quotes for multiple operations
   */
  quoteBatch(operations: Array<{ service: K; amount: number }>): LUCQuote<K>[] {
    return operations.map(({ service, amount }) => this.quote(service, amount));
  }

  // ─────────────────────────────────────────────────────────
  // Summary & Reporting
  // ─────────────────────────────────────────────────────────

  /**
   * Get a complete summary of the account's usage status
   */
  getSummary(): LUCSummary<K> {
    const warnings: string[] = [];
    const services: ServiceSummary<K>[] = [];
    const warningThreshold = (this.config.warningThreshold || 0.8) * 100;
    const criticalThreshold = (this.config.criticalThreshold || 0.9) * 100;

    let totalUsedPercent = 0;
    let serviceCount = 0;

    for (const [key, quota] of Object.entries(this.account.quotas) as Array<[K, QuotaRecord]>) {
      const bucket = this.config.services[key];
      if (!bucket) continue;

      const percentUsed = quota.limit > 0 ? (quota.used / quota.limit) * 100 : 0;
      const overageCost = quota.overage * bucket.overageRate;
      const blockedThreshold = 100 + this.plan.overageThreshold * 100;

      let status: 'ok' | 'warning' | 'critical' | 'blocked' = 'ok';
      if (percentUsed >= blockedThreshold) {
        status = 'blocked';
        warnings.push(`${bucket.name} is blocked - quota exceeded`);
      } else if (percentUsed >= criticalThreshold) {
        status = 'critical';
        warnings.push(`${bucket.name} is at ${percentUsed.toFixed(1)}% - approaching limit`);
      } else if (percentUsed >= warningThreshold) {
        status = 'warning';
        warnings.push(`${bucket.name} is at ${percentUsed.toFixed(1)}%`);
      }

      services.push({
        key,
        name: bucket.name,
        used: quota.used,
        limit: quota.limit,
        overage: quota.overage,
        percentUsed,
        overageCost,
        status,
      });

      totalUsedPercent += percentUsed;
      serviceCount++;
    }

    return {
      accountId: this.account.id,
      planName: this.plan.name,
      billingCycleStart: this.account.billingCycleStart,
      billingCycleEnd: this.account.billingCycleEnd,
      services,
      totalOverageCost: this.account.totalOverageCost,
      overallPercentUsed: serviceCount > 0 ? totalUsedPercent / serviceCount : 0,
      warnings,
    };
  }

  /**
   * Get usage for a specific service
   */
  getServiceUsage(service: K): QuotaRecord | null {
    return this.account.quotas[service] || null;
  }

  /**
   * Check if any service has warnings
   */
  hasWarnings(): boolean {
    return this.getSummary().warnings.length > 0;
  }

  /**
   * Get list of blocked services
   */
  getBlockedServices(): K[] {
    return this.getSummary()
      .services.filter((s) => s.status === 'blocked')
      .map((s) => s.key);
  }

  // ─────────────────────────────────────────────────────────
  // Account Management
  // ─────────────────────────────────────────────────────────

  /**
   * Get the current account record
   */
  getAccount(): LUCAccountRecord<K> {
    return { ...this.account };
  }

  /**
   * Get the current plan
   */
  getPlan(): LUCPlan<K> {
    return { ...this.plan };
  }

  /**
   * Update the account's plan
   */
  updatePlan(planId: string): boolean {
    const newPlan = this.config.plans[planId];
    if (!newPlan) return false;

    const oldPlanName = this.plan.name;
    this.plan = newPlan;
    this.account.planId = planId;
    this.account.planName = newPlan.name;

    // Update quota limits (keep usage)
    for (const [key, limit] of Object.entries(newPlan.quotas) as Array<[K, number]>) {
      if (this.account.quotas[key]) {
        this.account.quotas[key].limit = limit;
      }
    }

    this.account.updatedAt = new Date();

    this.emit('plan_changed', undefined, `Plan changed from ${oldPlanName} to ${newPlan.name}`, {
      oldPlan: oldPlanName,
      newPlan: newPlan.name,
    });

    return true;
  }

  /**
   * Reset the billing cycle (typically called monthly)
   */
  resetBillingCycle(): void {
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    this.account.billingCycleStart = now;
    this.account.billingCycleEnd = nextMonth;
    this.account.totalOverageCost = 0;

    // Reset all quotas
    for (const quota of Object.values(this.account.quotas) as QuotaRecord[]) {
      quota.used = 0;
      quota.overage = 0;
      quota.lastUpdated = now;
    }

    this.account.updatedAt = now;

    this.emit('cycle_reset', undefined, 'Billing cycle reset', {
      cycleStart: now,
      cycleEnd: nextMonth,
    });
  }

  /**
   * Update account metadata
   */
  setMetadata(key: string, value: unknown): void {
    if (!this.account.metadata) {
      this.account.metadata = {};
    }
    this.account.metadata[key] = value;
    this.account.updatedAt = new Date();
  }
}

// ─────────────────────────────────────────────────────────────
// Factory Functions
// ─────────────────────────────────────────────────────────────

/**
 * Create a new LUC account with default quotas from a plan
 */
export function createAccount<K extends string>(
  id: string,
  planId: string,
  config: LUCConfig<K>
): LUCAccountRecord<K> {
  const plan = config.plans[planId] || config.plans[config.defaultPlanId || ''];

  if (!plan) {
    throw new Error(`Plan not found: ${planId}`);
  }

  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const quotas = {} as Record<K, QuotaRecord>;

  for (const [key, limit] of Object.entries(plan.quotas) as Array<[K, number]>) {
    quotas[key] = {
      limit,
      used: 0,
      overage: 0,
      lastUpdated: now,
    };
  }

  return {
    id,
    planId,
    planName: plan.name,
    quotas,
    totalOverageCost: 0,
    billingCycleStart: now,
    billingCycleEnd: nextMonth,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a new LUC engine instance
 */
export function createEngine<K extends string>(
  account: LUCAccountRecord<K>,
  config: LUCConfig<K>
): LUCEngine<K> {
  return new LUCEngine(account, config);
}

export default LUCEngine;
