/**
 * aiPLUG runtime registry
 * =========================
 * Maps a plug's `runtime_key` (from the plugs table) to its actual
 * implementation function. The worker resolves the runtime from
 * this registry when a queued run is dispatched.
 *
 * Adding a new flagship plug:
 *   1. Insert row in `plugs` table with a unique `runtime_key`
 *   2. Implement a RuntimeFn in `runtimes/<key>.ts`
 *   3. Register here
 */

import type { PlugRow, PlugRunRow } from '@/lib/aiplug/types';
import { runSmbMarketing } from './smb-marketing';
import { runTeacherTwin } from './teacher-twin';

export interface RuntimeContext {
  /** The run row being executed */
  run: PlugRunRow;
  /** The plug row this run belongs to */
  plug: PlugRow;
  /** Append an event to plug_run_events. Always awaited by runtime functions. */
  emit: (
    kind: 'heartbeat' | 'stage' | 'info' | 'output' | 'error',
    stage: string,
    message: string,
    payload?: Record<string, unknown>,
  ) => Promise<void>;
  /** Persist partial outputs mid-run (the final outputs are written by the worker) */
  persistOutputs: (outputs: Record<string, unknown>) => Promise<void>;
}

export interface RuntimeResult {
  /** Final outputs written to plug_runs.outputs */
  outputs: Record<string, unknown>;
  /** Final status — typically 'succeeded' or 'failed' */
  status: 'succeeded' | 'failed' | 'waiting_for_user';
  /** Optional user-visible message on failure */
  errorMessage?: string;
  /** Approximate cost in model tokens for the run */
  costTokens?: number;
}

export type RuntimeFn = (ctx: RuntimeContext) => Promise<RuntimeResult>;

export const RUNTIME_REGISTRY: Record<string, RuntimeFn> = {
  'smb-marketing': runSmbMarketing,
  'teacher-twin': runTeacherTwin,
};

export function getRuntime(key: string): RuntimeFn | null {
  return RUNTIME_REGISTRY[key] ?? null;
}
