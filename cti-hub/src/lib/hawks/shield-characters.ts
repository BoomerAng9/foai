/**
 * ACHIEVEMOR Shield Division — Character Canon
 * =============================================
 * Visual descriptions, gear, and image slots for the 32 Shield Division
 * Hawks under Crypt_Ang's vCISO authority. Parallels
 * `./characters.ts` (Sqwaadrun fleet) but uses a cinematic tactical-realistic
 * aesthetic rather than chibi-cartoon, per the reference images
 * iCloudPhotos/IMG_2563(1).JPG, IMG_2565.JPG, IMG_0787.JPG.
 *
 * Brand reference (memory): project_shield_division_hawk_anatomy.md
 * Image destination: /public/hawks/shield/{slug}.png
 * Render script: scripts/iller-ang/render-shield-division.ts
 *
 * Every Hawk carries Spinner (weaponized boomerang) — NEVER a firearm.
 * Every Hawk has the DEPLOY chevron patch on the right shoulder.
 * A.I.M.S. chestplate is optional per-Hawk (present for all Gold & Platinum).
 * Eye patch is per-persona, NOT universal.
 *
 * Wave 1 lands the 5 Hawks that already have Semantic Constraint Profiles
 * (config/shield/hawks/). Subsequent waves fill the remaining 27.
 */

import type { CharacterProfile } from './characters';

/**
 * Shared brand DNA for the Shield Division. Appended to every prompt.
 * Differs from Sqwaadrun brand (port-at-night cartoon) — Shield Division
 * lives in a cinematic tactical-realistic key.
 */
export const SHIELD_BRAND_PROMPT =
  'Cinematic tactical-realistic character portrait, anthropomorphic eagle ' +
  'operator with brown and white tiger-stripe plumage, olive-drab tactical ' +
  'combat helmet with 3-tube night-vision mount (emerald green lenses), ' +
  'boom microphone across cheek, short whip antenna on right side of helmet, ' +
  'DEPLOY military chevron patch on right shoulder, Spinner weaponized ' +
  'boomerang holstered, tactical gloves, MOLLE plate carrier webbing, ' +
  'dramatic key lighting, industrial operations-bay background, smoke and ' +
  'atmospheric haze, illustrated digital painting style, square framing. ' +
  'NO firearms or blades of any kind.';

/**
 * Wave 1 — the 5 Hawks with landed Semantic Constraint Profiles.
 * Rank "specialist" across the board; squad information lives in the
 * visualDescription field (since CharacterProfile.rank is a closed union
 * and we do not modify it here).
 */
