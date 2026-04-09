import assert from 'node:assert/strict';
import { determinePlanFromPriceId, getStripePriceId } from '../src/lib/billing/plans.ts';
import { getOpenRouterModel } from '../src/lib/ai/openrouter.ts';
import { interpolate, InterpolationError } from '../src/lib/visual-engine/interpolate.ts';

let completed = 0;

function restoreEnvValue(name, value) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

function run(name, fn) {
  try {
    fn();
    completed += 1;
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

run('getOpenRouterModel falls back to the default model', () => {
  const originalTextModel = process.env.OPENROUTER_TEXT_MODEL;
  const originalVoiceModel = process.env.OPENROUTER_VOICE_MODEL;

  delete process.env.OPENROUTER_TEXT_MODEL;
  delete process.env.OPENROUTER_VOICE_MODEL;

  assert.equal(getOpenRouterModel('text'), 'qwen/qwen3.6-plus:free');
  assert.equal(getOpenRouterModel('voice'), 'qwen/qwen3.6-plus:free');

  restoreEnvValue('OPENROUTER_TEXT_MODEL', originalTextModel);
  restoreEnvValue('OPENROUTER_VOICE_MODEL', originalVoiceModel);
});

run('getOpenRouterModel respects explicit voice and text models', () => {
  const originalTextModel = process.env.OPENROUTER_TEXT_MODEL;
  const originalVoiceModel = process.env.OPENROUTER_VOICE_MODEL;

  process.env.OPENROUTER_TEXT_MODEL = 'openai/gpt-4.1-mini';
  process.env.OPENROUTER_VOICE_MODEL = 'openai/gpt-4o-audio-preview';

  assert.equal(getOpenRouterModel('text'), 'openai/gpt-4.1-mini');
  assert.equal(getOpenRouterModel('voice'), 'openai/gpt-4o-audio-preview');

  restoreEnvValue('OPENROUTER_TEXT_MODEL', originalTextModel);
  restoreEnvValue('OPENROUTER_VOICE_MODEL', originalVoiceModel);
});

run('determinePlanFromPriceId falls back to pay_per_use for unrecognized ids', () => {
  assert.equal(determinePlanFromPriceId('price_unknown_123'), 'pay_per_use');
  assert.equal(determinePlanFromPriceId(undefined), 'pay_per_use');
  assert.equal(determinePlanFromPriceId(null), 'pay_per_use');
});

run('getStripePriceId returns null for unknown plans', () => {
  assert.equal(getStripePriceId('unknown'), null);
});

run('interpolate - replaces single variable', () => {
  assert.equal(interpolate('Hello {{name}}', { name: 'world' }), 'Hello world');
});

run('interpolate - replaces multiple variables', () => {
  assert.equal(
    interpolate('{{greet}} {{name}}, you have {{count}} messages', {
      greet: 'Hi',
      name: 'Rish',
      count: '3',
    }),
    'Hi Rish, you have 3 messages',
  );
});

run('interpolate - replaces repeated variable', () => {
  assert.equal(interpolate('{{x}} and {{x}}', { x: 'same' }), 'same and same');
});

run('interpolate - joins array values with ", "', () => {
  assert.equal(
    interpolate('Gear: {{gear}}', { gear: ['shield', 'helmet', 'vest'] }),
    'Gear: shield, helmet, vest',
  );
});

run('interpolate - throws InterpolationError on missing variable', () => {
  assert.throws(() => interpolate('Hello {{name}}', {}), InterpolationError);
  assert.throws(
    () => interpolate('Hello {{name}}', {}),
    (err) => err instanceof InterpolationError && /name/.test(err.message),
  );
});

run('interpolate - leaves literal curly braces alone', () => {
  assert.equal(
    interpolate('Object: { "key": "value" }', {}),
    'Object: { "key": "value" }',
  );
});

run('interpolate - allows whitespace inside placeholder', () => {
  assert.equal(interpolate('Hello {{ name }}', { name: 'world' }), 'Hello world');
});

console.log(`${completed} active checks passed`);
