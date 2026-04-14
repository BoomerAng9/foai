import assert from 'node:assert/strict';
import { determinePlanFromPriceId, getStripePriceId } from '../src/lib/billing/plans.ts';
import { getOpenRouterModel } from '../src/lib/ai/openrouter.ts';

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

  assert.equal(getOpenRouterModel('text'), 'google/gemini-3.1-flash');
  assert.equal(getOpenRouterModel('voice'), 'google/gemini-3.1-flash');

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

console.log(`${completed} active checks passed`);
