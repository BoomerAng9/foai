/**
 * scripts/seed-attributes-top-50.ts
 * ====================================
 * Seeds Madden/2K-style attribute sheets for the top 50 consensus
 * prospects in the 2026 NFL Draft class.
 *
 * Tiering:
 *   - Top 10: hand-curated sheets with position-specific performance
 *     attributes + real narrative context (Jeremiyah Love's INJ=99 for
 *     playing 2025 post-knee-injury unbraced; Cade Downs' AWR=99 as a
 *     two-year no-TD-allowed safety; etc.)
 *   - 11-50: heuristically generated from consensus rank + Beast combine
 *     measurements + position norms. Marked attributes_source='synthesized'
 *     so they can be replaced by hand-curated sheets later.
 *
 * Writes to perform_players.attribute_ratings + attribute_badges +
 * attributes_source + attributes_updated_at. Idempotent — re-running
 * overwrites the sheet in-place.
 */

import postgres from 'postgres';
import * as fs from 'fs';
import { deriveBadges } from '../src/lib/tie/badges';

const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 4 });

/* ── Top 10: hand-curated sheets ───────────────────────────────────── */

interface CuratedSheet {
  name: string;
  school: string;
  position: string;
  ratings: Record<string, number>;
  versatility?: 'none' | 'situational' | 'two_way' | 'unicorn';
  primeSubTags?: Array<'franchise_cornerstone' | 'talent_character_concerns' | 'nil_ready' | 'quiet_but_elite' | 'ultra_competitive'>;
  note?: string;
}

