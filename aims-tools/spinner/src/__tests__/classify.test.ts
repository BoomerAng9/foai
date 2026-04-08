/**
 * Smoke tests for the RFP-BAMARAM intent classifier.
 * Run with: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifySync } from '../intent-classifier.js';
import { assertNotBanned, DEFAULT_ENGINE_CONFIG } from '../chat-engine.js';

test('build intent — explicit', () => {
  const r = classifySync('I want to build a coding agent for my startup');
  assert.equal(r.category, 'build-intent');
  assert.ok(r.confidence > 0.5);
  assert.equal(r.recommendedAction.type, 'transition-guide-me');
});

test('larger project — escalation', () => {
  const r = classifySync('I want to build a fully autonomous company for my 10-person team');
  assert.equal(r.category, 'larger-project');
  assert.equal(r.recommendedAction.type, 'spawn-three-consultant');
});

test('pricing question', () => {
  const r = classifySync('How much does this cost?');
  assert.equal(r.category, 'pricing-question');
  assert.equal(r.recommendedAction.type, 'handoff-tps-report-ang');
});

test('conversation — chitchat', () => {
  const r = classifySync('Hello there');
  assert.equal(r.category, 'conversation');
  assert.equal(r.recommendedAction.type, 'continue-chat');
});

test('status check', () => {
  const r = classifySync('What is the status of my mission?');
  assert.equal(r.category, 'status-check');
  assert.equal(r.recommendedAction.type, 'handoff-pmo');
});

test('Gemma is banned as default', () => {
  assert.throws(() => assertNotBanned('gemma-7b'), /banned/);
  assert.throws(() => assertNotBanned('google/gemma-2-9b'), /banned/);
});

test('GLM-5.1 is the default chat engine', () => {
  assert.equal(DEFAULT_ENGINE_CONFIG.primary, 'glm-5.1');
  assert.equal(DEFAULT_ENGINE_CONFIG.computerUse, 'glm-turbo');
});

test('Gemini 3.1 Flash Live is the multimodal upgrade', () => {
  assert.equal(DEFAULT_ENGINE_CONFIG.multimodalUpgrade, 'gemini-3.1-flash-live');
});
