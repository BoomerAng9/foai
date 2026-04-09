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
 * Phase 2 (THIS file): real Cloud Run Jobs API integration via the
 * GCP REST API. Gracefully degrades to a 'failed' session with a
 * setup checklist when env vars are missing — never returns fake URLs.
 *
 * Required env vars (production):
 *   GCP_PROJECT_ID                  ai-managed-services
 *   GCP_REGION                      us-central1 (default if unset)
 *   LIVE_LOOK_IN_OMNIVERSE_IMAGE    full container image URL for the
 *                                   NVIDIA Omniverse + Cosmos worker
 *                                   e.g. us-central1-docker.pkg.dev/
 *                                        ai-managed-services/spinner/
 *                                        omniverse-worker:latest
 *   LIVE_LOOK_IN_SERVICE_ACCOUNT    SA email with run.invoker +
 *                                   compute.instanceAdmin scoped to GPU nodes
 *   LIVE_LOOK_IN_WEBRTC_SIGNALING   wss:// endpoint for WebRTC offer/answer
 *                                   exchange (separate Cloud Run service)
 *   GOOGLE_APPLICATION_CREDENTIALS  path to SA JSON, OR Workload Identity
 *
 * IAM permissions:
 *   roles/run.developer             create + execute jobs
 *   roles/iam.serviceAccountUser    impersonate the worker SA
 *   roles/compute.instanceAdmin     attach GPU node pools
 *   roles/artifactregistry.reader   pull the container image
 *
 * GPU quotas (target region):
 *   nvidia-l4    >= 1   smallest, cheapest, default
 *   nvidia-a100  >= 1   mid
 *   nvidia-h100  >= 1   premium
 *
 * GCP DoD compliance gate: Cloud Run Jobs are GCP standard, not
 * gated by DoD compliance specifically — this can move ahead of the
 * Phase 1 CMMC L1 work. See project_dod_compliance_path.md.
 */

import { randomUUID } from 'node:crypto';
import type { LiveLookInSession, ChatSurface } from './types.js';

const _sessions = new Map<string, LiveLookInSession>();

// ─── Configuration ──────────────────────────────────────────────────

interface LiveLookInConfig {
  projectId: string;
  region: string;
  omniverseImage: string;
  serviceAccount: string;
  webrtcSignalingUrl: string;
}

function readConfig(): { ok: true; config: LiveLookInConfig } | { ok: false; missing: string[] } {
  const missing: string[] = [];
  const projectId = process.env.GCP_PROJECT_ID || '';
  const region = process.env.GCP_REGION || 'us-central1';
  const omniverseImage = process.env.LIVE_LOOK_IN_OMNIVERSE_IMAGE || '';
  const serviceAccount = process.env.LIVE_LOOK_IN_SERVICE_ACCOUNT || '';
  const webrtcSignalingUrl = process.env.LIVE_LOOK_IN_WEBRTC_SIGNALING || '';

  if (!projectId) missing.push('GCP_PROJECT_ID');
  if (!omniverseImage) missing.push('LIVE_LOOK_IN_OMNIVERSE_IMAGE');
  if (!serviceAccount) missing.push('LIVE_LOOK_IN_SERVICE_ACCOUNT');
  if (!webrtcSignalingUrl) missing.push('LIVE_LOOK_IN_WEBRTC_SIGNALING');

  if (missing.length > 0) return { ok: false, missing };
  return { ok: true, config: { projectId, region, omniverseImage, serviceAccount, webrtcSignalingUrl } };
}

// ─── GCP access token ───────────────────────────────────────────────

/**
 * Read a GCP access token from the metadata server (when running on
 * GCE/Cloud Run) or from an explicit env var as a dev escape hatch.
 *
 * Production should use Workload Identity Federation — see
 * project_dod_compliance_path.md (no SA keys on disk).
 */
