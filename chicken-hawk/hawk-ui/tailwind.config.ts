import type { Config } from 'tailwindcss';

// A.I.M.S. light theme — canonical for customer-facing FOAI surfaces.
// Source: ~/AIMS/.claude/skills/aims-ui-archetypes/SKILL.md §3.2 + globals.css
// + reference_aims_light_theme_canon.md memory.
//
// The `foai-*` token names are kept stable; values flipped from dark
// (foai.cloud admin) to light (aimanagedsolutions.cloud customer).
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        foai: {
          bg: '#F8FAFC',          // slate-50 — page background
          surface: '#FFFFFF',     // white — cards, panels, chat input
          'surface-2': '#F1F5F9', // slate-100 — raised / hover
          border: '#E2E8F0',      // slate-200
          'border-2': '#CBD5E1',  // slate-300 — emphasized borders
          text: '#0F172A',        // slate-900 — primary text
          muted: '#475569',       // slate-600 — secondary text
          dim: '#94A3B8',         // slate-400 — tertiary / placeholder
          gold: '#D97706',        // amber-600 — primary accent
          'gold-hover': '#B45309',// amber-700
          'gold-light': '#F59E0B',// amber-500
          'gold-tint': 'rgba(217, 119, 6, 0.08)',
          // status
          'ok': '#22C55E',        // green-500
          'warn': '#F59E0B',      // amber-500
          'err': '#EF4444',       // red-500
          'info': '#3B82F6',      // blue-500
          // legacy alias kept so any stray `foai-cyan` reference still resolves
          cyan: '#3B82F6',        // blue-500 (was electric cyan in dark theme)
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
        display: ['"Inter Tight"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'aims-amber-wash': 'linear-gradient(135deg, rgba(217, 119, 6, 0.06) 0%, transparent 60%)',
        'aims-soft-grid': 'linear-gradient(to right, rgba(15,23,42,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.03) 1px, transparent 1px)',
      },
      boxShadow: {
        'card-sm': '0 1px 2px rgba(15, 23, 42, 0.04)',
        'card': '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
        'card-md': '0 4px 12px rgba(15, 23, 42, 0.06), 0 2px 4px rgba(15, 23, 42, 0.04)',
        'card-lg': '0 12px 32px rgba(15, 23, 42, 0.08), 0 4px 8px rgba(15, 23, 42, 0.04)',
        'amber-soft': '0 2px 8px rgba(217, 119, 6, 0.18)',
        'amber-press': '0 4px 14px rgba(217, 119, 6, 0.30)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};

export default config;
