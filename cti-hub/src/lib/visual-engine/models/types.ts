/**
 * Shared types for the Visual Engine.
 *
 * These types form the contract between the engine orchestrator,
 * the preset registry, and the model adapters. No runtime imports —
 * pure type definitions only.
 */

export type SurfaceKind =
  | 'character-portrait'
  | 'scene-background'
  | 'ui-mockup'
  | 'generative-ui-runtime'
  | 'deck-or-doc'
  | 'diagram-or-infographic';

export type AdapterId =
  | 'recraft-v4'
  | 'ideogram-v3'
  | 'vertex-imagen-4'
  | 'fal-ai'
  | 'kie-ai'
  | 'vertex-nano-banana'
  | 'glm-image'
  | 'gpt-image';

export type AspectRatio = '1:1' | '4:5' | '3:4' | '16:9';

export interface RenderRequest {
  /** Fully-interpolated prompt — no {{var}} tokens remaining. */
  prompt: string;
  /** Negative prompt — things the model should avoid. */
  negativePrompt: string;
  /** Style anchor + backdrop anchor + any other reference PNGs, as raw bytes. 0-N allowed. */
  referenceImages?: Buffer[];
  aspect: AspectRatio;
  resolution: { w: number; h: number };
  /** Optional seed for reproducibility. */
  seed?: number;
}

export interface RenderResponse {
  /** Raw PNG bytes of the generated image. */
  png: Buffer;
  /** Internal-only adapter identifier. NEVER exposed to user-facing responses. */
  adapterId: AdapterId;
  /** Internal-only provider model string (e.g. "recraftv3"). NEVER exposed. */
  modelUsed: string;
  latencyMs: number;
  costUsd: number;
}

export interface ModelAdapter {
  id: AdapterId;
  /** Which surfaces this adapter can serve. */
  supportedSurfaces: SurfaceKind[];
  /** Whether the adapter accepts referenceImages in the RenderRequest. */
  supportsReferenceImages: boolean;
  /** Execute a single generation. Throws on failure — engine handles fallback. */
  render(req: RenderRequest): Promise<RenderResponse>;
}

/**
 * Sentinel error message prefix for stub adapters.
 * The engine fallback loop uses this exact prefix to silently skip
 * to the next adapter without logging the skip as a failure.
 */
export const ADAPTER_NOT_WIRED_PREFIX = 'ADAPTER_NOT_WIRED:';
