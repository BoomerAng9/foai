# Reddit Monitor Skill

Pull community data from Reddit based on topics, subreddits, or keywords.
Used by ACHEEVY and analysts to stay current on community sentiment.

## When to Use

- User asks about community sentiment, trending topics, or "what people are saying"
- User wants to monitor subreddits for specific topics
- User asks about Reddit data, threads, or discussions
- Analyst agents need fresh community context for content generation

## How It Works

Reddit's public JSON API — no OAuth, no API key required. Append `.json` to any Reddit URL.

### Fetch a subreddit feed

```
GET https://www.reddit.com/r/{subreddit}/{mode}.json?limit={count}&raw_json=1

mode: hot | new | top | rising
count: 1-100 (default 25)
```

### Fetch a specific thread + comments

```
GET https://www.reddit.com/r/{subreddit}/comments/{post_id}.json?raw_json=1
```

### Search within a subreddit

```
GET https://www.reddit.com/r/{subreddit}/search.json?q={query}&restrict_sr=on&limit=25&raw_json=1
```

### Search all of Reddit

```
GET https://www.reddit.com/search.json?q={query}&limit=25&raw_json=1
```

## Response Shape

Every listing returns `data.children[]` where each child has:

```
kind: "t3" (post) or "t1" (comment)
data.id          — post ID
data.title       — post title
data.selftext    — body text
data.author      — username
data.score       — net upvotes
data.num_comments
data.url         — linked URL
data.permalink   — relative path
data.link_flair_text — flair tag
data.created_utc — unix timestamp
data.subreddit   — subreddit name
```

## Internal API

All endpoints require auth (Bearer token or cookie).

### List monitored subreddits
```
GET /api/reddit?action=subreddits
```

### Get cached posts
```
GET /api/reddit?action=posts&subreddit=NFL_Draft&limit=50
GET /api/reddit?action=posts&category=draft&limit=50
```

### Add a subreddit (owner only)
```
POST /api/reddit
{ "action": "add", "subreddit": "NFL_Draft", "category": "draft", "fetch_mode": "hot", "min_score": 10 }
```

### Remove a subreddit (owner only)
```
POST /api/reddit
{ "action": "remove", "subreddit": "NFL_Draft" }
```

### Trigger full sweep (owner only)
```
POST /api/reddit
{ "action": "sweep" }
```

### Extract any Reddit URL via Xtrac
```
POST /api/extract
{ "source": "reddit", "url": "https://www.reddit.com/r/NFL_Draft/comments/abc123" }
```

## Categories

| Category | Subreddits | Purpose |
|----------|-----------|---------|
| draft | NFL_Draft | Scouting, mock drafts, prospect analysis |
| league | nfl | League news, transactions, game discussion |
| college | CFB | College football, recruiting |
| fantasy | fantasyfootball, DynastyFF | Fantasy strategy, rankings |
| analytics | NFLstatstalk | Advanced stats, data analysis |
| tech | artificial, MachineLearning, LocalLLaMA | AI industry trends |
| business | SaaS, startups, Entrepreneur | Market intel, competitor signals |

## Rate Limits

Reddit public API: ~60 requests/minute unauthenticated. The sweep function waits 1.2s between subreddits. For 12 subs, a full sweep takes ~15 seconds.

## Rules

- Always set `User-Agent` header (required by Reddit)
- Filter by `min_score` to avoid noise
- Posts are upserted — scores and comment counts update on re-fetch
- Never expose Reddit usernames or raw post URLs in user-facing content
- Use extracted data as context, not verbatim quotes
