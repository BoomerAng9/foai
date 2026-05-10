/**
 * @aims/voice-library/alter — orchestrator
 *
 * See PIPELINE.md (Stage 3). Pitch / formant / tempo / blend on an existing
 * clone, producing a `Derivative`. Per the policy in `types.ts`: "creative,
 * not compliance" — alteration doesn't make a voice safer to use; the
 * attestation gate at render time governs production.
 */

import type { AlterOptions, Clone, Derivative } from '../types.js';

export interface AlterRequest {
  parentClone: Clone;
  ownerId: string;
  options: AlterOptions;
  label: string;
}

export interface AlterAdapter {
  /** Provider key — same shape as CloneProvider but for alteration backends. */
  readonly provider: string;
  alter(req: AlterRequest): Promise<Derivative>;
}

const ADAPTERS = new Map<string, AlterAdapter>();

export function registerAlterAdapter(adapter: AlterAdapter): void {
  ADAPTERS.set(adapter.provider, adapter);
}

export function getAlterAdapter(provider: string): AlterAdapter | undefined {
  return ADAPTERS.get(provider);
}

/**
 * Apply alteration to an existing clone. Defaults to the first registered
 * adapter unless an explicit `provider` is named.
 */
export async function alterVoice(req: AlterRequest, provider?: string): Promise<Derivative> {
  const key = provider ?? Array.from(ADAPTERS.keys())[0];
  if (!key) {
    throw new Error('No alter adapter registered.');
  }
  const adapter = ADAPTERS.get(key);
  if (!adapter) {
    throw new Error(`No alter adapter registered for provider "${key}".`);
  }
  return adapter.alter(req);
}
