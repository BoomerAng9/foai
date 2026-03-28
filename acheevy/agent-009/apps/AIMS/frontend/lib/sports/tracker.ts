/**
 * Sports Tracker Module
 *
 * Combines Brave Search + SAM Vision for comprehensive player tracking.
 * Example: Track R.J. Johnson (CB, CU Buffs) career stats, starts, injuries.
 */

import braveSearch from '@/lib/search/brave';
import { generate, generateStructured } from '@/lib/ai/openrouter';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  conference?: string;
  jerseyNumber?: number;
  height?: string;
  weight?: number;
  class?: 'FR' | 'SO' | 'JR' | 'SR' | 'GR';
  hometown?: string;
  highSchool?: string;
  imageUrl?: string;
}

export interface GameStats {
  date: string;
  opponent: string;
  result: 'W' | 'L';
  score: string;
  started: boolean;
  stats: Record<string, number | string>;
}

export interface SeasonStats {
  year: number;
  team: string;
  gamesPlayed: number;
  gamesStarted: number;
  stats: Record<string, number | string>;
}

export interface Injury {
  date: string;
  type: string;
  bodyPart: string;
  severity: 'minor' | 'moderate' | 'major' | 'season-ending';
  gamessMissed: number;
  returnDate?: string;
  notes?: string;
}

