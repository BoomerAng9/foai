import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ACHIEVEMOR brand
        achv: {
          orange: '#FF6B00',
          orangeHot: '#FF8A3D',
          orangeDeep: '#C94A00',
          tactical: '#4FD1FF',
          ink: '#0A0A0F',
          inkDeep: '#050509',
          inkMid: '#13121C',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      backdropBlur: {
        '4xl': '72px',
      },
      boxShadow: {
        glass: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.5)',
        glassDeep: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 40px rgba(0,0,0,0.6)',
        tactical: '0 0 18px rgba(255,107,0,0.3)',
      },
      animation: {
        'pulse-orange': 'pulse-orange 1.8s ease-in-out infinite',
      },
      keyframes: {
        'pulse-orange': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 6px #FF6B00' },
          '50%': { opacity: '0.3', boxShadow: '0 0 12px #FF6B00' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
