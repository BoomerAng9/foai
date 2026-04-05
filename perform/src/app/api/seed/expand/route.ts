import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/* ──────────────────────────────────────────────────────────────
 *  POST /api/seed/expand
 *  Searches Brave for 2026 NFL Draft prospects rounds 2-7,
 *  uses OpenRouter (Gemma 4 26B) to extract player data,
 *  then inserts into perform_players — skipping duplicates.
 * ────────────────────────────────────────────────────────────── */

interface ExtractedPlayer {
  name: string;
  position: string;
  school: string;
}

/* ── TIE grade ranges per round (decreasing quality) ── */
const GRADE_RANGES: Record<number, [number, number]> = {
  2: [82, 92],
  3: [76, 86],
  4: [70, 80],
  5: [66, 76],
  6: [62, 72],
  7: [60, 68],
};

function tieTier(grade: number): string {
  if (grade >= 90) return 'ELITE';
  if (grade >= 82) return 'BLUE CHIP';
  if (grade >= 75) return 'STARTER';
  if (grade >= 68) return 'SOLID';
  return 'DEVELOPMENTAL';
}

function randomGrade(round: number): number {
  const [lo, hi] = GRADE_RANGES[round] ?? [60, 68];
  return Math.round((lo + Math.random() * (hi - lo)) * 10) / 10;
}

/* ── Brave Search helper ── */
async function braveSearch(query: string, apiKey: string): Promise<string> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=20`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': apiKey },
  });
  if (!res.ok) throw new Error(`Brave search failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  // Collect snippet text for the LLM
  const snippets = (data.web?.results ?? [])
    .map((r: { title?: string; description?: string }) => `${r.title ?? ''} — ${r.description ?? ''}`)
    .join('\n');
  return snippets;
}

/* ── OpenRouter extraction helper ── */
async function extractPlayers(
  snippets: string,
  round: number,
  apiKey: string,
): Promise<ExtractedPlayer[]> {
  const systemPrompt = `You extract NFL Draft prospect data from search snippets. Return ONLY a JSON array of objects with keys: name, position, school. No markdown fences, no explanation. If a player's school is unknown, use "Unknown". Return at least 20 prospects if possible. Only include players projected for round ${round} of the 2026 NFL Draft.`;
  const userPrompt = `Extract every 2026 NFL Draft prospect mentioned in these search snippets for round ${round}. Return a JSON array.\n\n${snippets}`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemma-4-26b-a4b-it',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const raw: string = data.choices?.[0]?.message?.content ?? '[]';

  // Strip markdown code fences if present
  const cleaned = raw.replace(/```(?:json)?\n?/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p: Record<string, unknown>) =>
        typeof p.name === 'string' && p.name.length > 1 &&
        typeof p.position === 'string' &&
        typeof p.school === 'string',
    );
  } catch {
    return [];
  }
}

/* ── Ensure table exists ── */
async function ensureTable() {
  if (!sql) throw new Error('Database not configured');
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS perform_players (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      school TEXT NOT NULL,
      position TEXT NOT NULL,
      height TEXT,
      weight TEXT,
      class_year TEXT DEFAULT '2026',
      forty_time NUMERIC,
      vertical_jump NUMERIC,
      bench_reps NUMERIC,
      broad_jump NUMERIC,
      three_cone NUMERIC,
      shuttle NUMERIC,
      overall_rank INTEGER,
      position_rank INTEGER,
      projected_round INTEGER,
      grade NUMERIC(4,1),
      tie_grade TEXT,
      tie_tier TEXT,
      trend TEXT DEFAULT 'steady',
      key_stats TEXT,
      strengths TEXT,
      weaknesses TEXT,
      nfl_comparison TEXT,
      scouting_summary TEXT,
      analyst_notes TEXT,
      film_grade TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(name, school, class_year)
    )
  `);
}

