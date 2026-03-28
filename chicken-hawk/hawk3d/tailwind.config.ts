import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        hawk: {
          gold: '#C8A84E',
          'gold-dark': '#8B7635',
          'gold-bright': '#FFD700',
          surface: '#1A1A2E',
          'surface-light': '#16213E',
          'surface-lighter': '#0F3460',
          accent: '#E94560',
          text: '#EAEAEA',
          'text-muted': '#8892B0',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
