/**
 * Coastal Brewing — local dialect entrypoint.
 *
 * The CANONICAL dialect / voice / sponsorship library lives at
 * `~/foai/aims-tools/voice-library` (`@aims/voice-library`) — it's the
 * ecosystem-shared module that Per|Form, Coastal, CTI, and future
 * verticals all draw from. This file is a thin re-export so the storefront
 * has a tidy local import path.
 *
 *   Owner directive 2026-04-29: "we have a ecosystem history, no need to
 *   start new... Nothing is new, only referenced."
 *
 *   Owner directive 2026-04-29: "we are building a library and index that
 *   feeds the ecosystem that Per|Form can use later or any other vertical."
 *
 * Bigger picture (per `aims-tools/voice-library/CATALOG.md`):
 *   - Coastal's 12 Sales-team Boomer_Angs are registered in
 *     `@aims/voice-library/dialect`
 *   - Per|Form's analysts can plug Coastal SKUs in their own register via
 *     `@aims/voice-library/sponsorship` (cross-pollination engine)
 *   - Voice cloning + Brave-MP3 ingestion + Gemini Live wire-up live in
 *     the same package's other submodules (TBD per the package's own roadmap)
 */

export {
  COASTAL_DIALECT_GUIDES,
  DIALECT_REGISTRY,
  applyDialect,
  getDialectGuide,
  getDialectPromptRules,
  getDialectsByVertical,
  getVoiceCarousel,
  getRegisterPairs,
} from '@aims/voice-library/dialect';

export type { DialectGuide, VoiceCarouselEntry } from '@aims/voice-library/dialect';

// Coastal-side convenience: only Coastal characters in the carousel.
import { getVoiceCarousel as _getVoiceCarousel } from '@aims/voice-library/dialect';
export const COASTAL_VOICE_CAROUSEL = _getVoiceCarousel('coastal');
