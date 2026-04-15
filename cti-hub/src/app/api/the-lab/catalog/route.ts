import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { rateLimit } from '@/lib/rate-limit-simple';
import { SEED_MODELS } from '@/lib/pricing/seed-models';
import type { PricingRow, Sector, Tier, Capability } from '@/lib/pricing/types';

/* ── User-facing tile shape (no internal names leak) ──────────── */

interface CatalogTile {
  id: string;
  title: string;
  provider: string;          // tier label, NOT real provider name
  sector: Sector;
  tier: Tier;
  costLuc: number;
  overview: string;
  bestCase: string;
  isLatest: boolean;
  routingPriority?: number;
  capabilities: Capability[];
}

/* ── IP-safe name map ─────────────────────────────────────────── */
// Per CLAUDE.md: never expose model names, provider names, or tool names.
// Users see generic descriptive names + tier labels.

const USER_FACING: Record<string, { title: string; overview: string; bestCase: string }> = {
  // LLM — open source
  'glm-5.1':          { title: 'Standard Chat',       overview: 'Open-source intelligence. Default chat engine.',                    bestCase: 'General chat, cost-efficient tasks' },
  'deepseek-v3.2':    { title: 'Deep Coder',          overview: 'Open-source coding specialist. Strong reasoning.',                  bestCase: 'Code generation and review' },
  // LLM — fast
  'gemini-3-flash':   { title: 'Fast Intelligence',   overview: 'Latest fast model. Real-time multimodal.',                          bestCase: 'Fast reasoning + multimodal input' },
  'claude-haiku-4.5': { title: 'Fast Analyst',        overview: 'Fast model with vision and tool use.',                              bestCase: 'Quick analysis with tool access' },
  // LLM — standard
  'claude-sonnet-4.5':{ title: 'Standard Analyst',    overview: 'Strong reasoning and coding. 1M context.',                          bestCase: 'Complex analysis, large document review' },
  'gpt-5.1':          { title: 'Standard Pro',        overview: 'Versatile intelligence with vision and tools.',                     bestCase: 'Balanced tasks, broad capability' },
  'gemini-3-pro':     { title: 'Standard Multimodal', overview: 'Multimodal reasoning. 1M context.',                                 bestCase: 'Multimodal tasks, long-context analysis' },
  // LLM — flagship
  'claude-opus-4.6':  { title: 'Precision Code',      overview: '1M context. Top-tier code + reasoning.',                            bestCase: 'Complex code, long-context analysis' },
  'gpt-5.2':          { title: 'Deep Intelligence',   overview: 'Flagship intelligence. #1 ranked.',                                 bestCase: 'Complex reasoning, research, analysis' },
  // Image — general
  'imagen-4':         { title: 'Photo Engine',        overview: 'Flagship photorealistic image generation.',                          bestCase: 'Photorealistic image generation' },
  'recraft-v4':       { title: 'Vector Engine',       overview: 'Vector gen, multiple styles, API compatible.',                       bestCase: 'Logo and vector asset generation' },
  'ideogram-v3':      { title: 'Graphics Engine',     overview: 'Generate, remix, edit, reframe with character refs.',                bestCase: 'Text-in-image and stylized graphics' },
  'nano-banana-pro-2':{ title: 'Quick Image',         overview: 'Fast image generation from multimodal input.',                       bestCase: 'Rapid concept art and iteration' },
  'glm-image':        { title: 'Free Image',          overview: 'Open-source image generation.',                                     bestCase: 'Free-tier image tasks' },
  'gpt-image':        { title: 'Smart Image',         overview: 'Intelligent image generation with understanding.',                   bestCase: 'Context-aware image creation' },
  // Design-first services
  'c1-thesys':        { title: 'Design Studio',       overview: 'AI design tool — portable specs for web/mobile/marketplace.',        bestCase: 'Component design + multi-surface export' },
  'stitch-mcp':       { title: 'Page Builder',        overview: 'AI page builder — mockups from filtered intent.',                    bestCase: 'Full page mockup generation' },
  'gamma':            { title: 'Multi-Surface',       overview: 'Multi-surface: decks, docs, webpages, social, brochures.',           bestCase: 'Presentation and multi-format content' },
  'napkin':           { title: 'Diagram Generator',   overview: 'Diagrams and visuals from text descriptions.',                       bestCase: 'Quick concept diagrams' },
  // Video
  'veo-3.1':          { title: 'Video Broadcast',     overview: 'Flagship broadcast-grade video generation.',                         bestCase: 'Broadcast-grade video generation' },
  'sora-2':           { title: 'Video Director',      overview: 'Premium video with cinematic control.',                              bestCase: 'Cinematic short-form video' },
  'kling-3':          { title: 'Video Motion',        overview: 'High-quality video gen with motion control.',                        bestCase: 'Dynamic motion and camera control' },
  'seedance-2':       { title: 'Video Prime',         overview: 'Flagship video generation. Character-consistent.',                   bestCase: 'Short-form video with character refs' },
};

/* ── LUC cost heuristic (wholesale → LUC) ─────────────────────── */
// 1 LUC ≈ $0.01. Rounded to nearest integer for display.
// Models priced per-1M-token: use output rate / 4 as proxy.
// Models priced per-unit: use unit price × 100.

function computeLuc(row: PricingRow): number {
  if (row.unitPrice != null) {
    return Math.max(1, Math.round(row.unitPrice * 100));
  }
  if (row.outputPer1M != null) {
    return Math.max(1, Math.round(row.outputPer1M / 4));
  }
  return 1;
}

/* ── Tier → user-facing provider label ────────────────────────── */

function tierLabel(tier?: Tier): string {
  switch (tier) {
    case 'open-source': return 'Open Source';
    case 'free':        return 'Free';
    case 'fast':        return 'Fast';
    case 'standard':    return 'Standard';
    case 'premium':     return 'Premium';
    case 'flagship':    return 'Flagship';
    default:            return 'Standard';
  }
}

/* ── Transform seed row → user-facing tile ────────────────────── */

function toTile(row: PricingRow): CatalogTile {
  const uf = USER_FACING[row.id];
  return {
    id: row.id,
    title: uf?.title ?? row.topic,
    provider: tierLabel(row.tier),
    sector: row.sector as Sector,
    tier: (row.tier ?? 'standard') as Tier,
    costLuc: computeLuc(row),
    overview: uf?.overview ?? row.description ?? '',
    bestCase: uf?.bestCase ?? '',
    isLatest: row.isLatest ?? false,
    routingPriority: row.routingPriority,
    capabilities: row.capabilities,
  };
}

/* ── Route handler ────────────────────────────────────────────── */

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  if (!rateLimit(auth.userId, 60, 60000)) {
    return NextResponse.json({ error: 'Too many requests', code: 'RATE_LIMITED' }, { status: 429 });
  }

  const catalog = SEED_MODELS
    .filter(r => r.active && (!r.supersededBy))
    .filter(r => {
      // Image/video must be latest
      if (r.sector === 'image' || r.sector === 'video') return r.isLatest === true;
      return true;
    })
    .map(toTile)
    .sort((a, b) => (a.routingPriority ?? 99) - (b.routingPriority ?? 99));

  return NextResponse.json({ catalog, count: catalog.length });
}
