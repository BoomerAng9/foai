/**
 * Smoke tests for the Spinner intent classifier mirror.
 * Run with: cd cti-hub && node --experimental-strip-types --test src/lib/spinner/classifier.test.ts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyMessage, shouldTransition } from './classifier.ts';

test('build intent → transition-guide-me', () => {
  const hint = classifyMessage('I want to build a coding agent for my startup');
  assert.equal(hint.category, 'build-intent');
  assert.equal(hint.action, 'transition-guide-me');
  assert.equal(shouldTransition(hint), true);
});

test('larger project → spawn-three-consultant', () => {
  const hint = classifyMessage('I want to build a fully autonomous company for my 10-person team');
  assert.equal(hint.category, 'larger-project');
  assert.equal(hint.action, 'spawn-three-consultant');
  assert.equal(shouldTransition(hint), true);
});

test('pricing question → handoff-tps-report-ang', () => {
  const hint = classifyMessage('How much does this cost?');
  assert.equal(hint.category, 'pricing-question');
  assert.equal(hint.action, 'handoff-tps-report-ang');
  assert.equal(shouldTransition(hint), false);
});

test('chitchat → continue-chat, no transition', () => {
  const hint = classifyMessage('Hello there');
  assert.equal(hint.category, 'conversation');
  assert.equal(hint.action, 'continue-chat');
  assert.equal(shouldTransition(hint), false);
});

test('status check → handoff-pmo', () => {
  const hint = classifyMessage('What is the status of my mission?');
  assert.equal(hint.category, 'status-check');
  assert.equal(hint.action, 'handoff-pmo');
  assert.equal(shouldTransition(hint), false);
});

test('escalation: build + scale → larger-project (not just build)', () => {
  const hint = classifyMessage('build me an enterprise platform');
  assert.equal(hint.category, 'larger-project');
});
