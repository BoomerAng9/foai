import { NextResponse, type NextRequest } from 'next/server';
import { sql, requireDb } from '@/lib/db';
import { DestinationSchema, type Destination } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/destinations
 *
 * Query params (all optional):
 *   region      — filter by region string
 *   state       — two-letter state code
 *   minWalk     — minimum walk_score
 *   maxPrice    — maximum median_home_price
 *
 * Returns all `status='live'` destinations from the public projection.
 */
export async function GET(request: NextRequest) {
  const guard = requireDb();
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const url = new URL(request.url);
  const region = url.searchParams.get('region');
  const state = url.searchParams.get('state');
  const minWalkRaw = url.searchParams.get('minWalk');
  const maxPriceRaw = url.searchParams.get('maxPrice');

  const minWalk = minWalkRaw ? Number.parseInt(minWalkRaw, 10) : null;
  const maxPrice = maxPriceRaw ? Number.parseInt(maxPriceRaw, 10) : null;

  if (minWalk !== null && (Number.isNaN(minWalk) || minWalk < 0 || minWalk > 100)) {
    return NextResponse.json({ error: 'minWalk must be 0..100' }, { status: 400 });
  }
  if (maxPrice !== null && (Number.isNaN(maxPrice) || maxPrice < 0)) {
    return NextResponse.json({ error: 'maxPrice must be a non-negative integer' }, { status: 400 });
  }
  if (state && !/^[A-Za-z]{2}$/.test(state)) {
    return NextResponse.json({ error: 'state must be a two-letter code' }, { status: 400 });
  }

  const rows = await sql!<Array<{
    destinationId: string;
    name: string;
    region: string;
    state: string;
    lat: number;
    lng: number;
    medianHomePrice: number | null;
    listingCount: number;
    walkScore: number | null;
    noiseDbMin: number | null;
    noiseDbMax: number | null;
    schoolRating: number | null;
    vibeDescriptors: string[];
    ambientColor: string;
    heroText: string | null;
    summary: string | null;
  }>>`
    SELECT
      destination_id, name, region, state, lat, lng,
      median_home_price, listing_count,
      walk_score, noise_db_min, noise_db_max, school_rating,
      vibe_descriptors, ambient_color, hero_text, summary
    FROM destinations_public
    WHERE (${region}::text IS NULL OR region = ${region})
      AND (${state}::text  IS NULL OR state  = UPPER(${state}))
      AND (${minWalk}::int IS NULL OR walk_score >= ${minWalk})
      AND (${maxPrice}::int IS NULL OR median_home_price <= ${maxPrice})
    ORDER BY COALESCE(walk_score, 0) DESC, name ASC
  `;

  const destinations: Destination[] = rows.map((r) => ({
    destinationId: r.destinationId,
    name: r.name,
    region: r.region,
    state: r.state,
    coordinates: { lat: r.lat, lng: r.lng },
    medianHomePrice: r.medianHomePrice,
    listingCount: r.listingCount,
    pulse: {
      walkScore: r.walkScore,
      noiseDbRange:
        r.noiseDbMin !== null && r.noiseDbMax !== null
          ? [r.noiseDbMin, r.noiseDbMax]
          : null,
      schoolRating: r.schoolRating,
      vibeDescriptors: r.vibeDescriptors,
      ambientColor: r.ambientColor,
    },
    heroText: r.heroText,
    summary: r.summary,
  }));

  // Defense-in-depth: validate every row before we hand it to the client.
  const validated: Destination[] = [];
  for (const d of destinations) {
    const parsed = DestinationSchema.safeParse(d);
    if (parsed.success) validated.push(parsed.data);
    else {
      console.error('[api/destinations] row failed schema validation', {
        destinationId: d.destinationId,
        issues: parsed.error.issues,
      });
    }
  }

  return NextResponse.json(
    { data: validated },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}
