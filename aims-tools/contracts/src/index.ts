/**
 * @aims/contracts — barrel export.
 *
 * Charter ↔ Ledger dual-surface scaffold for the 10-stage RFP → BAMARAM
 * engagement flow. Scaffold only — enforcement middleware lands in PR 4+.
 */

export * from './stages.js';
export * from './charter-schema.js';
export * from './ledger-schema.js';
export * from './queries.js';
export * from './validation.js';
export { getDbUrl, getSql, closeSql } from './client.js';
