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

export { PickerAngBomRenderer } from './components/PickerAngBomRenderer.js';
export type {
  PickerAngBomRendererProps,
  BomEntryView,
  BomIir,
  BomScanProfile,
  SecurityAddendumView,
} from './components/PickerAngBomRenderer.js';

export { MelaniumBalanceWidget } from './components/MelaniumBalanceWidget.js';
export type { MelaniumBalanceWidgetProps } from './components/MelaniumBalanceWidget.js';

export {
  DigitalMaintenanceFeeLineItem,
  DIGITAL_MAINTENANCE_FEE_AMOUNT,
  DIGITAL_MAINTENANCE_FEE_LABEL,
  DIGITAL_MAINTENANCE_FEE_EXPLAINER,
} from './components/DigitalMaintenanceFeeLineItem.js';
export type { DigitalMaintenanceFeeLineItemProps } from './components/DigitalMaintenanceFeeLineItem.js';

export { CharterDetailView } from './components/CharterDetailView.js';
export type {
  CharterDetailViewProps,
  CharterView,
  CharterHeaderIdentityView,
  CharterQuoteCostView,
  FourQuestionLensView,
  UseCaseView,
  TechnicalBlueprintView,
  SecurityLevelView,
  OkrsKpisView,
  RunbookView,
  LegalDataRightsView,
  AcceptanceView,
} from './components/CharterDetailView.js';
