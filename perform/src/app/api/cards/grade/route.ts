/**
 * POST /api/cards/grade
 * ======================
 * Public, customer-facing grading endpoint for the Player Card Generator.
 * No auth — anyone can submit name/sport/stats and get a TIE grade plus
 * a recommended card style.
 *
 * Body:
 *   {
 *     name: string,
 *     position: string,
 *     school?: string,
 *     sport?: Sport,                  // default 'football'
 *     vertical?: Vertical,            // default 'SPORTS'
 *     pillars: { performance, attributes, intangibles },  // 0-100 each
 *     versatility?: 'none' | 'situational' | 'two_way' | 'unicorn',
 *     primeSubTags?: PrimeSubTag[]
 *   }
 *
 * Response:
 *   {
 *     ok: true,
 *     grade: TIEResult,
 *     recommendedStyle: { id, name, category }
 *   }
 *
 * The TIE result is stamped with the requested vertical (default SPORTS)
 * so downstream surfaces can assertVertical() before rendering.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  buildTIEResult,
  versatilityBonusValue,
  type PrimeSubTag,
  type Vertical,
  type VersatilityFlex,
} from '@aims/tie-matrix';
import { recommendCardStyle } from '@/lib/cards/recommend-style';
import { listAllCardStyles } from '@/lib/images/card-aesthetics';
import type { Sport } from '@/lib/images/card-aesthetics';

const VALID_VERTICALS: ReadonlySet<Vertical> = new Set([
  'SPORTS', 'WORKFORCE', 'STUDENT', 'CONTRACTOR', 'FOUNDER', 'CREATIVE',
]);
const VALID_FLEX: ReadonlySet<VersatilityFlex> = new Set([
  'none', 'situational', 'two_way', 'unicorn',
]);
const VALID_PRIME_TAGS: ReadonlySet<PrimeSubTag> = new Set([
  'franchise_cornerstone', 'talent_character_concerns', 'nil_ready', 'quiet_but_elite', 'ultra_competitive',
]);

interface GradeBody {
  name?: unknown;
  position?: unknown;
  school?: unknown;
  sport?: unknown;
  vertical?: unknown;
  pillars?: unknown;
  versatility?: unknown;
  primeSubTags?: unknown;
}

function num(v: unknown, fallback = 50): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

export async function POST(req: NextRequest) {
  let body: GradeBody;
  try {
    body = (await req.json()) as GradeBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const position = typeof body.position === 'string' ? body.position.trim() : '';
  if (!name || !position) {
    return NextResponse.json({ error: 'name and position are required' }, { status: 400 });
  }

  const sport = (typeof body.sport === 'string' ? body.sport : 'football') as Sport;
  const vertical = ((typeof body.vertical === 'string' && VALID_VERTICALS.has(body.vertical as Vertical))
    ? body.vertical
    : 'SPORTS') as Vertical;

  const pillarsRaw = (body.pillars ?? {}) as Record<string, unknown>;
  const performance = num(pillarsRaw.performance);
  const attributes  = num(pillarsRaw.attributes);
  const intangibles = num(pillarsRaw.intangibles);

  const flex = (typeof body.versatility === 'string' && VALID_FLEX.has(body.versatility as VersatilityFlex))
    ? (body.versatility as VersatilityFlex)
    : 'none';
  const bonus = versatilityBonusValue(flex);

  const primeSubTags = Array.isArray(body.primeSubTags)
    ? body.primeSubTags.filter((t): t is PrimeSubTag => typeof t === 'string' && VALID_PRIME_TAGS.has(t as PrimeSubTag))
    : undefined;

  const grade = buildTIEResult({
    vertical,
    performance,
    attributes,
    intangibles,
    bonus,
    primeSubTags,
  });

  const styleId = recommendCardStyle(grade.tier, sport);
  const styleMeta = listAllCardStyles().find((s) => s.id === styleId);

  return NextResponse.json({
    ok: true,
    input: { name, position, school: typeof body.school === 'string' ? body.school : null, sport, vertical },
    grade,
    recommendedStyle: styleMeta
      ? { id: styleMeta.id, name: styleMeta.name, description: styleMeta.description, category: styleMeta.category }
      : { id: styleId, name: String(styleId), description: '', category: 'classic' as const },
  });
}