async function readGcpAccessToken(): Promise<string> {
  // Dev escape hatch: explicit token in env
  if (process.env.GOOGLE_OAUTH_ACCESS_TOKEN) {
    return process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
  }

  // GCE / Cloud Run metadata server
  try {
    const res = await fetch(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
      { headers: { 'Metadata-Flavor': 'Google' }, signal: AbortSignal.timeout(2000) },
    );
    if (res.ok) {
      const data = (await res.json()) as { access_token?: string };
      if (data.access_token) return data.access_token;
    }
  } catch {
    // Not on GCE — fall through
  }

  throw new Error(
    '[live-look-in] No GCP access token available. Set GOOGLE_OAUTH_ACCESS_TOKEN ' +
      'or run on GCP infrastructure with Workload Identity attached.',
  );
}

// ─── Cloud Run Jobs REST API ────────────────────────────────────────

const GPU_NODE_TYPE: Record<'L4' | 'A100' | 'H100', string> = {
  L4: 'nvidia-l4',
  A100: 'nvidia-tesla-a100',
  H100: 'nvidia-h100-80gb',
};

interface CreateJobInput {
  config: LiveLookInConfig;
  jobName: string;
  gpuType: 'L4' | 'A100' | 'H100';
  sessionId: string;
  parentJobId: string;
  userId: string;
  surface: ChatSurface;
  accessToken: string;
}

async function createCloudRunJob(input: CreateJobInput): Promise<void> {
  const { config, jobName, gpuType, sessionId, parentJobId, userId, surface, accessToken } = input;

  const url =
    `https://run.googleapis.com/v2/projects/${config.projectId}` +
    `/locations/${config.region}/jobs?jobId=${encodeURIComponent(jobName)}`;

  const body = {
    template: {
      template: {
        serviceAccount: config.serviceAccount,
        timeout: '900s',
        maxRetries: 0,
        containers: [
          {
            image: config.omniverseImage,
            env: [
              { name: 'SPINNER_SESSION_ID', value: sessionId },
              { name: 'SPINNER_PARENT_JOB_ID', value: parentJobId },
              { name: 'SPINNER_USER_ID', value: userId },
              { name: 'SPINNER_SURFACE', value: surface },
              { name: 'WEBRTC_SIGNALING_URL', value: config.webrtcSignalingUrl },
              { name: 'GPU_TYPE', value: GPU_NODE_TYPE[gpuType] },
            ],
            resources: {
              limits: {
                cpu: '4',
                memory: '16Gi',
                'nvidia.com/gpu': '1',
              },
            },
          },
        ],
        nodeSelector: {
          'run.googleapis.com/accelerator': GPU_NODE_TYPE[gpuType],
        },
      },
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => 'unknown error');
    throw new Error(`Cloud Run Job create failed: HTTP ${res.status} ${errBody.slice(0, 500)}`);
  }
}

async function executeCloudRunJob(
  config: LiveLookInConfig,
  jobName: string,
  accessToken: string,
): Promise<void> {
  const url =
    `https://run.googleapis.com/v2/projects/${config.projectId}` +
    `/locations/${config.region}/jobs/${encodeURIComponent(jobName)}:run`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => 'unknown error');
    throw new Error(`Cloud Run Job execute failed: HTTP ${res.status} ${errBody.slice(0, 500)}`);
  }
}

async function deleteCloudRunJob(
  config: LiveLookInConfig,
  jobName: string,
  accessToken: string,
): Promise<void> {
  const url =
    `https://run.googleapis.com/v2/projects/${config.projectId}` +
    `/locations/${config.region}/jobs/${encodeURIComponent(jobName)}`;

  await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => {});
}

// ─── Public API ─────────────────────────────────────────────────────

export interface ProvisionInput {
  jobId: string;
  surface: ChatSurface;
  userId: string;
  gpuType?: 'L4' | 'A100' | 'H100';
}

/**
 * Provision a Live Look In session.
 *
 * Real implementation: creates a Cloud Run Job with a GPU node selector,
 * passes the Spinner job context as env vars, triggers an immediate
 * execution. The Omniverse worker connects to the WebRTC signaling URL
 * to stream the rendered view back to the user's PiP window.
 *
 * Returns a session in 'provisioning' state immediately. The status
 * transitions to 'streaming' when the Omniverse worker comes online and
 * registers via markSessionReady() (out-of-band callback from a separate
 * signaling service).
 *
 * If env vars aren't configured, returns a session with status 'failed'
 * and a clear log message — never fakes the URL.
 */
