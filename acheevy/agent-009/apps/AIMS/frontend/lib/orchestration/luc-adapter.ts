/**
 * LUC Adapter for Boomer_Ang Orchestration
 *
 * Integrates LUC quota gating into the orchestration flow.
 * Every tool/action that consumes quota units must:
 * 1. Estimate units
 * 2. Call LUC pre-flight: canExecute(userId, service, amount)
 * 3. If allowed → run the action
 * 4. On success → debit the same service bucket
 * 5. On failure/rollback → credit (if pre-debited or partial failure)
 */

import {
  LUCEngine,
  createLUCAccount,
  createLUCEngine,
  LUCServiceKey,
  CanExecuteResult,
  DebitResult,
  CreditResult,
  LUCSummary,
  LUCQuote,
} from '@/lib/luc/luc-engine';

// ─────────────────────────────────────────────────────────────
// Tool to Service Mapping
// ─────────────────────────────────────────────────────────────

export interface ToolUsageEstimate {
  service: LUCServiceKey;
  amount: number;
  description: string;
}

/**
 * Maps orchestration tools/capabilities to LUC service buckets
 * with estimated usage amounts.
 */
export const TOOL_TO_SERVICE_MAP: Record<string, (params?: any) => ToolUsageEstimate> = {
  // Search tools
  brave_search: (params) => ({
    service: 'brave_searches',
    amount: params?.count || 1,
    description: `Brave Search (${params?.count || 1} queries)`,
  }),

  // Voice tools
  tts: (params) => ({
    service: 'elevenlabs_chars',
    amount: params?.charCount || 500,
    description: `ElevenLabs TTS (${params?.charCount || 500} chars)`,
  }),
  voice_cloning: (params) => ({
    service: 'elevenlabs_chars',
    amount: params?.charCount || 1000,
    description: `Voice cloning (${params?.charCount || 1000} chars)`,
  }),

  // Container/compute tools
  code_execution: (params) => ({
    service: 'container_hours',
    amount: params?.hours || 0.1,
    description: `Container execution (${((params?.hours || 0.1) * 60).toFixed(0)} min)`,
  }),
  infrastructure: (params) => ({
    service: 'container_hours',
    amount: params?.hours || 0.5,
    description: `Infrastructure operation`,
  }),

  // Workflow tools
  n8n_workflows: (params) => ({
    service: 'n8n_executions',
    amount: params?.executions || 1,
    description: `Workflow execution`,
  }),
  scheduling: (params) => ({
    service: 'n8n_executions',
    amount: 1,
    description: `Scheduled task`,
  }),

  // AI/LLM tools
  code_generation: (params) => ({
    service: 'openrouter_tokens',
    amount: params?.tokens ? params.tokens / 1000 : 5,
    description: `Code generation (${params?.tokens || 5000} tokens)`,
  }),
  analysis: (params) => ({
    service: 'openrouter_tokens',
    amount: params?.tokens ? params.tokens / 1000 : 2,
    description: `AI analysis`,
  }),
  reasoning: (params) => ({
    service: 'openrouter_tokens',
    amount: params?.tokens ? params.tokens / 1000 : 10,
    description: `Complex reasoning`,
  }),

  // Vision tools
  image_analysis: (params) => ({
    service: 'vision_analyses',
    amount: params?.imageCount || 1,
    description: `Image analysis (${params?.imageCount || 1} images)`,
  }),
  video_tracking: (params) => ({
    service: 'vision_analyses',
    amount: (params?.frameCount || 10) * 0.1,
    description: `Video tracking (${params?.frameCount || 10} frames)`,
  }),

  // Storage tools
  file_storage: (params) => ({
    service: 'storage_gb',
    amount: params?.sizeGb || 0.01,
    description: `File storage (${((params?.sizeGb || 0.01) * 1024).toFixed(0)} MB)`,
  }),

  // General API calls
  api_integration: (params) => ({
    service: 'api_calls',
    amount: params?.calls || 1,
    description: `API call`,
  }),
  webhooks: (params) => ({
    service: 'api_calls',
    amount: params?.calls || 1,
    description: `Webhook trigger`,
  }),

  // Embeddings
  embeddings: (params) => ({
    service: 'embeddings',
    amount: params?.tokens ? params.tokens / 1000 : 1,
    description: `Embedding computation`,
  }),
};

