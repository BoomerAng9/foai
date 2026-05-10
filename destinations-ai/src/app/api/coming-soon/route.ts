import { NextResponse, type NextRequest } from 'next/server';
import { sql, requireDb } from '@/lib/db';
import { ComingSoonRegionSchema, type ComingSoonRegion } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/coming-soon
 *
 * Returns the expansion roster for the ExpansionDrawer component.
 * Ordered by display_order, then estimated_unlock_quarter.
 */
export async function GET(_request: NextRequest) {
  const guard = requireDb();
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const rows = await sql!<Array<{
    regionId: string;
    name: string;
    geographicArea: string;
    centerLat: number;
    centerLng: number;
    ambientPalette: string[];
    destinationCount: number;
    estimatedUnlockQuarter: string;
    flagshipDestinations: string[];
    regionVibe: string[];
    waitlistCount: number;
    summary: string | null;
    displayOrder: number;
  }>>`
    SELECT
      region_id, name, geographic_area,
      center_lat, center_lng, ambient_palette,
      destination_count, estimated_unlock_quarter,
      flagship_destinations, region_vibe,
      waitlist_count, summary, display_order
    FROM coming_soon_regions
    ORDER BY display_order ASC, estimated_unlock_quarter ASC, name ASC
  `;

  const regions: ComingSoonRegion[] = rows.map((r) => ({
    regionId: r.regionId,
    name: r.name,
    geographicArea: r.geographicArea,
    centerCoordinates: { lat: r.centerLat, lng: r.centerLng },
    ambientPalette: [
      r.ambientPalette[0] ?? '#FF6B00',
      r.ambientPalette[1] ?? '#FF8A3D',
      r.ambientPalette[2] ?? '#C94A00',
    ] as [string, string, string],
    destinationCount: r.destinationCount,
    estimatedUnlockQuarter: r.estimatedUnlockQuarter,
    flagshipDestinations: r.flagshipDestinations,
    regionVibe: r.regionVibe,
    waitlistCount: r.waitlistCount,
    summary: r.summary,
    displayOrder: r.displayOrder,
  }));

  const validated: ComingSoonRegion[] = [];
  for (const region of regions) {
    const parsed = ComingSoonRegionSchema.safeParse(region);
    if (parsed.success) validated.push(parsed.data);
    else {

      console.error('[api/coming-soon] row failed schema validation', {
        regionId: region.regionId,
        issues: parsed.error.issues,
      });
    }
  }

  return NextResponse.json(
    { data: validated },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
      },
    },
  );
}
