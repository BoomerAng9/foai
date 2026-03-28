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

  assert.equal(getOpenRouterModel('text'), 'openai/gpt-4o-mini');
  assert.equal(getOpenRouterModel('voice'), 'openai/gpt-4o-mini');

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

run('determinePlanFromPriceId maps recognizable Stripe price ids', () => {
  assert.equal(determinePlanFromPriceId('price_pro_monthly_123'), 'pro');
  assert.equal(determinePlanFromPriceId('price_enterprise_456'), 'enterprise');
  assert.equal(determinePlanFromPriceId(undefined), 'free');
});

run('getStripePriceId returns null for unknown plans', () => {
  assert.equal(getStripePriceId('unknown'), null);
});

console.log(`${completed} active checks passed`);
