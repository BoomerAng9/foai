/**
 * Per|Form Inworld boot
 * ======================
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
  // Per|Form-specific tools (grading queue, player index, mock
  // draft state) register here.
}

bootInworld();
export { defaultToolRegistry };
