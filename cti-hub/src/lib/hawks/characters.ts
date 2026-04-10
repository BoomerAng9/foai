/**
 * Sqwaadrun Character Canon
 * ===========================
 * Visual descriptions, gear, and image slots for the Chicken Hawk family.
 * Used by /plug/sqwaadrun + sqwaadrun.foai.cloud landing pages, the
 * roster cards, and the Iller_Ang character art generation pipeline.
 *
 * Brand reference: project_sqwaadrun_brand.md (memory)
 * Image destination: /public/hawks/{slug}.png
 *
 * The Chicken Hawk family lives at a working port at night —
 * A.I.M.S. shipping containers stacked, neon port signage, golden
 * mech armor, cyan crane lights overhead.
 */

export interface CharacterProfile {
  slug: string;             // file slug (kebab case)
  callsign: string;         // public name
  rank: 'commander' | 'supervisor' | 'dispatcher' | 'core' | 'expansion' | 'specialist';
  imagePath: string;        // /public/hawks/{slug}.png
  imageReady: boolean;      // false until Iller_Ang renders production art
  visualDescription: string; // Iller_Ang prompt seed
  gear: string[];
  catchphrase: string;
  signatureColor: string;   // hex
}

/* ── Command tier ── */

export const COMMAND_PROFILES: CharacterProfile[] = [
  {
    slug: 'general-ang',
    callsign: 'General_Ang',
    rank: 'supervisor',
    imagePath: '/hawks/general-ang.png',
    imageReady: true,
    visualDescription:
      'Boomer_Ang in a tan tactical coat with brass-button collar, full black helmet visor obscuring face, "ANG" patch on chest, arms crossed in command stance, flanked by ANG operatives in matching tan suits, against a sunset-orange wall, illustrated comic-book style.',
    gear: ['Tan command coat', 'Black helmet visor', 'ANG chest patch', 'Doctrine ledger'],
    catchphrase: 'Every mission gets logged. Every move gets measured.',
    signatureColor: '#F97316',
  },
  {
    slug: 'chicken-hawk',
    callsign: 'Chicken_Hawk',
    rank: 'dispatcher',
    imagePath: '/hawks/chicken-hawk.png',
    imageReady: true,
    visualDescription:
      'Massive golden-armored mech with mechanical eagle wings spread wide, glowing orange chest core, hawk-beak helmet, standing on a steel platform at a working port at night, A.I.M.S. shipping containers stacked behind, cyan crane lights overhead, rain streaks, dramatic sci-fi cinematic.',
    gear: ['Golden mech armor', 'Mechanical wings', 'Chest reactor core', 'Mission HUD gauntlet'],
    catchphrase: 'No job too big. No job too small.',
    signatureColor: '#F5A623',
  },
];

/* ── 17-Hawk fleet ── */

