import type { Grade } from '@/lib/dmaic/types';

export interface ScrapeResult {
  items: NewsItem[];
  sourcesChecked: number;
  scrapedAt: string;
}

export interface NewsItem {
  headline: string;
  summary: string;
  sourceUrl: string;
  sourceName: string;
  publishedAt: string;
  relevanceTag: string;
  verified: boolean;
}

export interface BriefingResult {
  userId: number;
  team: string;
  date: string;
  hasNews: boolean;
  items: NewsItem[];
  studyContent: string;
  commercialContent: string;
  sourcesUsed: number;
  verifiedClaims: number;
  unverifiedClaims: number;
  noNewsNotice?: string;
}

export interface DeliveryResult {
  userId: number;
  briefingId: string;
  grade: Grade;
  score: number;
  shipped: boolean;
  deliveredVia: ('email' | 'dashboard')[];
  charterId: string;
  deliveredAt: string;
  error?: string;
}

export interface ProducerConfig {
  sqwaadrunGatewayUrl: string;
  sqwaadrunApiKey: string;
  resendApiKey: string;
  fromEmail: string;
}