export async function provisionSession(input: ProvisionInput): Promise<LiveLookInSession> {
  const sessionId = randomUUID();
  const gpuType = input.gpuType ?? 'L4';
  const jobName = `spinner-look-in-${sessionId.slice(0, 8)}`;

  const baseSession: LiveLookInSession = {
    id: sessionId,
    jobId: input.jobId,
    surface: input.surface,
    userId: input.userId,
    cloudRunJobName: jobName,
    gpuType,
    omniverseStreamUrl: undefined,
    status: 'provisioning',
    startedAt: new Date().toISOString(),
  };

  _sessions.set(sessionId, baseSession);

  const cfgRead = readConfig();
  if (!cfgRead.ok) {
    baseSession.status = 'failed';
    baseSession.endedAt = new Date().toISOString();
    // eslint-disable-next-line no-console
    console.warn(
      `[live-look-in] Provisioning skipped — missing env vars: ${cfgRead.missing.join(', ')}. ` +
        `See aims-tools/spinner/src/live-look-in.ts for the setup checklist.`,
    );
    return baseSession;
  }

  // Real provisioning — fire-and-forget so the caller gets a session
  // record immediately. Status transitions happen async.
  void provisionAsync(baseSession, cfgRead.config, gpuType, input);

  return baseSession;
}

async function provisionAsync(
  session: LiveLookInSession,
  config: LiveLookInConfig,
  gpuType: 'L4' | 'A100' | 'H100',
  input: ProvisionInput,
): Promise<void> {
  try {
    const accessToken = await readGcpAccessToken();

    await createCloudRunJob({
      config,
      jobName: session.cloudRunJobName!,
      gpuType,
      sessionId: session.id,
      parentJobId: input.jobId,
      userId: input.userId,
      surface: input.surface,
      accessToken,
    });

    await executeCloudRunJob(config, session.cloudRunJobName!, accessToken);

    // Status flips to 'streaming' when the Omniverse worker registers
    // with the WebRTC signaling endpoint. That's an out-of-band callback
    // (separate service POSTs to /api/live-look-in/ready/:sessionId) so
    // we leave it in 'provisioning' here.
    session.omniverseStreamUrl = `${config.webrtcSignalingUrl}/${session.id}`;
  } catch (e) {
    session.status = 'failed';
    session.endedAt = new Date().toISOString();
    // eslint-disable-next-line no-console
    console.error(
      `[live-look-in] Provisioning failed for session ${session.id}:`,
      e instanceof Error ? e.message : e,
    );
  }
}

/**
 * Mark a session as actively streaming. Called by the WebRTC signaling
 * endpoint when the Omniverse worker registers (separate ready callback).
 */
export function markSessionReady(sessionId: string, streamUrl?: string): boolean {
  const session = _sessions.get(sessionId);
  if (!session) return false;
  session.status = 'streaming';
  if (streamUrl) session.omniverseStreamUrl = streamUrl;
  return true;
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

  const cfgRead = readConfig();
  if (cfgRead.ok && session.cloudRunJobName) {
    try {
      const accessToken = await readGcpAccessToken();
      await deleteCloudRunJob(cfgRead.config, session.cloudRunJobName, accessToken);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(
        `[live-look-in] Failed to delete Cloud Run Job for session ${sessionId}:`,
        e instanceof Error ? e.message : e,
      );
    }
  }
}

/**
 * Test/dev helper.
 */
export function _resetSessionsForTesting(): void {
  _sessions.clear();
}

/**
 * Returns whether the Live Look In stack is fully configured. Useful
 * for health checks and admin dashboards.
 */
export function isLiveLookInConfigured():
  | { configured: true }
  | { configured: false; missing: string[] } {
  const cfgRead = readConfig();
  if (cfgRead.ok) return { configured: true };
  return { configured: false, missing: cfgRead.missing };
}
