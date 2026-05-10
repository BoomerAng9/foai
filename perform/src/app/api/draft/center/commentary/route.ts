/**
 * GET /api/draft/center/commentary?pick=<n>&player_id=<id>
 * =========================================================
 * Class C (per perform/docs/ARCHITECTURE_2026_04_21.md): Claude Managed
 * Agents generate 6-analyst dialect commentary on a pick that just landed.
 *
 * Dispatches a one-shot completion against Sonnet 4.6 with the canonical
 * Per|Form analyst persona prompt, asks for ~3 lines (one per relevant
 * analyst, pulled from the 6-roster: Void-Caster / Astra Novatos /
 * The Colonel / The Haze / Smoke / Bun-E). Returns JSON for the Draft
 * Center right rail to render.
 *
 * Public route — added to PUBLIC_PREFIXES in src/middleware.ts.
 * Rate-limited via the existing global /api/ rate limit (100/min/IP).
 *
 * Failure mode: if ANTHROPIC_API_KEY is unset OR the API errors, returns
 * an empty `lines` array so the Draft Center keeps streaming the live
 * ticker without blocking.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { sql, requireDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 600;

interface PlayerRow {
  id: number;
  name: string;
  school: string | null;
  position: string | null;
  grade: string | null;
  tie_tier: string | null;
  projected_round: number | null;
  drafted_by_team: string | null;
  drafted_pick_number: number | null;
  consensus_avg: number | null;
}

interface AnalystLine {
  analyst: string;
  body: string;
}

const ANALYST_VOICES = [
  { name: 'Void-Caster', voice: 'broadcast lead, measured baritone, history-first framing' },
  { name: 'Astra Novatos', voice: 'lifestyle and brand lens, opulent-cool, cultural reference points' },
  { name: 'The Colonel', voice: 'loud, North Jersey pizzeria energy, peaked-in-87 takes' },
  { name: 'The Haze', voice: 'street-smart skeptic, sharp value/risk reads' },
  { name: 'Smoke', voice: 'Haze\'s duo partner, calmer, scheme-fit and tape-watching' },
  { name: 'Bun-E', voice: 'numbers + analytics, draft-capital math' },
];

function pickAnalysts(pickNumber: number): typeof ANALYST_VOICES {
  // Round-robin three voices per pick keyed by pick number for determinism +
  // even rotation across the broadcast. Always picks 3 distinct analysts.
  const start = (pickNumber * 3) % ANALYST_VOICES.length;
  const ordered = [...ANALYST_VOICES.slice(start), ...ANALYST_VOICES.slice(0, start)];
  return ordered.slice(0, 3);
}

function buildPrompt(pick: PlayerRow, analysts: typeof ANALYST_VOICES): string {
  const consensus = pick.consensus_avg != null
    ? `consensus rank ~#${pick.consensus_avg}`
    : 'no consensus rank ingested';
  const tier = pick.tie_tier ?? 'unknown';
  const tierLabel = tier === 'A_PLUS' ? 'A+' : tier === 'A_MINUS' ? 'A-' : tier === 'B_PLUS' ? 'B+' : tier === 'B_MINUS' ? 'B-' : tier === 'C_PLUS' ? 'C+' : tier;

  return [
    `Per|Form NFL Draft 2026 — Pick #${pick.drafted_pick_number} live commentary.`,
    `Player: ${pick.name} (${pick.position ?? '?'}, ${pick.school ?? '?'})`,
    `Per|Form TIE: grade ${pick.grade ?? '?'} / tier ${tierLabel} / projected round ${pick.projected_round ?? '?'} / ${consensus}.`,
    `Drafted by: ${pick.drafted_by_team ?? '?'}.`,
    '',
    'Generate ONE short live-broadcast line per analyst below. Each line:',
    '- 1 sentence, max 28 words.',
    '- In that analyst\'s voice (no narration about the voice — speak AS them).',
    '- Reacts to THIS pick only (value vs board, scheme/team fit, surprise level, or storyline).',
    '- No greetings, no sign-offs, no "as I always say".',
    '- No mention of Per|Form, ACHIEVEMOR, ACHEEVY, or the platform itself.',
    '',
    'Analysts:',
    ...analysts.map(a => `- ${a.name} (${a.voice})`),
    '',
    'Return STRICT JSON, exactly this shape, nothing else (no markdown fence):',
    '{"lines":[{"analyst":"<name>","body":"<one sentence>"}]}',
  ].join('\n');
}

async function callAnthropic(prompt: string, signal: AbortSignal): Promise<AnalystLine[]> {
  if (!ANTHROPIC_API_KEY) return [];
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = data.content?.find(c => c.type === 'text')?.text ?? '';
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = (fenced?.[1] ?? text).trim();
  const parsed = JSON.parse(jsonText) as { lines?: AnalystLine[] };
  return Array.isArray(parsed.lines) ? parsed.lines.filter(l => l.analyst && l.body) : [];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const pickNumber = Number(url.searchParams.get('pick'));
  const playerId = Number(url.searchParams.get('player_id'));
  if (!Number.isFinite(pickNumber) || !Number.isFinite(playerId)) {
    return NextResponse.json({ error: 'pick and player_id required' }, { status: 400 });
  }

  const dbErr = requireDb();
  if (dbErr || !sql) return NextResponse.json({ pick: pickNumber, lines: [] }, { status: 200 });

  // Hydrate the pick row with grading + consensus data so the prompt is grounded.
  const rows = await sql<PlayerRow[]>`
    SELECT
      p.id,
      p.name,
      p.school,
      p.position,
      p.grade::text       AS grade,
      p.tie_tier,
      p.projected_round,
      p.drafted_by_team,
      p.drafted_pick_number,
      cr.consensus_avg
    FROM perform_players p
    LEFT JOIN LATERAL (
      SELECT ROUND(AVG(rank))::int AS consensus_avg
      FROM perform_consensus_ranks
      WHERE player_id = p.id
        AND source IN ('drafttek','yahoo','ringer','pff','espn','nflcom')
    ) cr ON TRUE
    WHERE p.id = ${playerId}
    LIMIT 1
  `;
  const pick = rows[0];
  if (!pick) {
    return NextResponse.json({ lines: [] }, { status: 200 });
  }

  const analysts = pickAnalysts(pickNumber);
  const prompt = buildPrompt(pick, analysts);

  // 8s upper bound; if Anthropic stalls, the Draft Center moves on to the next pick.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const lines = await callAnthropic(prompt, ctrl.signal);
    return NextResponse.json({ pick: pickNumber, lines });
  } catch {
    return NextResponse.json({ pick: pickNumber, lines: [] });
  } finally {
    clearTimeout(timer);
  }
}