const HAND_CURATED: CuratedSheet[] = [
  {
    name: 'Jeremiyah Love',
    school: 'Notre Dame',
    position: 'RB',
    versatility: 'unicorn',   // RB + returner + pass-protection anchor + flexes as WR out of backfield
    primeSubTags: ['franchise_cornerstone', 'ultra_competitive'],
    note: 'Generational RB. Played entire 2025 season after January 2025 knee injury — without a brace. 4.36 forty. Franchise cornerstone. Ultra-competitive motor. Elite medical-durability signal possible.',
    ratings: {
      // Performance (RB) — raised to generational tier: SPM/JKM/ELU at HoF
      TRK: 93, ELU: 99, BTK: 95, CAR: 93, JKM: 99, SPM: 99, SFA: 93, BCV: 94, PBK: 87,
      // Attributes (physical — 4.36 forty = historic-tier speed)
      SPD: 99, ACC: 99, AGI: 97, CHG: 94, STR: 88, JMP: 93, SIZ: 87, STA: 94, BAL: 98, EXP: 99,
      // Intangibles — INJ at max (played through knee, unbraced)
      AWR: 92, PRC: 90, MTR: 98, LDR: 88, CLU: 95, COMP: 97, INJ: 99, TGH: 97, DISC: 91, CHR: 94,
    },
  },
  {
    name: 'Fernando Mendoza',
    school: 'Indiana',
    position: 'QB',
    note: 'Consensus QB1. Size + arm + pocket toughness. Matt Ryan / BC echo. Tough as nails.',
    ratings: {
      THP: 88, TAS: 94, TAM: 91, TAD: 86, PAC: 88, RUN: 74, BCV: 82, SAC: 83,
      SPD: 72, ACC: 74, AGI: 72, CHG: 70, STR: 86, JMP: 76, SIZ: 93, STA: 88, BAL: 84, EXP: 72,
      AWR: 92, PRC: 92, MTR: 90, LDR: 93, CLU: 92, COMP: 94, INJ: 88, TGH: 96, DISC: 90, CHR: 90,
    },
  },
  {
    name: 'Arvell Reese',
    school: 'Ohio State',
    position: 'EDGE',
    note: 'Beast #1 overall. Elite physical traits + versatile across fronts.',
    ratings: {
      BSH: 92, PMV: 94, FMV: 91, TAK: 90, PUR: 92, PLR: 90, HPW: 93,
      SPD: 90, ACC: 91, AGI: 89, CHG: 88, STR: 92, JMP: 90, SIZ: 91, STA: 89, BAL: 88, EXP: 92,
      AWR: 88, PRC: 89, MTR: 92, LDR: 85, CLU: 88, COMP: 92, INJ: 90, TGH: 92, DISC: 88, CHR: 90,
    },
  },
  {
    name: 'David Bailey',
    school: 'Texas Tech',
    position: 'EDGE',
    note: 'Quick-twitch, disruptive, powerful + explosive. Versatile NFL starter projection.',
    ratings: {
      BSH: 88, PMV: 90, FMV: 92, TAK: 88, PUR: 90, PLR: 86, HPW: 89,
      SPD: 89, ACC: 92, AGI: 91, CHG: 90, STR: 88, JMP: 91, SIZ: 87, STA: 88, BAL: 87, EXP: 93,
      AWR: 85, PRC: 86, MTR: 90, LDR: 82, CLU: 85, COMP: 90, INJ: 88, TGH: 90, DISC: 86, CHR: 88,
    },
  },
  {
    name: 'Sonny Styles',
    school: 'Ohio State',
    position: 'LB',
    note: 'Freaky athlete, smooth S→LB transition, epic combine performance.',
    ratings: {
      TAK: 88, PUR: 93, BSH: 86, HPW: 90, PLR: 90, ZCV: 90, MCV: 86,
      SPD: 93, ACC: 93, AGI: 92, CHG: 91, STR: 86, JMP: 92, SIZ: 92, STA: 90, BAL: 89, EXP: 92,
      AWR: 89, PRC: 90, MTR: 91, LDR: 86, CLU: 88, COMP: 90, INJ: 90, TGH: 88, DISC: 88, CHR: 88,
    },
  },
  {
    name: 'Caleb Downs',
    school: 'Ohio State',
    position: 'S',
    note: 'Elite tackler, no TD allowed for two years. Beast ranks him #5 overall, surefire starter.',
    ratings: {
      ZCV: 93, MCV: 91, HPW: 90, TAK: 95, PLR: 94, PUR: 94, BSH: 86,
      SPD: 92, ACC: 92, AGI: 93, CHG: 92, STR: 82, JMP: 90, SIZ: 84, STA: 90, BAL: 92, EXP: 90,
      AWR: 97, PRC: 97, MTR: 94, LDR: 93, CLU: 93, COMP: 94, INJ: 92, TGH: 92, DISC: 94, CHR: 95,
    },
  },
  {
    name: 'Mansoor Delane',
    school: 'LSU',
    position: 'CB',
    note: 'Alpha competitor despite average size. Projects as starter.',
    ratings: {
      MCV: 89, ZCV: 88, PRS: 88, TAK: 84, CTH: 82, PLR: 86,
      SPD: 91, ACC: 91, AGI: 92, CHG: 91, STR: 78, JMP: 88, SIZ: 80, STA: 88, BAL: 89, EXP: 90,
      AWR: 86, PRC: 87, MTR: 92, LDR: 86, CLU: 88, COMP: 95, INJ: 88, TGH: 88, DISC: 86, CHR: 88,
    },
  },
  {
    name: 'Carnell Tate',
    school: 'Ohio State',
    position: 'WR',
    note: 'Day-one NFL starter, potential Pro Bowler.',
    ratings: {
      CTH: 91, CIT: 89, SPC: 88, RLS: 87, SRR: 89, MRR: 89, DRR: 87, RBK: 80, ELU: 84, BTK: 82, CAR: 88,
      SPD: 90, ACC: 91, AGI: 90, CHG: 89, STR: 82, JMP: 90, SIZ: 86, STA: 88, BAL: 89, EXP: 89,
      AWR: 87, PRC: 87, MTR: 90, LDR: 82, CLU: 88, COMP: 88, INJ: 90, TGH: 84, DISC: 86, CHR: 88,
    },
  },
  {
    name: 'Rueben Bain Jr.',
    school: 'Miami',
    position: 'EDGE',
    note: 'Not prototypical but power + play style will disrupt NFL backfields.',
    ratings: {
      BSH: 88, PMV: 92, FMV: 86, TAK: 87, PUR: 86, PLR: 84, HPW: 92,
      SPD: 84, ACC: 87, AGI: 84, CHG: 82, STR: 93, JMP: 84, SIZ: 88, STA: 86, BAL: 85, EXP: 88,
      AWR: 84, PRC: 84, MTR: 92, LDR: 82, CLU: 86, COMP: 92, INJ: 86, TGH: 94, DISC: 82, CHR: 86,
    },
  },
  {
    name: 'Francis Mauigoa',
    school: 'Miami',
    position: 'OT',
    note: 'Durable blocker, may project to guard long-term.',
    ratings: {
      RBK: 88, PBK: 86, RBP: 90, RBF: 84, PBP: 88, PBF: 82, IBL: 86, LBK: 82,
      SPD: 72, ACC: 74, AGI: 76, CHG: 72, STR: 93, JMP: 76, SIZ: 94, STA: 90, BAL: 86, EXP: 74,
      AWR: 84, PRC: 82, MTR: 88, LDR: 84, CLU: 84, COMP: 88, INJ: 92, TGH: 92, DISC: 88, CHR: 88,
    },
  },
  {
    name: 'Drew Allar',
    school: 'Penn State',
    position: 'QB',
    note: 'Big-bodied pocket QB (6-5 228) with a strong arm. 2025 season underwhelmed — accuracy regressed, decision-making inconsistent. Beast 3rd-4th grade. Late Day-2 projection.',
    ratings: {
      // Performance (QB) — strong arm drags up, accuracy + processing drag down
      THP: 87, TAS: 72, TAM: 70, TAD: 76, PAC: 68, RUN: 70, BCV: 70, SAC: 66,
      // Attributes — size is the calling card, not explosive
      SPD: 76, ACC: 76, AGI: 72, CHG: 70, STR: 86, JMP: 74, SIZ: 92, STA: 82, BAL: 76, EXP: 72,
      // Intangibles — leader + tough, middling awareness
      AWR: 74, PRC: 72, MTR: 82, LDR: 84, CLU: 72, COMP: 80, INJ: 84, TGH: 88, DISC: 74, CHR: 82,
    },
  },
];

