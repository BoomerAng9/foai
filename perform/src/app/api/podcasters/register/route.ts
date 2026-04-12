import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth, isOwnerEmail } from '@/lib/auth-guard';

export async function POST(req: NextRequest) {
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { podcast_name, podcaster_name, location, subscriber_count, primary_platforms, primary_vertical, addon_vertical, selected_team, huddl_name, mission, vision, objectives, needs_analysis } = body;

  if (!podcast_name?.trim() || !podcaster_name?.trim() || !primary_vertical?.trim()) {
    return NextResponse.json({ error: 'podcast_name, podcaster_name, and primary_vertical required' }, { status: 400 });
  }

  const validVerticals = ['nfl', 'cfb', 'nba', 'mlb'];
  if (!validVerticals.includes(primary_vertical)) {
    return NextResponse.json({ error: 'Invalid vertical' }, { status: 400 });
  }

  // Owner emails get LFG tier; everyone else starts at free.
  // User-supplied plan_tier is IGNORED to prevent tier escalation.
  const effectiveTier = isOwnerEmail(auth.email || '') ? 'lfg' : 'free';

  try {
    // Create user
    const [user] = await sql`
      INSERT INTO podcaster_users (firebase_uid, email, podcast_name, podcaster_name, location, subscriber_count, primary_platforms, primary_vertical, addon_vertical, selected_team, plan_tier, huddl_name, onboarding_complete)
      VALUES (${auth.userId}, ${auth.email || ''}, ${podcast_name.trim()}, ${podcaster_name.trim()}, ${location || null}, ${subscriber_count || 0}, ${primary_platforms || []}, ${primary_vertical}, ${addon_vertical || null}, ${selected_team || null}, ${effectiveTier}, ${huddl_name || podcast_name.trim() + ' Command Center'}, true)
      ON CONFLICT (firebase_uid) DO UPDATE SET
        podcast_name = EXCLUDED.podcast_name, podcaster_name = EXCLUDED.podcaster_name,
        primary_vertical = EXCLUDED.primary_vertical, selected_team = EXCLUDED.selected_team,
        onboarding_complete = true, updated_at = NOW()
      RETURNING *
    `;

    // Create hawks schema
    if (mission || vision || objectives) {
      await sql`
        INSERT INTO podcaster_hawks_schema (user_id, mission, vision, objectives, needs_analysis)
        VALUES (${user.id}, ${mission || null}, ${vision || null}, ${JSON.stringify(objectives || [])}, ${needs_analysis || null})
        ON CONFLICT DO NOTHING
      `;
    }

    return NextResponse.json({ user, ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
