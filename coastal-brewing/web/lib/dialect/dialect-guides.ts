/**
 * Coastal Brewing — local dialect entrypoint (deploy stub).
 *
 * The CANONICAL dialect / voice / sponsorship library lives at
 * `~/foai/aims-tools/voice-library` (`@aims/voice-library`).
 *
 * This file is INTENTIONALLY a stub right now. The Coastal Next.js Docker
 * build context only includes `coastal-brewing/web/` — sibling packages
 * outside that context don't resolve at build time. Three follow-up
 * options to wire the real shared library through:
 *   1. Move `@aims/voice-library` into the docker build context (vendor)
 *   2. Bump the docker build context to a parent dir + adjust Dockerfile COPYs
 *   3. Publish `@aims/voice-library` to a private registry and depend on it
 *
 * Until one of those lands, the storefront does not import from the
 * shared library. The cast still lives canonically in
 * `@aims/voice-library/dialect` — code that needs the data (voice-carousel
 * UI, sponsor-read engine, etc.) wires its own resolution path at the
 * time it ships.
 *
 *   Owner directive 2026-04-29: "Nothing is new, only referenced." The
 *   shared library is the single source; this file is the deploy handle.
 */

export interface VoiceCarouselEntry {
  cast_id: string;
  display_name: string;
  gender: 'M' | 'F';
  register: string;
  one_line_intro: string;
}

export const COASTAL_VOICE_CAROUSEL: VoiceCarouselEntry[] = [];
