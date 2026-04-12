import { interpolate, InterpolationError } from '../interpolate';

describe('interpolate', () => {
  test('replaces single variable', () => {
    expect(interpolate('Hello {{name}}', { name: 'world' })).toBe('Hello world');
  });

  test('replaces multiple variables', () => {
    expect(
      interpolate('{{greet}} {{name}}, you have {{count}} messages', {
        greet: 'Hi',
        name: 'Rish',
        count: '3',
      }),
    ).toBe('Hi Rish, you have 3 messages');
  });

  test('replaces repeated variable', () => {
    expect(interpolate('{{x}} and {{x}}', { x: 'same' })).toBe('same and same');
  });

  test('joins array values with ", "', () => {
    expect(
      interpolate('Gear: {{gear}}', { gear: ['shield', 'helmet', 'vest'] }),
    ).toBe('Gear: shield, helmet, vest');
  });

  test('throws InterpolationError on missing variable', () => {
    expect(() => interpolate('Hello {{name}}', {})).toThrow(InterpolationError);
    expect(() => interpolate('Hello {{name}}', {})).toThrow(/name/);
  });

  test('leaves literal curly braces alone', () => {
    expect(interpolate('Object: { "key": "value" }', {})).toBe(
      'Object: { "key": "value" }',
    );
  });

  test('allows whitespace inside placeholder', () => {
    expect(interpolate('Hello {{ name }}', { name: 'world' })).toBe('Hello world');
  });
});
