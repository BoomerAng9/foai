/**
 * aiPLUG runtime — direct Sqwaadrun gateway client
 * ====================================================
 * Lets aiPLUG runtimes call the Sqwaadrun 17-Hawk fleet directly
 * without going through the user-quota-gated /api/sqwaadrun/mission
 * HTTP route. The runtime already runs under owner management —
 * it doesn't need per-user Sqwaadrun quotas. Users pay for the
 * PLUG, not for the scraping layer underneath.
 *
 * Gateway is the Python aiohttp service at SQWAADRUN_GATEWAY_URL
 * (default http://localhost:7700). Auth via SQWAADRUN_API_KEY
 * when set, no-auth in dev mode.
 *
 * Exposes two high-level helpers:
 *
 *   scrapeUrl(url, opts?)        — single-URL fetch, returns text
 *   scrapeQuery(query, opts?)    — NL intent → gateway auto-routes
 *                                  to the right Hawk mission
 *
 * Both helpers fail soft: on any gateway error they return
 * { ok: false, error } so runtimes can continue with LLM-only
 * output instead of failing the whole run.
 */

const DEFAULT_TIMEOUT_MS = 60_000;

interface GatewayAuth {
  baseUrl: string;
  apiKey: string;
}

function getAuth(): GatewayAuth {
  return {
    baseUrl: process.env.SQWAADRUN_GATEWAY_URL || 'http://localhost:7700',
    apiKey: process.env.SQWAADRUN_API_KEY || '',
  };
}

function headers(apiKey: string): Record<string, string> {
  const out: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) out.Authorization = `Bearer ${apiKey}`;
  return out;
}

export interface ScrapeResult {
  ok: boolean;
  /** Combined markdown/text for all pages that were fetched */
  text: string;
  /** Per-page results when the gateway returns multiple */
  pages: Array<{
    url: string;
    title?: string;
    text: string;
    status?: number;
  }>;
  /** Raw gateway response for debugging (trimmed) */
  raw?: Record<string, unknown>;
  error?: string;
}

interface ScrapeOptions {
  /** Request timeout in ms (default 60s) */
  timeoutMs?: number;
  /** Mission type override — e.g. 'recon', 'sweep', 'harvest' */
  missionType?: string;
  /** Extra mission config for Chicken_Hawk to route */
  config?: Record<string, unknown>;
}

function coerceText(data: unknown): { text: string; pages: ScrapeResult['pages'] } {
  // Gateway responses vary by mission type. Common shapes:
  //   { pages: [{ url, title, text }], ... }
  //   { results: [{ url, title, content }], ... }
  //   { content: "...", url: "..." }
  //   { markdown: "...", url: "..." }
  const pages: ScrapeResult['pages'] = [];
  const shape = data as Record<string, unknown>;

  if (Array.isArray(shape.pages)) {
    for (const p of shape.pages as Array<Record<string, unknown>>) {
      pages.push({
        url: String(p.url ?? ''),
        title: typeof p.title === 'string' ? p.title : undefined,
        text: String(p.text ?? p.content ?? p.markdown ?? ''),
        status: typeof p.status === 'number' ? p.status : undefined,
      });
    }
  } else if (Array.isArray(shape.results)) {
    for (const p of shape.results as Array<Record<string, unknown>>) {
      pages.push({
        url: String(p.url ?? ''),
        title: typeof p.title === 'string' ? p.title : undefined,
        text: String(p.content ?? p.text ?? p.markdown ?? ''),
        status: typeof p.status === 'number' ? p.status : undefined,
      });
    }
  } else if (typeof shape.content === 'string' || typeof shape.markdown === 'string' || typeof shape.text === 'string') {
    pages.push({
      url: String(shape.url ?? ''),
      title: typeof shape.title === 'string' ? shape.title : undefined,
      text: String(shape.markdown ?? shape.content ?? shape.text ?? ''),
    });
  }

  const text = pages
    .map(p => (p.title ? `# ${p.title}\n${p.text}` : p.text))
    .filter(Boolean)
    .join('\n\n---\n\n');

  return { text, pages };
}

/**
 * Fetch a single URL via the Sqwaadrun RECON mission type.
 * Returns { ok: false, error } on any failure — does NOT throw.
 */
export async function scrapeUrl(url: string, opts: ScrapeOptions = {}): Promise<ScrapeResult> {
  const { baseUrl, apiKey } = getAuth();

  try {
    const res = await fetch(`${baseUrl}/mission`, {
      method: 'POST',
      headers: headers(apiKey),
      body: JSON.stringify({
        mission: {
          type: opts.missionType || 'recon',
          targets: [url],
          config: opts.config ?? {},
        },
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        ok: false,
        text: '',
        pages: [],
        error: `Sqwaadrun gateway ${res.status}: ${body.slice(0, 200)}`,
      };
    }

    const data = await res.json();
    const { text, pages } = coerceText(data);
    return { ok: true, text, pages, raw: data as Record<string, unknown> };
  } catch (err) {
    return {
      ok: false,
      text: '',
      pages: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Natural-language intent scrape via the Sqwaadrun /scrape endpoint.
 * Chicken_Hawk auto-routes the intent to the appropriate mission type.
 *
 * Example:
 *   await scrapeQuery('find the top 3 competitor pricing pages for acme corp');
 */
export async function scrapeQuery(
  intent: string,
  targets: string[] = [],
  opts: ScrapeOptions = {},
): Promise<ScrapeResult> {
  const { baseUrl, apiKey } = getAuth();

  try {
    const res = await fetch(`${baseUrl}/scrape`, {
      method: 'POST',
      headers: headers(apiKey),
      body: JSON.stringify({
        intent,
        targets,
        config: opts.config ?? {},
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        ok: false,
        text: '',
        pages: [],
        error: `Sqwaadrun gateway ${res.status}: ${body.slice(0, 200)}`,
      };
    }

    const data = await res.json();
    const { text, pages } = coerceText(data);
    return { ok: true, text, pages, raw: data as Record<string, unknown> };
  } catch (err) {
    return {
      ok: false,
      text: '',
      pages: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
