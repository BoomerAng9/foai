/**
 * @aims/forms — canonical types for the Form side of The Per|Form Platform.
 *
 * The `|` in Per|Form is a deliberate divider: Performance data on one side,
 * Form (paperwork, contracts, agreements, documents) on the other. This
 * package owns everything on the Form side.
 *
 * Every output that references a named person (athlete, agent, counterparty)
 * is attestation-gated at production layer per
 * `feedback_attestation_not_ingestion_policing.md`. That enforcement lives
 * in the review + delivery functions, not at intake.
 */

import { z } from 'zod';
import type { AttestationRecord, AttestationSubject } from '@aims/voice-library';

// ─── Form types (the universe of paperwork this package handles) ──────

export const FormTypeSchema = z.enum([
  'nil-contract',          // Name, Image, Likeness endorsement agreement
  'endorsement-agreement', // broader sponsorship / endorsement
  'agent-packet',          // athlete-agent representation agreement
  'eligibility-waiver',    // NCAA, NAIA, high-school eligibility forms
  'academic-transcript',   // transcript verification + credit transfer
  'medical-release',       // HIPAA releases, physical forms
  'insurance-form',        // team insurance, disability insurance apps
  'draft-declaration',     // pro draft entry paperwork
  'transfer-portal',       // NCAA transfer portal documents
  'compliance-disclosure', // booster / collective compliance disclosures
  'professional-services', // non-athlete professional services contracts
  'other',                 // catch-all — still gets processed
]);
export type FormType = z.infer<typeof FormTypeSchema>;

// ─── Intake — unfiltered, per the attestation-not-ingestion rule ──────

/** A raw form submitted by a user. No rights-verification at intake. */
export const FormSubmissionSchema = z.object({
  submissionId: z.string().uuid(),
  submitterId: z.string(),        // the Per|Form user (athlete / professional / their agent)
  formType: FormTypeSchema,
  /** GCS or Puter URI for the source file (PDF, image, docx). */
  sourceUri: z.string(),
  /** MIME type detected on upload. */
  mimeType: z.string(),
  /** Byte size — used for cost budgeting. */
  sizeBytes: z.number().int().nonnegative(),
  /** Free-form user-provided context: "review for fair market terms" etc. */
  intent: z.string().max(2000).optional(),
  /** Optional links to related Per-side data (player id, team, season). */
  perContext: z.object({
    playerId: z.string().optional(),
    teamId: z.string().optional(),
    season: z.string().optional(),
    sport: z.string().optional(),
  }).optional(),
  submittedAt: z.string(),
});
export type FormSubmission = z.infer<typeof FormSubmissionSchema>;

// ─── Parse — raw text + structured clauses ────────────────────────────

/** A single identified clause within a parsed document. */
export const ClauseSchema = z.object({
  clauseId: z.string(),
  /** Human-readable clause label: "Compensation," "Exclusivity," "Term," etc. */
  label: z.string(),
  /** Verbatim text of the clause. */
  text: z.string(),
  /** 1-based ordering within the document. */
  ordinal: z.number().int().positive(),
  /** Location hints for UI highlighting. */
  location: z.object({
    pageNumber: z.number().int().positive().optional(),
    startChar: z.number().int().nonnegative().optional(),
    endChar: z.number().int().nonnegative().optional(),
  }).optional(),
  /** Gemini's classification of what kind of clause this is. */
  classification: z.enum([
    'compensation',
    'exclusivity',
    'term',
    'termination',
    'morals',
    'ip-rights',
    'publicity-rights',
    'social-media',
    'conflict',
    'jurisdiction',
    'dispute-resolution',
    'audit',
    'confidentiality',
    'warranty',
    'indemnity',
    'assignment',
    'force-majeure',
    'amendment',
    'severability',
    'other',
  ]).optional(),
});
export type Clause = z.infer<typeof ClauseSchema>;

export const ParsedFormSchema = z.object({
  submissionId: z.string().uuid(),
  /** Full extracted text of the document (post-OCR if applicable). */
  text: z.string(),
  /** Structured clauses identified by the parser. */
  clauses: z.array(ClauseSchema),
  /** Key parties identified (athlete, brand, agent, school). */
  parties: z.array(z.object({
    name: z.string(),
    role: z.enum(['athlete', 'brand', 'agent', 'school', 'witness', 'guarantor', 'other']),
    isUser: z.boolean(),    // true if this party is the submitter
  })),
  /** Parsed money references for market-rate comparison. */
  compensation: z.object({
    baseAmount: z.number().optional(),
    currency: z.string().default('USD'),
    frequency: z.enum(['one-time', 'monthly', 'per-appearance', 'per-post', 'annual', 'other']).optional(),
    performanceBonuses: z.array(z.object({
      trigger: z.string(),
      amount: z.number(),
    })).optional(),
  }).optional(),
  /** Language + jurisdiction detected. */
  language: z.string().default('en'),
  jurisdiction: z.string().optional(),
  parsedAt: z.string(),
});
export type ParsedForm = z.infer<typeof ParsedFormSchema>;

