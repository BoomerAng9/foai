import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
const MODEL = 'qwen/qwen3.6-plus-preview:free';

/**
 * POST /api/perform/seed — Use Scout_Ang to research and generate real player data
 *
 * Body: { position?: string, count?: number }
 *
 * Scout_Ang researches real 2026 NFL Draft prospects and returns structured data
 * that gets inserted into the player index via /api/perform/players POST.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { position, count = 10 } = await req.json();

    const prompt = `You are Scout_Ang, the lead NFL Draft analyst for Per|Form. Your job is to provide REAL data on the 2026 NFL Draft class.

Generate a JSON array of ${count} REAL ${position ? position + ' ' : ''}prospects for the 2026 NFL Draft. Use your knowledge of actual college football players who are draft-eligible.

For each player provide:
{
  "name": "Full Name",
  "school": "University",
  "position": "POS",
  "height": "6'2\"",
  "weight": "215",
  "overall_rank": 1,
  "position_rank": 1,
  "projected_round": 1,
  "grade": 92.5,
  "trend": "rising|falling|steady",
  "key_stats": "Key stat line from their college career",
  "strengths": "Top 3 strengths separated by semicolons",
  "weaknesses": "Top 2 weaknesses separated by semicolons",
  "nfl_comparison": "NFL player comparison",
  "scouting_summary": "2-3 sentence scouting report",
  "film_grade": "A+|A|A-|B+|B|B-|C+|C"
}

IMPORTANT: Use REAL players from the actual 2026 draft class. If you're unsure of exact stats, use your best estimate based on their college performance. Grade honestly — not everyone is elite.

Return ONLY a valid JSON array. No markdown, no explanation.`;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Scout_Ang research failed' }, { status: 502 });
    }

    const data = await res.json();
    let raw = data.choices?.[0]?.message?.content || '';

    // Extract JSON from response
    if (raw.includes('```json')) raw = raw.split('```json')[1].split('```')[0];
    else if (raw.includes('```')) raw = raw.split('```')[1].split('```')[0];

    let players;
    try {
      const parsed = JSON.parse(raw.trim());
      players = Array.isArray(parsed) ? parsed : parsed.players || [parsed];
    } catch {
      return NextResponse.json({ error: 'Failed to parse Scout_Ang response', raw: raw.slice(0, 500) }, { status: 500 });
    }

    // Forward to the players API to insert into DB
    const origin = req.nextUrl.origin;
    const insertRes = await fetch(`${origin}/api/perform/players`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.get('cookie') || '',
      },
      body: JSON.stringify({ players }),
    });

    const insertData = await insertRes.json();

    return NextResponse.json({
      researched: players.length,
      inserted: insertData.inserted || 0,
      players: players.map((p: any) => ({ name: p.name, school: p.school, position: p.position, grade: p.grade })),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Seed failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
