import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';

/**
 * POST /api/perform/seed-board — Seed the complete 2026 NFL Draft Big Board
 * Real prospect data from Per|Form research.
 */

const BOARD_2026 = [
  { name: 'Jeremiyah Love', school: 'Notre Dame', position: 'RB', overall_rank: 1, grade: 93, key_stats: 'Zero fumbles in 3 years. Elite vision and burst.', nfl_comparison: 'Saquon Barkley', projected_round: 1 },
  { name: 'Fernando Mendoza', school: 'Indiana', position: 'QB', overall_rank: 2, grade: 91, key_stats: '3,800+ YDS, 32 TD, 8 INT. Elite pocket passer.', nfl_comparison: 'Justin Herbert', projected_round: 1 },
  { name: 'Sonny Styles', school: 'Ohio State', position: 'LB', overall_rank: 3, grade: 90, key_stats: 'Played S, LB, nickel in same game. Defensive MVP.', nfl_comparison: 'Micah Parsons', projected_round: 1 },
  { name: 'Caleb Downs', school: 'Ohio State', position: 'S', overall_rank: 4, grade: 89, key_stats: 'Thorpe + Lott IMPACT winner. Chess piece.', nfl_comparison: 'Derwin James', projected_round: 1 },
  { name: 'Rueben Bain Jr.', school: 'Miami', position: 'EDGE', overall_rank: 5, grade: 89, key_stats: '11 sacks, 18 TFL. Explosive first step.', nfl_comparison: 'Khalil Mack', projected_round: 1 },
  { name: 'Olaivavega Ioane', school: 'Penn State', position: 'OG', overall_rank: 6, grade: 89, key_stats: 'Mauler. Best guard prospect in years.', nfl_comparison: 'Quenton Nelson', projected_round: 1 },
  { name: 'David Bailey', school: 'Texas Tech', position: 'EDGE', overall_rank: 7, grade: 88, key_stats: '10.5 sacks. Violent hands, relentless motor.', nfl_comparison: 'Maxx Crosby', projected_round: 1 },
  { name: 'Makai Lemon', school: 'USC', position: 'WR', overall_rank: 8, grade: 86, key_stats: '1,200+ YDS, 10 TD. Route running elite.', nfl_comparison: 'Davante Adams', projected_round: 1 },
  { name: 'Carnell Tate', school: 'Ohio State', position: 'WR', overall_rank: 9, grade: 86, key_stats: '1,100+ YDS, 12 TD. Best contested catch ability.', nfl_comparison: 'DeAndre Hopkins', projected_round: 1 },
  { name: 'Mansoor Delane', school: 'LSU', position: 'CB', overall_rank: 10, grade: 85, key_stats: '4 INT, 15 PBU. Lockdown corner.', nfl_comparison: 'Sauce Gardner', projected_round: 1 },
  { name: 'Dillon Thieneman', school: 'Oregon', position: 'S', overall_rank: 11, grade: 85, key_stats: '6 INT, 70 tackles. Rangey ballhawk.', nfl_comparison: 'Jessie Bates III', projected_round: 1 },
  { name: 'Monroe Freeling', school: 'Georgia', position: 'OT', overall_rank: 12, grade: 83, key_stats: 'Allowed 1 sack all season. Smooth feet.', nfl_comparison: 'Tyron Smith', projected_round: 1 },
  { name: 'Akheem Mesidor', school: 'Auburn', position: 'EDGE', overall_rank: 13, grade: 83, key_stats: '9.5 sacks, 16 TFL. Power rusher.', nfl_comparison: 'Josh Allen (JAX)', projected_round: 1 },
  { name: 'Spencer Fano', school: 'Utah', position: 'OT', overall_rank: 14, grade: 84, key_stats: 'OT/OG versatility. Started 36 games.', nfl_comparison: 'Tristan Wirfs', projected_round: 1 },
  { name: 'Arvell Reese', school: 'Ohio State', position: 'EDGE', overall_rank: 15, grade: 87, key_stats: 'Edge/LB hybrid. 4.45 speed at 245.', nfl_comparison: 'T.J. Watt', projected_round: 1 },
  { name: 'Omar Cooper Jr.', school: 'Indiana', position: 'WR', overall_rank: 16, grade: 82, key_stats: '1,050+ YDS, 9 TD. Separation specialist.', nfl_comparison: 'Terry McLaurin', projected_round: 2 },
  { name: 'Emmanuel McNeil-Warren', school: 'Toledo', position: 'S', overall_rank: 17, grade: 82, key_stats: '5 INT, 80 tackles. Small school standout.', nfl_comparison: 'Antoine Winfield Jr.', projected_round: 2 },
  { name: 'Keldric Faulk', school: 'Auburn', position: 'EDGE', overall_rank: 18, grade: 81, key_stats: '8 sacks. Long arms, high motor.', nfl_comparison: 'Brian Burns', projected_round: 2 },
  { name: 'Jordyn Tyson', school: 'Arizona State', position: 'WR', overall_rank: 19, grade: 81, key_stats: '1,100+ YDS, 11 TD. After-catch monster.', nfl_comparison: 'Deebo Samuel', projected_round: 2 },
  { name: 'CJ Allen', school: 'Georgia', position: 'LB', overall_rank: 20, grade: 81, key_stats: '95 tackles, 8 TFL. Tackling machine.', nfl_comparison: 'Roquan Smith', projected_round: 2 },
  { name: 'Francis Mauigoa', school: 'Miami', position: 'OT', overall_rank: 21, grade: 83, key_stats: 'Started 30+ games. Pass pro elite.', nfl_comparison: 'Laremy Tunsil', projected_round: 1 },
  { name: 'Kadyn Proctor', school: 'Alabama', position: 'OT', overall_rank: 22, grade: 80, key_stats: '5-star recruit. Mauling run blocker.', nfl_comparison: 'Andrew Thomas', projected_round: 2 },
  { name: 'Jermod McCoy', school: 'Tennessee', position: 'CB', overall_rank: 23, grade: 80, key_stats: '3 INT, 12 PBU. Physical press corner.', nfl_comparison: 'Marshon Lattimore', projected_round: 2 },
  { name: 'Kenyon Sadiq', school: 'Oregon', position: 'TE', overall_rank: 24, grade: 80, key_stats: '700+ REC YDS, 8 TD. Mismatch weapon.', nfl_comparison: 'George Kittle', projected_round: 2 },
  { name: 'R Mason Thomas', school: 'Oklahoma', position: 'EDGE', overall_rank: 25, grade: 80, key_stats: '9 sacks. Speed rusher with bend.', nfl_comparison: 'Von Miller', projected_round: 2 },
  { name: 'Peter Woods', school: 'Clemson', position: 'DT', overall_rank: 26, grade: 79, key_stats: '6 sacks, 12 TFL. Interior disruption.', nfl_comparison: 'Javon Hargrave', projected_round: 2 },
  { name: 'Zion Young', school: 'Missouri', position: 'EDGE', overall_rank: 27, grade: 79, key_stats: '8.5 sacks. Explosive off the edge.', nfl_comparison: 'Montez Sweat', projected_round: 2 },
  { name: 'A.J. Haulcy', school: 'LSU', position: 'S', overall_rank: 28, grade: 79, key_stats: '4 INT, 65 tackles. Versatile DB.', nfl_comparison: 'Kyle Hamilton', projected_round: 2 },
  { name: 'Skyler Bell', school: 'UConn', position: 'WR', overall_rank: 29, grade: 79, key_stats: '1,000+ YDS. Transfer success story.', nfl_comparison: 'Amon-Ra St. Brown', projected_round: 2 },
  { name: 'Germie Bernard', school: 'Alabama', position: 'WR', overall_rank: 30, grade: 78, key_stats: '900+ YDS, 8 TD. Deep threat.', nfl_comparison: 'Marquise Brown', projected_round: 2 },
  { name: 'Cashius Howell', school: 'Texas A&M', position: 'EDGE', overall_rank: 31, grade: 78, key_stats: '7.5 sacks. Raw but explosive.', nfl_comparison: 'Jaelan Phillips', projected_round: 2 },
  { name: 'D\'Angelo Ponds', school: 'Indiana', position: 'CB', overall_rank: 32, grade: 78, key_stats: '3 INT, 10 PBU. Ball skills.', nfl_comparison: 'Tre\'Davious White', projected_round: 2 },
  { name: 'Colton Hood', school: 'Tennessee', position: 'CB', overall_rank: 33, grade: 77, key_stats: 'Reliable zone corner. Smart player.', nfl_comparison: 'Carlton Davis', projected_round: 3 },
  { name: 'Malachi Lawrence', school: 'UCF', position: 'EDGE', overall_rank: 34, grade: 77, key_stats: '8 sacks. Quick twitch.', nfl_comparison: 'Haason Reddick', projected_round: 3 },
  { name: 'Jonah Coleman', school: 'Washington', position: 'RB', overall_rank: 35, grade: 77, key_stats: '1,200+ YDS, 12 TD. Physical runner.', nfl_comparison: 'Josh Jacobs', projected_round: 3 },
  { name: 'Blake Miller', school: 'Clemson', position: 'OT', overall_rank: 36, grade: 79, key_stats: 'Started 30+ games. Steady.', nfl_comparison: 'Taylor Moton', projected_round: 2 },
  { name: 'Caleb Lomu', school: 'Utah', position: 'OT', overall_rank: 37, grade: 75, key_stats: 'Athletic tackle. Developing.', nfl_comparison: 'Kolton Miller', projected_round: 3 },
  { name: 'Christen Miller', school: 'Georgia', position: 'DT', overall_rank: 38, grade: 75, key_stats: '5 sacks, 10 TFL. Interior pass rush.', nfl_comparison: 'Grady Jarrett', projected_round: 3 },
  { name: 'TJ Parker', school: 'Clemson', position: 'EDGE', overall_rank: 39, grade: 75, key_stats: '7 sacks. Length and athleticism.', nfl_comparison: 'Yannick Ngakoue', projected_round: 3 },
  { name: 'Lee Hunter', school: 'Texas Tech', position: 'DT', overall_rank: 40, grade: 75, key_stats: 'Run-stuffing nose tackle.', nfl_comparison: 'Vita Vea', projected_round: 3 },
];

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

    // Ensure table exists
    await sql`
      CREATE TABLE IF NOT EXISTS perform_players (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        school TEXT NOT NULL,
        position TEXT NOT NULL,
        height TEXT,
        weight TEXT,
        class TEXT DEFAULT '2026',
        forty_time NUMERIC(4,2),
        vertical_jump NUMERIC(4,1),
        bench_reps INTEGER,
        broad_jump NUMERIC(5,1),
        three_cone NUMERIC(5,2),
        shuttle NUMERIC(5,2),
        overall_rank INTEGER,
        position_rank INTEGER,
        projected_round INTEGER,
        grade NUMERIC(4,1),
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
        UNIQUE(name, school, class)
      )
    `;

    let inserted = 0;
    for (const p of BOARD_2026) {
      await sql`
        INSERT INTO perform_players (name, school, position, overall_rank, grade, key_stats, nfl_comparison, projected_round, class, trend)
        VALUES (${p.name}, ${p.school}, ${p.position}, ${p.overall_rank}, ${p.grade}, ${p.key_stats}, ${p.nfl_comparison}, ${p.projected_round}, '2026', 'steady')
        ON CONFLICT (name, school, class) DO UPDATE SET
          overall_rank = EXCLUDED.overall_rank,
          grade = EXCLUDED.grade,
          key_stats = EXCLUDED.key_stats,
          nfl_comparison = EXCLUDED.nfl_comparison,
          projected_round = EXCLUDED.projected_round,
          updated_at = NOW()
      `;
      inserted++;
    }

    return NextResponse.json({ inserted, total: BOARD_2026.length, message: '2026 NFL Draft Big Board seeded.' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Seed failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
