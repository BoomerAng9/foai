/**
 * Live Look In adapter — NVIDIA Omniverse + Cosmos via Cloud Run Jobs
 * ====================================================================
 * Per Rish 2026-04-08:
 *   "We need to start setting up the live look-in feature that we
 *    established initially with NVIDIA, using NVIDIA Omniverse and
 *    Cosmos through cloud run jobs, spinning up a GPU."
 *
 * This module is the visualization layer that lets a user WATCH
 * Spinner execute autonomously. The view streams from a GPU-backed
 * Cloud Run Job back to the chat surface's PiP / Live Look In window.
 *
 * Phase 1 (this PR): types + stub functions only. Phase 2: provision
 * Cloud Run Jobs + wire WebRTC streaming.
 *
 * GCP DoD compliance gate: Cloud Run Jobs are GCP standard, not
 * gated by DoD compliance specifically — this can move ahead of the
 * Phase 1 CMMC L1 work. See project_dod_compliance_path.md.
 */

import { randomUUID } from 'node:crypto';
import type { LiveLookInSession, ChatSurface } from './types.js';

const _sessions = new Map<string, LiveLookInSession>();

export interface ProvisionInput {
  jobId: string;
  surface: ChatSurface;
  userId: string;
  gpuType?: 'L4' | 'A100' | 'H100';
}

/**
 * Provision a Live Look In session. Returns immediately with status
 * 'provisioning'; the session transitions to 'streaming' when the
 * Cloud Run Job is ready.
 *
 * STUB — wires up the data structures but does not actually call GCP
 * APIs. Phase 2 will add the real provisioning.
 */
export async function provisionSession(input: ProvisionInput): Promise<LiveLookInSession> {
  const session: LiveLookInSession = {
    id: randomUUID(),
    jobId: input.jobId,
    surface: input.surface,
    userId: input.userId,
    cloudRunJobName: `spinner-look-in-${input.jobId.slice(0, 8)}`,
    gpuType: input.gpuType ?? 'L4',
    omniverseStreamUrl: undefined, // populated when streaming starts
    status: 'provisioning',
    startedAt: new Date().toISOString(),
  };
  _sessions.set(session.id, session);

  // STUB: simulate provisioning latency (real version calls
  // gcloud run jobs create + waits for ready)
  void simulateProvisioning(session);

  return session;
}

async function simulateProvisioning(session: LiveLookInSession): Promise<void> {
  await new Promise((r) => setTimeout(r, 100));
  session.status = 'streaming';
  session.omniverseStreamUrl = `wss://live-look-in.aimanagedsolutions.cloud/stream/${session.id}`;
}

export function getSession(sessionId: string): LiveLookInSession | undefined {
  return _sessions.get(sessionId);
}

export function listSessionsForUser(userId: string): LiveLookInSession[] {
  return [..._sessions.values()].filter((s) => s.userId === userId);
}

export async function closeSession(sessionId: string): Promise<void> {
  const session = _sessions.get(sessionId);
  if (!session) return;
  session.status = 'closed';
  session.endedAt = new Date().toISOString();
  // STUB: real version calls gcloud run jobs delete
}

/**
 * Test/dev helper.
 */
export function _resetSessionsForTesting(): void {
  _sessions.clear();
}
