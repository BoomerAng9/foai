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
        bg: { DEFAULT: '#F7F7F7', surface: '#FFFFFF', elevated: '#EFEFEF' },
        fg: { DEFAULT: '#000000', secondary: '#616161', tertiary: '#9E9E9E', ghost: '#BDBDBD' },
        accent: { DEFAULT: '#191919', hover: '#333333' },
        border: { DEFAULT: '#E0E0E0', strong: '#C0C0C0' },
        signal: { live: '#22C55E', warn: '#F59E0B', error: '#EF4444', info: '#3B82F6' },
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
      },
    },
  },
  plugins: [],
};
export default config;
