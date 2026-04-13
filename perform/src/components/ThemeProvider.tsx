'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  type Theme,
  getStoredTheme,
  setStoredTheme,
  applyThemeToDOM,
  onSystemThemeChange,
} from '@/lib/theme';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = getStoredTheme();
    setTheme(initial);
    applyThemeToDOM(initial);
    setMounted(true);

    // Listen for OS-level theme changes (only if user hasn't explicitly set)
    const cleanup = onSystemThemeChange((systemTheme) => {
      const stored = localStorage.getItem('pf-theme');
      if (!stored) {
        setTheme(systemTheme);
        applyThemeToDOM(systemTheme);
      }
    });

    return cleanup;
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setStoredTheme(next);
    applyThemeToDOM(next);
  };

  // Prevent flash of wrong theme
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
