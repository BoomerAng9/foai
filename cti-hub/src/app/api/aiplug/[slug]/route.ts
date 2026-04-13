import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';
import { ensureAiplugTables } from '@/lib/aiplug/schema';
import type { PlugRow, PlugRunRow } from '@/lib/aiplug/types';

const FALLBACK_PLUGS: Record<string, { id: string; slug: string; name: string; tagline: string; description: string; category: string; status: string; featured: boolean; tags: string[]; features: string[]; price_cents: number; runtime_key: string }> = {
  'smb-marketing': { id: '1', slug: 'smb-marketing', name: 'SMB Marketing Agency', tagline: 'Autonomous marketing operations for small and mid-sized businesses.', description: 'A real agentic marketing agency that runs autonomously on your behalf. Drafts content, finds prospects, schedules campaigns, and reports weekly.', category: 'marketing', status: 'ready', featured: true, tags: ['marketing','agency','autonomous','flagship'], features: ['Autonomous prospect research','Content drafting and scheduling','Campaign performance tracking','Weekly executive reports','Live browser automation','Owner-viewable execution logs'], price_cents: 0, runtime_key: 'smb-marketing' },
  'teacher-twin': { id: '2', slug: 'teacher-twin', name: 'Teacher Twin', tagline: 'Autonomous teaching assistant for classroom and tutoring contexts.', description: 'A real agentic teaching partner that builds 2-week learning plans, generates ready-to-print assessments with answer keys, and drafts parent briefings.', category: 'education', status: 'ready', featured: false, tags: ['education','classroom','tutoring','flagship'], features: ['Grade-appropriate curriculum plans','Ready-to-print quizzes + worksheets','Answer keys generated per assessment','Parent briefings with ESL-friendly labels','Parent Portal invitation flow (coming in I-3b)','Owner-viewable execution logs'], price_cents: 0, runtime_key: 'teacher-twin' },
  'finance-analyst': { id: '3', slug: 'finance-analyst', name: 'Finance Analyst', tagline: 'Autonomous CFO for small and mid-sized businesses.', description: 'A real agentic financial analyst that ships a health snapshot, a 12-week cash flow forecast, and 5 prioritized weekly actions in one launch.', category: 'finance', status: 'ready', featured: false, tags: ['finance','cfo','cash-flow','flagship'], features: ['Financial health snapshot (runway + top risks + opportunities)','12-week cash flow forecast with narrative','5 prioritized weekly actions with impact estimates','Flags missing inputs instead of fabricating numbers','Owner-viewable execution logs'], price_cents: 0, runtime_key: 'finance-analyst' },
};

function getFallback(slug: string) {
  const plug = FALLBACK_PLUGS[slug];
  if (!plug) return null;
  return { plug, recentRuns: [] };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (!sql) {
    const fallback = getFallback(slug);
    if (fallback) return NextResponse.json(fallback);
    return NextResponse.json({ error: 'Plug not found' }, { status: 404 });
  }

  try {
    await ensureAiplugTables();
    const plugRows = (await sql`
      SELECT id, slug, name, tagline, description, category, hero_image_url,
             status, features, tags, price_cents, runtime_key, featured,
             created_at, updated_at
      FROM plugs
      WHERE slug = ${slug}
      LIMIT 1
    `) as unknown as PlugRow[];

    if (plugRows.length === 0) {
      const fallback = getFallback(slug);
      if (fallback) return NextResponse.json(fallback);
      return NextResponse.json({ error: 'Plug not found' }, { status: 404 });
    }

    const plug = plugRows[0];
    const recentRuns: PlugRunRow[] = [];

    return NextResponse.json({ plug, recentRuns });
  } catch (err) {
    console.error('[aiplug detail] GET error:', err instanceof Error ? err.stack : err);
    const fallback = getFallback(slug);
    if (fallback) return NextResponse.json(fallback);
    return NextResponse.json({ error: 'Failed to fetch plug' }, { status: 500 });
  }
}