/* ── Heuristic generator for ranks 11-50 ───────────────────────────── */

interface BaseProspect {
  name: string;
  school: string;
  position: string;
  consensus: number;  // consensus_avg rank
  beast?: { forty?: number; vertical?: number; weight?: number; grade?: string };
}

function clamp(n: number, lo = 55, hi = 99): number {
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

function heuristicSheet(p: BaseProspect): Record<string, number> {
  // Anchor rating: linear from 92 at consensus=11 to 76 at consensus=50.
  const rank = p.consensus;
  const anchor = Math.round(92 - ((rank - 11) / 39) * 16);
  const jitter = (seed: number): number => ((p.name.charCodeAt(seed % p.name.length) % 7) - 3);

  const ratings: Record<string, number> = {};
  const pos = p.position.toUpperCase();

  // Universal physicals — bump by beast 40 if present
  let spdBase = anchor;
  if (p.beast?.forty) {
    // 4.40 = +8, 4.55 = 0, 4.70 = -8
    spdBase += Math.round((4.55 - p.beast.forty) * 55);
  }
  ratings.SPD = clamp(spdBase + jitter(0));
  ratings.ACC = clamp(spdBase + jitter(1));
  ratings.AGI = clamp(anchor + jitter(2));
  ratings.CHG = clamp(anchor - 1 + jitter(3));
  ratings.STR = clamp(anchor + (['OT', 'OG', 'C', 'DL', 'EDGE'].includes(pos) ? 6 : -2) + jitter(4));
  ratings.JMP = clamp(anchor + (p.beast?.vertical ? Math.round((p.beast.vertical - 34) * 1.2) : 0) + jitter(5));
  ratings.SIZ = clamp(anchor + (p.beast?.weight ? Math.round((p.beast.weight - 220) / 10) : 0) + jitter(6));
  ratings.STA = clamp(anchor + jitter(7));
  ratings.BAL = clamp(anchor + jitter(8));
  ratings.EXP = clamp(anchor + jitter(9));

  // Universal intangibles — anchor shifted by Beast grade band
  const beastBonus = p.beast?.grade?.startsWith('1st') ? 4 : p.beast?.grade === '2nd' ? 2 : 0;
  ratings.AWR = clamp(anchor - 2 + beastBonus + jitter(10));
  ratings.PRC = clamp(anchor - 2 + beastBonus + jitter(11));
  ratings.MTR = clamp(anchor + 2 + jitter(12));
  ratings.LDR = clamp(anchor - 4 + jitter(13));
  ratings.CLU = clamp(anchor + jitter(14));
  ratings.COMP = clamp(anchor + jitter(15));
  ratings.INJ = clamp(anchor + jitter(16));
  ratings.TGH = clamp(anchor + jitter(17));
  ratings.DISC = clamp(anchor + jitter(18));
  ratings.CHR = clamp(anchor + jitter(19));

  // Position-specific performance attrs (anchored, light jitter)
  const perfAnchor = anchor;
  const byPos: Record<string, string[]> = {
    QB: ['THP', 'TAS', 'TAM', 'TAD', 'PAC', 'RUN', 'BCV', 'SAC'],
    RB: ['TRK', 'ELU', 'BTK', 'CAR', 'JKM', 'SPM', 'SFA', 'BCV', 'PBK'],
    WR: ['CTH', 'CIT', 'SPC', 'RLS', 'SRR', 'MRR', 'DRR', 'RBK'],
    TE: ['CTH', 'CIT', 'SPC', 'RLS', 'SRR', 'MRR', 'RBK', 'PBK', 'IBL'],
    OT: ['RBK', 'PBK', 'RBP', 'RBF', 'PBP', 'PBF', 'IBL'],
    OG: ['RBK', 'PBK', 'RBP', 'RBF', 'PBP', 'PBF', 'IBL', 'LBK'],
    C: ['RBK', 'PBK', 'RBP', 'RBF', 'PBP', 'PBF', 'IBL', 'LBK'],
    EDGE: ['BSH', 'PMV', 'FMV', 'TAK', 'PUR', 'PLR', 'HPW'],
    DL: ['BSH', 'PMV', 'FMV', 'TAK', 'PUR', 'PLR', 'HPW'],
    LB: ['TAK', 'PUR', 'PRC', 'BSH', 'HPW', 'PLR', 'ZCV', 'MCV'],
    CB: ['MCV', 'ZCV', 'PRS', 'TAK', 'CTH', 'PLR'],
    S: ['ZCV', 'MCV', 'HPW', 'TAK', 'PLR', 'PUR', 'BSH'],
  };
  const keys = byPos[pos] ?? byPos['LB'];
  keys.forEach((k, i) => {
    ratings[k] = clamp(perfAnchor + jitter(20 + i));
  });

  return ratings;
}

/* ── Main ─────────────────────────────────────────────────────────── */

async function upsertSheet(
  name: string,
  school: string,
  ratings: Record<string, number>,
  source: 'curated' | 'synthesized',
  opts: { versatility?: string | null; primeSubTags?: string[] | null } = {},
): Promise<'updated' | 'not_found'> {
  const nameNorm = name.toLowerCase().trim();
  const badges = deriveBadges(ratings);
  const badgeCodes = badges.map(b => b.code);
  const rows = await sql<Array<{ id: number }>>`
    SELECT id FROM perform_players
    WHERE LOWER(TRIM(name)) = ${nameNorm}
      AND class_year = '2026'
      AND (LOWER(TRIM(school)) = ${school.toLowerCase().trim()} OR school_normalized = ${school.toLowerCase().trim().replace(/\s+/g, '_')})
    LIMIT 1
  `;
  if (rows.length === 0) return 'not_found';
  await sql`
    UPDATE perform_players
    SET attribute_ratings     = ${sql.json(ratings)},
        attribute_badges      = ${sql.json(badgeCodes)},
        attributes_source     = ${source},
        attributes_updated_at = NOW(),
        versatility_flex      = ${opts.versatility ?? null},
        prime_sub_tags        = ${opts.primeSubTags ?? null},
        updated_at            = NOW()
    WHERE id = ${rows[0].id}
  `;
  return 'updated';
}

(async () => {
  const t0 = Date.now();
  console.log('[seed-attr] starting');
  let curated = 0;
  const unmatched: string[] = [];

  // Top 10 — hand-curated
  for (const sheet of HAND_CURATED) {
    const res = await upsertSheet(sheet.name, sheet.school, sheet.ratings, 'curated', {
      versatility: sheet.versatility ?? null,
      primeSubTags: sheet.primeSubTags ?? null,
    });
    if (res === 'updated') curated++;
    else unmatched.push(`${sheet.name} (${sheet.school}) [curated]`);
    const badgeCount = deriveBadges(sheet.ratings).length;
    console.log(`  [curated] ${sheet.name.padEnd(25)} ${sheet.position.padEnd(5)} → ${badgeCount} badges`);
  }

  // Ranks 11-50 — heuristic from consensus + Beast
  const pool = await sql<Array<{
    id: number; name: string; school: string; position: string;
    consensus_avg: number | null;
    height: string | null; weight: number | null;
  }>>`
    SELECT p.id, p.name, p.school, p.position,
           (SELECT rank FROM perform_consensus_ranks WHERE player_id=p.id AND source='consensus_avg' LIMIT 1) AS consensus_avg,
           p.height, p.weight
    FROM perform_players p
    WHERE p.class_year='2026'
      AND (SELECT rank FROM perform_consensus_ranks WHERE player_id=p.id AND source='consensus_avg' LIMIT 1) BETWEEN 11 AND 50
    ORDER BY consensus_avg ASC NULLS LAST
  `;
  console.log(`\n[seed-attr] synthesizing ${pool.length} sheets for consensus ranks 11-50`);
  let synth = 0;
  for (const p of pool) {
    if (p.consensus_avg == null) continue;
    const sheet = heuristicSheet({
      name: p.name,
      school: p.school,
      position: p.position,
      consensus: p.consensus_avg,
      beast: { weight: p.weight ?? undefined },
    });
    const res = await upsertSheet(p.name, p.school, sheet, 'synthesized');
    if (res === 'updated') synth++;
  }

  console.log(`\n[seed-attr] curated=${curated}/${HAND_CURATED.length} synthesized=${synth}/${pool.length} unmatched=${unmatched.length}`);
  if (unmatched.length) {
    console.log('[seed-attr] unmatched:');
    for (const u of unmatched) console.log(`  - ${u}`);
  }
  console.log(`[seed-attr] elapsed = ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await sql.end();
})().catch(e => { console.error(e); process.exit(1); });
