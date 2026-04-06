/**
 * The Sqwaadrun roster — pairs character profiles with operational
 * metadata (role, capabilities, sample mission). The UI consumes
 * this directly via HawkCardData.
 */

import type { HawkCardData } from '@/components/hawks/HawkCard';
import { HAWK_PROFILES, getHawkBySlug } from '@/lib/hawks/characters';

interface OpsMeta {
  slug: string;
  role: string;
  capabilities: string[];
  sampleMission: string;
}

const OPS: OpsMeta[] = [
  // ─── Core ───
  {
    slug: 'lil_guard_hawk',
    role: 'Gatekeeper — robots.txt, rate limiting, proxy rotation',
    capabilities: [
      'Enforces robots.txt and crawl delays',
      'User-agent rotation across real browser strings',
      'Per-domain allow / denylists',
      'Proxy pool management',
      'Block detection and graceful retreat',
    ],
    sampleMission: 'Check if this domain allows scraping and pace the next 50 requests.',
  },
  {
    slug: 'lil_scrapp_hawk',
    role: 'Squad Lead — async fetching with retries and encoding',
    capabilities: [
      'High-concurrency HTTP fetching',
      'Automatic retries on 429 / 5xx with exponential backoff',
      'Encoding auto-detection',
      'Connection pooling',
      'Squad coordination across all other Hawks',
    ],
    sampleMission: 'Fetch the front page with three retries and return clean bytes.',
  },
  {
    slug: 'lil_parse_hawk',
    role: 'Parser — title, meta, links, markdown conversion',
    capabilities: [
      'Title / meta description / OG tag extraction',
      'Link and image harvesting with URL resolution',
      'Clean text extraction',
      'Markdown conversion',
      'Language detection',
    ],
    sampleMission: 'Convert this page to clean markdown with all links resolved.',
  },
  {
    slug: 'lil_crawl_hawk',
    role: 'Crawler — BFS frontier and link discovery',
    capabilities: [
      'Breadth-first site traversal',
      'Include / exclude pattern filtering',
      'Depth and page count limits',
      'Duplicate URL detection',
      'Domain boundary enforcement',
    ],
    sampleMission: 'Crawl the docs section up to depth three, skip /api/ routes.',
  },
  {
    slug: 'lil_snap_hawk',
    role: 'Screenshot specialist — JS rendering for SPAs',
    capabilities: [
      'Full-page screenshots',
      'JavaScript rendering for SPAs',
      'Viewport customization',
      'PDF export',
      'Graceful standby when renderer offline',
    ],
    sampleMission: 'Capture a 1920×1080 screenshot of this dashboard after JS hydration.',
  },
  {
    slug: 'lil_store_hawk',
    role: 'Persistence — SQLite WAL, dedup, caching',
    capabilities: [
      'SQLite storage with WAL mode',
      'Content-hash deduplication',
      'TTL cache invalidation',
      'JSON / JSONL / Markdown export',
      'Query by URL, date, or tag',
    ],
    sampleMission: 'Cache this result for six hours, dedup by content hash.',
  },

  // ─── Expansion ───
  {
    slug: 'lil_extract_hawk',
    role: 'Surgical extraction — CSS / XPath / regex schemas',
    capabilities: [
      'Declarative extraction rules',
      'CSS, XPath, and regex selectors',
      'Type coercion (int, float, bool)',
      'HTML table extraction',
      'CSV export',
    ],
    sampleMission: 'Pull name, price, and rating from every product card on this page.',
  },
  {
    slug: 'lil_feed_hawk',
    role: 'RSS / Atom / JSON Feed dispatcher',
    capabilities: [
      'Feed auto-discovery from HTML link tags',
      'Parse RSS 2.0, Atom, JSON Feed',
      'Entry deduplication by GUID',
      'Publication date filtering',
      'Author and category extraction',
    ],
    sampleMission: 'Find all feeds on this blog and pull the last 25 entries.',
  },
  {
    slug: 'lil_diff_hawk',
    role: 'Change detection — hashing, unified diffs, alerts',
    capabilities: [
      'SHA-256 content hashing',
      'Unified diff generation',
      'Similarity ratio scoring',
      'Change history with timestamps',
      'Field-level change alerts',
    ],
    sampleMission: 'Alert me when the pricing page changes by more than 5%.',
  },
  {
    slug: 'lil_clean_hawk',
    role: 'Boilerplate removal, normalization, quality scoring',
    capabilities: [
      'Unicode normalization',
      '17-pattern boilerplate removal',
      'Quality scoring (0–100)',
      'Repetition and dedup filtering',
      'Readability calibration',
    ],
    sampleMission: 'Strip nav and footer from this article and score what remains.',
  },
  {
    slug: 'lil_api_hawk',
    role: 'REST / GraphQL with auth and pagination',
    capabilities: [
      'Bearer, API key, and Basic auth',
      'Cursor, offset, and URL pagination',
      'Rate limit awareness',
      'Schema validation',
      'Multi-endpoint orchestration',
    ],
    sampleMission: 'Page through this authenticated REST endpoint until exhausted.',
  },
  {
    slug: 'lil_queue_hawk',
    role: 'Priority queue with retry scheduling',
    capabilities: [
      'Priority-based job ordering',
      'Worker pool management',
      'Retry with exponential backoff',
      'Job status persistence',
      'Deadline enforcement',
    ],
    sampleMission: 'Queue 1,000 URLs with priority 5 across 8 workers in parallel.',
  },

  // ─── Specialist ───
  {
    slug: 'lil_sitemap_hawk',
    role: 'Deep XML sitemap specialist',
    capabilities: [
      'robots.txt sitemap auto-discovery',
      'Sitemap index recursion',
      'Last-modified filtering',
      'Priority and changefreq awareness',
      'Image, video, and news sitemap extensions',
    ],
    sampleMission: 'Pull every URL modified in the last 7 days from this 500-page sitemap.',
  },
  {
    slug: 'lil_stealth_hawk',
    role: 'Anti-detection — fingerprints, timing, referrers',
    capabilities: [
      '4 full browser fingerprint profiles',
      'Per-domain session profile persistence',
      'Human-like timing jitter',
      'Referrer chain construction',
      'Bot-detection scanner (Cloudflare, Akamai, captcha)',
    ],
    sampleMission: 'Scrape this site with realistic Chrome-Mac headers and detect challenge pages.',
  },
  {
    slug: 'lil_schema_hawk',
    role: 'Structured data — JSON-LD, microdata, RDFa, OG',
    capabilities: [
      'JSON-LD with @graph flattening',
      'Microdata recursive tree parsing',
      'RDFa type / property / about',
      'Open Graph with nested properties',
      'Schema.org type detection',
    ],
    sampleMission: 'Extract every structured data block on this athlete profile page.',
  },
  {
    slug: 'lil_pipe_hawk',
    role: 'ETL — map / filter / coerce / dedup / sort',
    capabilities: [
      'Field mapping and renaming',
      'Type coercion (str → int / float / bool / case)',
      '11 filter operators',
      'Deduplication by key',
      'SQL INSERT / CSV export',
    ],
    sampleMission: 'Rename fields, cast prices to float, dedup by SKU, export as SQL.',
  },
  {
    slug: 'lil_sched_hawk',
    role: 'Scheduled missions — recurring jobs and persistence',
    capabilities: [
      'Interval-based job registration',
      'Automatic next-run scheduling',
      'Max-run limits',
      'Disk persistence across restarts',
      'Change-only callbacks via Diff_Hawk',
    ],
    sampleMission: 'Re-scrape this page every six hours and notify only if it changes.',
  },
];

export const SQWAADRUN_ROSTER: HawkCardData[] = OPS.map((op) => {
  const profile = getHawkBySlug(op.slug);
  if (!profile) {
    throw new Error(`No character profile for ${op.slug}`);
  }
  return {
    profile,
    role: op.role,
    capabilities: op.capabilities,
    sampleMission: op.sampleMission,
  };
});

export const CORE_HAWKS = SQWAADRUN_ROSTER.filter((h) => h.profile.rank === 'core');
export const EXPANSION_HAWKS = SQWAADRUN_ROSTER.filter((h) => h.profile.rank === 'expansion');
export const SPECIALIST_HAWKS = SQWAADRUN_ROSTER.filter((h) => h.profile.rank === 'specialist');
