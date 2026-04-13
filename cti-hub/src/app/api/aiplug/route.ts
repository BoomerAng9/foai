import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';
import { ensureAiplugTables } from '@/lib/aiplug/schema';
import type { PlugRow } from '@/lib/aiplug/types';

/**
 * GET /api/aiplug — list available aiPLUGs
 *
 * Public endpoint (no auth). Returns plugs with status='ready' or
 * 'beta' for display in the launcher grid. Archived and drafts are
 * filtered out. Featured plugs come first.
 */
const FALLBACK_PLUGS = [
  { id: "1", slug: "smb-marketing", name: "SMB Marketing Agency", tagline: "Autonomous marketing operations for small and mid-sized businesses.", category: "marketing", status: "ready", featured: true, tags: ["marketing","agency","autonomous","flagship"], features: ["Autonomous prospect research","Content drafting and scheduling","Campaign performance tracking","Weekly executive reports"], price_cents: 0, runtime_key: "smb-marketing" },
  { id: "2", slug: "teacher-twin", name: "Teacher Twin", tagline: "Autonomous teaching assistant for classroom and tutoring contexts.", category: "education", status: "ready", featured: false, tags: ["education","classroom","tutoring","flagship"], features: ["Grade-appropriate curriculum plans","Ready-to-print quizzes + worksheets","Answer keys generated per assessment","Parent briefings with ESL-friendly labels"], price_cents: 0, runtime_key: "teacher-twin" },
  { id: "3", slug: "finance-analyst", name: "Finance Analyst", tagline: "Autonomous CFO for small and mid-sized businesses.", category: "finance", status: "ready", featured: false, tags: ["finance","cfo","cash-flow","flagship"], features: ["Financial health snapshot","12-week cash flow forecast","5 prioritized weekly actions","Flags missing inputs"], price_cents: 0, runtime_key: "finance-analyst" },
];

export async function GET(_request: NextRequest) {
  if (!sql) {
    // Return seed data when DB is unavailable
    return NextResponse.json({ plugs: FALLBACK_PLUGS });
  }

  try {
    await ensureAiplugTables();
    const rows = (await sql`
      SELECT id, slug, name, tagline, description, category, hero_image_url,
             status, features, tags, price_cents, runtime_key, featured,
             created_at, updated_at
      FROM plugs
      WHERE status IN ('ready', 'beta')
      ORDER BY featured DESC, created_at ASC
    `) as unknown as PlugRow[];
    return NextResponse.json({ plugs: rows });
  } catch (err) {
    console.error('[aiplug] GET error:', err instanceof Error ? err.stack : err);
    // Graceful degradation — serve fallback data instead of 500
    return NextResponse.json({ plugs: FALLBACK_PLUGS });
  }
}