// ─────────────────────────────────────────────────────────────
// LUC Adapter Class
// ─────────────────────────────────────────────────────────────

export class LUCAdapter {
  private engine: LUCEngine;
  private userId: string;
  private pendingDebits: Map<string, ToolUsageEstimate[]> = new Map();

  constructor(userId: string, engine?: LUCEngine) {
    this.userId = userId;
    if (engine) {
      this.engine = engine;
    } else {
      // Create a new engine with default account
      const account = createLUCAccount(userId, 'starter');
      this.engine = createLUCEngine(account);
    }
  }

  // ─────────────────────────────────────────────────────────
  // Pre-flight Check
  // ─────────────────────────────────────────────────────────

  /**
   * Check if a tool can be executed given current quota.
   * Call this BEFORE running any quota-impacting action.
   */
  async canExecuteTool(
    toolName: string,
    params?: any
  ): Promise<{ allowed: boolean; estimate: ToolUsageEstimate; result: CanExecuteResult }> {
    const estimator = TOOL_TO_SERVICE_MAP[toolName];

    if (!estimator) {
      // Unknown tool - allow by default but log warning
      console.warn(`[LUC Adapter] Unknown tool: ${toolName}`);
      return {
        allowed: true,
        estimate: {
          service: 'api_calls',
          amount: 1,
          description: `Unknown tool: ${toolName}`,
        },
        result: {
          allowed: true,
          currentUsed: 0,
          limit: 999999,
          requested: 1,
          overageAllowed: 999999,
        },
      };
    }

    const estimate = estimator(params);
    const result = this.engine.canExecute(estimate.service, estimate.amount);

    return {
      allowed: result.allowed,
      estimate,
      result,
    };
  }

