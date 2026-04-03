import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tie: {
          gold: '#D4A853',
          silver: '#C0C0C0',
          amber: '#FFB300',
          dark: '#0A0A0F',
          surface: 'rgba(255,255,255,0.03)',
          border: 'rgba(255,255,255,0.08)',
        },
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
