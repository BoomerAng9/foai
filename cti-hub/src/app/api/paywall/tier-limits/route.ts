import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { isOwner } from '@/lib/allowlist';

interface TierLimits {
  max_sources: number;
  max_research_queries_per_day: number;
  max_agents: number;
  max_storage_mb: number;
  deep_research: boolean;
  custom_models: boolean;
}

const TIER_LIMITS: Record<string, TierLimits> = {
  free: { max_sources: 3, max_research_queries_per_day: 10, max_agents: 1, max_storage_mb: 50, deep_research: false, custom_models: false },
  starter: { max_sources: 10, max_research_queries_per_day: 50, max_agents: 3, max_storage_mb: 500, deep_research: true, custom_models: false },
  growth: { max_sources: 50, max_research_queries_per_day: 200, max_agents: 10, max_storage_mb: 5000, deep_research: true, custom_models: true },
  enterprise: { max_sources: -1, max_research_queries_per_day: -1, max_agents: -1, max_storage_mb: -1, deep_research: true, custom_models: true },
  owner: { max_sources: -1, max_research_queries_per_day: -1, max_agents: -1, max_storage_mb: -1, deep_research: true, custom_models: true },
};

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  // Owner bypass — always return unlimited
  if (isOwner(auth.email)) {
    return NextResponse.json(TIER_LIMITS.owner);
  }

  const tier = request.nextUrl.searchParams.get('tier') || 'free';
  const limits = TIER_LIMITS[tier] ?? TIER_LIMITS.free;

  return NextResponse.json(limits);
}
