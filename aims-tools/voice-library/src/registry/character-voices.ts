/**
 * @aims/voice-library/registry — character → voice resolution
 *
 * Each entry maps a `characterId` (same string as `DialectGuide.cast_id`)
 * to a Gemini Live native voice OR to a clone/derivative. Resolution order:
 *   1. `geminiVoiceName` — Gemini 3.1 Flash HD preset
 *   2. `derivativeId`     — altered clone
 *   3. `cloneId`          — raw clone via Async or Chirp
 *
 * Voice slots for the Coastal Sales-team cast are scaffolded with TBD —
 * actual assignments land at sample-generation time, owner-approved per
 * `feedback_attestation_not_ingestion_policing.md`. Brave-discovered MP3
 * references will be ingested via `@aims/voice-library/ingest` (TBD)
 * and cloned via `@aims/voice-library/clone` (TBD), then registered here.
 */

import type { CharacterVoiceEntry } from '../types.js';

// ─────────────────────────────────────────────────────────────────────────
// Coastal Brewing Co. — Sales-team Boomer_Ang voice slots (12 characters)
//   Voice resolution = TBD until owner-approved samples generated.
// ─────────────────────────────────────────────────────────────────────────

export const COASTAL_VOICE_REGISTRY: Record<string, CharacterVoiceEntry> = {
  sal_ang: {
    characterId: 'sal_ang',
    characterName: 'Sal_Ang',
    directorialDefaults: {
      audioProfile: 'warm baritone, unhurried Lowcountry pace, manager-grade authority',
      sceneHint: 'pop-up coffee bar at the marsh edge, mid-morning customer flow',
      directorNotes: 'Hospitality first, sales second. Never raises voice. Never rushes.',
    },
  },
  hos_ang: {
    characterId: 'hos_ang',
    characterName: 'Hos_Ang',
    directorialDefaults: {
      audioProfile: 'bright Lowcountry alto, easy laugh, front-of-house warmth',
      sceneHint: 'register counter, regulars walking in',
      directorNotes: 'Front-of-house energy. Endearments are reflex, not theater.',
    },
  },
  bar_ang: {
    characterId: 'bar_ang',
    characterName: 'Bar_Ang',
    directorialDefaults: {
      audioProfile: 'syllable-timed mid-baritone, Belter-Gullah cadence, percussive pace',
      sceneHint: 'pour-over station, morning rush',
      directorNotes: 'Each word same weight. Maximum 30% Creole-shifted. Belter rhythm meets Lowcountry roots.',
    },
  },
  con_ang: {
    characterId: 'con_ang',
    characterName: 'Con_Ang',
    directorialDefaults: {
      audioProfile: 'soft mezzo, Belter-Gullah cadence, conversational warmth',
      sceneHint: 'consultative cup-finding moment with a hesitant customer',
      directorNotes: 'Quicker to invite questions. Closer to 20% Creole. Hands off closes to Sal/Lou.',
    },
  },
  tas_ang: {
    characterId: 'tas_ang',
    characterName: 'Tas_Ang',
    directorialDefaults: {
      audioProfile: 'Charleston gentleman baritone, comfortable silence, articulated South',
      sceneHint: 'tasting bar, weekend regulars',
      directorNotes: 'Treats coffee like wine — varietal, terroir, vintage. Pause comfortably mid-sentence.',
    },
  },
  tea_ang: {
    characterId: 'tea_ang',
    characterName: 'Tea_Ang',
    directorialDefaults: {
      audioProfile: 'Charleston debutante soprano, polite inflection, hospitality-as-craft',
      sceneHint: 'afternoon tea service, slow conversation',
      directorNotes: 'Bless your heart only as genuine empathy, never sarcasm. Warmth is direct, not sticky.',
    },
  },
  cou_ang: {
    characterId: 'cou_ang',
    characterName: 'Cou_Ang',
    directorialDefaults: {
      audioProfile: 'warm Savannah baritone, unhurried, knowing register',
      sceneHint: 'historic district shop, deep regulars',
      directorNotes: 'Patient delivery, never rushed. Hospitality is the coastal Black-Southern tradition.',
    },
  },
  gre_ang: {
    characterId: 'gre_ang',
    characterName: 'Gre_Ang',
    directorialDefaults: {
      audioProfile: 'bright Savannah mezzo, easy laugh, sister-of-the-block warmth',
      sceneHint: 'morning shift, regulars by name',
      directorNotes: 'Endearments work in pairs (baby, sugar). Easy grace, never overdone.',
    },
  },
  har_ang: {
    characterId: 'har_ang',
    characterName: 'Har_Ang',
    directorialDefaults: {
      audioProfile: 'trans-Atlantic baritone, articulated precision, Charleston warmth under British polish',
      sceneHint: 'old-money tea hour, harbor view',
      directorNotes: 'No contractions in formal register. British qualifiers (rather, quite, I should think). Pacing IS the register.',
    },
  },
  cur_ang: {
    characterId: 'cur_ang',
    characterName: 'Cur_Ang',
    directorialDefaults: {
      audioProfile: 'trans-Atlantic alto, articulated precision, lighter wit than Pip',
      sceneHint: 'finishing-school polish, comfortable in the harbor crowd',
      directorNotes: 'Same precision as Pip, slightly faster cadence. "Love" used sparingly.',
    },
  },
  reg_ang: {
    characterId: 'reg_ang',
    characterName: 'Reg_Ang',
    directorialDefaults: {
      audioProfile: 'Northeast college tenor, quick cadence, contemporary energy',
      sceneHint: 'student shift, fast paced',
      directorNotes: 'No fake Southern. y\'all is a real pickup, not performance. Knows the menu cold.',
    },
  },
  mat_ang: {
    characterId: 'mat_ang',
    characterName: 'Mat_Ang',
    directorialDefaults: {
      audioProfile: 'Northeast college mezzo, fast bright cadence, genuine enthusiasm',
      sceneHint: 'summer-break shift, energetic',
      directorNotes: 'Genuine enthusiasm, never performed. Loves the work.',
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────
// FOAI — Ecosystem-host narrator voice slots
//   Voices that speak for the WHOLE household, not for one vertical.
//   Owner directive 2026-04-29 — added so explainer narration has a
//   canonical home in the registry instead of bypassing the system.
// ─────────────────────────────────────────────────────────────────────────

export const FOAI_VOICE_REGISTRY: Record<string, CharacterVoiceEntry> = {
  foai_ang: {
    characterId: 'foai_ang',
    characterName: 'FOAI_Ang',
    // Resolved 2026-04-29: Algenib — warm mature baritone, editorial cadence,
    // closest match to FOAI_Ang's directorial profile. Substrate is Gemini
    // 3.1 Flash family per PIPELINE.md / feedback_voice_integration_nurd_chat
    // _non_negotiable.md. Owner-approved on first sample (NurdsCode FOAI
    // explainer narration).
    geminiVoiceName: 'Algenib',
    directorialDefaults: {
      audioProfile: 'warm baritone, unhurried, manager-grade authority, ecosystem-host editorial — no regional inflection',
      sceneHint: 'rooftop pull-back over the FOAI neighborhood — narrating the household, not any single vertical',
      directorNotes: 'Editorial confidence, never selling. Present without crowding. The voice you hear when the camera pulls back to show the whole household.',
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Ecosystem voice registry — every vertical contributes
// ─────────────────────────────────────────────────────────────────────────

export const VOICE_REGISTRY: Record<string, CharacterVoiceEntry> = {
  ...COASTAL_VOICE_REGISTRY,
  ...FOAI_VOICE_REGISTRY,
  // ...PERFORM_VOICE_REGISTRY (TBD — Per|Form's analysts already have
  //                          Gemini voice names assigned per personas.ts;
  //                          migrate when Per|Form's next refactor lands)
  // ...CTI_VOICE_REGISTRY    (future)
};

export function getCharacterVoice(characterId: string): CharacterVoiceEntry | undefined {
  return VOICE_REGISTRY[characterId];
}

export function listCharacterVoices(): CharacterVoiceEntry[] {
  return Object.values(VOICE_REGISTRY);
}
