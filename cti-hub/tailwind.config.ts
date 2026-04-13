import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: 'var(--bg)', surface: 'var(--bg-surface)', elevated: 'var(--bg-elevated)' },
        fg: { DEFAULT: 'var(--fg)', secondary: 'var(--fg-secondary)', tertiary: 'var(--fg-tertiary)', ghost: 'var(--fg-ghost)' },
        accent: { DEFAULT: 'var(--accent)', hover: 'var(--accent-hover)' },
        border: { DEFAULT: 'var(--border)', strong: 'var(--border-strong)' },
        signal: { live: 'var(--signal-live)', warn: 'var(--signal-warn)', error: 'var(--signal-error)', info: 'var(--signal-info)' },
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'GeistMono', 'monospace'],
        sans: ['Geist', 'system-ui', '-apple-system', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
      borderRadius: {
        none: '0',
      },
      animation: {
        materialize: 'materialize 0.5s cubic-bezier(0, 0, 0.2, 1) both',
        'fade-in': 'fade-in 0.3s ease-out both',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
        'cursor-blink': 'cursor-blink 1s step-end infinite',
        shimmer: 'shimmer 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { opacity: '0.4' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
