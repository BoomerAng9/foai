'use client';

import { useTheme } from '@/hooks/useTheme';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { resolved, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
      className="flex items-center justify-center w-8 h-8 border border-border hover:border-accent/50 transition-colors"
      title={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} mode`}
    >
      {resolved === 'dark' ? (
        <Sun className="w-4 h-4 text-accent" />
      ) : (
        <Moon className="w-4 h-4 text-fg-secondary" />
      )}
    </button>
  );
}
