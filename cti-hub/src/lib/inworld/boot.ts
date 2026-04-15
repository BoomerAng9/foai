/**
 * cti-hub Inworld boot
 * =====================
 * Registers shared Port Authority tool set + cti-hub-local tools on
 * the process-wide Spinner registry. Idempotent.
 */

import {
  defaultToolRegistry,
  registerPortAuthorityTools,
  isInworldConfigured,
} from '@aims/spinner';

let booted = false;

export function bootInworld(): void {
  if (booted) return;
  booted = true;
  if (!isInworldConfigured()) return;
  registerPortAuthorityTools(defaultToolRegistry);
  // cti-hub-local tools go here.
}

bootInworld();
export { defaultToolRegistry };
