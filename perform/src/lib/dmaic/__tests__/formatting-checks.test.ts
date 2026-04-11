import { describe, it, expect } from 'vitest';
import { scanFormatting } from '../formatting-checks';

describe('scanFormatting', () => {
  it('passes clean content', () => {
    const result = scanFormatting('Daniel Jones cleared for minicamp on April 10, 2026.');
    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('catches template variables with double braces', () => {
    const result = scanFormatting('Hello {{name}}, your team is {{team}}.');
    expect(result.passed).toBe(false);
    expect(result.issues).toContain('Template variable found: {{name}}');
    expect(result.issues).toContain('Template variable found: {{team}}');
  });

  it('catches template variables with parentheses', () => {
    const result = scanFormatting('Hello (name), welcome to (platform).');
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.includes('(name)'))).toBe(true);
  });

  it('catches bracket placeholders', () => {
    const result = scanFormatting('The [INSERT TEAM NAME] played well.');
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.includes('[INSERT'))).toBe(true);
  });

  it('catches common placeholder words', () => {
    const result = scanFormatting('Player scored TBD points in the game.');
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.includes('TBD'))).toBe(true);
  });

  it('does not flag normal parentheses usage', () => {
    const result = scanFormatting('Jones (QB, #8) threw for 300 yards (season high).');
    expect(result.passed).toBe(true);
  });

  it('catches broken markdown links', () => {
    const result = scanFormatting('Check out [this link]() for details.');
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.includes('Empty markdown link'))).toBe(true);
  });

  it('catches Lorem Ipsum', () => {
    const result = scanFormatting('Lorem ipsum dolor sit amet, the Giants won.');
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.includes('Lorem ipsum'))).toBe(true);
  });
});
