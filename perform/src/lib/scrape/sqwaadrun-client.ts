/**
 * Sqwaadrun HTTP Client
 * =======================
 * TypeScript client for the ACHIEVEMOR Sqwaadrun gateway.
 * Used by Per|Form's TRCC pipeline to feed canonical grades with
 * fresh, real web data — athlete pages, stat sites, recruiting
 * boards, NIL markets. Replaces Firecrawl.
 *
 * The Sqwaadrun gateway is a separate Python service (typically
 * running on the same host as the Smelter OS file system). Per|Form
 * just POSTs intents and reads back JSON.
 *
 * Env:
 *   SQWAADRUN_GATEWAY_URL  (default http://localhost:7700)
 *   SQWAADRUN_API_KEY      (optional bearer token)
 */

const getBaseUrl = () =>
  process.env.SQWAADRUN_GATEWAY_URL || 'http://localhost:7700';

const getApiKey = () => process.env.SQWAADRUN_API_KEY || '';

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const key = getApiKey();
  if (key) h.Authorization = `Bearer ${key}`;
  return h;
}

/* ── Types mirroring the gateway payload shapes ── */

export type MissionType =
  | 'recon'
  | 'sweep'
  | 'harvest'
  | 'patrol'
  | 'intercept'
  | 'survey'
  | 'batch_ops';

export interface ScrapeIntentRequest {
  intent: string;
  targets: string[];
  config?: Record<string, unknown>;
}

export interface ScrapeIntentResponse {
  mission_id: string;
  type: MissionType;
  status: 'completed' | 'failed' | 'pending_signoff' | 'rejected' | 'denied';
  target_count: number;
  results_count: number;
  error: string | null;
  kpis: Record<string, unknown>;
  needs_sign_off: boolean;
  doctrine_reason: string | null;
}

export interface MissionRequest {
  type: MissionType;
  targets: string[];
  config?: Record<string, unknown>;
}

export interface MissionResponse {
  mission_id: string;
  type: MissionType;
  status: string;
  target_count: number;
  results_count: number;
  results: Array<Record<string, unknown>>;
  kpis: Record<string, unknown>;
  error: string | null;
}

export interface RosterEntry {
  name: string;
  color: string;
  status: 'active' | 'standby' | 'error' | 'inactive';
  tasks_completed: number;
  tasks_failed: number;
}

export interface RosterResponse {
  total_hawks: number;
  hawks: RosterEntry[];
  chicken_hawk: string;
}

/* ── Core client methods ── */

export async function sqwaadrunHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${getBaseUrl()}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sqwaadrunRoster(): Promise<RosterResponse | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/roster`, { headers: authHeaders() });
    if (!res.ok) return null;
    return (await res.json()) as RosterResponse;
  } catch {
    return null;
  }
}

export async function sqwaadrunScrape(
  req: ScrapeIntentRequest,
): Promise<ScrapeIntentResponse | { error: string }> {
  try {
    const res = await fetch(`${getBaseUrl()}/scrape`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(req),
    });
    return (await res.json()) as ScrapeIntentResponse;
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'fetch failed' };
  }
}

export async function sqwaadrunMission(
  req: MissionRequest,
): Promise<MissionResponse | { error: string }> {
  try {
    const res = await fetch(`${getBaseUrl()}/mission`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(req),
    });
    return (await res.json()) as MissionResponse;
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'fetch failed' };
  }
}

export async function sqwaadrunStatus(): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/status`, { headers: authHeaders() });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function sqwaadrunApprove(missionId: string): Promise<unknown> {
  const res = await fetch(`${getBaseUrl()}/approve/${missionId}`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return await res.json();
}

export async function sqwaadrunDeny(missionId: string, reason: string): Promise<unknown> {
  const res = await fetch(`${getBaseUrl()}/deny/${missionId}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ reason }),
  });
  return await res.json();
}

/* ── TRCC-specific helpers — the Per|Form data factory entry points ── */

/**
 * Enrich a prospect by scraping their On3 / 247Sports / Rivals / ESPN
 * page and harvesting structured data. Returns the raw harvest so the
 * TRCC pipeline can feed it through the canonical grader.
 */
export async function enrichProspectPage(
  prospectName: string,
  sourceUrl: string,
): Promise<MissionResponse | { error: string }> {
  return sqwaadrunMission({
    type: 'harvest',
    targets: [sourceUrl],
    config: {
      intent: `enrich prospect ${prospectName}`,
      schema_name: 'athlete_page',
    },
  });
}

/**
 * Monitor an athlete's social + NIL pages for changes. Returns a
 * PATROL mission that runs diff detection on the next invocation.
 */
export async function monitorNILPages(
  athleteName: string,
  urls: string[],
): Promise<ScrapeIntentResponse | { error: string }> {
  return sqwaadrunScrape({
    intent: `monitor NIL pages for ${athleteName}`,
    targets: urls,
  });
}

/**
 * Discover all pages on a recruiting site via sitemap, then batch-
 * harvest them. Used to rebuild the data factory for a class year.
 */
export async function surveyRecruitingSite(
  baseUrl: string,
): Promise<MissionResponse | { error: string }> {
  return sqwaadrunMission({
    type: 'survey',
    targets: [baseUrl],
  });
}
