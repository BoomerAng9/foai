/**
 * @aims/voice-library
 *
 * The ecosystem-wide voice + dialect + sponsorship library.
 *
 * KEY POLICY: ingestion is unfiltered. Compliance enforced at PRODUCTION
 * via user attestation. See `feedback_attestation_not_ingestion_policing.md`.
 *
 * Layered architecture (load-bearing):
 *   Layer 3 — Persona               (dialect/dialect-guides.ts → DialectGuide)
 *   Layer 2 — Dialect script        (dialect/dialect-guides.ts → applyDialect)
 *   Layer 1 — Voice timbre          (registry/character-voices.ts → CharacterVoiceEntry)
 *
 * Cross-pollination layer:
 *   Sponsorship (sponsorship/plug-engine.ts) — every character can plug
 *   every brand in their own register. Per|Form's Void-Caster reads a
 *   Coastal Sumatra spot in his Belter Creole; Smoke does the same in
 *   Houston Southern. The ecosystem's economic loop.
 *
 * Submodules:
 *   - ./types          — RawSample, Clone, Derivative, Attestation, CharacterVoiceEntry
 *   - ./attestation    — record + require, with Neon DDL (compliance gate)
 *   - ./dialect        — DialectGuide registry + applyDialect + getDialectPromptRules
 *   - ./registry       — character → voice resolution
 *   - ./sponsorship    — cross-vertical brand directory + plug engine
 *
 * Pipeline submodules (orchestrator interfaces; per-provider adapters
 * register at runtime — see PIPELINE.md for the full design):
 *   - ./ingest         — Brave discovery, Sqwaadrun scrape, user upload
 *   - ./clone          — Gemini Live (preferred), Async (volume), Chirp 3 HD (premium)
 *   - ./alter          — pitch / formant / tempo / blend (creative, not a gate)
 *   - ./storage        — SmelterOS (Puter metadata + GCS bytes)
 */

export * from './types.js';

// Pipeline orchestrators (Stage 1-4 — per-provider adapters register at runtime)
export type { IngestRequest, IngestAdapter } from './ingest/index.js';
export { registerIngestAdapter, getIngestAdapter, ingest } from './ingest/index.js';

export type { CloneAdapter } from './clone/index.js';
export { registerCloneAdapter, getCloneAdapter, cloneVoice } from './clone/index.js';

export type { AlterRequest, AlterAdapter } from './alter/index.js';
export { registerAlterAdapter, getAlterAdapter, alterVoice } from './alter/index.js';

export type { StorageAdapter } from './storage/index.js';
export { setStorageAdapter, getStorageAdapter } from './storage/index.js';

// Attestation (compliance gate)
export {
  recordAttestation,
  requireAttestation,
  AttestationRequiredError,
  ATTESTATION_TEXT_V1,
  ATTESTATION_TEXT_VERSION,
  ATTESTATION_RECORDS_DDL,
} from './attestation/index.js';

// Dialect (script layer — character → vocabulary swaps + persona rules)
export type { DialectGuide, VoiceCarouselEntry } from './dialect/index.js';
export {
  COASTAL_DIALECT_GUIDES,
  DIALECT_REGISTRY,
  applyDialect,
  getDialectGuide,
  getDialectPromptRules,
  getDialectsByVertical,
  getVoiceCarousel,
  getRegisterPairs,
} from './dialect/index.js';

// Registry (voice timbre layer — character → Gemini voice / clone)
export {
  COASTAL_VOICE_REGISTRY,
  VOICE_REGISTRY,
  getCharacterVoice,
  listCharacterVoices,
} from './registry/index.js';

// Sponsorship (cross-pollination — any character × any brand)
export type { BrandIdentity, ProductSku, PlugFormat, PlugRequest, PlugScript } from './sponsorship/index.js';
export {
  COASTAL_BRAND,
  PERFORM_BRAND,
  ACHIEVEMOR_BRAND,
  BRAND_REGISTRY,
  COASTAL_SKUS,
  SKU_REGISTRY,
  getBrand,
  getSku,
  getSkusByBrand,
  PlugError,
  generatePlug,
  generateAllSponsorReads,
} from './sponsorship/index.js';