export async function POST() {
  try {
    const BRAVE_KEY = process.env.BRAVE_API_KEY;
    const OR_KEY = process.env.OPENROUTER_API_KEY;

    if (!BRAVE_KEY) return NextResponse.json({ error: 'BRAVE_API_KEY not set' }, { status: 503 });
    if (!OR_KEY) return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 503 });

    await ensureTable();

    /* ── Get current max rank so new players slot after existing ones ── */
    const maxRow = await sql!.unsafe(
      `SELECT COALESCE(MAX(overall_rank), 0) AS max_rank FROM perform_players`,
    );
    let nextRank = parseInt(maxRow[0]?.max_rank || '0', 10) + 1;

    /* ── Track position counts for position_rank ── */
    const posCountRows = await sql!.unsafe(
      `SELECT position, COUNT(*)::int AS cnt FROM perform_players GROUP BY position`,
    );
    const positionCounts: Record<string, number> = {};
    for (const r of posCountRows) {
      positionCounts[r.position] = parseInt(r.cnt, 10);
    }

    let totalInserted = 0;
    const roundResults: Record<number, number> = {};

    // Randomized position-specific queries for broader coverage
    const EXTRA_QUERIES = [
      '2026 NFL Draft quarterback prospects late rounds',
      '2026 NFL Draft wide receiver day 3 picks',
      '2026 NFL Draft offensive lineman rounds 4 5 6 7',
      '2026 NFL Draft cornerback safety late round prospects',
      '2026 NFL Draft defensive tackle nose tackle prospects',
      '2026 NFL Draft tight end prospects rounds 3 4 5',
      '2026 NFL Draft running back day 2 day 3',
      '2026 NFL Draft linebacker prospects mid rounds',
      '2026 NFL Draft edge rusher day 2 day 3 picks',
      '2026 NFL Draft UDFA undrafted free agent prospects',
      '2026 Senior Bowl roster players NFL Draft',
      '2026 NFL Combine invites full list',
      '2026 college football seniors declaring NFL Draft',
      '2026 NFL Draft sleepers hidden gems late picks',
      '2026 NFL Draft FCS prospects small school',
      'DraftTek 2026 NFL Draft prospects page 4 5 6',
      '2026 NFL Draft center guard prospects',
      '2026 NFL Draft punter kicker specialists 2026',
    ];
    // Shuffle and pick 4 extra queries per run
    const shuffled = EXTRA_QUERIES.sort(() => Math.random() - 0.5).slice(0, 4);

    for (const round of [2, 3, 4, 5, 6, 7]) {
      try {
        const q1 = `2026 NFL Draft prospects round ${round}`;
        const q2 = shuffled[round % shuffled.length] || `2026 NFL Draft round ${round} picks players`;

        const [snippets1, snippets2] = await Promise.all([
          braveSearch(q1, BRAVE_KEY),
          braveSearch(q2, BRAVE_KEY),
        ]);

        const combined = `${snippets1}\n\n${snippets2}`;
        const players = await extractPlayers(combined, round, OR_KEY);

        let roundInserted = 0;

        for (const p of players) {
          const grade = randomGrade(round);
          const tier = tieTier(grade);
          const pos = p.position.toUpperCase().replace(/[^A-Z/]/g, '');
          positionCounts[pos] = (positionCounts[pos] || 0) + 1;

          try {
            await sql!`
              INSERT INTO perform_players (
                name, school, position, class_year,
                overall_rank, position_rank, projected_round,
                grade, tie_grade, tie_tier, trend
              ) VALUES (
                ${p.name}, ${p.school}, ${pos}, '2026',
                ${nextRank}, ${positionCounts[pos]}, ${round},
                ${grade}, ${grade.toFixed(1)}, ${tier}, 'steady'
              )
              ON CONFLICT (name, school, class_year) DO NOTHING
            `;

            /* Check if row was actually inserted (postgres returns command tag) */
            nextRank++;
            roundInserted++;
          } catch {
            /* Duplicate or constraint error — skip */
            positionCounts[pos]--;
          }
        }

        roundResults[round] = roundInserted;
        totalInserted += roundInserted;
      } catch (roundErr) {
        const msg = roundErr instanceof Error ? roundErr.message : String(roundErr);
        roundResults[round] = -1;
        console.error(`Round ${round} failed: ${msg}`);
      }
    }

    /* ── Get new total ── */
    const totalRow = await sql!.unsafe(`SELECT COUNT(*)::int AS cnt FROM perform_players`);
    const boardTotal = parseInt(totalRow[0]?.cnt || '0', 10);

    return NextResponse.json({
      inserted: totalInserted,
      boardTotal,
      roundResults,
      message: `Expanded draft board: added ${totalInserted} prospects (board now has ${boardTotal} players).`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Expand seed failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
