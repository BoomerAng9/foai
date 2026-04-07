import { NextRequest, NextResponse } from 'next/server';
import { calculateTIE } from '@/lib/tie/engine';
import type { PerformanceInput, AttributesInput, IntangiblesInput } from '@/lib/tie/types';
import { calculatePerFormGrade, getGradeBand } from '@/lib/draft/tie-scale';
import { gradeToProjectedRound } from '@/lib/draft/open-mind-grader';

/* ──────────────────────────────────────────────────────────────
 *  POST /api/tie/grade
 *
 *  Two modes based on Content-Type:
 *    1. application/json    → single athlete structured input (legacy)
 *    2. multipart/form-data → file upload batch grading (workbench)
 * ────────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';

  // ── MODE 1: legacy single-athlete structured input ──
  if (contentType.includes('application/json')) {
    try {
      const { performance, attributes, intangibles } = (await req.json()) as {
        performance: PerformanceInput;
        attributes: AttributesInput;
        intangibles: IntangiblesInput;
      };
      const result = calculateTIE(performance || {}, attributes || {}, intangibles || {});
      return NextResponse.json({
        score: result.score,
        grade: result.grade,
        tier: result.tier,
        label: result.label,
        draftContext: result.draftContext,
        badgeColor: result.badgeColor,
        components: result.components,
      });
    } catch {
      return NextResponse.json({ error: 'Grading failed' }, { status: 500 });
    }
  }

  // ── MODE 2: file upload batch grading ──
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const text = await file.text();
    let rawRows: Record<string, string>[] = [];

    if (file.name.endsWith('.json') || text.trim().startsWith('[') || text.trim().startsWith('{')) {
      try {
        const json = JSON.parse(text);
        const arr = Array.isArray(json) ? json : (json.players || json.athletes || []);
        rawRows = arr.map((p: Record<string, unknown>) => {
          const obj: Record<string, string> = {};
          Object.keys(p).forEach((k) => {
            obj[k.toLowerCase()] = String(p[k] ?? '');
          });
          return obj;
        });
      } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
      }
    } else {
      rawRows = parseCSV(text);
    }

    const inputs = normalize(rawRows);
    if (inputs.length === 0) {
      return NextResponse.json(
        { error: 'No valid rows found. Requires at least "name" and "position" columns.' },
        { status: 400 },
      );
    }

    const graded = inputs.map((row, i) => {
      const pillars = estimatePillars(row, i);
      const result = calculatePerFormGrade({
        gamePerformance: pillars.gamePerformance,
        athleticism: pillars.athleticism,
        intangibles: pillars.intangibles,
        multiPositionBonus: 0,
      });
      const band = getGradeBand(result.finalScore);
      return {
        name: row.name,
        position: row.position,
        school: row.school,
        grade: result.finalScore,
        gradeLetter: band.grade,
        gradeLabel: band.label,
        gradeIcon: band.icon,
        projectedRound: gradeToProjectedRound(result.finalScore),
        pillars,
      };
    });

    graded.sort((a, b) => b.grade - a.grade);

    return NextResponse.json({
      players: graded,
      total: graded.length,
      filename: file.name,
      model: 'TIE canonical 40·30·30 v1',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Grading failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/* ── File parsing helpers ── */
interface InputRow {
  name: string;
  position: string;
  school?: string;
  rank?: number;
  forty?: number;
  vertical?: number;
  bench?: number;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(/[,\t]/).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(/[,\t]/).map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cols[i] || ''));
    return row;
  });
}

function normalize(rows: Record<string, string>[]): InputRow[] {
  return rows
    .map((r) => {
      const name = r.name || r.player || r['player name'] || r.athlete || '';
      const position = (r.position || r.pos || '').toUpperCase();
      if (!name || !position) return null;
      return {
        name: name.trim(),
        position: position.trim(),
        school: r.school || r.team || undefined,
        rank: r.rank ? parseInt(r.rank, 10) : undefined,
        forty: r.forty || r['40'] ? parseFloat(r.forty || r['40']) : undefined,
        vertical: r.vertical ? parseFloat(r.vertical) : undefined,
        bench: r.bench ? parseFloat(r.bench) : undefined,
      } as InputRow;
    })
    .filter((x): x is InputRow => x !== null);
}

function estimatePillars(row: InputRow, index: number): {
  gamePerformance: number;
  athleticism: number;
  intangibles: number;
} {
  const rank = row.rank ?? index + 1;
  const gp =
    rank <= 3 ? 95
    : rank <= 10 ? 90 - (rank - 3) * 0.5
    : rank <= 25 ? 86 - (rank - 10) * 0.4
    : rank <= 50 ? 80 - (rank - 25) * 0.3
    : rank <= 100 ? 72 - (rank - 50) * 0.2
    : Math.max(45, 62 - (rank - 100) * 0.08);

  let ath =
    rank <= 5 ? 90
    : rank <= 20 ? 86 - (rank - 5) * 0.3
    : rank <= 50 ? 80 - (rank - 20) * 0.25
    : rank <= 100 ? 72 - (rank - 50) * 0.15
    : Math.max(50, 64 - (rank - 100) * 0.07);

  if (row.forty) {
    if (row.forty <= 4.35) ath += 5;
    else if (row.forty <= 4.45) ath += 3;
    else if (row.forty >= 4.70) ath -= 3;
  }
  if (row.vertical && row.vertical >= 40) ath += 2;
  if (row.bench && row.bench >= 25) ath += 2;

  const int =
    rank <= 10 ? 85 - (rank - 1) * 0.3
    : rank <= 50 ? 82 - (rank - 10) * 0.25
    : rank <= 100 ? 72 - (rank - 50) * 0.2
    : Math.max(45, 62 - (rank - 100) * 0.08);

  return {
    gamePerformance: Math.max(20, Math.min(99, gp)),
    athleticism: Math.max(20, Math.min(99, ath)),
    intangibles: Math.max(20, Math.min(99, int)),
  };
}
