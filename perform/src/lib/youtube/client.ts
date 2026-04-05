/**
 * YouTube Data API v3 client for Per|Form
 *
 * Searches for player highlights, draft coverage, and sports content.
 * Uses Google API key (same GOOGLE_KEY as TTS).
 */

const GOOGLE_KEY = process.env.GOOGLE_KEY || '';
const YT_BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
  url: string;
}

/**
 * Search YouTube for videos matching a query
 */
export async function searchYouTube(
  query: string,
  maxResults: number = 10,
): Promise<YouTubeVideo[]> {
  if (!GOOGLE_KEY) return [];

  try {
    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: String(maxResults),
      order: 'relevance',
      key: GOOGLE_KEY,
    });

    const res = await fetch(`${YT_BASE}/search?${params}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn('[YouTube] API error:', res.status);
      return [];
    }

    const data = await res.json();
    return (data.items || []).map((item: any) => ({
      videoId: item.id?.videoId || '',
      title: item.snippet?.title || '',
      description: item.snippet?.description || '',
      channelTitle: item.snippet?.channelTitle || '',
      publishedAt: item.snippet?.publishedAt || '',
      thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
      url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
    }));
  } catch (err) {
    console.warn('[YouTube] Search failed:', err);
    return [];
  }
}

/**
 * Search for player highlights
 */
export async function searchPlayerHighlights(playerName: string): Promise<YouTubeVideo[]> {
  // Simple search — just the name + highlights. Don't over-specify.
  const results = await searchYouTube(`${playerName} highlights`, 5);
  if (results.length > 0) return results;
  // Fallback: just the name
  return searchYouTube(playerName, 5);
}

/**
 * Search for draft coverage from major channels
 */
export async function searchDraftCoverage(maxResults: number = 10): Promise<YouTubeVideo[]> {
  return searchYouTube('2026 NFL Draft coverage analysis prospects', maxResults);
}

/**
 * Get video details by ID
 */
export async function getVideoDetails(videoId: string): Promise<{
  title: string;
  description: string;
  duration: string;
  viewCount: string;
} | null> {
  if (!GOOGLE_KEY) return null;

  try {
    const params = new URLSearchParams({
      part: 'snippet,contentDetails,statistics',
      id: videoId,
      key: GOOGLE_KEY,
    });

    const res = await fetch(`${YT_BASE}/videos?${params}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;

    return {
      title: item.snippet?.title || '',
      description: item.snippet?.description || '',
      duration: item.contentDetails?.duration || '',
      viewCount: item.statistics?.viewCount || '0',
    };
  } catch {
    return null;
  }
}
