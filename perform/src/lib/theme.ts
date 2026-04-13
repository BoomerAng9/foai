/**
 * Theme utilities for Per|Form.
 *
 * Manages dark/light mode state via:
 *   - localStorage key: "pf-theme"
 *   - CSS class on <html>: "dark" (Tailwind) + "light-theme" (custom CSS vars)
 *   - System preference detection via matchMedia
 *
 * Default: dark mode (the draft experience and broadcast aesthetic is dark-first).
 */

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'pf-theme';

/** Read stored theme or detect system preference. Defaults to dark. */
export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';

  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === 'light' || stored === 'dark') return stored;

  // Check system preference
  if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
    return 'light';
  }

  return 'dark';
}

/** Persist theme choice. */
export function setStoredTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, theme);
}

/** Apply theme classes to the document element. */
export function applyThemeToDOM(theme: Theme): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light-theme');
  } else {
    root.classList.remove('dark');
    root.classList.add('light-theme');
  }
}

/** Listen for system theme changes. Returns cleanup function. */
export function onSystemThemeChange(callback: (theme: Theme) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches ? 'dark' : 'light');
  };
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
