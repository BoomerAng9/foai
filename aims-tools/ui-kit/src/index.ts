/**
 * @aims/ui-kit — barrel export.
 *
 * Shared React components for Deploy by: ACHIEVEMOR surfaces. Consumes
 * @aims/brand-tokens for colors, typography, and the two-card home rule.
 */

export { HomeHero } from './components/HomeHero.js';
export type { HomeHeroProps } from './components/HomeHero.js';

export { AcheevyNavShell } from './components/AcheevyNavShell.js';
export type {
  AcheevyNavShellProps,
  AcheevyNavItem,
} from './components/AcheevyNavShell.js';

export {
  RfpBamaramProgressTracker,
  TRACKER_STAGES,
} from './components/RfpBamaramProgressTracker.js';
export type {
  RfpBamaramProgressTrackerProps,
  TrackerStage,
  TrackerStageEntry,
  TrackerGateStatus,
} from './components/RfpBamaramProgressTracker.js';
