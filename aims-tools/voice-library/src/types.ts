/**
 * @aims/voice-library — shared types
 *
 * Load-bearing policy lives at `feedback_attestation_not_ingestion_policing.md`:
 * we DO NOT pre-verify identity claims on voice references. Every VoiceAsset
 * can be ingested freely. Compliance is enforced at PRODUCTION time when a
 * user renders content using the asset — the user attests they have rights,
 * and that attestation is persisted.
 */

// ─── Ingestion ────────────────────────────────────────────────────────

/** Where a reference audio sample came from. Informational only — not a rights claim. */
export type IngestSource =
  | { kind: 'user-upload'; userId: string }
  | { kind: 'brave-discovery'; query: string; url: string }
  | { kind: 'sqwaadrun-scrape'; missionId: string; url: string }
  | { kind: 'direct-url'; url: string };

export interface RawSample {
  /** UUID v4. Generated at ingest time. */
  id: string;
  /** Ownership scope: which user uploaded/discovered this sample. */
  ownerId: string;
  /** GCS or Puter URI for the audio bytes. */
  storageUri: string;
  /** Duration in milliseconds. */
  durationMs: number;
  /** Codec / container (e.g., "audio/mpeg", "audio/wav", "audio/ogg"). */
  mimeType: string;
  /** Provenance — where it came from. Not a rights attestation. */
  source: IngestSource;
  /** Optional free-form label the uploader gave. Informational only. */
  label?: string;
  /** ISO timestamp of ingest. */
  ingestedAt: string;
}

// ─── Cloning ──────────────────────────────────────────────────────────

export type CloneProvider = 'async' | 'chirp-3-hd';

export interface CloneRequest {
  /** Which raw sample(s) to base the clone on. Async: 1 is enough. Chirp: expects ≥20 min total. */
  sampleIds: string[];
  provider: CloneProvider;
  /** Human-readable label for the resulting voice. */
  label: string;
  /** Ownership scope — which user owns the resulting voice asset. */
  ownerId: string;
}

export interface Clone {
  id: string;
  ownerId: string;
  provider: CloneProvider;
  /** Provider-side voice identifier (Async voice_id, Chirp custom voice id, etc.). */
  providerVoiceId: string;
  /** Raw samples this clone was trained from. */
  sourceSampleIds: string[];
  label: string;
  createdAt: string;
}

// ─── Alteration (optional, creative — not a legal gate) ────────────────

export interface AlterOptions {
  /** Pitch shift in semitones. Range [-12, 12]. */
  pitchSemitones?: number;
  /** Formant shift factor. Range [0.7, 1.4] — 1.0 = no change. */
  formantFactor?: number;
  /** Tempo stretch. Range [0.8, 1.2] — 1.0 = no change. */
  tempoFactor?: number;
  /** Blend with another clone at this weight (0–1). Creative, not compliance. */
  blendWithCloneId?: string;
  blendWeight?: number;
}

export interface Derivative {
  id: string;
  ownerId: string;
  parentCloneId: string;
  alterOptions: AlterOptions;
  /** Provider-side voice identifier for the derivative (if the provider supports it). */
  providerVoiceId: string;
  label: string;
  createdAt: string;
}

// ─── Attestation (the compliance layer) ───────────────────────────────

export type AttestationType =
  /** "This voice is mine." */
  | 'own'
  /** "I have documented rights or consent to use this voice." */
  | 'rights'
  /** "My use constitutes fair use under applicable law." */
  | 'fair-use';

/** The thing the user is about to use. */
export type AttestationSubject =
  | { kind: 'voice'; assetId: string; assetType: 'clone' | 'derivative' | 'raw-sample' }
  | { kind: 'face'; assetId: string }
  | { kind: 'nil'; personName: string; context: string };

/** A single attestation event. Written to Neon `attestation_records`. */
export interface AttestationRecord {
  id: string;
  userId: string;
  subject: AttestationSubject;
  attestationType: AttestationType;
  /** The output job this attestation gated. */
  outputJobId: string;
  /** Inbound request metadata — IP, UA for audit. */
  requestMeta: {
    ip?: string;
    userAgent?: string;
  };
  /** ISO timestamp. Server-generated, not user-provided. */
  timestamp: string;
  /** The full, verbatim text the user clicked "Agree" on. Immutable. */
  attestationTextVersion: string;
  attestationText: string;
}

// ─── Production request (the gated surface) ───────────────────────────

export interface RenderRequest {
  userId: string;
  subject: AttestationSubject;
  /** Must be present — no render fires without an attestation record. */
  attestationId: string;
  /** Forward-only — the render payload (transcript, scene spec, etc.). */
  payload: Record<string, unknown>;
}

// ─── Registry (character → voice mapping) ─────────────────────────────

export interface CharacterVoiceEntry {
  characterId: string;
  /** Human-readable name (ACHEEVY, Bun-E, Void-Caster, etc.). */
  characterName: string;
  /**
   * Voice resolution. Preferred order:
   *  1. `geminiVoiceName` (Gemini 3.1 Flash HD preset, e.g. "Sadachbia")
   *  2. `derivativeId` (altered clone)
   *  3. `cloneId` (raw clone via Async or Chirp)
   */
  geminiVoiceName?: string;
  derivativeId?: string;
  cloneId?: string;
  /** Character directorial notes for Gemini prompt builder. */
  directorialDefaults?: {
    audioProfile?: string;
    sceneHint?: string;
    directorNotes?: string;
  };
}
