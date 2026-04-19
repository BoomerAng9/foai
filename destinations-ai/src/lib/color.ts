/**
 * Color helpers — shared between pins, cards, and overlays.
 *
 * Port of the prototype's hexToRgba + accentScheme resolver at
 * C:\Users\rishj\Projects\destinations-ai-prototype\src\Pins.jsx.
 * These are pure functions with no runtime deps.
 */

export type AccentScheme = 'ambient' | 'achievemor' | 'tactical';

const ACCENT_COLORS: Record<Exclude<AccentScheme, 'ambient'>, string> = {
  achievemor: '#FF6B00',
  tactical: '#4FD1FF',
};

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (!/^[0-9A-Fa-f]{6}$/.test(h)) {
    // Safe fallback — never crash on malformed input at render time.
    return `rgba(255,107,0,${alpha})`;
  }
  const r = Number.parseInt(h.substring(0, 2), 16);
  const g = Number.parseInt(h.substring(2, 4), 16);
  const b = Number.parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Resolve the effective accent color for a destination given the active
 * scheme. Per Iller_Ang direction, HeroStrip keeps per-destination
 * ambientColor regardless of scheme; UI chrome follows the scheme.
 */
export function resolveAccent(
  destination: { pulse: { ambientColor: string } },
  scheme: AccentScheme,
): string {
  if (scheme === 'ambient') return destination.pulse.ambientColor;
  return ACCENT_COLORS[scheme];
}