export const HAWK_PROFILES: CharacterProfile[] = [
  // ═══ CORE ═══
  {
    slug: 'lil_guard_hawk',
    callsign: 'Lil_Guard_Hawk',
    rank: 'core',
    imagePath: '/hawks/lil_guard_hawk.png',
    imageReady: true,
    visualDescription:
      'Chibi armored hawk in red tactical vest with riot shield, yellow hard hat, fierce eyes, perched on an A.I.M.S. shipping container at a port, illustrated cartoon style with cinematic lighting.',
    gear: ['Riot shield', 'Yellow hard hat', 'Red tactical vest', 'Robots.txt scroll'],
    catchphrase: 'You shall not pass — until I check the rules.',
    signatureColor: '#FF4444',
  },
  {
    slug: 'lil_scrapp_hawk',
    callsign: 'Lil_Scrapp_Hawk',
    rank: 'core',
    imagePath: '/hawks/lil_scrapp_hawk.png',
    imageReady: true,
    visualDescription:
      'Chibi armored hawk with green chest core glowing, jetpack on back, captain stripes on shoulders (Squad Lead), fierce determined expression, holding a tactical tablet, port background at night.',
    gear: ['Squad Lead stripes', 'Jetpack', 'Tactical tablet', 'Async comm rig'],
    catchphrase: 'Squad up. Move fast. Bring it home.',
    signatureColor: '#00E676',
  },
  {
    slug: 'lil_parse_hawk',
    callsign: 'Lil_Parse_Hawk',
    rank: 'core',
    imagePath: '/hawks/lil_parse_hawk.png',
    imageReady: true,
    visualDescription:
      'Chibi hawk wearing rectangular blue analyst glasses, holding a glowing document scanner, surrounded by holographic markdown text, gentle blue glow, port at night.',
    gear: ['Analyst glasses', 'Document scanner', 'Markdown wand'],
    catchphrase: 'Title, meta, body. Clean as it comes.',
    signatureColor: '#448AFF',
  },
  {
    slug: 'lil_crawl_hawk',
    callsign: 'Lil_Crawl_Hawk',
    rank: 'core',
    imagePath: '/hawks/lil_crawl_hawk.png',
    imageReady: true,
    visualDescription:
      'Chibi hawk with eight mechanical spider-leg attachments, amber visor, climbing on a wireframe globe of links, golden trail of URLs behind, port background.',
    gear: ['Spider-leg climbers', 'URL trail beacon', 'Frontier map'],
    catchphrase: 'Every link. Every page. No corner missed.',
    signatureColor: '#FFAB00',
  },
  {
    slug: 'lil_snap_hawk',
    callsign: 'Lil_Snap_Hawk',
    rank: 'core',
    imagePath: '/hawks/lil_snap_hawk.png',
    imageReady: true,
    visualDescription:
      'Chibi hawk holding a futuristic camera with magenta lens flare, photographer vest, beret, capturing a glowing screenshot, neon magenta accents, port at night.',
    gear: ['Holo-camera', 'Photographer beret', 'Screenshot wand'],
    catchphrase: 'Picture or it never loaded.',
    signatureColor: '#E040FB',
  },
  {
    slug: 'lil_store_hawk',
    callsign: 'Lil_Store_Hawk',
    rank: 'core',
    imagePath: '/hawks/lil_store_hawk.png',
    imageReady: true,
    visualDescription:
      'Chibi hawk standing in front of a glowing cyan vault filled with data crystals, archivist smock, ledger in hand, organized rows of A.I.M.S. containers behind.',
    gear: ['Cyan data vault', 'Archivist smock', 'Hash ledger'],
    catchphrase: 'Stored. Hashed. Indexed. Find it twice.',
    signatureColor: '#00BCD4',
  },

  // ═══ EXPANSION ═══
  {
    slug: 'lil_extract_hawk',
    callsign: 'Lil_Extract_Hawk',
    rank: 'expansion',
    imagePath: '/hawks/lil_extract_hawk.png',
    imageReady: true,
    visualDescription:
      'Chibi hawk with sniper-style targeting visor, surgical extraction gloves, holding tweezers that pull glowing fields out of a holographic page, orange accents, port at night.',
    gear: ['Targeting visor', 'Surgical gloves', 'Field tweezers'],
    catchphrase: 'CSS, XPath, regex — pick your weapon.',
    signatureColor: '#FF9100',
  },
  {
    slug: 'lil_feed_hawk',
    callsign: 'Lil_Feed_Hawk',
    rank: 'expansion',
    imagePath: '/hawks/lil_feed_hawk.png',
    imageReady: true,
    visualDescription:
      'Chibi hawk holding an antenna dish with green RSS bars radiating outward, dispatcher headset, news ticker scrolling around, port background.',
    gear: ['RSS antenna', 'Dispatcher headset', 'Feed ticker'],
    catchphrase: 'Atom, RSS, JSON Feed — I speak them all.',
    signatureColor: '#76FF03',
  },
  {
    slug: 'lil_diff_hawk',
    callsign: 'Lil_Diff_Hawk',
    rank: 'expansion',
    imagePath: '/hawks/lil_diff_hawk.png',
    imageReady: true,
    visualDescription:
      'Chibi hawk holding two hash tablets glowing orange, magnifying glass over a unified diff, alert bell on belt, focused stare, port background.',
    gear: ['Hash tablets', 'Diff magnifier', 'Alert bell'],
    catchphrase: 'It changed. I noticed. You\'ll know.',
    signatureColor: '#FF6D00',
  },
  {
    slug: 'lil_clean_hawk',
    callsign: 'Lil_Clean_Hawk',
    rank: 'expansion',
    imagePath: '/hawks/lil_clean_hawk.png',
    imageReady: true,
    visualDescription:
      'Chibi hawk in white lab coat with light-green broom and squeegee, sweeping away ad banners and cookie popups, gleaming clean text behind, port background.',
    gear: ['Lab coat', 'Boilerplate broom', 'Quality scorecard'],
    catchphrase: 'Boilerplate out. Signal in.',
    signatureColor: '#B2FF59',
  },
  {
    slug: 'lil_api_hawk',
    callsign: 'Lil_API_Hawk',
    rank: 'expansion',
    imagePath: '/hawks/lil_api_hawk.png',
    imageReady: true,
    visualDescription:
      'Chibi hawk with hacker hoodie in violet, holding a key card with bearer token glow, REST endpoints orbiting around like planets, port at night.',
    gear: ['Hacker hoodie', 'Bearer key card', 'Pagination rig'],
    catchphrase: 'Endpoint. Auth. Page through. Done.',
    signatureColor: '#7C4DFF',
  },
  {
    slug: 'lil_queue_hawk',
    callsign: 'Lil_Queue_Hawk',
    rank: 'expansion',
    imagePath: '/hawks/lil_queue_hawk.png',
    imageReady: true,
    visualDescription:
      'Chibi hawk traffic controller with cyan glow sticks, conveyor belt of glowing job tokens behind, hard hat with priority chevrons, port background.',
    gear: ['Glow sticks', 'Priority chevrons', 'Job conveyor'],
    catchphrase: 'P0 first. Retry on three. Never drop a job.',
    signatureColor: '#18FFFF',
  },

  // ═══ SPECIALIST ═══
  {
    slug: 'lil_sitemap_hawk',
    callsign: 'Lil_Sitemap_Hawk',
    rank: 'specialist',
    imagePath: '/hawks/lil_sitemap_hawk.png',
    imageReady: true,
    visualDescription:
      'Chibi hawk cartographer with rolled XML sitemap scroll, amber explorer hat, holding a compass that points to glowing URLs, port + warehouse map background.',
    gear: ['Sitemap scroll', 'Explorer hat', 'URL compass'],
    catchphrase: 'I read the map before I take the road.',
    signatureColor: '#FFC107',
  },
  {
    slug: 'lil_stealth_hawk',
    callsign: 'Lil_Stealth_Hawk',
    rank: 'specialist',
    imagePath: '/hawks/lil_stealth_hawk.png',
    imageReady: true,
    visualDescription:
      'Chibi hawk in dark gray ninja outfit, smoke-bomb effect at feet, four ghost-fingerprint silhouettes orbiting (browser profiles), tactical mask, port at night.',
    gear: ['Ninja gi', 'Smoke pellets', 'Fingerprint ring'],
    catchphrase: 'Walk in like Chrome. Walk out like nobody.',
    signatureColor: '#607D8B',
  },
  {
    slug: 'lil_schema_hawk',
    callsign: 'Lil_Schema_Hawk',
    rank: 'specialist',
    imagePath: '/hawks/lil_schema_hawk.png',
    imageReady: true,
    visualDescription:
      'Chibi hawk geneticist holding a glowing pink JSON-LD double helix, lab coat with @schema badge, microdata circuits floating around, port lab background.',
    gear: ['Lab coat', 'JSON-LD helix', '@schema badge'],
    catchphrase: 'JSON-LD, microdata, RDFa, OG — I read the bones.',
    signatureColor: '#E91E63',
  },
  {
    slug: 'lil_pipe_hawk',
    callsign: 'Lil_Pipe_Hawk',
    rank: 'specialist',
    imagePath: '/hawks/lil_pipe_hawk.png',
    imageReady: true,
    visualDescription:
      'Chibi hawk plumber with brown overalls, wrench in hand, copper ETL pipes stretching behind transforming JSON shapes mid-flow, port factory background.',
    gear: ['Brown overalls', 'ETL wrench', 'Pipe diagram'],
    catchphrase: 'Map. Filter. Coerce. Ship it clean.',
    signatureColor: '#795548',
  },
  {
    slug: 'lil_sched_hawk',
    callsign: 'Lil_Sched_Hawk',
    rank: 'specialist',
    imagePath: '/hawks/lil_sched_hawk.png',
    imageReady: true,
    visualDescription:
      'Chibi hawk in railway conductor outfit with purple cap, holding a stopwatch and clipboard with cron schedule, station-clock glow behind, port background.',
    gear: ['Conductor cap', 'Stopwatch', 'Cron clipboard'],
    catchphrase: 'On schedule. On time. Every six hours.',
    signatureColor: '#9C27B0',
  },
];

export const ALL_PROFILES = [...COMMAND_PROFILES, ...HAWK_PROFILES];

export function getProfile(slug: string): CharacterProfile | undefined {
  return ALL_PROFILES.find((p) => p.slug === slug);
}

export function getHawkBySlug(slug: string): CharacterProfile | undefined {
  return HAWK_PROFILES.find((p) => p.slug === slug);
}
