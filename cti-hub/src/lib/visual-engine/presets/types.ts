import type { AspectRatio, SurfaceKind } from '../models/types';

export interface PresetVariableSpec {
  type: 'string' | 'color' | 'array';
  required: boolean;
  description: string;
}

export interface PresetReferenceSpec {
  /** Path relative to cti-hub/public/brand/_refs/ */
  styleAnchor?: string;
  /** Path relative to cti-hub/public/brand/_refs/ */
  backdropAnchor?: string;
  /** Path to "avoid this" image. Concept is injected into negative prompt. */
  rejectReference?: string;
}

export interface Preset {
  id: string;
  version: string;
  description: string;
  surface: SurfaceKind;
  basePrompt: string;
  negativePrompt: string;
  composes?: string[];
  references: PresetReferenceSpec;
  aspect: AspectRatio;
  resolution: { w: number; h: number };
  candidatesDefault: number;
  variables: Record<string, PresetVariableSpec>;
  tags: string[];
}
