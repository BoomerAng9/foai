/**
 * Destinations AI — seed script.
 *
 * Populates:
 *   - 5 live destinations (Coastal GA / Lowcountry corridor)
 *   - 8 Coming Soon regions (24 destinations queued)
 *
 * DATA PROVENANCE
 * ───────────────
 * - Coordinates: OpenStreetMap / Nominatim lookups (public domain)
 * - Walk scores: publicly stated WalkScore.com ratings for the named place
 *   at the time of curation. Commercial MLS / walkscore API integration
 *   deferred to Phase 3 when contracts close.
 * - School ratings: publicly stated GreatSchools ratings, rounded to a
 *   destination-level summary. Same Phase 3 integration applies.
 * - Median home prices: publicly stated Zillow/Redfin market summaries
 *   for the named place, rounded. Rotated on seed re-run.
 * - Vibe descriptors + hero text: curated by ACHIEVEMOR editorial.
 *
 * Every row is tagged data_source='curated' so a Phase 3 refresh can
 * distinguish curated vs live-fed rows and apply different update cadences.
 *
 * Usage:
 *   DATABASE_URL=... tsx scripts/seed.ts
 */

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('[seed] DATABASE_URL is not set — aborting.');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: 'require', max: 2 });

// ─── Live destinations ──────────────────────────────────────────────
const DESTINATIONS = [
  {
    destinationId: 'dest_savannah_historic',
    name: 'Savannah — Historic District',
    region: 'Coastal Georgia',
    state: 'GA',
    lat: 32.0809,
    lng: -81.0912,
    medianHomePrice: 685000,
    listingCount: 142,
    walkScore: 94,
    noiseDbMin: 48,
    noiseDbMax: 62,
    schoolRating: 7,
    vibeDescriptors: ['live oaks', 'cobblestone', 'southern-gothic', 'walkable', 'artist-dense'],
    ambientColor: '#FF8A3D',
    heroText: 'Spanish moss, cobblestone squares, and a working waterfront — the south\u2019s most walkable historic core.',
    summary:
      'Savannah\u2019s Historic District is a 22-square grid of oak-shaded plazas, historic homes, restored warehouses along the river, and a food scene that punches above its weight. Ideal for buyers who want walkability + culture and can accept 19th-century building quirks.',
  },
  {
    destinationId: 'dest_tybee_island',
    name: 'Tybee Island',
    region: 'Coastal Georgia',
    state: 'GA',
    lat: 32.0076,
    lng: -80.8454,
    medianHomePrice: 825000,
    listingCount: 38,
    walkScore: 71,
    noiseDbMin: 42,
    noiseDbMax: 55,
    schoolRating: 6,
    vibeDescriptors: ['beach town', 'slow pace', 'bike culture', 'salt air', 'tourist ebb'],
    ambientColor: '#4FD1FF',
    heroText: 'A five-mile barrier island with working fishermen, locals-only bars, and a permanent half-step-slower clock.',
    summary:
      'Tybee is Savannah\u2019s beach — reachable in 25 minutes via US-80 over marsh. Year-round population ~3k swells with summer visitors. Golf carts replace cars for most errands. Inventory is tight and beachfront is scarce.',
  },
  {
    destinationId: 'dest_richmond_hill',
    name: 'Richmond Hill',
    region: 'Coastal Georgia',
    state: 'GA',
    lat: 31.9382,
    lng: -81.304,
    medianHomePrice: 452000,
    listingCount: 87,
    walkScore: 42,
    noiseDbMin: 38,
    noiseDbMax: 51,
    schoolRating: 9,
    vibeDescriptors: ['family corridor', 'new construction', 'excellent schools', 'quiet', 'commuter-belt'],
    ambientColor: '#9AE66E',
    heroText: 'Bryan County\u2019s fastest-growing family corridor — top-rated schools, new builds, and 20 minutes to Savannah.',
    summary:
      'Richmond Hill has been the preferred Savannah-commuter town for a decade. Bryan County schools consistently rank top-three in Georgia. New-build ranches dominate, with established neighborhoods around Sterling Creek and Richmond Hill State Park. Walkability is car-first.',
  },
  {
    destinationId: 'dest_bluffton_sc',
    name: 'Bluffton, SC',
    region: 'Lowcountry',
    state: 'SC',
    lat: 32.2374,
    lng: -80.8604,
    medianHomePrice: 712000,
    listingCount: 64,
    walkScore: 55,
    noiseDbMin: 40,
    noiseDbMax: 54,
    schoolRating: 8,
    vibeDescriptors: ['lowcountry charm', 'oak-shaded', 'craft-food scene', 'growing', 'design-conscious'],
    ambientColor: '#C49BFF',
    heroText: 'The South Carolina Lowcountry\u2019s design-driven growth town — Old Town charm meets new-urbanist planning.',
    summary:
      'Bluffton has grown ~10x since 2000 yet kept the oak-shaded Old Town center intact. Mix of master-planned communities (Palmetto Bluff, Cypress Ridge) and restored cottages. Strong craft-food + artist scene relative to population.',
  },
  {
    destinationId: 'dest_pooler',
    name: 'Pooler',
    region: 'Coastal Georgia',
    state: 'GA',
    lat: 32.1152,
    lng: -81.2474,
    medianHomePrice: 398000,
    listingCount: 103,
    walkScore: 38,
    noiseDbMin: 44,
    noiseDbMax: 60,
    schoolRating: 8,
    vibeDescriptors: ['new-build sprawl', 'amenity-rich', 'airport-adjacent', 'value-priced'],
    ambientColor: '#FFD93D',
    heroText: 'Savannah\u2019s amenity belt — new neighborhoods, the airport, and the region\u2019s value price point.',
    summary:
      'Pooler is the Savannah metro\u2019s value option — big-box retail, the Savannah airport, new construction in the $300-500k range. Suburb-typical amenities, car-first layout, rapid growth with the usual traffic tradeoffs.',
  },
] as const;

