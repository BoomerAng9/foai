// Canonical Sqwaadrun roster — sourced from
// ~/foai/smelter-os/sqwaadrun/sqwaadrun_hawks.json. Keep this in sync.
// Each `id` matches the lowercase PNG filename in /public/hawks/.
//
// `beats` are the ordered lifecycle steps shown in the dispatch-thinking
// trace when this hawk is deployed from the chat. Each beat is ~700ms.

export interface SqwaadrunHawk {
  id: string;
  title: string;
  catchphrase: string;
  personality: string;
  specialty: string;
  stats: { speed: number; accuracy: number; stealth: number; endurance: number; intel: number };
  beats: string[];
}

export const SQWAADRUN_ROSTER: SqwaadrunHawk[] = [
  {
    id: 'Lil_Guard_Hawk',
    title: 'The Gatekeeper',
    catchphrase: "I read the rules so you don't have to.",
    personality: 'Cautious, methodical, protective. Checks robots.txt before anyone else moves.',
    specialty: 'robots.txt compliance, rate limiting, user-agent rotation',
    stats: { speed: 5, accuracy: 10, stealth: 7, endurance: 9, intel: 8 },
    beats: ['Reading robots.txt', 'Verifying crawl-delay', 'Rotating user-agent', 'Checking legal scope', 'Clearing for entry'],
  },
  {
    id: 'Lil_Scrapp_Hawk',
    title: 'The Squad Lead',
    catchphrase: "First in, last out. That's the Scrappie way.",
    personality: 'Bold, reliable, no-nonsense. The default hawk for any fetch operation.',
    specialty: 'Async HTTP fetching, multi-URL parallel downloads, raw content retrieval',
    stats: { speed: 9, accuracy: 8, stealth: 6, endurance: 9, intel: 7 },
    beats: ['Opening async session', 'Queuing URL batch', 'Pulling raw content', 'Streaming bytes home', 'Confirming retrieval'],
  },
  {
    id: 'Lil_Parse_Hawk',
    title: 'The Translator',
    catchphrase: 'I see structure where you see chaos.',
    personality: 'Analytical, patient, detail-oriented. Finds patterns in noise.',
    specialty: 'HTML→markdown, content extraction, JSON-LD parsing, language detection',
    stats: { speed: 6, accuracy: 10, stealth: 5, endurance: 8, intel: 10 },
    beats: ['Parsing DOM tree', 'Stripping boilerplate', 'Detecting language', 'Converting to markdown', 'Surfacing structure'],
  },
  {
    id: 'Lil_Crawl_Hawk',
    title: 'The Explorer',
    catchphrase: 'Every link is a door. I open them all.',
    personality: 'Curious, tireless, slightly obsessive. Always wants to go one level deeper.',
    specialty: 'BFS frontier crawling, link discovery, depth-limited site traversal',
    stats: { speed: 8, accuracy: 7, stealth: 6, endurance: 10, intel: 7 },
    beats: ['Seeding frontier', 'BFS traversal', 'Discovering links', 'Dedup by content hash', 'Mapping the graph'],
  },
  {
    id: 'Lil_Snap_Hawk',
    title: 'The Witness',
    catchphrase: 'A screenshot never lies.',
    personality: 'Visual, observant, quiet. Speaks through images, not words.',
    specialty: 'Playwright screenshots, viewport capture, visual evidence collection',
    stats: { speed: 7, accuracy: 9, stealth: 8, endurance: 6, intel: 7 },
    beats: ['Launching browser', 'Loading viewport', 'Waiting for paint', 'Capturing frame', 'Hashing evidence'],
  },
  {
    id: 'Lil_Store_Hawk',
    title: 'The Vault',
    catchphrase: "Nothing's lost on my watch.",
    personality: 'Dependable, organized, slightly territorial about storage.',
    specialty: 'SQLite WAL storage, content-hash dedup, JSON/CSV/Parquet export',
    stats: { speed: 6, accuracy: 9, stealth: 5, endurance: 10, intel: 7 },
    beats: ['Opening WAL session', 'Hashing payload', 'Checking dedup table', 'Writing row', 'Committing transaction'],
  },
  {
    id: 'Lil_Extract_Hawk',
    title: 'The Surgeon',
    catchphrase: 'I cut through the noise to find the signal.',
    personality: 'Precise, clinical, confident. Surgical accuracy.',
    specialty: 'CSS/XPath/regex schema extraction, structured data, confidence scoring',
    stats: { speed: 7, accuracy: 10, stealth: 6, endurance: 8, intel: 9 },
    beats: ['Loading schema', 'Querying selectors', 'Scoring confidence', 'Pulling target field', 'Returning structured row'],
  },
  {
    id: 'Lil_Feed_Hawk',
    title: 'The Listener',
    catchphrase: 'News breaks. I catch it before it lands.',
    personality: 'Always on, always monitoring. Calm under information overload.',
    specialty: 'RSS/Atom/JSON feed monitoring, news aggregation, article metadata',
    stats: { speed: 8, accuracy: 8, stealth: 7, endurance: 10, intel: 8 },
    beats: ['Subscribing to feeds', 'Polling for updates', 'Diffing against last seen', 'Extracting article metadata', 'Ranking by recency'],
  },
  {
    id: 'Lil_Diff_Hawk',
    title: 'The Fact-Checker',
    catchphrase: "Trust nothing. Verify everything. That's the Diff.",
    personality: 'Skeptical, relentless, uncompromising. Cares about accuracy.',
    specialty: 'Cross-source change detection, SHA-256 hashing, discrepancy flagging',
    stats: { speed: 6, accuracy: 10, stealth: 5, endurance: 9, intel: 10 },
    beats: ['Pulling source A', 'Pulling source B', 'SHA-256 fingerprint', 'Flagging discrepancies', 'Scoring consensus'],
  },
  {
    id: 'Lil_Clean_Hawk',
    title: 'The Polisher',
    catchphrase: 'Messy data in, clean data out. Every time.',
    personality: 'Meticulous, calm, slightly perfectionist. Produces the golden record.',
    specialty: 'Boilerplate removal, unicode normalization, entity resolution',
    stats: { speed: 7, accuracy: 9, stealth: 5, endurance: 8, intel: 8 },
    beats: ['Stripping boilerplate', 'Normalizing unicode', 'Resolving entity variants', 'Standardizing formats', 'Producing golden record'],
  },
  {
    id: 'Lil_API_Hawk',
    title: 'The Diplomat',
    catchphrase: "I speak every API's language fluently.",
    personality: 'Smooth, adaptable, multilingual in API protocols.',
    specialty: 'REST/GraphQL, OAuth/API-key auth, rate-limit negotiation, pagination',
    stats: { speed: 8, accuracy: 9, stealth: 7, endurance: 8, intel: 9 },
    beats: ['Negotiating auth', 'Crafting request', 'Honoring rate limit', 'Walking pagination', 'Returning payload'],
  },
  {
    id: 'Lil_Queue_Hawk',
    title: 'The Traffic Controller',
    catchphrase: 'Priority in, priority out. Nobody cuts the line.',
    personality: 'Organized, authoritative, calm under pressure.',
    specialty: 'Priority queues, retry with exponential backoff, work distribution',
    stats: { speed: 7, accuracy: 8, stealth: 5, endurance: 10, intel: 8 },
    beats: ['Sorting priorities', 'Distributing work', 'Handling retries', 'Backing off failures', 'Recovering dead-letters'],
  },
  {
    id: 'Lil_Sitemap_Hawk',
    title: 'The Cartographer',
    catchphrase: 'I map the territory before anyone sets foot in it.',
    personality: 'Systematic, thorough, patient. Builds the comprehensive URL catalog.',
    specialty: 'sitemap.xml discovery, nested index recursion, gzip decompression',
    stats: { speed: 7, accuracy: 10, stealth: 6, endurance: 9, intel: 9 },
    beats: ['Reading robots.txt', 'Fetching sitemap.xml', 'Recursing nested indexes', 'Gunzipping compressed maps', 'Cataloguing URLs'],
  },
  {
    id: 'Lil_Stealth_Hawk',
    title: 'The Ghost',
    catchphrase: 'They never see me coming. They never know I was there.',
    personality: 'Quiet, invisible, professional. Speaks rarely.',
    specialty: 'Browser profiles, TLS fingerprint rotation, anti-bot evasion',
    stats: { speed: 7, accuracy: 8, stealth: 10, endurance: 7, intel: 9 },
    beats: ['Selecting browser profile', 'Rotating TLS fingerprint', 'Spoofing Sec-Fetch', 'Evading bot detection', 'Phasing in clean'],
  },
  {
    id: 'Lil_Schema_Hawk',
    title: 'The Decoder',
    catchphrase: 'Structured data hides in plain sight. I find it.',
    personality: 'Cerebral, pattern-recognizing. Sees metadata nobody else notices.',
    specialty: 'JSON-LD graph, microdata, RDFa, OpenGraph, schema.org compliance',
    stats: { speed: 6, accuracy: 10, stealth: 6, endurance: 8, intel: 10 },
    beats: ['Scanning meta tags', 'Parsing JSON-LD graph', 'Resolving @context', 'Walking schema.org types', 'Returning entity tree'],
  },
  {
    id: 'Lil_Pipe_Hawk',
    title: 'The Engineer',
    catchphrase: "Raw in, refined out. That's what pipes do.",
    personality: 'Practical, efficient, builder-mentality.',
    specialty: 'ETL transforms, CSV/SQL/Parquet export, data pipeline construction',
    stats: { speed: 8, accuracy: 8, stealth: 5, endurance: 9, intel: 8 },
    beats: ['Loading raw input', 'Applying transforms', 'Validating shape', 'Writing target format', 'Sealing the manifest'],
  },
  {
    id: 'Lil_Sched_Hawk',
    title: 'The Clockmaker',
    catchphrase: 'Set it. Forget it. I never miss a beat.',
    personality: 'Punctual, reliable, obsessively precise about timing.',
    specialty: 'Interval scheduling, cron recurrence, disk-persisted job state',
    stats: { speed: 6, accuracy: 9, stealth: 5, endurance: 10, intel: 7 },
    beats: ['Reading schedule', 'Resolving timezone', 'Computing next fire', 'Persisting job state', 'Triggering execution'],
  },
];

// Default beats for non-Sqwaadrun missions (Chicken Hawk itself, generic chat).
export const DEFAULT_BEATS = [
  'Reading the request',
  'Picking the right approach',
  'Drafting the response',
  'Tightening the answer',
  'Surfacing the result',
];

export function findHawkInPrompt(prompt: string): SqwaadrunHawk | null {
  // Match the exact `Lil_<X>_Hawk` token in the deeplink prompt.
  const m = prompt.match(/Lil_[A-Za-z]+_Hawk/);
  if (!m) return null;
  return SQWAADRUN_ROSTER.find((h) => h.id === m[0]) ?? null;
}
