/**
 * @aims/voice-library/clone — orchestrator
 *
 * See PIPELINE.md (Stage 2). Three providers: GeminiLive (preferred),
 * Async (volume), Chirp3HD (premium). Each adapter implements CloneAdapter
 * and self-registers at module-import time. NO ElevenLabs (owner directive
 * 2026-04-29: "There is no need for Eleven Labs at all").
 */

import type { Clone, CloneRequest, CloneProvider } from '../types.js';

export interface CloneAdapter {
  readonly provider: CloneProvider;
  clone(req: CloneRequest): Promise<Clone>;
}

const ADAPTERS = new Map<CloneProvider, CloneAdapter>();

export function registerCloneAdapter(adapter: CloneAdapter): void {
  ADAPTERS.set(adapter.provider, adapter);
}

export function getCloneAdapter(provider: CloneProvider): CloneAdapter | undefined {
  return ADAPTERS.get(provider);
}

/**
 * Run a clone request through the registered adapter for its provider.
 * Throws if no adapter is registered.
 */
export async function cloneVoice(req: CloneRequest): Promise<Clone> {
  const adapter = ADAPTERS.get(req.provider);
  if (!adapter) {
    throw new Error(
      `No clone adapter registered for provider "${req.provider}". ` +
        'Import the adapter module first (e.g., import "./gemini-live").',
    );
  }
  return adapter.clone(req);
}