// ─── Coming Soon expansion roster ───────────────────────────────────
const COMING_SOON = [
  {
    regionId: 'region_appalachian_highlands',
    name: 'Appalachian Highlands',
    geographicArea: 'Western North Carolina + East Tennessee',
    centerLat: 35.5951,
    centerLng: -82.5515,
    ambientPalette: ['#8FC27A', '#C8A97E', '#4A5D52'],
    destinationCount: 4,
    estimatedUnlockQuarter: 'Q3 2026',
    flagshipDestinations: ['Asheville', 'Boone', 'Brevard', 'Johnson City'],
    regionVibe: ['mountain arts', 'craft-food scene', 'four-season', 'hippie-pragmatic', 'trail-dense'],
    summary:
      'The Appalachian Highlands are the eastern U.S.\u2019s best small-mountain-town corridor — Asheville as the cultural anchor, Boone and Brevard as college-town alternatives, Johnson City as the value-priced TN gateway.',
    displayOrder: 10,
  },
  {
    regionId: 'region_desert_southwest',
    name: 'Desert Southwest',
    geographicArea: 'Northern New Mexico + Sedona AZ',
    centerLat: 35.687,
    centerLng: -105.9378,
    ambientPalette: ['#D97757', '#E8B796', '#8B4332'],
    destinationCount: 3,
    estimatedUnlockQuarter: 'Q3 2026',
    flagshipDestinations: ['Santa Fe', 'Taos', 'Sedona'],
    regionVibe: ['high-desert', 'spiritual gravity', 'adobe-earth', 'artist-long-haul', 'thin-air clarity'],
    summary:
      'Santa Fe as the anchor, Taos as the higher-elevation art town, Sedona as the red-rock outlier — three destinations that consistently retain value and attract creative buyers.',
    displayOrder: 20,
  },
  {
    regionId: 'region_pacific_northwest',
    name: 'Pacific Northwest',
    geographicArea: 'Central + Southern Oregon',
    centerLat: 44.0582,
    centerLng: -121.3153,
    ambientPalette: ['#4FD1A8', '#2E5C4B', '#6BA390'],
    destinationCount: 3,
    estimatedUnlockQuarter: 'Q4 2026',
    flagshipDestinations: ['Bend', 'Ashland', 'Hood River'],
    regionVibe: ['alpine-adjacent', 'coffee-dense', 'outdoor industrial', 'temperate rainforest', 'mushroom-damp'],
    summary:
      'Bend as the growing outdoor anchor, Ashland for the arts/Shakespeare festival buyer, Hood River for the Columbia Gorge athlete. Cooler climate, tight inventory.',
    displayOrder: 30,
  },
  {
    regionId: 'region_rocky_mountain',
    name: 'Rocky Mountain Corridor',
    geographicArea: 'Southwest Montana + Central Colorado',
    centerLat: 45.677,
    centerLng: -111.0429,
    ambientPalette: ['#B8C5D6', '#6B8CAE', '#2C3E50'],
    destinationCount: 3,
    estimatedUnlockQuarter: 'Q4 2026',
    flagshipDestinations: ['Bozeman', 'Livingston', 'Salida'],
    regionVibe: ['big-sky', 'fly-fishing', 'remote-worker inflow', 'ranch-adjacent', 'sporting class'],
    summary:
      'Bozeman is the growth story, Livingston is the lower-priced Montana alternative, Salida is the Arkansas River outdoor town. Remote-worker inflow has compressed inventory since 2020.',
    displayOrder: 40,
  },
  {
    regionId: 'region_emerald_coast',
    name: 'Emerald Coast',
    geographicArea: '30A Florida Panhandle + Fairhope AL',
    centerLat: 30.3276,
    centerLng: -86.1557,
    ambientPalette: ['#7FD8D8', '#FFE4A3', '#E8A87C'],
    destinationCount: 3,
    estimatedUnlockQuarter: 'Q1 2027',
    flagshipDestinations: ['Seaside', 'Rosemary Beach', 'Alys Beach', 'Fairhope'],
    regionVibe: ['New Urbanist', 'sugar-sand', 'design-driven', 'bike-path architecture', 'pastel-disciplined'],
    summary:
      'The 30A corridor — Seaside, Rosemary Beach, and Alys Beach — is the country\u2019s most disciplined New Urbanist beach development. Fairhope, across the Mobile Bay, is the Alabama alternative with oak-tunnel streets.',
    displayOrder: 50,
  },
  {
    regionId: 'region_great_lakes_north',
    name: 'Great Lakes North',
    geographicArea: 'Northern Michigan + Door County WI',
    centerLat: 44.7631,
    centerLng: -85.6206,
    ambientPalette: ['#5B9EC9', '#F4E4BC', '#3D5C6F'],
    destinationCount: 3,
    estimatedUnlockQuarter: 'Q1 2027',
    flagshipDestinations: ['Traverse City', "Sutton's Bay", 'Door County'],
    regionVibe: ['lake culture', 'cherry orchards', 'four-season serious', 'inland nautical', 'midwest civility'],
    summary:
      'Traverse City as the anchor (cherry capital, cold-climate wine region), Sutton\u2019s Bay as the Leelanau peninsula gem, Door County Wisconsin as the parallel experience across Lake Michigan.',
    displayOrder: 60,
  },
  {
    regionId: 'region_hudson_catskills',
    name: 'Hudson Valley & Catskills',
    geographicArea: 'Mid-Hudson + Western Catskills',
    centerLat: 42.2529,
    centerLng: -73.7901,
    ambientPalette: ['#C49BFF', '#8B7BA8', '#3E3351'],
    destinationCount: 3,
    estimatedUnlockQuarter: 'Q2 2027',
    flagshipDestinations: ['Hudson', 'Beacon', 'Woodstock', 'Kingston'],
    regionVibe: ['NYC-adjacent', 'literary-art', 'farm-table', 'Amtrak corridor', 'creative-class relocation'],
    summary:
      'Hudson as the NYC-creative-class anchor, Beacon for the Metro-North commuter, Woodstock for the artist, Kingston as the value-priced industrial revival.',
    displayOrder: 70,
  },
  {
    regionId: 'region_blue_ridge_va',
    name: 'Blue Ridge Virginia',
    geographicArea: 'Central Virginia + Shenandoah Valley',
    centerLat: 38.0293,
    centerLng: -78.4767,
    ambientPalette: ['#9AE66E', '#D4C487', '#5C7A4F'],
    destinationCount: 2,
    estimatedUnlockQuarter: 'Q2 2027',
    flagshipDestinations: ['Charlottesville', 'Staunton', 'Floyd'],
    regionVibe: ['Jeffersonian', 'bluegrass', 'vineyard belt', 'small-college', 'old-south genteel'],
    summary:
      'Charlottesville (UVA + vineyard belt), Staunton (Shakespeare + restored downtown), and Floyd (bluegrass epicenter) offer a genteel Virginia alternative to the Carolina mountain towns.',
    displayOrder: 80,
  },
] as const;

