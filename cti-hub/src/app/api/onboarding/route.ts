import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';

const ENSURE_TABLE = `
CREATE TABLE IF NOT EXISTS user_onboarding (
  id SERIAL PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  business_type TEXT NOT NULL DEFAULT '',
  primary_goal TEXT NOT NULL DEFAULT '',
  communication_style TEXT NOT NULL DEFAULT 'mixed',
  language TEXT NOT NULL DEFAULT 'English',
  experience_level TEXT NOT NULL DEFAULT 'beginner',
  immediate_needs TEXT NOT NULL DEFAULT '',
  tone_preference REAL NOT NULL DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

let tableReady = false;

async function ensureTable() {
  if (tableReady || !sql) return;
  await sql.unsafe(ENSURE_TABLE);
  tableReady = true;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  await ensureTable();

  const rows = await sql`
    SELECT * FROM user_onboarding WHERE user_id = ${auth.userId} LIMIT 1
  `;

  if (rows.length === 0) {
    return NextResponse.json({ completed: false, profile: null });
  }

  return NextResponse.json({ completed: true, profile: rows[0] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  await ensureTable();

  const body = await request.json();
  const {
    name = '',
    business_type = '',
    primary_goal = '',
    communication_style = 'mixed',
    language = 'English',
    experience_level = 'beginner',
    immediate_needs = '',
  } = body;

  // Derive tone_preference from communication_style
  const toneMap: Record<string, number> = {
    casual: 0.2,
    mixed: 0.5,
    professional: 0.9,
  };
  const tone_preference = toneMap[communication_style] ?? 0.5;

  const rows = await sql`
    INSERT INTO user_onboarding (
      user_id, display_name, business_type, primary_goal,
      communication_style, language, experience_level,
      immediate_needs, tone_preference
    ) VALUES (
      ${auth.userId}, ${name}, ${business_type}, ${primary_goal},
      ${communication_style}, ${language}, ${experience_level},
      ${immediate_needs}, ${tone_preference}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      business_type = EXCLUDED.business_type,
      primary_goal = EXCLUDED.primary_goal,
      communication_style = EXCLUDED.communication_style,
      language = EXCLUDED.language,
      experience_level = EXCLUDED.experience_level,
      immediate_needs = EXCLUDED.immediate_needs,
      tone_preference = EXCLUDED.tone_preference
    RETURNING *
  `;

  return NextResponse.json({ completed: true, profile: rows[0] });
}
