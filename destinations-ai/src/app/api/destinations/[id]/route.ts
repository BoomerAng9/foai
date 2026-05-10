import { NextResponse, type NextRequest } from 'next/server';
import { sql, requireDb } from '@/lib/db';
import { DestinationSchema, type Destination } from '@/lib/validation';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/destinations/[id]
 *
 * Fetches a single destination with full pulse data. Used by the Pulse Card
 * when a user hovers or pins a destination.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const guard = requireDb();
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await params;

  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
    return NextResponse.json({ error: 'invalid destination id' }, { status: 400 });
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
    WHERE destination_id = ${id}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'destination not found' }, { status: 404 });
  }

  const r = rows[0]!;
  const dest: Destination = {
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
  };

  const parsed = DestinationSchema.safeParse(dest);
  if (!parsed.success) {

    console.error('[api/destinations/[id]] schema validation failed', {
      id,
      issues: parsed.error.issues,
    });
    return NextResponse.json({ error: 'destination data invalid' }, { status: 500 });
  }

  return NextResponse.json(
    { data: parsed.data },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
      },
    },
  );
}
