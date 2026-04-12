import path from 'node:path';
import fs from 'node:fs/promises';
import { load, validateVars, PresetNotFoundError, PresetInvalidError } from '../presets';

const TMP_PRESETS_DIR = path.join(__dirname, '__fixtures__/presets');

beforeAll(async () => {
  await fs.mkdir(TMP_PRESETS_DIR, { recursive: true });
  await fs.writeFile(
    path.join(TMP_PRESETS_DIR, 'valid-preset.json'),
    JSON.stringify({
      id: 'valid-preset',
      version: '1.0.0',
      description: 'Test preset',
      surface: 'character-portrait',
      basePrompt: 'A {{subject}} on {{background}}',
      negativePrompt: 'blurry',
      references: {},
      aspect: '1:1',
      resolution: { w: 1024, h: 1024 },
      candidatesDefault: 3,
      variables: {
        subject: { type: 'string', required: true, description: 'Main subject' },
        background: { type: 'string', required: true, description: 'Scene' },
      },
      tags: ['test'],
    }),
  );
  await fs.writeFile(
    path.join(TMP_PRESETS_DIR, 'missing-fields.json'),
    JSON.stringify({ id: 'missing-fields' }),
  );
});

afterAll(async () => {
  await fs.rm(TMP_PRESETS_DIR, { recursive: true, force: true });
});

describe('presets.load', () => {
  test('loads valid preset', async () => {
    const preset = await load('valid-preset', TMP_PRESETS_DIR);
    expect(preset.id).toBe('valid-preset');
    expect(preset.surface).toBe('character-portrait');
    expect(preset.variables.subject.required).toBe(true);
  });

  test('throws PresetNotFoundError for missing file', async () => {
    await expect(load('nope', TMP_PRESETS_DIR)).rejects.toThrow(PresetNotFoundError);
  });

  test('throws PresetInvalidError for malformed preset', async () => {
    await expect(load('missing-fields', TMP_PRESETS_DIR)).rejects.toThrow(PresetInvalidError);
  });
});

describe('presets.validateVars', () => {
  test('passes when all required vars present', async () => {
    const preset = await load('valid-preset', TMP_PRESETS_DIR);
    expect(() => validateVars(preset, { subject: 'hawk', background: 'port' })).not.toThrow();
  });

  test('throws on missing required var', async () => {
    const preset = await load('valid-preset', TMP_PRESETS_DIR);
    expect(() => validateVars(preset, { subject: 'hawk' })).toThrow(/background/);
  });

  test('ignores extra vars', async () => {
    const preset = await load('valid-preset', TMP_PRESETS_DIR);
    expect(() =>
      validateVars(preset, { subject: 'hawk', background: 'port', extra: 'ignored' }),
    ).not.toThrow();
  });
});
