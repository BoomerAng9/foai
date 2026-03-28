/**
 * Brave Search Module
 *
 * Clean, focused integration with Brave Search API.
 * Used by Researcher_Ang for web search and sports tracking.
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface BraveSearchOptions {
  query: string;
  count?: number;
  offset?: number;
  country?: string;
  safesearch?: 'off' | 'moderate' | 'strict';
  freshness?: 'pd' | 'pw' | 'pm' | 'py'; // past day/week/month/year
}

export interface BraveWebResult {
  title: string;
  url: string;
  description: string;
  age?: string;
  language?: string;
  thumbnail?: {
    src: string;
  };
}

export interface BraveNewsResult {
  title: string;
  url: string;
  description: string;
  age: string;
  source: string;
  thumbnail?: {
    src: string;
  };
}

export interface BraveVideoResult {
  title: string;
  url: string;
  description: string;
  thumbnail?: {
    src: string;
  };
  duration?: string;
  views?: string;
  creator?: string;
}

export interface BraveSearchResponse {
  web: {
    results: BraveWebResult[];
    totalResults?: number;
  };
  news?: {
    results: BraveNewsResult[];
  };
  videos?: {
    results: BraveVideoResult[];
  };
  query: {
    original: string;
    altered?: string;
  };
}

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const BRAVE_BASE_URL = 'https://api.search.brave.com/res/v1';

// ─────────────────────────────────────────────────────────────
// Core Search Function
// ─────────────────────────────────────────────────────────────

export async function search(options: BraveSearchOptions): Promise<BraveSearchResponse> {
  if (!BRAVE_API_KEY) {
    throw new Error('BRAVE_API_KEY is not configured');
  }

  const params = new URLSearchParams({
    q: options.query,
    count: String(options.count || 10),
    offset: String(options.offset || 0),
  });

  if (options.country) params.set('country', options.country);
  if (options.safesearch) params.set('safesearch', options.safesearch);
  if (options.freshness) params.set('freshness', options.freshness);

  const response = await fetch(`${BRAVE_BASE_URL}/web/search?${params}`, {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Brave Search failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ─────────────────────────────────────────────────────────────
// News Search
// ─────────────────────────────────────────────────────────────

export async function searchNews(
  query: string,
  options: { count?: number; freshness?: 'pd' | 'pw' | 'pm' } = {}
): Promise<BraveNewsResult[]> {
  if (!BRAVE_API_KEY) {
    throw new Error('BRAVE_API_KEY is not configured');
  }

  const params = new URLSearchParams({
    q: query,
    count: String(options.count || 10),
  });

  if (options.freshness) params.set('freshness', options.freshness);

  const response = await fetch(`${BRAVE_BASE_URL}/news/search?${params}`, {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': BRAVE_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Brave News Search failed: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}

// ─────────────────────────────────────────────────────────────
// Video Search
// ─────────────────────────────────────────────────────────────

export async function searchVideos(
  query: string,
  options: { count?: number } = {}
): Promise<BraveVideoResult[]> {
  if (!BRAVE_API_KEY) {
    throw new Error('BRAVE_API_KEY is not configured');
  }

  const params = new URLSearchParams({
    q: query,
    count: String(options.count || 10),
  });

  const response = await fetch(`${BRAVE_BASE_URL}/videos/search?${params}`, {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': BRAVE_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Brave Video Search failed: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}

// ─────────────────────────────────────────────────────────────
// Summarized Search (for AI context)
// ─────────────────────────────────────────────────────────────

export interface SearchSummary {
  query: string;
  topResults: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  newsHighlights: Array<{
    title: string;
    source: string;
    age: string;
  }>;
  totalResults: number;
}

export async function searchWithSummary(query: string): Promise<SearchSummary> {
  const [webResults, newsResults] = await Promise.all([
    search({ query, count: 5 }),
    searchNews(query, { count: 3, freshness: 'pw' }).catch(() => []),
  ]);

  return {
    query,
    topResults: webResults.web.results.slice(0, 5).map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
    })),
    newsHighlights: newsResults.slice(0, 3).map(n => ({
      title: n.title,
      source: n.source,
      age: n.age,
    })),
    totalResults: webResults.web.totalResults || webResults.web.results.length,
  };
}

export default {
  search,
  searchNews,
  searchVideos,
  searchWithSummary,
};