async function main() {
  try {
    console.log('[seed] destinations…');
    for (const d of DESTINATIONS) {
      await sql`
        INSERT INTO destinations (
          destination_id, name, region, state, lat, lng,
          median_home_price, listing_count,
          walk_score, noise_db_min, noise_db_max, school_rating,
          vibe_descriptors, ambient_color,
          status, data_source, hero_text, summary
        ) VALUES (
          ${d.destinationId}, ${d.name}, ${d.region}, ${d.state}, ${d.lat}, ${d.lng},
          ${d.medianHomePrice}, ${d.listingCount},
          ${d.walkScore}, ${d.noiseDbMin}, ${d.noiseDbMax}, ${d.schoolRating},
          ${sql.array(d.vibeDescriptors as unknown as string[])}, ${d.ambientColor},
          'live', 'curated', ${d.heroText}, ${d.summary}
        )
        ON CONFLICT (destination_id) DO UPDATE SET
          name = EXCLUDED.name,
          region = EXCLUDED.region,
          state = EXCLUDED.state,
          lat = EXCLUDED.lat,
          lng = EXCLUDED.lng,
          median_home_price = EXCLUDED.median_home_price,
          listing_count = EXCLUDED.listing_count,
          walk_score = EXCLUDED.walk_score,
          noise_db_min = EXCLUDED.noise_db_min,
          noise_db_max = EXCLUDED.noise_db_max,
          school_rating = EXCLUDED.school_rating,
          vibe_descriptors = EXCLUDED.vibe_descriptors,
          ambient_color = EXCLUDED.ambient_color,
          hero_text = EXCLUDED.hero_text,
          summary = EXCLUDED.summary
      `;
      console.log(`  · ${d.destinationId}`);
    }

    console.log('[seed] coming-soon regions…');
    for (const r of COMING_SOON) {
      await sql`
        INSERT INTO coming_soon_regions (
          region_id, name, geographic_area,
          center_lat, center_lng, ambient_palette,
          destination_count, estimated_unlock_quarter,
          flagship_destinations, region_vibe,
          summary, display_order
        ) VALUES (
          ${r.regionId}, ${r.name}, ${r.geographicArea},
          ${r.centerLat}, ${r.centerLng}, ${sql.array(r.ambientPalette as unknown as string[])},
          ${r.destinationCount}, ${r.estimatedUnlockQuarter},
          ${sql.array(r.flagshipDestinations as unknown as string[])},
          ${sql.array(r.regionVibe as unknown as string[])},
          ${r.summary}, ${r.displayOrder}
        )
        ON CONFLICT (region_id) DO UPDATE SET
          name = EXCLUDED.name,
          geographic_area = EXCLUDED.geographic_area,
          center_lat = EXCLUDED.center_lat,
          center_lng = EXCLUDED.center_lng,
          ambient_palette = EXCLUDED.ambient_palette,
          destination_count = EXCLUDED.destination_count,
          estimated_unlock_quarter = EXCLUDED.estimated_unlock_quarter,
          flagship_destinations = EXCLUDED.flagship_destinations,
          region_vibe = EXCLUDED.region_vibe,
          summary = EXCLUDED.summary,
          display_order = EXCLUDED.display_order
      `;
      console.log(`  · ${r.regionId}`);
    }

    console.log('[seed] done.');
  } catch (err) {
    console.error('[seed] failed', err);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main();
