/**
 * X/Twitter Posting Client — X API v2
 *
 * Posts tweets, searches tweets, and fetches user timelines via the X API v2.
 * Auth: Bearer token via process.env.X_BEARER_TOKEN
 *
 * Note: This uses the X API (api.x.com), NOT the Grok/xAI LLM API.
 * The Grok LLM API (api.x.ai) is a separate service — see grok.ts for that.
 */

const X_API_BASE = 'https://api.x.com/2';

function getHeaders(): Record<string, string> {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) {
    throw new Error('X_BEARER_TOKEN is not configured. Set it in your environment.');
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Tweet {
  id: string;
  text: string;
  created_at?: string;
  author_id?: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
}

export interface PostTweetResult {
  id: string;
  text: string;
  url: string;
}

export interface SearchTweetsResult {
  tweets: Tweet[];
  next_token?: string;
}

export interface UserTimelineResult {
  tweets: Tweet[];
  next_token?: string;
}

// ---------------------------------------------------------------------------
// Post a tweet
// ---------------------------------------------------------------------------

export async function postTweet(text: string): Promise<PostTweetResult> {
  if (!text || text.length === 0) {
    throw new Error('Tweet text cannot be empty.');
  }
  if (text.length > 280) {
    throw new Error(`Tweet exceeds 280 characters (${text.length}).`);
  }

  const response = await fetch(`${X_API_BASE}/tweets`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`X API POST /tweets failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as { data: { id: string; text: string } };
  return {
    id: payload.data.id,
    text: payload.data.text,
    url: `https://x.com/i/web/status/${payload.data.id}`,
  };
}

// ---------------------------------------------------------------------------
// Search recent tweets
// ---------------------------------------------------------------------------

export async function searchTweets(
  query: string,
  options?: { maxResults?: number; nextToken?: string },
): Promise<SearchTweetsResult> {
  if (!query) throw new Error('Search query is required.');

  const params = new URLSearchParams({
    query,
    max_results: String(options?.maxResults || 10),
    'tweet.fields': 'created_at,author_id,public_metrics',
  });
  if (options?.nextToken) {
    params.set('next_token', options.nextToken);
  }

  const response = await fetch(`${X_API_BASE}/tweets/search/recent?${params}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`X API search failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as {
    data?: Tweet[];
    meta?: { next_token?: string };
  };

  return {
    tweets: payload.data || [],
    next_token: payload.meta?.next_token,
  };
}

// ---------------------------------------------------------------------------
// Get user timeline by username
// ---------------------------------------------------------------------------

export async function getUserTimeline(
  username: string,
  options?: { maxResults?: number; nextToken?: string },
): Promise<UserTimelineResult> {
  if (!username) throw new Error('Username is required.');

  // Step 1: Resolve username to user ID
  const userRes = await fetch(`${X_API_BASE}/users/by/username/${encodeURIComponent(username)}`, {
    headers: getHeaders(),
  });

  if (!userRes.ok) {
    const body = await userRes.text();
    throw new Error(`X API user lookup failed (${userRes.status}): ${body}`);
  }

  const userData = (await userRes.json()) as { data?: { id: string } };
  const userId = userData.data?.id;
  if (!userId) throw new Error(`User @${username} not found.`);

  // Step 2: Fetch timeline
  const params = new URLSearchParams({
    max_results: String(options?.maxResults || 10),
    'tweet.fields': 'created_at,public_metrics',
  });
  if (options?.nextToken) {
    params.set('pagination_token', options.nextToken);
  }

  const timelineRes = await fetch(
    `${X_API_BASE}/users/${userId}/tweets?${params}`,
    { headers: getHeaders() },
  );

  if (!timelineRes.ok) {
    const body = await timelineRes.text();
    throw new Error(`X API timeline failed (${timelineRes.status}): ${body}`);
  }

  const payload = (await timelineRes.json()) as {
    data?: Tweet[];
    meta?: { next_token?: string };
  };

  return {
    tweets: payload.data || [],
    next_token: payload.meta?.next_token,
  };
}
