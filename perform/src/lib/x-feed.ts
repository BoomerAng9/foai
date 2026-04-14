// X/Twitter API v2 client for live sports feeds
const X_BEARER = process.env.X_BEARER_TOKEN || '';
const X_API_BASE = 'https://api.x.com/2';

export interface Tweet {
  id: string;
  text: string;
  authorName: string;
  authorUsername: string;
  authorVerified: boolean;
  createdAt: string;
  metrics?: {
    likes: number;
    retweets: number;
    replies: number;
  };
}

// Top sports accounts to follow for breaking news
const SPORTS_ACCOUNTS = [
  'AdamSchefter',       // NFL insider
  'RapSheet',           // NFL Network
  'FieldYates',         // ESPN NFL
  'PFF',                // Pro Football Focus
  'ShamsCharania',      // NBA insider
  'ChrisBHaynes',       // NBA insider
  'TheSteinLine',       // NBA insider
  'JeffPassan',         // MLB insider
  'MLBNetwork',         // MLB
  'NBA',                // NBA league
  'MLB',                // MLB league
  'SportsCenter',       // ESPN
];

export async function fetchSportsTimeline(maxResults = 20): Promise<Tweet[]> {
  if (!X_BEARER) {
    console.warn('[X-Feed] X_BEARER_TOKEN not set');
    return [];
  }

  try {
    // Use search/recent with sports query
    const query = encodeURIComponent(
      '(NFL OR NBA OR MLB OR football OR basketball OR baseball) (trade OR signing OR injury OR playoffs OR free agency OR extension) -is:retweet lang:en'
    );
    const url = `${X_API_BASE}/tweets/search/recent?query=${query}&max_results=${maxResults}&tweet.fields=created_at,public_metrics,author_id&expansions=author_id&user.fields=name,username,verified`;

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${X_BEARER}`,
      },
      next: { revalidate: 120 }, // Cache for 2 minutes
    });

    if (!res.ok) {
      console.error(`[X-Feed] API error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const users = new Map<string, { name: string; username: string; verified: boolean }>();

    if (data.includes?.users) {
      for (const u of data.includes.users) {
        users.set(u.id, { name: u.name, username: u.username, verified: u.verified || false });
      }
    }

    return (data.data || []).map((tweet: any) => {
      const author = users.get(tweet.author_id) || { name: 'Unknown', username: 'unknown', verified: false };
      return {
        id: tweet.id,
        text: tweet.text,
        authorName: author.name,
        authorUsername: author.username,
        authorVerified: author.verified,
        createdAt: tweet.created_at,
        metrics: tweet.public_metrics ? {
          likes: tweet.public_metrics.like_count,
          retweets: tweet.public_metrics.retweet_count,
          replies: tweet.public_metrics.reply_count,
        } : undefined,
      };
    });
  } catch (err) {
    console.error('[X-Feed] Fetch error:', err);
    return [];
  }
}

export async function fetchFromAccounts(accounts: string[] = SPORTS_ACCOUNTS, maxResults = 10): Promise<Tweet[]> {
  if (!X_BEARER) return [];

  try {
    const fromQuery = accounts.map(a => `from:${a}`).join(' OR ');
    const query = encodeURIComponent(`(${fromQuery}) -is:retweet`);
    const url = `${X_API_BASE}/tweets/search/recent?query=${query}&max_results=${maxResults}&tweet.fields=created_at,public_metrics,author_id&expansions=author_id&user.fields=name,username,verified`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${X_BEARER}` },
      next: { revalidate: 120 },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const users = new Map<string, { name: string; username: string; verified: boolean }>();
    if (data.includes?.users) {
      for (const u of data.includes.users) {
        users.set(u.id, { name: u.name, username: u.username, verified: u.verified || false });
      }
    }

    return (data.data || []).map((tweet: any) => {
      const author = users.get(tweet.author_id) || { name: 'Unknown', username: 'unknown', verified: false };
      return {
        id: tweet.id,
        text: tweet.text,
        authorName: author.name,
        authorUsername: author.username,
        authorVerified: author.verified,
        createdAt: tweet.created_at,
        metrics: tweet.public_metrics ? {
          likes: tweet.public_metrics.like_count,
          retweets: tweet.public_metrics.retweet_count,
          replies: tweet.public_metrics.reply_count,
        } : undefined,
      };
    });
  } catch {
    return [];
  }
}
