/**
 * LUC SDK - Engine Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  LUCEngine,
  createAccount,
  createEngine,
  createConfig,
  defineService,
  definePlan,
  SAAS_PRESET,
} from '../src';

// Test configuration
type TestServiceKey = 'api_calls' | 'storage_gb' | 'compute_hours';

const TEST_CONFIG = createConfig<TestServiceKey>({
  services: {
    api_calls: defineService('api_calls', 'API Calls', 'call', 0.0001),
    storage_gb: defineService('storage_gb', 'Storage', 'GB', 0.025),
    compute_hours: defineService('compute_hours', 'Compute', 'hour', 0.05),
  },
  plans: {
    free: definePlan('free', 'Free', 0, 0, {
      api_calls: 1000,
      storage_gb: 1,
      compute_hours: 10,
    }),
    pro: definePlan('pro', 'Pro', 29, 0.2, {
      api_calls: 100000,
      storage_gb: 100,
      compute_hours: 500,
    }),
  },
  defaultPlanId: 'free',
  warningThreshold: 0.8,
  criticalThreshold: 0.9,
});

describe('LUCEngine', () => {
  let engine: LUCEngine<TestServiceKey>;

  beforeEach(() => {
    const account = createAccount('test-user', 'free', TEST_CONFIG);
    engine = createEngine(account, TEST_CONFIG);
  });

  describe('canExecute', () => {
    it('should allow execution within quota', () => {
      const result = engine.canExecute('api_calls', 100);

      expect(result.allowed).toBe(true);
      expect(result.currentUsed).toBe(0);
      expect(result.limit).toBe(1000);
      expect(result.requested).toBe(100);
    });

    it('should block execution exceeding quota on free plan', () => {
      const result = engine.canExecute('api_calls', 1500);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('exceed quota');
      expect(result.wouldExceedBy).toBe(500);
    });

    it('should allow overage within threshold on pro plan', () => {
      const proAccount = createAccount('pro-user', 'pro', TEST_CONFIG);
      const proEngine = createEngine(proAccount, TEST_CONFIG);

      // Use 95% of quota
      proEngine.debit('api_calls', 95000);

      // Request 15% more (within 20% threshold)
      const result = proEngine.canExecute('api_calls', 15000);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('Within overage threshold');
      expect(result.projectedCost).toBeGreaterThan(0);
    });

    it('should return unknown service error', () => {
      const result = (engine as any).canExecute('unknown_service', 100);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Unknown service');
    });
  });

  describe('debit', () => {
    it('should debit usage correctly', () => {
      const result = engine.debit('api_calls', 100);

      expect(result.success).toBe(true);
      expect(result.newUsed).toBe(100);
      expect(result.quotaPercent).toBe(10);
    });

    it('should accumulate usage across multiple debits', () => {
      engine.debit('api_calls', 100);
      engine.debit('api_calls', 200);
      const result = engine.debit('api_calls', 300);

      expect(result.newUsed).toBe(600);
      expect(result.quotaPercent).toBe(60);
    });

    it('should generate warning at 80% usage', () => {
      const result = engine.debit('api_calls', 850);

      expect(result.warning).toContain('Warning');
      expect(result.warning).toContain('85.0%');
    });

    it('should generate critical warning at 90% usage', () => {
      const result = engine.debit('api_calls', 950);

      expect(result.warning).toContain('Critical');
      expect(result.warning).toContain('95.0%');
    });

    it('should track overage cost', () => {
      const proAccount = createAccount('pro-user', 'pro', TEST_CONFIG);
      const proEngine = createEngine(proAccount, TEST_CONFIG);

      // Use full quota plus 10% overage
      proEngine.debit('api_calls', 110000);

      const summary = proEngine.getSummary();
      expect(summary.totalOverageCost).toBeGreaterThan(0);
    });
  });

  describe('credit', () => {
    it('should credit usage back', () => {
      engine.debit('api_calls', 500);
      const result = engine.credit('api_calls', 200);

      expect(result.success).toBe(true);
      expect(result.newUsed).toBe(300);
      expect(result.amountCredited).toBe(200);
    });

    it('should not go below zero', () => {
      engine.debit('api_calls', 100);
      const result = engine.credit('api_calls', 500);

      expect(result.newUsed).toBe(0);
      expect(result.amountCredited).toBe(100);
    });

    it('should clear overage when credited below limit', () => {
      const proAccount = createAccount('pro-user', 'pro', TEST_CONFIG);
      const proEngine = createEngine(proAccount, TEST_CONFIG);

      proEngine.debit('api_calls', 110000);
      expect(proEngine.getServiceUsage('api_calls')?.overage).toBe(10000);

      proEngine.credit('api_calls', 20000);
      expect(proEngine.getServiceUsage('api_calls')?.overage).toBe(0);
    });
  });

  describe('quote', () => {
    it('should provide accurate quote without debiting', () => {
      const quote = engine.quote('api_calls', 500);

      expect(quote.service).toBe('api_calls');
      expect(quote.amount).toBe(500);
      expect(quote.currentUsed).toBe(0);
      expect(quote.wouldExceed).toBe(false);
      expect(quote.allowed).toBe(true);

      // Verify no actual debit occurred
      expect(engine.getServiceUsage('api_calls')?.used).toBe(0);
    });

    it('should calculate projected overage cost', () => {
      engine.debit('api_calls', 800);
      const quote = engine.quote('api_calls', 400);

      expect(quote.wouldExceed).toBe(true);
      expect(quote.projectedOverage).toBe(200);
      expect(quote.projectedCost).toBeCloseTo(0.02, 4); // 200 * 0.0001
    });
  });

  describe('getSummary', () => {
    it('should return complete summary', () => {
      engine.debit('api_calls', 500);
      engine.debit('storage_gb', 0.5);

      const summary = engine.getSummary();

      expect(summary.accountId).toBe('test-user');
      expect(summary.planName).toBe('Free');
      expect(summary.services).toHaveLength(3);

      const apiService = summary.services.find((s) => s.key === 'api_calls');
      expect(apiService?.used).toBe(500);
      expect(apiService?.percentUsed).toBe(50);
      expect(apiService?.status).toBe('ok');
    });

    it('should include warnings for high usage', () => {
      engine.debit('api_calls', 900);

      const summary = engine.getSummary();

      expect(summary.warnings.length).toBeGreaterThan(0);
      expect(summary.warnings[0]).toContain('API Calls');
    });
  });

  describe('updatePlan', () => {
    it('should upgrade plan and update limits', () => {
      engine.debit('api_calls', 500);

      const upgraded = engine.updatePlan('pro');

      expect(upgraded).toBe(true);
      expect(engine.getPlan().name).toBe('Pro');
      expect(engine.getServiceUsage('api_calls')?.limit).toBe(100000);
      expect(engine.getServiceUsage('api_calls')?.used).toBe(500); // Usage preserved
    });

    it('should return false for invalid plan', () => {
      const result = engine.updatePlan('invalid');
      expect(result).toBe(false);
    });
  });

  describe('resetBillingCycle', () => {
    it('should reset all usage and overage', () => {
      engine.debit('api_calls', 800);
      engine.debit('storage_gb', 0.8);

      engine.resetBillingCycle();

      expect(engine.getServiceUsage('api_calls')?.used).toBe(0);
      expect(engine.getServiceUsage('storage_gb')?.used).toBe(0);
      expect(engine.getSummary().totalOverageCost).toBe(0);
    });
  });

  describe('events', () => {
    it('should emit warning events', () => {
      const events: any[] = [];
      engine.on('quota_warning', (e) => events.push(e));

      engine.debit('api_calls', 850);

      expect(events.length).toBe(1);
      expect(events[0].type).toBe('quota_warning');
      expect(events[0].service).toBe('api_calls');
    });

    it('should emit critical events', () => {
      const events: any[] = [];
      engine.on('quota_critical', (e) => events.push(e));

      engine.debit('api_calls', 950);

      expect(events.length).toBe(1);
      expect(events[0].type).toBe('quota_critical');
    });

    it('should emit plan changed event', () => {
      const events: any[] = [];
      engine.on('plan_changed', (e) => events.push(e));

      engine.updatePlan('pro');

      expect(events.length).toBe(1);
      expect(events[0].data?.oldPlan).toBe('Free');
      expect(events[0].data?.newPlan).toBe('Pro');
    });

    it('should allow wildcard subscription', () => {
      const events: any[] = [];
      engine.on('*', (e) => events.push(e));

      engine.debit('api_calls', 950);
      engine.updatePlan('pro');

      expect(events.length).toBe(2);
    });

    it('should return unsubscribe function', () => {
      const events: any[] = [];
      const unsub = engine.on('quota_warning', (e) => events.push(e));

      engine.debit('api_calls', 850);
      expect(events.length).toBe(1);

      unsub();
      engine.debit('api_calls', 50);
      expect(events.length).toBe(1); // No new events
    });
  });
});

describe('Presets', () => {
  it('should work with SaaS preset', () => {
    const account = createAccount('saas-user', 'startup', SAAS_PRESET);
    const engine = createEngine(account, SAAS_PRESET);

    expect(engine.getPlan().name).toBe('Startup');

    const result = engine.canExecute('api_calls', 50000);
    expect(result.allowed).toBe(true);

    engine.debit('api_calls', 50000);
    expect(engine.getServiceUsage('api_calls')?.used).toBe(50000);
  });
});

describe('Batch Operations', () => {
  let engine: LUCEngine<TestServiceKey>;

  beforeEach(() => {
    const account = createAccount('batch-user', 'pro', TEST_CONFIG);
    engine = createEngine(account, TEST_CONFIG);
  });

  it('should check multiple services at once', () => {
    const result = engine.canExecuteBatch([
      { service: 'api_calls', amount: 1000 },
      { service: 'storage_gb', amount: 5 },
      { service: 'compute_hours', amount: 10 },
    ]);

    expect(result.allAllowed).toBe(true);
    expect(result.results).toHaveLength(3);
  });

  it('should report if any service is blocked', () => {
    // Use up quota
    engine.debit('api_calls', 120000); // Over limit + overage

    const result = engine.canExecuteBatch([
      { service: 'api_calls', amount: 10000 },
      { service: 'storage_gb', amount: 5 },
    ]);

    expect(result.allAllowed).toBe(false);
  });

  it('should debit multiple services', () => {
    const result = engine.debitBatch([
      { service: 'api_calls', amount: 1000 },
      { service: 'storage_gb', amount: 5 },
    ]);

    expect(result.success).toBe(true);
    expect(engine.getServiceUsage('api_calls')?.used).toBe(1000);
    expect(engine.getServiceUsage('storage_gb')?.used).toBe(5);
  });
});
