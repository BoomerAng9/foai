/**
 * Xtrac_Ang — Content Extraction Engine
 * Extracts transcripts from YouTube, web pages, and PDFs
 * for tutorial generation and Boomer_Ang consumption.
 */

export interface ExtractionResult {
  content: string;
  source: string;
  metadata: Record<string, unknown>;
}

const GOOGLE_KEY = process.env.GOOGLE_KEY || '';
const BRAVE_API_KEY = process.env.BRAVE_API_KEY || '';

/**
 * Extract transcript / details from a YouTube video.
 * Uses YouTube Data API v3 to fetch video details + captions.
 * Falls back to description if no captions available.
 */
export async function extractYouTube(url: string): Promise<ExtractionResult> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL — could not extract video ID');
  }

  if (!GOOGLE_KEY) {
    throw new Error('GOOGLE_KEY not configured — cannot access YouTube API');
  }

  // 1. Fetch video details (title, description, etc.)
  const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${GOOGLE_KEY}`;
  const detailsRes = await fetch(detailsUrl);
  if (!detailsRes.ok) {
    throw new Error(`YouTube API error: ${detailsRes.status}`);
  }
  const detailsData = await detailsRes.json();
  const video = detailsData.items?.[0];
  if (!video) {
    throw new Error('Video not found');
  }

  const snippet = video.snippet || {};
  const title = snippet.title || 'Untitled';
  const description = snippet.description || '';
  const channelTitle = snippet.channelTitle || '';
  const publishedAt = snippet.publishedAt || '';

  // 2. Try to fetch captions list
  let transcript = '';
  try {
    const captionsUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${GOOGLE_KEY}`;
    const captionsRes = await fetch(captionsUrl);
    if (captionsRes.ok) {
      const captionsData = await captionsRes.json();
      const captions = captionsData.items || [];
      const englishCaption = captions.find(
        (c: Record<string, Record<string, string>>) =>
          c.snippet?.language === 'en' || c.snippet?.language?.startsWith('en')
      );

      if (englishCaption) {
        // Try to download the caption track
        try {
          const captionDownloadUrl = `https://www.googleapis.com/youtube/v3/captions/${englishCaption.id}?tfmt=srt&key=${GOOGLE_KEY}`;
          const captionRes = await fetch(captionDownloadUrl);
          if (captionRes.ok) {
            transcript = await captionRes.text();
            // Clean SRT format — strip timestamps and numbers
            transcript = transcript
              .replace(/^\d+\s*$/gm, '')
              .replace(/\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/g, '')
              .replace(/\n{3,}/g, '\n\n')
              .trim();
          }
        } catch {
          // Caption download requires OAuth — fall through to description
        }
      }
    }
  } catch {
    // Captions endpoint may require OAuth for downloading — use description
  }

  // 3. Fallback: use description if no transcript
  const content = transcript || description;

  return {
    content: `# ${title}\n\nChannel: ${channelTitle}\n\n${content}`,
    source: `youtube:${videoId}`,
    metadata: {
      videoId,
      title,
      channelTitle,
      publishedAt,
      duration: video.contentDetails?.duration || '',
      hasTranscript: !!transcript,
      url,
    },
  };
}

/**
 * Extract text content from a web page.
 * Uses Brave Search API for context or fetches URL directly.
 */
