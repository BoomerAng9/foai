'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBrandConfigFromHostname } from '@/lib/platform/surface';

type Theme = 'light' | 'dark' | 'system';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStorageKey(): string {
  if (typeof window === 'undefined') {
    return getBrandConfigFromHostname(null).themeStorageKey;
  }
  return getBrandConfigFromHostname(window.location.hostname).themeStorageKey;
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.setAttribute('data-theme', resolved);
  if (resolved === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system');

  useEffect(() => {
    const storageKey = getStorageKey();
    const saved = localStorage.getItem(storageKey) as Theme | null;
    const initial = saved ?? 'system';
    setThemeState(initial);
    applyTheme(initial);

    // Listen for system theme changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if ((localStorage.getItem(storageKey) ?? 'system') === 'system') {
        applyTheme('system');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(getStorageKey(), t);
    applyTheme(t);
  }, []);

  const resolved = theme === 'system' ? getSystemTheme() : theme;

  return { theme, resolved, setTheme };
}
