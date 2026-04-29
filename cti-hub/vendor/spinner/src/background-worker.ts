/**
 * Background worker
 * =================
 * Spawns + tracks SpinnerJobs that execute autonomously while the
 * user keeps chatting with ACHEEVY.
 *
 * Process model (single-process, in-memory for Phase 1):
 *   - Each SpinnerJob lives in an in-process Map keyed by jobId
 *   - status transitions: idle → classifying → executing → streaming → completed/failed
 *   - PiP stream events are emitted via a callback (the chat surface
 *     subscribes and renders them in the side window)
 *   - Failures are caught + logged + surfaced via the job's `error` field
 *
 * Phase 2 (TODO): move job state to Neon/Redis for cross-process
 * resilience and multi-instance scaling.
 */

import { randomUUID } from 'node:crypto';
import type {
  SpinnerJob,
  IntentClassification,
  ChatSurface,
  WorkerStatus,
} from './types.js';

const _jobs = new Map<string, SpinnerJob>();

export type JobEventListener = (job: SpinnerJob, event: string) => void;
const _listeners = new Set<JobEventListener>();

export function onJobEvent(listener: JobEventListener): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function emit(job: SpinnerJob, event: string): void {
  for (const l of _listeners) {
    try {
      l(job, event);
    } catch {
      // listener errors must not break the worker
    }
  }
}

function setStatus(job: SpinnerJob, status: WorkerStatus): void {
  job.status = status;
  emit(job, `status:${status}`);
}

// ─── Job lifecycle ──────────────────────────────────────────────────

export interface StartJobInput {
  surface: ChatSurface;
  userId: string;
  userMessage: string;
  classification: IntentClassification;
}

export function startJob(input: StartJobInput): SpinnerJob {
  const job: SpinnerJob = {
    id: randomUUID(),
    surface: input.surface,
    userId: input.userId,
    userMessage: input.userMessage,
    classification: input.classification,
    status: 'classifying',
    startedAt: new Date().toISOString(),
  };
  _jobs.set(job.id, job);
  emit(job, 'started');

  // Async execution path — fire and forget
  void executeJob(job).catch((err) => {
    job.status = 'failed';
    job.error = err instanceof Error ? err.message : String(err);
    job.completedAt = new Date().toISOString();
    emit(job, 'failed');
  });

  return job;
}

async function executeJob(job: SpinnerJob): Promise<void> {
  setStatus(job, 'executing');

  // Branch on the recommended action
  const action = job.classification.recommendedAction;

  switch (action.type) {
    case 'continue-chat':
      // No-op — chat surface handles directly
      setStatus(job, 'completed');
      job.completedAt = new Date().toISOString();
      return;

    case 'execute-simple':
      // TODO: actual simple task execution
      setStatus(job, 'streaming');
      // Stub: simulate work
      await new Promise((r) => setTimeout(r, 100));
      setStatus(job, 'completed');
      job.completedAt = new Date().toISOString();
      return;

    case 'transition-guide-me':
    case 'transition-manage-it':
      // Hands off to the chat-to-Guide-Me transition flow
      // The chat surface listens for `awaiting-handoff` and prompts the user
      setStatus(job, 'awaiting-handoff');
      return;

    case 'spawn-three-consultant':
      // Hands off to the 3-Consultant Engagement flow
      setStatus(job, 'awaiting-handoff');
      return;

    case 'handoff-tps-report-ang':
      // TODO: call TPS_Report_Ang's prompt-to-plan endpoint
      setStatus(job, 'awaiting-handoff');
      return;

    case 'handoff-pmo':
      // TODO: pull PMO mission status
      setStatus(job, 'awaiting-handoff');
      return;
  }
}

// ─── Job introspection ──────────────────────────────────────────────

export function getJob(jobId: string): SpinnerJob | undefined {
  return _jobs.get(jobId);
}

export function listJobs(opts: { userId?: string; status?: WorkerStatus } = {}): SpinnerJob[] {
  const all = [..._jobs.values()];
  return all.filter((j) => {
    if (opts.userId && j.userId !== opts.userId) return false;
    if (opts.status && j.status !== opts.status) return false;
    return true;
  });
}

export async function cancelJob(jobId: string): Promise<void> {
  const job = _jobs.get(jobId);
  if (!job) return;
  job.status = 'failed';
  job.error = 'cancelled';
  job.completedAt = new Date().toISOString();
  emit(job, 'cancelled');
}

/**
 * Test/dev helper — wipes the in-memory job store.
 * Never call from production code.
 */
export function _resetJobsForTesting(): void {
  _jobs.clear();
}