export const SHIELD_DIVISION_WAVE_1: CharacterProfile[] = [
  // ─── Black Squad ──────────────────────────────────────────────────────
  {
    slug: 'lil_scope_hawk',
    callsign: 'Reaper',
    rank: 'specialist',
    imagePath: '/hawks/shield/lil_scope_hawk.png',
    imageReady: true,
    visualDescription:
      'ACHIEVEMOR Shield Division — Black Squad — kinetic execution specialist. ' +
      'Matte-black and gunmetal accents over olive plate carrier. HUD-scope ' +
      'optical augmentation lens over right eye (reads as sniper optic, not a ' +
      'patch). A.I.M.S. silver chestplate in black-anodized finish with ' +
      'diagonal ridge pattern. Spinner weaponized boomerang mounted in ' +
      'quick-draw chest-rig across the chestplate. No armband. Steel-grey ' +
      'eyes, coiled predatory posture.',
    gear: [
      'Black-anodized A.I.M.S. chestplate',
      'HUD-scope right-eye augmentation',
      'Gunmetal MOLLE webbing',
      'Spinner quick-draw chest-rig',
    ],
    catchphrase: 'The target was decided before it showed up.',
    signatureColor: '#1A1A1A',
  },

  // ─── White Squad ──────────────────────────────────────────────────────
  {
    slug: 'lil_seal_hawk',
    callsign: 'Privacy',
    rank: 'specialist',
    imagePath: '/hawks/shield/lil_seal_hawk.png',
    imageReady: true,
    visualDescription:
      'ACHIEVEMOR Shield Division — White Squad — edge redaction specialist, ' +
      'formally verified kernel component. Clean white and polished-chrome ' +
      'accents on helmet trim and plate carrier webbing. Mirror-polished ' +
      'chrome A.I.M.S. chestplate with faint etched redaction-rune overlay ' +
      'pattern. ACHIEVEMOR checkmark seal emblem at chestplate center. ' +
      'Clean white armband on forearm. Spinner in low-key side holster. ' +
      'Ice-blue eyes. Composed, unflinching boundary-guardian posture. ' +
      'Cool-toned clean laboratory lighting.',
    gear: [
      'Mirror-chrome A.I.M.S. chestplate',
      'Etched redaction-rune overlay',
      'ACHIEVEMOR checkmark seal emblem',
      'White forearm armband',
      'Spinner side holster',
    ],
    catchphrase: 'Nothing passes that shouldn\'t.',
    signatureColor: '#F5F7FA',
  },

  // ─── Gold & Platinum Squad ────────────────────────────────────────────
  {
    slug: 'lil_mast_hawk',
    callsign: 'Halo',
    rank: 'specialist',
    imagePath: '/hawks/shield/lil_mast_hawk.png',
    imageReady: true,
    visualDescription:
      'ACHIEVEMOR Shield Division — Gold & Platinum Squad Lead — identity ' +
      'infrastructure and SAT co-signer. Platinum-textured helmet with a ' +
      'subtle luminous ring integrated along the top rim (the halo — ' +
      'present, not garish). Platinum-chrome A.I.M.S. chestplate with gold ' +
      'highlight accents on edge trim. ACHIEVEMOR checkmark crest at ' +
      'chestplate center in platinum texture. Platinum-textured DEPLOY ' +
      'chevron on right shoulder. Cryptographic co-signer glyph etched ' +
      'on right forearm. Spinner in platinum-finished chest bandolier. ' +
      'Gold eyes. Command-center architectural background with platinum ' +
      'column accents. Composed sentinel posture.',
    gear: [
      'Platinum helmet with luminous halo ring',
      'Platinum-chrome A.I.M.S. chestplate',
      'ACHIEVEMOR platinum checkmark crest',
      'Platinum DEPLOY chevron',
      'Cryptographic co-signer glyph forearm',
      'Platinum Spinner bandolier',
    ],
    catchphrase: 'I sign, or it does not ship.',
    signatureColor: '#E5E4E2',
  },

  {
    slug: 'lil_doubt_hawk',
    callsign: 'Paranoia',
    rank: 'specialist',
    imagePath: '/hawks/shield/lil_doubt_hawk.png',
    imageReady: true,
    visualDescription:
      'ACHIEVEMOR Shield Division — Gold & Platinum Squad — independent ' +
      'auditor, reports to ACHEEVY directly, NOT to Crypt_Ang. Platinum ' +
      'base palette with a single bright ACHEEVY-orange (#FF6B00) accent ' +
      'line across the top of the platinum-chrome A.I.M.S. chestplate — ' +
      'this orange line is the signature visual marker of the independent ' +
      'reporting override. Secondary small orange ACHIEVEMOR checkmark ' +
      'badge beside the main platinum crest. Platinum DEPLOY chevron on ' +
      'right shoulder. Extra small covert antenna on helmet (private ' +
      'comms to ACHEEVY). Amber eyes. Spinner in discreet side holster. ' +
      'Inverted mirror-axis stance compared to other Gold & Platinum Hawks. ' +
      'Shadowed independent-booth background.',
    gear: [
      'Platinum A.I.M.S. chestplate',
      'ACHEEVY-orange accent line across chestplate top',
      'Secondary orange ACHIEVEMOR badge',
      'Covert ACHEEVY comms antenna',
      'Discreet Spinner side holster',
    ],
    catchphrase: 'I watch the watchmen, including the one who pays me.',
    signatureColor: '#FF6B00',
  },

  {
    slug: 'lil_peel_hawk',
    callsign: 'Hex',
    rank: 'specialist',
    imagePath: '/hawks/shield/lil_peel_hawk.png',
    imageReady: true,
    visualDescription:
      'ACHIEVEMOR Shield Division — Gold & Platinum Squad — formal verifier ' +
      'and malware reverse-engineer, owns all five formally verified kernel ' +
      'components. Specialized multi-lens helmet augmentation with a 5-lens ' +
      'reverse-engineering cluster beyond standard 3-tube NVG. Platinum ' +
      'A.I.M.S. chestplate with faint etched mathematical proof-obligation ' +
      'glyphs (Kani and Prusti sigils, a universal-quantifier symbol, a ' +
      'subtle Rust crate mark). Belt tool-rig with reverse-engineering ' +
      'pouches replacing the standard forearm armband. Platinum DEPLOY ' +
      'chevron. Spinner in side holster; secondary utility tool on opposite ' +
      'hip. Luminous cyan eyes in analytical mode. Workshop-laboratory ' +
      'background with proof-chain visualizations in cyan light.',
    gear: [
      'Multi-lens reverse-engineering helmet cluster',
      'Platinum A.I.M.S. chestplate with proof-obligation glyphs',
      'Belt tool-rig with RE pouches',
      'Spinner side holster',
      'Secondary utility tool hip',
    ],
    catchphrase: 'It is not shipped until it is proven.',
    signatureColor: '#00FFFF',
  },
];

/**
 * Convenience: all Shield Division profiles landed so far.
 * Extend this as Waves 2-6 land their character files.
 */
export const ALL_SHIELD_DIVISION_PROFILES: CharacterProfile[] = [
  ...SHIELD_DIVISION_WAVE_1,
];
