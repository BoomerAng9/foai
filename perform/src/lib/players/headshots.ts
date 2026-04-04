/**
 * Player headshot resolver
 *
 * Strategy:
 *  1. Search ESPN's public site-api for the player by name + school
 *  2. Extract the ESPN athlete ID
 *  3. Build the CDN headshot URL
 *  4. Cache results in-memory so we only look up once per player
 *
 * ESPN endpoints used (no auth required):
 *  - Search: https://site.api.espn.com/apis/common/v3/search?query=...&type=player&sport=football&league=college-football
 *  - Headshot CDN: https://a.espncdn.com/combiner/i?img=/i/headshots/college-football/players/full/{id}.png&w=350&h=254
 */

const SEARCH_URL =
  'https://site.api.espn.com/apis/common/v3/search';

const HEADSHOT_CDN =
  'https://a.espncdn.com/combiner/i?img=/i/headshots/college-football/players/full';

/** In-memory cache: "name|school" -> headshot URL (or empty string for miss) */
const cache = new Map<string, string>();

function cacheKey(name: string, school: string): string {
  return `${name.toLowerCase().trim()}|${school.toLowerCase().trim()}`;
}

/**
 * Normalise school names so "Ohio St." matches "Ohio State Buckeyes" etc.
 */
function schoolMatches(espnTeam: string, querySchool: string): boolean {
  const a = espnTeam.toLowerCase().replace(/[^a-z]/g, '');
  const b = querySchool.toLowerCase().replace(/[^a-z]/g, '');
  return a.includes(b) || b.includes(a);
}

export interface HeadshotResult {
  url: string;
  espnId: string | null;
  source: 'espn' | 'fallback';
}

/**
 * Look up a college football player's headshot via ESPN's public API.
 */
export async function getPlayerHeadshot(
  name: string,
  school: string,
): Promise<HeadshotResult> {
  const key = cacheKey(name, school);

  // Return cached result
  if (cache.has(key)) {
    const url = cache.get(key)!;
    return {
      url,
      espnId: url ? extractId(url) : null,
      source: url ? 'espn' : 'fallback',
    };
  }

  try {
    const params = new URLSearchParams({
      query: name,
      type: 'player',
      sport: 'football',
      league: 'college-football',
      limit: '10',
    });

    const res = await fetch(`${SEARCH_URL}?${params}`, {
      headers: { 'User-Agent': 'PerForm/1.0' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      cache.set(key, '');
      return { url: '', espnId: null, source: 'fallback' };
    }

    const data = await res.json();

    // ESPN search returns results in data.results or data.items
    const items =
      data?.results?.[0]?.items ||
      data?.items ||
      data?.athletes ||
      [];

    // Find best match: name matches AND school matches
    for (const item of items) {
      const displayName: string =
        item?.displayName || item?.name || item?.fullName || '';
      const team: string =
        item?.team?.displayName ||
        item?.team?.name ||
        item?.teamName ||
        '';

      const nameMatch =
        displayName.toLowerCase().trim() === name.toLowerCase().trim();

      if (nameMatch && (school === '' || schoolMatches(team, school))) {
        const id =
          item?.id || item?.athleteId || item?.playerId || '';
        if (id) {
          const url = `${HEADSHOT_CDN}/${id}.png&w=350&h=254`;
          cache.set(key, url);
          return { url, espnId: String(id), source: 'espn' };
        }
      }
    }

    // Looser match: just name (ignore school)
    for (const item of items) {
      const displayName: string =
        item?.displayName || item?.name || item?.fullName || '';
      const nameMatch =
        displayName.toLowerCase().trim() === name.toLowerCase().trim();

      if (nameMatch) {
        const id =
          item?.id || item?.athleteId || item?.playerId || '';
        if (id) {
          const url = `${HEADSHOT_CDN}/${id}.png&w=350&h=254`;
          cache.set(key, url);
          return { url, espnId: String(id), source: 'espn' };
        }
      }
    }

    cache.set(key, '');
    return { url: '', espnId: null, source: 'fallback' };
  } catch {
    cache.set(key, '');
    return { url: '', espnId: null, source: 'fallback' };
  }
}

function extractId(url: string): string | null {
  const m = url.match(/\/full\/(\d+)\.png/);
  return m ? m[1] : null;
}

/**
 * Clear the in-memory cache (useful for testing / manual refresh).
 */
export function clearHeadshotCache(): void {
  cache.clear();
}
