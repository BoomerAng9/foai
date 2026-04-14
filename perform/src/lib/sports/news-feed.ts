import { ALL_TEAMS } from '@/lib/franchise/teams';
import type { Sport } from '@/lib/franchise/types';

export interface SportsFeedRecord {
  sport: Sport;
  headline: string;
  summary: string;
  source_name: string;
  source_url: string;
  category: string;
  published_at: string | null;
  teams_mentioned: string[];
  players_mentioned: string[];
}

export const DEFAULT_FEED_SPORTS: Sport[] = ['nfl', 'nba', 'mlb'];

export const SPORT_FEED_CONFIG: Record<Sport, {
  label: string;
  badgeColor: string;
  segmentMs: number;
  rssUrl: string;
}> = {
  nfl: {
    label: 'NFL',
    badgeColor: '#013369',
    segmentMs: 22000,
    rssUrl: 'https://www.espn.com/espn/rss/nfl/news',
  },
  nba: {
    label: 'NBA',
    badgeColor: '#1D428A',
    segmentMs: 18000,
    rssUrl: 'https://www.espn.com/espn/rss/nba/news',
  },
  mlb: {
    label: 'MLB',
    badgeColor: '#002D72',
    segmentMs: 18000,
    rssUrl: 'https://www.espn.com/espn/rss/mlb/news',
  },
};

const EXTRA_TEAM_ALIASES: Partial<Record<Sport, Record<string, string[]>>> = {
  nfl: {
    NE: ['Pats', 'Pats'],
    NO: ['Saints'],
    SF: ['49ers', 'Niners'],
    TB: ['Bucs', 'Buccaneers'],
    WAS: ['Commanders', 'Washington'],
  },
  nba: {
    BKN: ['Nets'],
    GSW: ['Warriors', 'Dubs'],
    LAC: ['Clippers', 'Clips'],
    LAL: ['Lakers'],
    NOP: ['Pelicans', 'Pels'],
    NYK: ['Knicks'],
    OKC: ['Thunder'],
    PHI: ['76ers', 'Sixers'],
    POR: ['Trail Blazers', 'Blazers'],
    SAS: ['Spurs'],
  },
  mlb: {
    ATH: ['Athletics', "A's", 'As'],
    ARI: ['Diamondbacks', 'D-backs', 'Dbacks'],
    CHC: ['Cubs'],
    CWS: ['White Sox'],
    LAD: ['Dodgers'],
    NYM: ['Mets'],
    NYY: ['Yankees'],
    OAK: ['Athletics', "A's", 'As'],
    SD: ['Padres'],
    SF: ['Giants'],
    STL: ['Cardinals'],
    TB: ['Rays'],
  },
};

type ParsedRssItem = {
  title: string;
  description: string;
  link: string;
  publishedAt: string | null;
};

type TeamMatcher = {
  abbreviation: string;
  aliases: string[];
};

const TEAM_MATCHERS: Record<Sport, TeamMatcher[]> = {
  nfl: buildTeamMatchers('nfl'),
  nba: buildTeamMatchers('nba'),
  mlb: buildTeamMatchers('mlb'),
};

function buildTeamMatchers(sport: Sport): TeamMatcher[] {
  return ALL_TEAMS[sport].map((team) => {
    const aliases = new Set<string>([
      `${team.city} ${team.name}`,
      team.name,
      ...(EXTRA_TEAM_ALIASES[sport]?.[team.abbreviation] ?? []),
    ]);

    return {
      abbreviation: team.abbreviation,
      aliases: [...aliases].filter(Boolean),
    };
  });
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function stripHtml(value: string): string {
  return decodeXmlEntities(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return match?.[1]?.trim() ?? '';
}

function parseRssItems(xml: string): ParsedRssItem[] {
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];

  return items.map((item) => {
    const title = stripHtml(extractTag(item, 'title'));
    const description = stripHtml(extractTag(item, 'description'));
    const link = stripHtml(extractTag(item, 'link'));
    const pubDate = stripHtml(extractTag(item, 'pubDate'));
    const published = pubDate ? new Date(pubDate) : null;

    return {
      title,
      description,
      link,
      publishedAt: published && !Number.isNaN(published.getTime())
        ? published.toISOString()
        : null,
    };
  }).filter((item) => item.title && item.link);
}

function categorizeHeadline(text: string): string {
  const value = text.toLowerCase();

  if (/(trade|traded|deal|acquire|acquired)/.test(value)) return 'trade';
  if (/(signs|signed|signing|extension|extends|contract)/.test(value)) return 'signing';
  if (/(injury|injured|out with|out for|il\b|disabled list|diagnosis|surgery)/.test(value)) return 'injury';
  if (/(draft|prospect|combine|mock draft)/.test(value)) return 'draft';
  if (/(playoff|postseason|finals|wild card)/.test(value)) return 'playoff';
  if (/(wins|win|beats|tops|walk-off|rally|clinches)/.test(value)) return 'game';

  return 'breaking';
}

function extractTeams(sport: Sport, headline: string, summary: string): string[] {
  const haystack = `${headline} ${summary}`.toLowerCase();
  const matches = new Set<string>();

  for (const team of TEAM_MATCHERS[sport]) {
    if (team.aliases.some((alias) => haystack.includes(alias.toLowerCase()))) {
      matches.add(team.abbreviation);
    }
  }

  return [...matches];
}

async function fetchRssFeed(sport: Sport): Promise<SportsFeedRecord[]> {
  const config = SPORT_FEED_CONFIG[sport];
  const response = await fetch(config.rssUrl, {
    cache: 'no-store',
    headers: {
      Accept: 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) return [];

  const xml = await response.text();
  const items = parseRssItems(xml).slice(0, 20);

  return items.map((item) => ({
    sport,
    headline: item.title,
    summary: item.description,
    source_name: 'ESPN',
    source_url: item.link,
    category: categorizeHeadline(`${item.title} ${item.description}`),
    published_at: item.publishedAt,
    teams_mentioned: extractTeams(sport, item.title, item.description),
    players_mentioned: [],
  }));
}

export async function fetchSportsHeadlineFeed(
  sports: Sport[] = DEFAULT_FEED_SPORTS,
): Promise<SportsFeedRecord[]> {
  const feeds = await Promise.all(
    sports.map(async (sport) => {
      try {
        return await fetchRssFeed(sport);
      } catch {
        return [];
      }
    }),
  );

  const deduped = new Map<string, SportsFeedRecord>();
  for (const item of feeds.flat()) {
    if (!deduped.has(item.source_url)) {
      deduped.set(item.source_url, item);
    }
  }

  return [...deduped.values()];
}
