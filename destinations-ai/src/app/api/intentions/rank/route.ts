import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { sql, requireDb } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { rankDestinations } from '@/lib/vertex';
import {
  IntentionSchema,
  type Destination,
  type Intention,
} from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Vertex ranking takes up to ~15s for Pro

const RankingRequestSchema = z.object({
  intentions: z.array(IntentionSchema).min(1).max(50),
  model: z.enum(['flash', 'pro']).optional(),
  maxResults: z.number().int().min(1).max(50).optional(),
  region: z.string().max(64).optional(),
});

/**
 * POST /api/intentions/rank
 * Body: { intentions, model?, maxResults?, region? }
 *
 * Vertex Gemini scores every live destination against the weighted
 * intention set. Returns ordered {destinationId, score, reasoning}.
 */
export async function POST(request: NextRequest) {
  const guard = requireDb();
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const parsed = RankingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid body', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { intentions, model = 'flash', maxResults = 10, region } = parsed.data;

  // Pull all live destinations for ranking scope. Region filter narrows
  // if the user is only interested in one corridor.
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

  if (destinations.length === 0) {
    return NextResponse.json({ data: [] });
  }

  try {
    const ranked = await rankDestinations({
      destinations,
      intentions: intentions as Intention[],
      model,
      maxResults,
    });
    return NextResponse.json({ data: ranked });
  } catch (err) {
    console.error('[api/intentions/rank] Vertex call failed', err);
    return NextResponse.json(
      { error: 'ranking service unavailable' },
      { status: 503 },
    );
  }
}
