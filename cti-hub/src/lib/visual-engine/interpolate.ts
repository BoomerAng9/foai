/**
 * Minimal Mustache-style template expansion — `{{var}}` and `{{ var }}`.
 * No sections, no conditionals, no partials. YAGNI.
 *
 * Arrays are joined with ", ". Missing variables throw InterpolationError.
 */

export class InterpolationError extends Error {
  readonly variableName: string;
  constructor(variableName: string) {
    super(`VISUAL_ENGINE_INVALID_VARS: missing variable "${variableName}"`);
    this.name = 'InterpolationError';
    this.variableName = variableName;
  }
}

const PLACEHOLDER = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

export function interpolate(
  template: string,
  vars: Record<string, string | string[]>,
): string {
  return template.replace(PLACEHOLDER, (_, name: string) => {
    if (!(name in vars)) {
      throw new InterpolationError(name);
    }
    const value = vars[name];
    return Array.isArray(value) ? value.join(', ') : value;
  });
}
