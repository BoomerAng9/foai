/**
 * Async voice cloning via Inworld. Enqueue-and-return pattern — never
 * blocks a request. Clone jobs run in the background and results are
 * polled or pushed via webhook.
 *
 * Uses INWORLD_API_KEY for the server-to-server POST — that key stays
 * on the server and is never returned to the browser. See
 * `inworld-realtime.ts` v0.2.0 for the separate JWT-minting path used
 * for browser-direct realtime sessions.
 */

export interface CloneJob {
  job_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  voice_id?: string;
  provider: 'inworld';
  created_at: string;
  error?: string;
}

const JOBS = new Map<string, CloneJob>();

export interface CloneRequest {
  display_name: string;
  sample_url: string;
  language?: string;
}

export function enqueueClone(req: CloneRequest): CloneJob {
  const jobId = `clone_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const job: CloneJob = {
    job_id: jobId,
    status: 'queued',
    provider: 'inworld',
    created_at: new Date().toISOString(),
  };
  JOBS.set(jobId, job);
  // Fire-and-forget; never awaited by the caller.
  void runClone(jobId, req);
  return job;
}

export function getCloneJob(jobId: string): CloneJob | undefined {
  return JOBS.get(jobId);
}

async function runClone(jobId: string, req: CloneRequest): Promise<void> {
  const job = JOBS.get(jobId);
  if (!job) return;
  job.status = 'running';

  const apiKey = process.env.INWORLD_API_KEY;
  if (!apiKey) {
    job.status = 'failed';
    job.error = 'INWORLD_API_KEY not configured';
    return;
  }

  try {
    const endpoint = process.env.INWORLD_VOICE_CLONE_URL ?? 'https://api.inworld.ai/tts/v1/voices:clone';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        display_name: req.display_name,
        sample_url: req.sample_url,
        language: req.language ?? 'en',
      }),
    });

    if (!res.ok) {
      job.status = 'failed';
      job.error = `Inworld clone failed: ${res.status} ${res.statusText}`;
      return;
    }

    const body = (await res.json()) as { voice_id?: string; id?: string };
    job.voice_id = body.voice_id ?? body.id;
    job.status = 'completed';
  } catch (err) {
    job.status = 'failed';
    job.error = err instanceof Error ? err.message : 'clone request failed';
  }
}
