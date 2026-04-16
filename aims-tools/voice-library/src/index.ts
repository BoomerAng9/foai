/**
 * @aims/voice-library
 *
 * Voice reference → clone → (optional) alter → store pipeline.
 *
 * KEY POLICY: ingestion is unfiltered. Compliance enforced at PRODUCTION
 * via user attestation. See `feedback_attestation_not_ingestion_policing.md`.
 *
 * Phase 1 (this package's scope):
 *   - Types for raw samples, clones, derivatives, attestations, registry
 *   - Attestation module (record + require, with Neon DDL)
 *
 * Phase 2 (follow-up files to be added):
 *   - Ingestion adapters: Brave discovery, Sqwaadrun scrape, user upload
 *   - Clone adapters: Async (async.com), Vertex AI Chirp 3 HD Custom Voice
 *   - Alteration helpers: pitch/formant/tempo/blend (creative, not a gate)
 *   - Storage: SmelterOS filesystem (Puter metadata + GCS bytes)
 *   - Character voice registry: ACHEEVY=Sadachbia, Bun-E=Vindemiatrix, …
 */

export * from './types.js';
export {
  recordAttestation,
  requireAttestation,
  AttestationRequiredError,
  ATTESTATION_TEXT_V1,
  ATTESTATION_TEXT_VERSION,
  ATTESTATION_RECORDS_DDL,
} from './attestation/index.js';
