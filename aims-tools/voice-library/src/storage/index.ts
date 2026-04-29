/**
 * @aims/voice-library/storage — orchestrator
 *
 * See PIPELINE.md (Stage 4). Storage backend = SmelterOS (Puter metadata
 * + GCS bytes). Adapter pattern so an alternate backend (local FS, S3,
 * etc.) can plug in for dev without touching production wiring.
 */

export interface StorageAdapter {
  readonly name: string;
  putBytes(uri: string, bytes: Uint8Array): Promise<void>;
  getBytes(uri: string): Promise<Uint8Array>;
  putMetadata(id: string, record: unknown): Promise<void>;
  getMetadata<T>(id: string): Promise<T | null>;
}

let _adapter: StorageAdapter | null = null;

export function setStorageAdapter(adapter: StorageAdapter): void {
  _adapter = adapter;
}

export function getStorageAdapter(): StorageAdapter {
  if (!_adapter) {
    throw new Error(
      'No storage adapter set. Import the adapter module first ' +
        '(e.g., import "./puter-gcs") so it can call setStorageAdapter().',
    );
  }
  return _adapter;
}