  /**
   * Check multiple tools at once (for parallel execution).
   */
  async canExecuteTools(
    tools: Array<{ toolName: string; params?: any }>
  ): Promise<{
    allAllowed: boolean;
    results: Array<{
      toolName: string;
      allowed: boolean;
      estimate: ToolUsageEstimate;
      result: CanExecuteResult;
    }>;
  }> {
    const results = await Promise.all(
      tools.map(async ({ toolName, params }) => {
        const { allowed, estimate, result } = await this.canExecuteTool(toolName, params);
        return { toolName, allowed, estimate, result };
      })
    );

    return {
      allAllowed: results.every((r) => r.allowed),
      results,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Execute with LUC Gating
  // ─────────────────────────────────────────────────────────

  /**
   * Execute a tool with LUC pre-flight check and post-execution debit.
   * This is the main entry point for quota-gated execution.
   */
  async executeWithGating<T>(
    taskId: string,
    toolName: string,
    params: any,
    executor: () => Promise<T>
  ): Promise<{
    success: boolean;
    result?: T;
    error?: string;
    quotaBlocked?: boolean;
    debitResult?: DebitResult;
  }> {
    // Pre-flight check
    const { allowed, estimate, result: canExecResult } = await this.canExecuteTool(toolName, params);

    if (!allowed) {
      return {
        success: false,
        quotaBlocked: true,
        error: `Quota exceeded for ${estimate.service}: ${canExecResult.reason}`,
      };
    }

    // Track pending debit for potential rollback
    const pendingList = this.pendingDebits.get(taskId) || [];
    pendingList.push(estimate);
    this.pendingDebits.set(taskId, pendingList);

    try {
      // Execute the tool
      const result = await executor();

      // Debit on success
      const debitResult = this.engine.debit(estimate.service, estimate.amount);

      // Clear pending debit
      this.clearPendingDebit(taskId, estimate);

      // Log warning if approaching quota
      if (debitResult.warning) {
        console.warn(`[LUC Adapter] ${debitResult.warning}`);
      }

      return {
        success: true,
        result,
        debitResult,
      };
    } catch (error) {
      // On failure, don't debit (or credit if pre-debited)
      this.clearPendingDebit(taskId, estimate);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute multiple tools in sequence with cumulative gating.
   */
  async executeSequenceWithGating(
    taskId: string,
    steps: Array<{
      toolName: string;
      params?: any;
      executor: () => Promise<any>;
    }>
  ): Promise<{
    success: boolean;
    completedSteps: number;
    results: any[];
    error?: string;
  }> {
    const results: any[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const { success, result, error, quotaBlocked } = await this.executeWithGating(
        `${taskId}-step-${i}`,
        step.toolName,
        step.params,
        step.executor
      );

      if (!success) {
        // Rollback previous debits in this sequence
        await this.rollbackTask(taskId);

        return {
          success: false,
          completedSteps: i,
          results,
          error: quotaBlocked ? `Quota blocked at step ${i + 1}: ${error}` : error,
        };
      }

      results.push(result);
    }

    return {
      success: true,
      completedSteps: steps.length,
      results,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Debit / Credit Operations
  // ─────────────────────────────────────────────────────────

  /**
   * Direct debit (use after successful execution if not using executeWithGating).
   */
  debit(service: LUCServiceKey, amount: number): DebitResult {
    return this.engine.debit(service, amount);
  }

  /**
   * Credit (for rollbacks or corrections).
   */
  credit(service: LUCServiceKey, amount: number): CreditResult {
    return this.engine.credit(service, amount);
  }

  /**
   * Rollback all pending debits for a task.
   */
  async rollbackTask(taskId: string): Promise<void> {
    const pending = this.pendingDebits.get(taskId);
    if (!pending) return;

    for (const estimate of pending) {
      // Only credit if already debited
      // In this implementation, we debit after success, so pending items weren't debited
      // This is more for tracking/cleanup
    }

    this.pendingDebits.delete(taskId);
  }

  private clearPendingDebit(taskId: string, estimate: ToolUsageEstimate): void {
    const pending = this.pendingDebits.get(taskId);
    if (!pending) return;

    const index = pending.findIndex(
      (e) => e.service === estimate.service && e.amount === estimate.amount
    );

    if (index > -1) {
      pending.splice(index, 1);
      if (pending.length === 0) {
        this.pendingDebits.delete(taskId);
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  // Query Methods
  // ─────────────────────────────────────────────────────────

  /**
   * Get current LUC summary.
   */
  getSummary(): LUCSummary {
    return this.engine.getSummary();
  }

  /**
   * Get a quote for a planned operation.
   */
  getQuote(service: LUCServiceKey, amount: number): LUCQuote {
    return this.engine.quote(service, amount);
  }

  /**
   * Get quote for a tool usage.
   */
  getToolQuote(toolName: string, params?: any): LUCQuote | null {
    const estimator = TOOL_TO_SERVICE_MAP[toolName];
    if (!estimator) return null;

    const estimate = estimator(params);
    return this.engine.quote(estimate.service, estimate.amount);
  }

  /**
   * Check if any service is near quota (warning threshold).
   */
  hasWarnings(): boolean {
    const summary = this.getSummary();
    return summary.warnings.length > 0;
  }

  /**
   * Get services that are blocked.
   */
  getBlockedServices(): string[] {
    const summary = this.getSummary();
    return summary.services
      .filter((s) => s.status === 'blocked')
      .map((s) => s.key);
  }
}

// ─────────────────────────────────────────────────────────────
// Orchestrator Integration Hook
// ─────────────────────────────────────────────────────────────

/**
 * Create a LUC-gated tool executor for the orchestrator.
 * This wraps any tool execution with LUC pre-flight and debit.
 */
export function createLUCGatedExecutor(userId: string) {
  const adapter = new LUCAdapter(userId);

  return {
    adapter,

    /**
     * Execute a single tool with LUC gating.
     */
    execute: <T>(
      taskId: string,
      toolName: string,
      params: any,
      executor: () => Promise<T>
    ) => adapter.executeWithGating(taskId, toolName, params, executor),

    /**
     * Check if tool can be executed.
     */
    canExecute: (toolName: string, params?: any) =>
      adapter.canExecuteTool(toolName, params),

    /**
     * Get current quota summary.
     */
    getSummary: () => adapter.getSummary(),

    /**
     * Check for warnings.
     */
    hasWarnings: () => adapter.hasWarnings(),

    /**
     * Direct debit (for manual accounting).
     */
    debit: (service: LUCServiceKey, amount: number) => adapter.debit(service, amount),

    /**
     * Credit (for rollbacks).
     */
    credit: (service: LUCServiceKey, amount: number) => adapter.credit(service, amount),
  };
}

// ─────────────────────────────────────────────────────────────
// Export Types
// ─────────────────────────────────────────────────────────────

export type { CanExecuteResult, DebitResult, CreditResult, LUCSummary, LUCQuote };

export default LUCAdapter;
