import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';

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
};

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const userId = request.nextUrl.searchParams.get('userId');
  const feature = request.nextUrl.searchParams.get('feature') as keyof TierLimits | null;

  if (!userId || !feature) {
    return NextResponse.json({ error: 'userId and feature are required' }, { status: 400 });
  }

  // Look up user tier from profiles table
  let tier = 'free';
  if (sql) {
    try {
      const rows = await sql`SELECT tier FROM profiles WHERE user_id = ${userId} LIMIT 1`;
      if (rows.length > 0 && rows[0].tier) {
        tier = rows[0].tier;
      }
    } catch {
      // Default to free if profiles table doesn't exist or query fails
    }
  }

  const limits = TIER_LIMITS[tier] ?? TIER_LIMITS.free;
  const value = limits[feature];

  // Boolean features: true = allowed
  // Numeric features: -1 = unlimited (allowed), >0 = allowed, 0 = not allowed
  let allowed = false;
  if (typeof value === 'boolean') {
    allowed = value;
  } else if (typeof value === 'number') {
    allowed = value !== 0;
  }

  return NextResponse.json({ allowed, tier, feature, value });
}