// ─── Review — flagged clauses with rationale + market-rate context ────

export const ClauseReviewSchema = z.object({
  clauseId: z.string(),
  /** Green = market-standard; amber = unusual/worth reading; red = problematic. */
  flag: z.enum(['green', 'amber', 'red']),
  /** One-sentence explanation for the flag, written in plain English. */
  rationale: z.string(),
  /** Optional longer-form explanation for UI expand. */
  detail: z.string().optional(),
  /** Suggested alternative language (for amber / red flags). */
  suggestedRevision: z.string().optional(),
  /** Cross-reference to Per-side market-rate data (if available). */
  marketComparison: z.object({
    comparableCount: z.number().int().nonnegative(),
    userTermValue: z.number().optional(),
    marketMedian: z.number().optional(),
    marketPercentile: z.number().min(0).max(100).optional(),
    note: z.string().optional(),
  }).optional(),
});
export type ClauseReview = z.infer<typeof ClauseReviewSchema>;

export const FormReviewSchema = z.object({
  submissionId: z.string().uuid(),
  /** The Boomer_Ang specialist that authored this review. */
  reviewedBy: z.enum([
    'biz-ang',          // finance / market-rate
    'tps-report-ang',   // pricing overseer
    'scout-ang',        // performance context
    'edu-ang',          // academic / transcript
    'betty-anne-ang',   // HR / compliance posture
  ]),
  /** Per-clause flags. */
  clauseReviews: z.array(ClauseReviewSchema),
  /** Plain-English executive summary, 3-5 sentences. */
  summary: z.string(),
  /** Top three things the user should know before signing. */
  keyTakeaways: z.array(z.string()).max(5),
  /** Overall assessment. */
  overallAssessment: z.enum([
    'market-competitive',
    'acceptable-with-revisions',
    'needs-negotiation',
    'do-not-sign',
  ]),
  reviewedAt: z.string(),
});
export type FormReview = z.infer<typeof FormReviewSchema>;

// ─── Delivery — attestation-gated output ──────────────────────────────

/** The package that goes back to the user. Gated by attestation. */
export const ReviewedFormDeliverySchema = z.object({
  deliveryId: z.string().uuid(),
  submissionId: z.string().uuid(),
  submitterId: z.string(),
  /** The form review that was produced. */
  review: FormReviewSchema,
  /** The attestation record that unlocked this delivery. */
  attestationId: z.string(),
  /** URL to the annotated PDF (if produced). Stored in SmelterOS. */
  annotatedDocumentUri: z.string().optional(),
  deliveredAt: z.string(),
});
export type ReviewedFormDelivery = z.infer<typeof ReviewedFormDeliverySchema>;

// ─── Neon DDL (run once per environment) ──────────────────────────────

/**
 * The Form-side tables. Sits alongside attestation_records (from voice-library)
 * and delegate_requests (from @aims/spinner/orchestration).
 */
export const FORMS_DDL = `
CREATE TABLE IF NOT EXISTS form_submissions (
  submission_id     UUID PRIMARY KEY,
  submitter_id      TEXT NOT NULL,
  form_type         TEXT NOT NULL,
  source_uri        TEXT NOT NULL,
  mime_type         TEXT NOT NULL,
  size_bytes        BIGINT NOT NULL,
  intent            TEXT,
  per_context       JSONB,
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS form_submissions_submitter_idx
  ON form_submissions (submitter_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS form_parses (
  submission_id     UUID PRIMARY KEY REFERENCES form_submissions(submission_id),
  full_text         TEXT NOT NULL,
  clauses           JSONB NOT NULL,
  parties           JSONB NOT NULL,
  compensation      JSONB,
  language          TEXT NOT NULL DEFAULT 'en',
  jurisdiction      TEXT,
  parsed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS form_reviews (
  submission_id     UUID PRIMARY KEY REFERENCES form_submissions(submission_id),
  reviewed_by       TEXT NOT NULL,
  clause_reviews    JSONB NOT NULL,
  summary           TEXT NOT NULL,
  key_takeaways     JSONB NOT NULL,
  overall_assessment TEXT NOT NULL,
  reviewed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviewed_form_deliveries (
  delivery_id             UUID PRIMARY KEY,
  submission_id           UUID NOT NULL REFERENCES form_submissions(submission_id),
  submitter_id            TEXT NOT NULL,
  attestation_id          TEXT NOT NULL,
  annotated_document_uri  TEXT,
  delivered_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reviewed_form_deliveries_submitter_idx
  ON reviewed_form_deliveries (submitter_id, delivered_at DESC);
`;

// Re-export attestation types for consumers who want them here.
export type { AttestationRecord, AttestationSubject };
