import fs from 'node:fs/promises';
import path from 'node:path';
import type { Preset } from './types';
import type { SurfaceKind, AspectRatio } from '../models/types';

export class PresetNotFoundError extends Error {
  constructor(public readonly presetId: string, public readonly searchedIn: string) {
    super(`VISUAL_ENGINE_PRESET_NOT_FOUND: "${presetId}" in ${searchedIn}`);
    this.name = 'PresetNotFoundError';
  }
}

export class PresetInvalidError extends Error {
  constructor(public readonly presetId: string, public readonly reason: string) {
    super(`VISUAL_ENGINE_PRESET_INVALID: "${presetId}" — ${reason}`);
    this.name = 'PresetInvalidError';
  }
}

const VALID_SURFACES: SurfaceKind[] = [
  'character-portrait',
  'scene-background',
  'ui-mockup',
  'generative-ui-runtime',
  'deck-or-doc',
  'diagram-or-infographic',
];

const VALID_ASPECTS: AspectRatio[] = ['1:1', '4:5', '3:4', '16:9'];

function assertPreset(presetId: string, data: unknown): asserts data is Preset {
  if (typeof data !== 'object' || data === null) {
    throw new PresetInvalidError(presetId, 'not an object');
  }
  const p = data as Record<string, unknown>;
  const required = ['id', 'version', 'description', 'surface', 'basePrompt',
                    'negativePrompt', 'references', 'aspect', 'resolution',
                    'candidatesDefault', 'variables', 'tags'] as const;
  for (const field of required) {
    if (!(field in p)) {
      throw new PresetInvalidError(presetId, `missing field "${field}"`);
    }
  }
  if (p.id !== presetId) {
    throw new PresetInvalidError(presetId, `id mismatch: file id "${p.id}"`);
  }
  if (!VALID_SURFACES.includes(p.surface as SurfaceKind)) {
    throw new PresetInvalidError(presetId, `invalid surface "${p.surface}"`);
  }
  if (!VALID_ASPECTS.includes(p.aspect as AspectRatio)) {
    throw new PresetInvalidError(presetId, `invalid aspect "${p.aspect}"`);
  }
  if (typeof p.candidatesDefault !== 'number' || p.candidatesDefault < 1) {
    throw new PresetInvalidError(presetId, 'candidatesDefault must be a positive number');
  }
  const res = p.resolution as { w?: unknown; h?: unknown };
  if (typeof res?.w !== 'number' || typeof res?.h !== 'number') {
    throw new PresetInvalidError(presetId, 'resolution.w and resolution.h must be numbers');
  }
}

/**
 * Default preset directory — resolves to cti-hub/src/lib/visual-engine/presets/
 * when running from the cti-hub root (which is how Next.js + scripts run).
 */
const DEFAULT_PRESETS_DIR = path.join(process.cwd(), 'src/lib/visual-engine/presets');

export async function load(presetId: string, dir: string = DEFAULT_PRESETS_DIR): Promise<Preset> {
  const filePath = path.join(dir, `${presetId}.json`);
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new PresetNotFoundError(presetId, dir);
    }
    throw err;
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new PresetInvalidError(presetId, `JSON parse error: ${(err as Error).message}`);
  }

  assertPreset(presetId, data);
  return data;
}

export function validateVars(
  preset: Preset,
  vars: Record<string, string | string[]>,
): void {
  const missing: string[] = [];
  for (const [name, spec] of Object.entries(preset.variables)) {
    if (spec.required && !(name in vars)) {
      missing.push(name);
    }
  }
  if (missing.length > 0) {
    throw new PresetInvalidError(
      preset.id,
      `missing required variables: ${missing.join(', ')}`,
    );
  }
}

export type { Preset, PresetVariableSpec, PresetReferenceSpec } from './types';
