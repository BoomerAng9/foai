import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { safeCompare } from '@/lib/auth-guard';

/* ──────────────────────────────────────────────────────────────
 *  POST /api/data/cleanup
 *  Removes already-drafted NFL players and bad data from the
 *  perform_players table. Fixes duplicates, removes "Unknown"
 *  schools, and purges players from prior draft classes.
 * ────────────────────────────────────────────────────────────── */

/** Players confirmed already in the NFL (drafted 2022-2025) */
const ALREADY_DRAFTED = [
  // RBs (2022-2025)
  'Devon Achane', 'Bijan Robinson', 'Jahmyr Gibbs', 'Zach Charbonnet',
  'Roschon Johnson', 'Chase Brown', 'Tank Bigsby', 'Sean Tucker',
  'Eric Gray', 'Israel Abanikanda', 'Kenny McIntosh', 'DeWayne McBride',
  'Isiah Pacheco', 'Hassan Haskins', 'Chris Rodriguez Jr.', 'Chris Rodriguez',
  'Zach Evans', 'SaRodorick Thompson', 'Kendre Miller', 'Tyjae Spears',
  'Braelon Allen', 'Ray Davis', 'Audric Estime', 'Marshawn Lloyd',
  'Frank Gore Jr.', 'Kimani Vidal', 'Carson Steele', 'Cody Schrader',
  'Bucky Irving', 'Trey Benson', 'Blake Corum', 'Jonathon Brooks',
  'Rasheen Ali', 'Cam Davis', 'Tyrone Tracy Jr.', 'Nate Noel',
  'Justice Ellison', 'Jase McClellan', 'Jaylen Wright', 'Deuce Vaughn',
  'Will Shipley', 'Jordan Waters', 'Montrell Johnson', 'Jaydon Blue',
  'CJ Baxter', 'Bhayshul Tuten', 'Phil Mafah', 'Tahj Brooks',
  'Ollie Gordon II', 'Jarquez Hunter', 'RJ Harvey', 'DJ Giddens',
  'Omarion Hampton', 'Devin Neal', 'Donovan Edwards', 'Treveyon Henderson',
  'Quinshon Judkins', 'Dylan Sampson', 'Ashton Jeanty', 'Cam Skattebo',
  'Kaleb Johnson', 'Damien Martinez', 'Chance Luper',
  // QBs (2022-2025)
  'Bryce Young', 'CJ Stroud', 'Anthony Richardson', 'Will Levis',
  'Caleb Williams', 'Jayden Daniels', 'Drake Maye', 'Bo Nix',
  'Michael Penix Jr.', 'JJ McCarthy', 'Spencer Rattler',
  'Cam Ward', 'Shedeur Sanders', 'Jalen Milroe',
  'Max Duggan', 'Jack Plummer', 'Dequan Finn', 'Will Altmyer',
  // WRs (2022-2025)
  'Jaxon Smith-Njigba', 'Quentin Johnston', 'Zay Flowers',
  'Marvin Harrison Jr.', 'Malik Nabers', 'Rome Odunze',
  'Ladd McConkey', 'Keon Coleman', 'Xavier Worthy', 'Brian Thomas Jr.',
  'Troy Franklin', 'Adonai Mitchell', 'Luther Burden III',
  'Tetairoa McMillan', 'Travis Hunter', 'Xavier Legette', 'Ricky Pearsall',
  'Rashod Bateman', 'Trey Palmer', 'Theo Wease', 'Parker Washington',
  'Jalen Cropper', 'Jalen Moreno-Cropper', 'Marcus Burke',
  // TEs (2022-2025)
  'Brock Bowers', 'Dalton Kincaid', 'Sam LaPorta',
  // OL (2022-2025)
  'Paris Johnson Jr.', 'Peter Skoronski', 'Joe Alt', 'Olu Fashanu',
  // EDGE/DL (2022-2025)
  'Will Anderson Jr.', 'Tyree Wilson', 'Jalen Carter',
  'Nolan Smith', 'Lukas Van Ness',
  // DBs (2022-2025)
  'Devon Witherspoon', 'Christian Gonzalez', 'Quinyon Mitchell',
];

/** Single-word junk names from bad LLM extractions */
const JUNK_NAMES = [
  'Lemon', 'Orange', 'Love', 'Tyson', 'Washington', 'Zvada',
  'Hemby', 'Coleman', 'Unknown',
];

export async function POST(req: NextRequest) {
  try {
    const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!PIPELINE_KEY || !safeCompare(token, PIPELINE_KEY)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!sql) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

    const results: Record<string, number> = {};

    // 1. Remove already-drafted NFL players (case-insensitive match)
    const draftedLower = ALREADY_DRAFTED.map(n => n.toLowerCase());
    const draftedRes = await sql`
      DELETE FROM perform_players
      WHERE LOWER(TRIM(name)) = ANY(${draftedLower})
      RETURNING id
    `;
    results.drafted_removed = draftedRes.length;

    // 2. Remove known junk single-word names from bad LLM extractions
    const junkLower = JUNK_NAMES.map(n => n.toLowerCase());
    const junkRes = await sql`
      DELETE FROM perform_players
      WHERE LOWER(TRIM(name)) = ANY(${junkLower})
      RETURNING id
    `;
    results.junk_names_removed = junkRes.length;

    // 3. Remove any single-word names (real prospects have first + last name)
    const singleWordRes = await sql`
      DELETE FROM perform_players
      WHERE TRIM(name) NOT LIKE '% %'
      RETURNING id
    `;
    results.single_word_names_removed = singleWordRes.length;

    // 4. Remove players with "UNKNOWN" position
    const unknownPosRes = await sql`
      DELETE FROM perform_players
      WHERE UPPER(TRIM(position)) = 'UNKNOWN' OR position IS NULL OR TRIM(position) = ''
      RETURNING id
    `;
    results.unknown_position_removed = unknownPosRes.length;

    // 5. Remove players with "Unknown" school
    const unknownRes = await sql`
      DELETE FROM perform_players
      WHERE LOWER(TRIM(school)) = 'unknown' OR school IS NULL OR TRIM(school) = ''
      RETURNING id
    `;
    results.unknown_school_removed = unknownRes.length;

    // 6. Remove duplicate names (keep the one with the best grade)
    const dupRes = await sql`
      DELETE FROM perform_players
      WHERE id NOT IN (
        SELECT DISTINCT ON (LOWER(TRIM(name)))
          id
        FROM perform_players
        ORDER BY LOWER(TRIM(name)), grade DESC NULLS LAST, id ASC
      )
      RETURNING id
    `;
    results.duplicates_removed = dupRes.length;

    // 7. Recompute overall_rank and position_rank after cleanup
    await sql`
      WITH ranked AS (
        SELECT id,
          ROW_NUMBER() OVER (ORDER BY grade DESC NULLS LAST, id ASC) AS new_overall,
          ROW_NUMBER() OVER (PARTITION BY position ORDER BY grade DESC NULLS LAST, id ASC) AS new_pos_rank
        FROM perform_players
      )
      UPDATE perform_players p
      SET overall_rank = r.new_overall,
          position_rank = r.new_pos_rank
      FROM ranked r
      WHERE p.id = r.id
    `;

    // 8. Get final count
    const countRes = await sql`SELECT COUNT(*)::int AS cnt FROM perform_players`;
    const remaining = parseInt(countRes[0]?.cnt || '0', 10);

    return NextResponse.json({
      message: `Cleanup complete. ${remaining} players remain.`,
      removed: results,
      remaining,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Cleanup failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
