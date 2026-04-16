/**
 * @aims/forms
 *
 * The Form pillar of The Per|Form Platform. Scaffolded package.
 *
 * Phase 1 scope (this commit):
 *   - Canonical types + Neon DDL for form intake, parse, review, delivery
 *   - Form-type registry
 *
 * Phase 2 scope (follow-up commits):
 *   - intake/        : upload adapter, SmelterOS storage write, idempotency guard
 *   - parse/         : Gemini 3.1 Flash text extraction + clause classification
 *                      (text + OCR for images/scans via the Gemini audio/vision modality)
 *   - review/        : Boomer_Ang specialist routing (biz-ang for NIL/compensation,
 *                      edu-ang for transcripts, betty-anne-ang for compliance) with
 *                      market-rate cross-reference against Per-side performance data
 *   - nil/           : the specific NIL-contract pipeline (the first concrete flow
 *                      because NIL is the category most in need of review right now)
 *   - registry/      : form-type registry with per-type defaults
 *
 * Every output that references a named person runs through the attestation
 * gate in @aims/voice-library/attestation BEFORE delivery.
 */

export * from './types.js';
