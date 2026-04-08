/**
 * @aims/pmo
 * =========
 * HR PMO Office for the A.I.M.S. virtual organization.
 *
 * - Mission commissioning (commission, startMission, finishMission, logEvent)
 * - Active-mission gate (hasActiveMission) — Port Authority calls this
 *   to reject tool calls from agents without an active mission
 * - Three-layer evaluation classification (classifyEvaluation)
 * - Neon (Postgres) client wrapper
 *
 * Schema lives in migrations/. Run migrate:up to install.
 *
 * Chain of command (enforced in commission.ts validateChainOfCommand):
 *   AVVA NOON → ACHEEVY only
 *   ACHEEVY → Chicken Hawk OR Boomer_Angs
 *   Chicken Hawk → Lil_Hawks (NOT Boomer_Angs)
 *   Boomer_Ang → PMO Office Supervisors OR Lil_Hawks in their dept
 *   Betty-Anne_Ang → reports up to AVVA NOON, evaluates only
 *   Lil_Hawks → execute, do not delegate
 */

export * from './types.js';
export * from './schema.js';
export * from './client.js';
export * from './commission.js';