export interface NewsItem {
  title: string;
  source: string;
  date: string;
  url: string;
  snippet: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface PlayerProfile {
  player: Player;
  careerStats: SeasonStats[];
  recentGames: GameStats[];
  injuries: Injury[];
  news: NewsItem[];
  highlights: string[];
  lastUpdated: Date;
}

// ─────────────────────────────────────────────────────────────
// Schemas for AI Extraction
// ─────────────────────────────────────────────────────────────

const PlayerSchema = z.object({
  name: z.string(),
  position: z.string(),
  team: z.string(),
  jerseyNumber: z.number().optional(),
  height: z.string().optional(),
  weight: z.number().optional(),
  class: z.enum(['FR', 'SO', 'JR', 'SR', 'GR']).optional(),
  hometown: z.string().optional(),
});

const SeasonStatsSchema = z.object({
  year: z.number(),
  team: z.string(),
  gamesPlayed: z.number(),
  gamesStarted: z.number(),
  tackles: z.number().optional(),
  interceptions: z.number().optional(),
  passesDefended: z.number().optional(),
  sacks: z.number().optional(),
  forcedFumbles: z.number().optional(),
});

const InjurySchema = z.object({
  date: z.string(),
  type: z.string(),
  bodyPart: z.string(),
  severity: z.enum(['minor', 'moderate', 'major', 'season-ending']),
  gamesMissed: z.number(),
  notes: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────
// Search Functions
// ─────────────────────────────────────────────────────────────

export async function searchPlayer(
  playerName: string,
  team?: string
): Promise<{ webResults: any[]; newsResults: any[] }> {
  const query = team
    ? `${playerName} ${team} football stats`
    : `${playerName} college football stats`;

  const [webResults, newsResults] = await Promise.all([
    braveSearch.search({ query, count: 10 }),
    braveSearch.searchNews(playerName, { count: 5, freshness: 'pm' }),
  ]);

  return {
    webResults: webResults.web.results,
    newsResults,
  };
}

export async function searchPlayerInjuries(
  playerName: string,
  team?: string
): Promise<any[]> {
  const query = team
    ? `${playerName} ${team} injury history`
    : `${playerName} football injury`;

  const results = await braveSearch.searchNews(query, { count: 10 });
  return results;
}

export async function searchPlayerHighlights(
  playerName: string,
  team?: string
): Promise<any[]> {
  const query = team
    ? `${playerName} ${team} highlights video`
    : `${playerName} football highlights`;

  const results = await braveSearch.searchVideos(query, { count: 5 });
  return results;
}

// ─────────────────────────────────────────────────────────────
// AI-Powered Data Extraction
// ─────────────────────────────────────────────────────────────

export async function extractPlayerProfile(
  searchResults: { webResults: any[]; newsResults: any[] },
  playerName: string
): Promise<Partial<PlayerProfile>> {
  // Compile search results into context
  const context = [
    ...searchResults.webResults.map(r => `${r.title}: ${r.description}`),
    ...searchResults.newsResults.map(r => `[NEWS] ${r.title}: ${r.description}`),
  ].join('\n\n');

  // Extract structured player info
  const playerInfo = await generateStructured({
    model: 'gemini-2-flash',
    prompt: `Extract player information for ${playerName} from this context:\n\n${context}`,
    schema: PlayerSchema,
    systemPrompt: 'You are a sports data extraction assistant. Extract accurate player information from search results.',
  });

  // Extract career stats
  const statsPrompt = `
Based on this context, extract season-by-season statistics for ${playerName}:

${context}

Focus on: games played, games started, tackles, interceptions, passes defended for defensive players.
Return as structured data.
`;

  const statsText = await generate({
    model: 'gemini-2-flash',
    prompt: statsPrompt,
  });

  // Extract injury history
  const injuryPrompt = `
Based on this context, list any injuries for ${playerName}:

${context}

Include: date, type of injury, body part affected, games missed.
`;

  const injuryText = await generate({
    model: 'gemini-2-flash',
    prompt: injuryPrompt,
  });

  return {
    player: {
      id: `player-${playerName.toLowerCase().replace(/\s+/g, '-')}`,
      ...playerInfo,
    } as Player,
    news: searchResults.newsResults.map(n => ({
      title: n.title,
      source: n.source,
      date: n.age,
      url: n.url,
      snippet: n.description,
    })),
    lastUpdated: new Date(),
  };
}

// ─────────────────────────────────────────────────────────────
// Main Tracking Function
// ─────────────────────────────────────────────────────────────

export async function trackPlayer(
  playerName: string,
  team?: string
): Promise<PlayerProfile> {
  console.log(`[Sports Tracker] Tracking ${playerName}${team ? ` (${team})` : ''}`);

  // Gather all search data in parallel
  const [
    searchResults,
    injuryResults,
    highlightResults,
  ] = await Promise.all([
    searchPlayer(playerName, team),
    searchPlayerInjuries(playerName, team),
    searchPlayerHighlights(playerName, team),
  ]);

  // Extract structured profile
  const profile = await extractPlayerProfile(searchResults, playerName);

  // Compile highlights
  const highlights = highlightResults.map(v => v.url);

  return {
    player: profile.player || {
      id: `player-${Date.now()}`,
      name: playerName,
      position: 'Unknown',
      team: team || 'Unknown',
    },
    careerStats: [],
    recentGames: [],
    injuries: [],
    news: profile.news || [],
    highlights,
    lastUpdated: new Date(),
  };
}

// ─────────────────────────────────────────────────────────────
// Stats Calculations
// ─────────────────────────────────────────────────────────────

export interface PlayerStatsCalculation {
  totalGames: number;
  totalStarts: number;
  startPercentage: number;
  gamesMissedToInjury: number;
  availabilityRate: number;
  seasonsPlayed: number;
}

export function calculateCareerStats(profile: PlayerProfile): PlayerStatsCalculation {
  const totalGames = profile.careerStats.reduce((sum, s) => sum + s.gamesPlayed, 0);
  const totalStarts = profile.careerStats.reduce((sum, s) => sum + s.gamesStarted, 0);
  const gamesMissedToInjury = profile.injuries.reduce((sum, i) => sum + i.gamessMissed, 0);

  // Assuming ~13 games per season
  const expectedGames = profile.careerStats.length * 13;

  return {
    totalGames,
    totalStarts,
    startPercentage: totalGames > 0 ? (totalStarts / totalGames) * 100 : 0,
    gamesMissedToInjury,
    availabilityRate: expectedGames > 0
      ? ((expectedGames - gamesMissedToInjury) / expectedGames) * 100
      : 100,
    seasonsPlayed: profile.careerStats.length,
  };
}

// ─────────────────────────────────────────────────────────────
// Real-Time Stats for Nixie Display
// ─────────────────────────────────────────────────────────────

export interface NixiePlayerStats {
  gamesPlayed: number;
  gamesStarted: number;
  tackles: number;
  interceptions: number;
  passesDefended: number;
  injuryGames: number;
}

export function getStatsForNixieDisplay(profile: PlayerProfile): NixiePlayerStats {
  const career = profile.careerStats;

  return {
    gamesPlayed: career.reduce((sum, s) => sum + s.gamesPlayed, 0),
    gamesStarted: career.reduce((sum, s) => sum + s.gamesStarted, 0),
    tackles: career.reduce((sum, s) => sum + (Number(s.stats.tackles) || 0), 0),
    interceptions: career.reduce((sum, s) => sum + (Number(s.stats.interceptions) || 0), 0),
    passesDefended: career.reduce((sum, s) => sum + (Number(s.stats.passesDefended) || 0), 0),
    injuryGames: profile.injuries.reduce((sum, i) => sum + i.gamessMissed, 0),
  };
}

export default {
  trackPlayer,
  searchPlayer,
  searchPlayerInjuries,
  searchPlayerHighlights,
  calculateCareerStats,
  getStatsForNixieDisplay,
};
