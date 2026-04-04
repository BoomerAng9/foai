const BRAVE_KEY = process.env.BRAVE_API_KEY || '';
const BRAVE_URL = 'https://api.search.brave.com/res/v1/web/search';

export interface ScrapedArticle {
  title: string;
  url: string;
  description: string;
  source: string;
  publishedAt?: string;
}

export async function searchProspectNews(playerName: string): Promise<ScrapedArticle[]> {
  if (!BRAVE_KEY) return [];
  const query = `${playerName} NFL draft 2026 scouting`;
  const res = await fetch(`${BRAVE_URL}?q=${encodeURIComponent(query)}&count=5`, {
    headers: { 'X-Subscription-Token': BRAVE_KEY, 'Accept': 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.web?.results ?? []).map((r: any) => ({
    title: r.title, url: r.url, description: r.description,
    source: new URL(r.url).hostname, publishedAt: r.published_date,
  }));
}

export async function searchDraftNews(): Promise<ScrapedArticle[]> {
  if (!BRAVE_KEY) return [];
  const queries = [
    'NFL draft 2026 prospects',
    'college football transfer portal',
    'NFL combine 2026',
    'college football recruiting commitments',
  ];
  const results: ScrapedArticle[] = [];
  for (const q of queries) {
    try {
      const res = await fetch(`${BRAVE_URL}?q=${encodeURIComponent(q)}&count=5&freshness=pw`, {
        headers: { 'X-Subscription-Token': BRAVE_KEY, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const r of (data.web?.results ?? [])) {
        results.push({
          title: r.title, url: r.url, description: r.description,
          source: new URL(r.url).hostname, publishedAt: r.published_date,
        });
      }
    } catch {}
  }
  return results;
}

export async function searchTransferPortal(): Promise<ScrapedArticle[]> {
  if (!BRAVE_KEY) return [];
  const res = await fetch(`${BRAVE_URL}?q=${encodeURIComponent('college football transfer portal 2026')}&count=10&freshness=pw`, {
    headers: { 'X-Subscription-Token': BRAVE_KEY, 'Accept': 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.web?.results ?? []).map((r: any) => ({
    title: r.title, url: r.url, description: r.description,
    source: new URL(r.url).hostname, publishedAt: r.published_date,
  }));
}
