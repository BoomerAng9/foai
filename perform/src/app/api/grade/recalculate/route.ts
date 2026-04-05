import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/* ──────────────────────────────────────────────────────────────
 *  POST /api/grade/recalculate
 *  Re-grades all players using Brave Search + Gemma 4 via OpenRouter.
 *  Protected by PIPELINE_AUTH_KEY.
 *  Processes 5 players at a time to avoid rate limits.
 * ────────────────────────────────────────────────────────────── */

const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';

interface GradeResult {
  grade: number;
  tie_grade: string;
  strengths: string;
  weaknesses: string;
  scouting_summary: string;
  nfl_comparison: string;
}

function deriveTieGrade(grade: number): string {
  if (grade >= 90) return 'Blue Chip';
  if (grade >= 85) return 'First Round Lock';
  if (grade >= 80) return 'Day 1 Starter';
  if (grade >= 75) return 'Solid Starter';
  if (grade >= 70) return 'Quality Starter';
  if (grade >= 65) return 'Developmental';
  if (grade >= 60) return 'Late Round';
  return 'UDFA';
}

async function braveSearch(query: string, apiKey: string): Promise<string> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`;
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
  });
  if (!res.ok) throw new Error(`Brave search failed (${res.status})`);
  const data = await res.json();
  const snippets = (data.web?.results ?? [])
    .map((r: { title?: string; description?: string }) => `${r.title ?? ''} — ${r.description ?? ''}`)
    .join('\n');
  return snippets;
}

async function gradePlayer(
  name: string,
  position: string,
  school: string,
  searchResults: string,
  openrouterKey: string,
): Promise<GradeResult | null> {
  const systemPrompt = `You are an NFL Draft scouting analyst. Grade prospects on a 0-100 scale based on real consensus scouting data. Be accurate — use actual draft projections from the search results. Return ONLY a JSON object with no markdown fences.`;

  const userPrompt = `Based on these scouting reports for ${name} (${position}, ${school}), grade this prospect on a 0-100 scale.

Consider: college production, athletic measurables, positional value, projected draft position.

Search results:
${searchResults}

Return ONLY a JSON object: {"grade": number, "tie_grade": "string", "strengths": "string", "weaknesses": "string", "scouting_summary": "string", "nfl_comparison": "string"}`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openrouterKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemma-4-26b-a4b-it',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    console.error(`OpenRouter failed for ${name}: ${res.status}`);
    return null;
  }

  const data = await res.json();
  const raw: string = data.choices?.[0]?.message?.content ?? '';
  const cleaned = raw.replace(/```(?:json)?\n?/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    const grade = Math.max(0, Math.min(100, Math.round(Number(parsed.grade) || 50)));
    return {
      grade,
      tie_grade: deriveTieGrade(grade),
      strengths: String(parsed.strengths || ''),
      weaknesses: String(parsed.weaknesses || ''),
      scouting_summary: String(parsed.scouting_summary || ''),
      nfl_comparison: String(parsed.nfl_comparison || ''),
    };
  } catch {
    console.error(`Failed to parse grade for ${name}: ${cleaned.slice(0, 200)}`);
    return null;
  }
}

export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get('authorization') || '';
  if (PIPELINE_KEY && authHeader !== `Bearer ${PIPELINE_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const BRAVE_KEY = process.env.BRAVE_API_KEY;
  const OR_KEY = process.env.OPENROUTER_API_KEY;

  if (!BRAVE_KEY) return NextResponse.json({ error: 'BRAVE_API_KEY not set' }, { status: 503 });
  if (!OR_KEY) return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 503 });

  try {
    // Get all players
    const players = await sql`SELECT id, name, position, school FROM perform_players ORDER BY overall_rank ASC NULLS LAST`;

    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process in batches of 5
    for (let i = 0; i < players.length; i += 5) {
      const batch = players.slice(i, i + 5);

      const results = await Promise.allSettled(
        batch.map(async (player) => {
          const searchQuery = `${player.name} 2026 NFL Draft grade scouting report`;
          const searchResults = await braveSearch(searchQuery, BRAVE_KEY);
          const gradeResult = await gradePlayer(
            player.name,
            player.position,
            player.school,
            searchResults,
            OR_KEY,
          );

          if (!gradeResult) {
            throw new Error(`No grade result for ${player.name}`);
          }

          // Derive tie_tier from the new grade
          let tieTier = 'DEVELOPMENTAL';
          if (gradeResult.grade >= 90) tieTier = 'ELITE';
          else if (gradeResult.grade >= 82) tieTier = 'BLUE CHIP';
          else if (gradeResult.grade >= 75) tieTier = 'STARTER';
          else if (gradeResult.grade >= 68) tieTier = 'SOLID';

          await sql`
            UPDATE perform_players
            SET
              grade = ${gradeResult.grade},
              tie_grade = ${gradeResult.tie_grade},
              tie_tier = ${tieTier},
              strengths = ${gradeResult.strengths},
              weaknesses = ${gradeResult.weaknesses},
              scouting_summary = ${gradeResult.scouting_summary},
              nfl_comparison = ${gradeResult.nfl_comparison},
              updated_at = NOW()
            WHERE id = ${player.id}
          `;

          return player.name;
        }),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          updated++;
        } else {
          failed++;
          errors.push(result.reason?.message || 'Unknown error');
        }
      }

      // Brief pause between batches to respect rate limits
      if (i + 5 < players.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({
      total: players.length,
      updated,
      failed,
      errors: errors.slice(0, 20),
      message: `Re-graded ${updated}/${players.length} players using real scouting data.`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Recalculate failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
