/**
 * Attestation — the single compliance surface.
 *
 * Per `feedback_attestation_not_ingestion_policing.md`, compliance lives at
 * the PRODUCTION layer (when a user renders content using a voice/face/NIL
 * asset), NOT at the ingestion layer. This module is the gate.
 *
 * Two things it does:
 *
 *   1. `recordAttestation(…)` — write a user's click-through to the
 *      Neon `attestation_records` table. Returns the record id.
 *   2. `requireAttestation(attestationId, expectedSubject)` — called by
 *      any render endpoint. Confirms the record exists, the subject
 *      matches, and it was recorded recently enough to be meaningful.
 *      If the check fails, the render must refuse.
 *
 * No gate on ingest, clone, alter. Only here, only on render.
 */

import type {
  AttestationRecord,
  AttestationSubject,
  AttestationType,
} from '../types.js';

/** Canonical attestation text. Versioned — bump when legal language changes. */
export const ATTESTATION_TEXT_V1 = `
By clicking Attest & Generate, I affirm that at least one of the
following is true:

  (a) This voice, face, or likeness is my own; OR
  (b) I have documented rights or consent to use it; OR
  (c) My use of it constitutes fair use under applicable law.

I understand that The Deploy Platform is not liable for my use of
this content and that I am the responsible party. I further
understand that The Deploy Platform will honor takedown requests
from rights-holders and that misrepresentation here may result in
account termination and referral to law enforcement.
`.trim();

export const ATTESTATION_TEXT_VERSION = 'v1.2026-04-16';

// ─── Record (write path) ───────────────────────────────────────────────

export interface RecordAttestationInput {
  userId: string;
  subject: AttestationSubject;
  attestationType: AttestationType;
  outputJobId: string;
  requestMeta: AttestationRecord['requestMeta'];
  /** Injected — typically the Neon postgres client. */
  sql: <T = unknown>(strings: TemplateStringsArray, ...values: unknown[]) => Promise<T[]>;
}

export async function recordAttestation(
  input: RecordAttestationInput,
): Promise<string> {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  await input.sql`
    INSERT INTO attestation_records (
      id, user_id, subject_kind, subject_ref, attestation_type,
      output_job_id, request_ip, request_user_agent,
      attestation_text_version, attestation_text, created_at
    ) VALUES (
      ${id},
      ${input.userId},
      ${input.subject.kind},
      ${JSON.stringify(input.subject)},
      ${input.attestationType},
      ${input.outputJobId},
      ${input.requestMeta.ip ?? null},
      ${input.requestMeta.userAgent ?? null},
      ${ATTESTATION_TEXT_VERSION},
      ${ATTESTATION_TEXT_V1},
      ${timestamp}
    )
  `;

  return id;
}

// ─── Require (read/gate path) ──────────────────────────────────────────

export class AttestationRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttestationRequiredError';
  }
}

export interface RequireAttestationInput {
  attestationId: string;
  expectedSubject: AttestationSubject;
  /** Max age in ms that an attestation is valid for. Default 30 min. */
  maxAgeMs?: number;
  sql: <T = unknown>(strings: TemplateStringsArray, ...values: unknown[]) => Promise<T[]>;
}

export async function requireAttestation(
  input: RequireAttestationInput,
): Promise<AttestationRecord> {
  const rows = await input.sql<{
    id: string;
    user_id: string;
    subject_kind: string;
    subject_ref: string;
    attestation_type: string;
    output_job_id: string;
    request_ip: string | null;
    request_user_agent: string | null;
    attestation_text_version: string;
    attestation_text: string;
    created_at: string;
  }>`
    SELECT * FROM attestation_records WHERE id = ${input.attestationId} LIMIT 1
  `;

  const row = rows[0];
  if (!row) {
    throw new AttestationRequiredError('attestation record not found');
  }

  // Subject match — the attestation must be for the thing we're actually rendering.
  const subject = JSON.parse(row.subject_ref) as AttestationSubject;
  if (!subjectsMatch(subject, input.expectedSubject)) {
    throw new AttestationRequiredError(
      'attestation subject does not match render subject',
    );
  }

  // Age check — stale attestations are not reusable.
  const maxAgeMs = input.maxAgeMs ?? 30 * 60 * 1000;
  const ageMs = Date.now() - new Date(row.created_at).getTime();
  if (ageMs > maxAgeMs) {
    throw new AttestationRequiredError(
      `attestation is ${Math.round(ageMs / 60000)} minutes old; max ${Math.round(maxAgeMs / 60000)}`,
    );
  }

  return {
    id: row.id,
    userId: row.user_id,
    subject,
    attestationType: row.attestation_type as AttestationType,
    outputJobId: row.output_job_id,
    requestMeta: {
      ip: row.request_ip ?? undefined,
      userAgent: row.request_user_agent ?? undefined,
    },
    timestamp: row.created_at,
    attestationTextVersion: row.attestation_text_version,
    attestationText: row.attestation_text,
  };
}

function subjectsMatch(a: AttestationSubject, b: AttestationSubject): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'voice' && b.kind === 'voice') {
    return a.assetId === b.assetId && a.assetType === b.assetType;
  }
  if (a.kind === 'face' && b.kind === 'face') {
    return a.assetId === b.assetId;
  }
  if (a.kind === 'nil' && b.kind === 'nil') {
    return a.personName === b.personName && a.context === b.context;
  }
  return false;
}

// ─── Neon schema (run once) ────────────────────────────────────────────

/** DDL for the attestation_records table. Run in a migration. */
export const ATTESTATION_RECORDS_DDL = `
CREATE TABLE IF NOT EXISTS attestation_records (
  id                        TEXT PRIMARY KEY,
  user_id                   TEXT NOT NULL,
  subject_kind              TEXT NOT NULL CHECK (subject_kind IN ('voice', 'face', 'nil')),
  subject_ref               JSONB NOT NULL,
  attestation_type          TEXT NOT NULL CHECK (attestation_type IN ('own', 'rights', 'fair-use')),
  output_job_id             TEXT NOT NULL,
  request_ip                TEXT,
  request_user_agent        TEXT,
  attestation_text_version  TEXT NOT NULL,
  attestation_text          TEXT NOT NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS attestation_records_user_idx
  ON attestation_records (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS attestation_records_subject_idx
  ON attestation_records (subject_kind, (subject_ref->>'assetId'));
`;
