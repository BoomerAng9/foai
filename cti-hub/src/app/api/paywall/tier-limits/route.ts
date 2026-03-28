import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';

export async function GET(request: NextRequest) {
  const tier = request.nextUrl.searchParams.get('tier') || 'free';
  if (!sql) {
    return NextResponse.json({
      max_sources: 3, max_research_queries_per_day: 10, max_agents: 1,
      max_storage_mb: 50, deep_research: false, custom_models: false,
    });
  }
  const rows = await sql`SELECT get_tier_limits(${tier}) as limits`;
  return NextResponse.json(rows[0]?.limits ?? {});
}
