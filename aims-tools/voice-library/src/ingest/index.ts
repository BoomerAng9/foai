/**
 * @aims/voice-library/ingest — orchestrator
 *
 * See PIPELINE.md (Stage 1) for the design. Adapters register at runtime
 * via `registerIngestAdapter()`. Each adapter's job: take an IngestRequest,
 * acquire reference audio, return a RawSample written to storage.
 */

import type { IngestSource, RawSample } from '../types.js';

export interface IngestRequest {
  /** Where the sample comes from. */
  source: IngestSource;
  /** Owner scope — who owns the resulting RawSample. */
  ownerId: string;
  /** Optional human-readable label. */
  label?: string;
}

export interface IngestAdapter {
  readonly kind: IngestSource['kind'];
  ingest(req: IngestRequest): Promise<RawSample>;
}

const ADAPTERS = new Map<IngestSource['kind'], IngestAdapter>();

export function registerIngestAdapter(adapter: IngestAdapter): void {
  ADAPTERS.set(adapter.kind, adapter);
}

export function getIngestAdapter(kind: IngestSource['kind']): IngestAdapter | undefined {
  return ADAPTERS.get(kind);
}

/**
 * Run an ingest request through the registered adapter for its source kind.
 * Throws if no adapter is registered (the caller is expected to import the
 * adapter module, which self-registers, before invoking this).
 */
export async function ingest(req: IngestRequest): Promise<RawSample> {
  const adapter = ADAPTERS.get(req.source.kind);
  if (!adapter) {
    throw new Error(
      `No ingest adapter registered for source kind "${req.source.kind}". ` +
        'Import the adapter module first (e.g., import "./brave-discovery").',
    );
  }
  return adapter.ingest(req);
}