export async function extractWebPage(url: string): Promise<ExtractionResult> {
  // Strategy 1: Direct fetch and extract text
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; XtracAng/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (res.ok) {
      const html = await res.text();
      const text = stripHtml(html);

      if (text.length > 100) {
        return {
          content: text,
          source: `web:${url}`,
          metadata: {
            url,
            contentLength: text.length,
            method: 'direct',
            fetchedAt: new Date().toISOString(),
          },
        };
      }
    }
  } catch {
    // Direct fetch failed — try Brave
  }

  // Strategy 2: Use Brave Search API to get page summary
  if (BRAVE_API_KEY) {
    try {
      const searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(url)}&count=3`;
      const braveRes = await fetch(searchUrl, {
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': BRAVE_API_KEY,
        },
      });

      if (braveRes.ok) {
        const data = await braveRes.json();
        const results = data.web?.results || [];
        const match = results.find((r: Record<string, string>) => r.url === url) || results[0];

        if (match) {
          return {
            content: `# ${match.title || 'Web Page'}\n\n${match.description || ''}\n\n${match.extra_snippets?.join('\n\n') || ''}`,
            source: `web:${url}`,
            metadata: {
              url,
              title: match.title,
              method: 'brave_search',
              fetchedAt: new Date().toISOString(),
            },
          };
        }
      }
    } catch {
      // Brave search failed
    }
  }

  throw new Error('Could not extract content from URL — both direct fetch and search failed');
}

/**
 * Extract text from PDF content.
 * Accepts the text content directly (no binary parsing in-container).
 */
export async function extractPDF(content: string): Promise<ExtractionResult> {
  if (!content || !content.trim()) {
    throw new Error('No PDF content provided');
  }

  return {
    content: content.trim(),
    source: 'pdf:uploaded',
    metadata: {
      contentLength: content.length,
      method: 'direct_text',
      extractedAt: new Date().toISOString(),
    },
  };
}

/**
 * Extract top posts from a Reddit thread or subreddit URL.
 * Works with: reddit.com/r/subreddit, reddit.com/r/subreddit/comments/...
 */
export async function extractReddit(url: string): Promise<ExtractionResult> {
  // Normalize URL to JSON endpoint
  const cleanUrl = url.replace(/\/$/, '');
  const jsonUrl = cleanUrl.endsWith('.json') ? cleanUrl : `${cleanUrl}.json`;

  const res = await fetch(jsonUrl, {
    headers: { 'User-Agent': 'FOAI-Deploy/1.0 (content-extraction)' },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Reddit fetch failed: ${res.status}`);
  }

  const data = await res.json();

  // Single post (comments page) returns an array of listings
  if (Array.isArray(data)) {
    const post = data[0]?.data?.children?.[0]?.data;
    const comments = (data[1]?.data?.children || [])
      .filter((c: Record<string, unknown>) => c.kind === 't1')
      .slice(0, 20)
      .map((c: Record<string, Record<string, unknown>>) =>
        `**u/${c.data.author}** (${c.data.score} pts):\n${c.data.body}`
      )
      .join('\n\n---\n\n');

    const content = `# ${post?.title || 'Reddit Post'}\n\nr/${post?.subreddit} · u/${post?.author} · ${post?.score} upvotes\n\n${post?.selftext || ''}\n\n## Top Comments\n\n${comments}`;

    return {
      content,
      source: `reddit:${post?.id || 'unknown'}`,
      metadata: {
        subreddit: post?.subreddit,
        author: post?.author,
        score: post?.score,
        num_comments: post?.num_comments,
        url,
        fetchedAt: new Date().toISOString(),
      },
    };
  }

  // Subreddit listing
  const posts = (data?.data?.children || [])
    .filter((c: Record<string, unknown>) => c.kind === 't3')
    .slice(0, 15)
    .map((c: Record<string, Record<string, unknown>>) => {
      const d = c.data;
      return `## ${d.title}\n\nu/${d.author} · ${d.score} pts · ${d.num_comments} comments\n${d.selftext ? String(d.selftext).slice(0, 500) : ''}`;
    })
    .join('\n\n---\n\n');

  const subredditName = data?.data?.children?.[0]?.data?.subreddit || 'unknown';

  return {
    content: `# r/${subredditName} — Top Posts\n\n${posts}`,
    source: `reddit:r/${subredditName}`,
    metadata: {
      subreddit: subredditName,
      postCount: data?.data?.children?.length || 0,
      url,
      fetchedAt: new Date().toISOString(),
    },
  };
}

// ─── Helpers ───

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function stripHtml(html: string): string {
  return html
    // Remove script/style blocks
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}
