import { NextRequest, NextResponse } from 'next/server';
import { safeCompare } from '@/lib/auth-guard';
import { sql } from '@/lib/db';

/* ──────────────────────────────────────────────────────────────
 *  GET /api/data/validate
 *  Diagnostic endpoint that checks all players for data quality
 *  issues. Returns a JSON report — does NOT auto-fix anything.
 * ────────────────────────────────────────────────────────────── */

interface Issue {
  playerId: number;
  playerName: string;
  issue: string;
  details: string;
}

/** Known NFL players who should NOT be in a 2026 prospect DB */
const ALREADY_DRAFTED_NAMES = new Set([
  'devon achane', 'bijan robinson', 'jahmyr gibbs', 'zach charbonnet',
  'roschon johnson', 'chase brown', 'tank bigsby', 'sean tucker',
  'eric gray', 'israel abanikanda', 'kenny mcintosh', 'dewayne mcbride',
  'isiah pacheco', 'hassan haskins', 'chris rodriguez jr.', 'zach evans',
  'sarodorick thompson', 'kendre miller', 'tyjae spears', 'braelon allen',
  'ray davis', 'audric estime', 'marshawn lloyd', 'frank gore jr.',
  'kimani vidal', 'carson steele', 'cody schrader', 'bucky irving',
  'trey benson', 'blake corum', 'rasheen ali', 'cam davis',
  'tyrone tracy jr.', 'nate noel', 'justice ellison', 'jase mcclellan',
  'jaylen wright', 'deuce vaughn', 'will shipley', 'jordan waters',
  'bryce young', 'cj stroud', 'anthony richardson', 'will levis',
  'caleb williams', 'jayden daniels', 'drake maye', 'bo nix',
  'michael penix jr.', 'jj mccarthy', 'spencer rattler', 'cam ward',
  'shedeur sanders', 'jalen milroe', 'marvin harrison jr.', 'malik nabers',
  'rome odunze', 'ladd mcconkey', 'travis hunter', 'brock bowers',
  'ashton jeanty', 'cam skattebo', 'quinshon judkins', 'dylan sampson',
  'treveyon henderson', 'donovan edwards', 'omarion hampton', 'kaleb johnson',
  'montrell johnson', 'phil mafah', 'tahj brooks', 'ollie gordon ii',
  'jarquez hunter', 'rj harvey', 'dj giddens', 'devin neal',
  'bhayshul tuten', 'cj baxter', 'jaydon blue',
]);

// Expected grade ranges per projected round
const ROUND_GRADE_RANGES: Record<number, [number, number]> = {
  1: [80, 100],
  2: [74, 95],
  3: [68, 88],
  4: [62, 82],
  5: [58, 76],
  6: [55, 72],
  7: [50, 68],
};

export async function GET(req: NextRequest) {
  const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!PIPELINE_KEY || !safeCompare(token, PIPELINE_KEY)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const players = await sql`
      SELECT id, name, school, position, grade, projected_round,
             nfl_comparison, strengths, weaknesses, scouting_summary
      FROM perform_players
      ORDER BY overall_rank ASC NULLS LAST
    `;

    const issues: Issue[] = [];

    // 1. Check for duplicate names
    const nameCount: Record<string, number[]> = {};
    for (const p of players) {
      const key = p.name?.toLowerCase()?.trim();
      if (key) {
        if (!nameCount[key]) nameCount[key] = [];
        nameCount[key].push(p.id);
      }
    }
    for (const [name, ids] of Object.entries(nameCount)) {
      if (ids.length > 1) {
        for (const id of ids) {
          issues.push({
            playerId: id,
            playerName: name,
            issue: 'DUPLICATE_NAME',
            details: `Name appears ${ids.length} times (IDs: ${ids.join(', ')})`,
          });
        }
      }
    }

    // 2. Check each player for individual issues
    for (const p of players) {
      // Missing or "Unknown" school
      if (!p.school || p.school === 'Unknown' || p.school.trim() === '') {
        issues.push({
          playerId: p.id,
          playerName: p.name,
          issue: 'MISSING_SCHOOL',
          details: `School is "${p.school || '(empty)'}"`,
        });
      }

      // Missing or "UNKNOWN" position
      if (!p.position || p.position === 'UNKNOWN' || p.position.trim() === '') {
        issues.push({
          playerId: p.id,
          playerName: p.name,
          issue: 'MISSING_POSITION',
          details: `Position is "${p.position || '(empty)'}"`,
        });
      }

      // Grade vs projected round mismatch
      const grade = Number(p.grade);
      const round = Number(p.projected_round);
      if (!isNaN(grade) && !isNaN(round) && round >= 1 && round <= 7) {
        const [minExpected, maxExpected] = ROUND_GRADE_RANGES[round] ?? [0, 100];
        if (grade < minExpected - 5 || grade > maxExpected + 5) {
          issues.push({
            playerId: p.id,
            playerName: p.name,
            issue: 'GRADE_ROUND_MISMATCH',
            details: `Grade ${grade} but projected round ${round} (expected ~${minExpected}-${maxExpected})`,
          });
        }
      }

      // Missing NFL comparison
      if (!p.nfl_comparison || p.nfl_comparison.trim() === '') {
        issues.push({
          playerId: p.id,
          playerName: p.name,
          issue: 'MISSING_NFL_COMPARISON',
          details: 'No NFL comparison set',
        });
      }

      // Missing strengths
      if (!p.strengths || p.strengths.trim() === '') {
        issues.push({
          playerId: p.id,
          playerName: p.name,
          issue: 'MISSING_STRENGTHS',
          details: 'No strengths set',
        });
      }

      // Missing weaknesses
      if (!p.weaknesses || p.weaknesses.trim() === '') {
        issues.push({
          playerId: p.id,
          playerName: p.name,
          issue: 'MISSING_WEAKNESSES',
          details: 'No weaknesses set',
        });
      }

      // Missing scouting summary
      if (!p.scouting_summary || p.scouting_summary.trim() === '') {
        issues.push({
          playerId: p.id,
          playerName: p.name,
          issue: 'MISSING_SCOUTING_SUMMARY',
          details: 'No scouting summary set',
        });
      }

      // Already drafted — NOT a 2026 prospect
      const normalizedName = p.name?.toLowerCase()?.replace(/[^a-z\s]/g, '')?.replace(/\s+/g, ' ')?.trim();
      if (normalizedName && ALREADY_DRAFTED_NAMES.has(normalizedName)) {
        issues.push({
          playerId: p.id,
          playerName: p.name,
          issue: 'ALREADY_DRAFTED',
          details: `${p.name} is already in the NFL — not a 2026 prospect`,
        });
      }

      // Missing grade entirely
      if (p.grade === null || p.grade === undefined) {
        issues.push({
          playerId: p.id,
          playerName: p.name,
          issue: 'MISSING_GRADE',
          details: 'No grade assigned',
        });
      }

      // Missing projected round
      if (p.projected_round === null || p.projected_round === undefined) {
        issues.push({
          playerId: p.id,
          playerName: p.name,
          issue: 'MISSING_PROJECTED_ROUND',
          details: 'No projected round set',
        });
      }
    }

    // Build summary counts
    const summary: Record<string, number> = {};
    for (const issue of issues) {
      summary[issue.issue] = (summary[issue.issue] || 0) + 1;
    }

    return NextResponse.json({
      totalPlayers: players.length,
      totalIssues: issues.length,
      summary,
      issues,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Validation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
