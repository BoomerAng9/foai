/**
 * LUC Module - Live Usage Calculator
 *
 * Production-ready usage tracking, quota management, and cost calculation.
 * Core execution gating service for A.I.M.S.
 *
 * @module luc
 */

// Core LUC Engine
export {
  SERVICE_BUCKETS,
  LUC_PLANS,
  createLUCAccount,
  createLUCEngine,
  serializeLUCAccount,
  deserializeLUCAccount,
  LUCEngine,
  type LUCServiceKey,
  type ServiceBucket,
  type LUCPlan,
  type QuotaRecord,
  type LUCAccountRecord,
  type LUCQuote,
  type LUCSummary,
} from './luc-engine';

// Industry Presets
export {
  INDUSTRY_PRESETS,
  getPreset,
  getPresetsByCategory,
  createAccountFromPreset,
  getPresetServiceConfig,
  type IndustryPreset,
  type PresetService,
  type PresetCategory,
} from './luc-presets';

// Client-side Storage (localStorage)
export {
  LocalStorageAdapter,
  getLUCStorage,
  getLUCAccountManager,
  LUCAccountManager,
  usageHistoryToCSV,
  accountSummaryToCSV,
  type LUCStorageAdapter,
  type UsageHistoryEntry,
} from './luc-storage';

// Server-side Storage (file-based)
export {
  ServerStorageAdapter,
  getServerStorage,
  getLUCServerManager,
  LUCServerAccountManager,
  type UsageHistoryEntry as ServerUsageHistoryEntry,
} from './server-storage';

// LUC Client (API wrapper)
export { getLucEstimateLive } from './luc-client';

// Default export - main engine creator
export { createLUCEngine as default } from './luc-engine';
