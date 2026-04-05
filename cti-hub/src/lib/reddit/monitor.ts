/**
 * Reddit Monitor — Pull community data from subreddits.
 * Uses Reddit's public JSON API (no OAuth required for read-only).
 * Stores posts in DB for ACHEEVY and analysts to reference.
 */

import { sql } from '@/lib/insforge';

const USER_AGENT = 'FOAI-Deploy/1.0 (community-monitor)';

export interface RedditPost {
  reddit_id: string;
  subreddit: string;
  title: string;
  selftext: string;
  author: string;
  score: number;
  num_comments: number;
  url: string;
  permalink: string;
  flair: string | null;
  created_utc: Date;
}

export interface SubredditConfig {
  id: string;
  subreddit: string;
  category: string;
  enabled: boolean;
  fetch_mode: string;
  min_score: number;
  last_fetched_at: Date | null;
}

// ── Fetch from Reddit ────────────────────────────────────

export async function fetchSubredditPosts(
  subreddit: string,
  mode: 'hot' | 'new' | 'top' | 'rising' = 'hot',
  limit: number = 25,
): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}/${mode}.json?limit=${limit}&raw_json=1`;

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Reddit API error for r/${subreddit}: ${res.status}`);
  }

  const data = await res.json();
  const children = data?.data?.children || [];

  return children
    .filter((c: { kind: string; data: Record<string, unknown> }) => c.kind === 't3')
    .map((c: { kind: string; data: Record<string, unknown> }) => {
      const d = c.data as Record<string, unknown>;
      return {
        reddit_id: `t3_${d.id}`,
        subreddit: String(d.subreddit || subreddit),
        title: String(d.title || ''),
        selftext: String(d.selftext || ''),
        author: String(d.author || '[deleted]'),
        score: Number(d.score) || 0,
        num_comments: Number(d.num_comments) || 0,
        url: String(d.url || ''),
        permalink: `https://reddit.com${d.permalink}`,
        flair: d.link_flair_text ? String(d.link_flair_text) : null,
        created_utc: new Date((Number(d.created_utc) || 0) * 1000),
      };
    });
}

// ── Database: Subreddit configs ──────────────────────────

export async function getMonitoredSubreddits(): Promise<SubredditConfig[]> {
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM monitored_subreddits ORDER BY category, subreddit
  `;
  return rows as unknown as SubredditConfig[];
}

export async function addSubreddit(
  subreddit: string,
  category: string = 'general',
  fetchMode: string = 'hot',
  minScore: number = 5,
): Promise<SubredditConfig | null> {
  if (!sql) return null;
  const rows = await sql`
    INSERT INTO monitored_subreddits (subreddit, category, fetch_mode, min_score)
    VALUES (${subreddit}, ${category}, ${fetchMode}, ${minScore})
    ON CONFLICT (subreddit) DO UPDATE SET
      category = EXCLUDED.category,
      fetch_mode = EXCLUDED.fetch_mode,
      min_score = EXCLUDED.min_score,
      enabled = true
    RETURNING *
  `;
  return (rows[0] as unknown as SubredditConfig) ?? null;
}

export async function removeSubreddit(subreddit: string): Promise<void> {
  if (!sql) return;
  await sql`UPDATE monitored_subreddits SET enabled = false WHERE subreddit = ${subreddit}`;
}

// ── Database: Posts ──────────────────────────────────────

export async function storePosts(posts: RedditPost[], category: string): Promise<number> {
  if (!sql || posts.length === 0) return 0;

  let stored = 0;
  for (const p of posts) {
    try {
      await sql`
        INSERT INTO reddit_posts (reddit_id, subreddit, title, selftext, author, score, num_comments, url, permalink, flair, created_utc, category)
        VALUES (${p.reddit_id}, ${p.subreddit}, ${p.title}, ${p.selftext}, ${p.author}, ${p.score}, ${p.num_comments}, ${p.url}, ${p.permalink}, ${p.flair}, ${p.created_utc}, ${category})
        ON CONFLICT (reddit_id) DO UPDATE SET
          score = EXCLUDED.score,
          num_comments = EXCLUDED.num_comments,
          fetched_at = NOW()
      `;
      stored++;
    } catch {
      // Skip individual post failures (e.g. constraint violations)
    }
  }
  return stored;
}

export async function getRecentPosts(
  subreddit?: string,
  category?: string,
  limit: number = 50,
) {
  if (!sql) return [];

  if (subreddit) {
    return sql`
      SELECT * FROM reddit_posts
      WHERE subreddit = ${subreddit}
      ORDER BY score DESC, created_utc DESC
      LIMIT ${limit}
    `;
  }
  if (category) {
    return sql`
      SELECT * FROM reddit_posts
      WHERE category = ${category}
      ORDER BY score DESC, created_utc DESC
      LIMIT ${limit}
    `;
  }
  return sql`
    SELECT * FROM reddit_posts
    ORDER BY fetched_at DESC
    LIMIT ${limit}
  `;
}

// ── Full sweep: fetch all enabled subreddits ─────────────

export async function runMonitorSweep(): Promise<{
  subreddits: number;
  posts: number;
  errors: string[];
}> {
  const configs = await getMonitoredSubreddits();
  const enabled = configs.filter(c => c.enabled);

  let totalPosts = 0;
  const errors: string[] = [];

  for (const config of enabled) {
    try {
      const posts = await fetchSubredditPosts(
        config.subreddit,
        config.fetch_mode as 'hot' | 'new' | 'top' | 'rising',
        50,
      );

      // Filter by minimum score
      const qualified = posts.filter(p => p.score >= config.min_score);
      const stored = await storePosts(qualified, config.category);
      totalPosts += stored;

      // Update last_fetched_at
      if (sql) {
        await sql`
          UPDATE monitored_subreddits SET last_fetched_at = NOW()
          WHERE subreddit = ${config.subreddit}
        `;
      }

      // Rate limit: Reddit asks for 1 req/sec for unauthenticated
      await new Promise(resolve => setTimeout(resolve, 1200));
    } catch (err) {
      errors.push(`r/${config.subreddit}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return { subreddits: enabled.length, posts: totalPosts, errors };
}
