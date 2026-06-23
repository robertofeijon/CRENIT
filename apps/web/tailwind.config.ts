import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'var(--rc-red)',
          navy: 'var(--rc-navy)',
          accent: '#7f1d1d',
          success: '#16A34A',
          warning: '#F59E0B',
          danger: '#DC2626',
          dark: '#0F172A',
        },
        surface: {
          bg: 'var(--rc-bg)',
          card: 'var(--rc-card)',
          muted: 'var(--rc-card-alt)',
        },
        rc: {
          red: 'var(--rc-red)',
          navy: 'var(--rc-navy)',
          bg: 'var(--rc-bg)',
          card: 'var(--rc-card)',
          border: 'var(--rc-border)',
          text: 'var(--rc-text)',
          muted: 'var(--rc-text-secondary)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Instrument Serif', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'rc-mesh':
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(192,57,43,0.09), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(26,26,46,0.06), transparent)',
      },
      animation: {
        'hero-float': 'heroFloat 5.5s ease-in-out infinite',
        'orb-drift': 'orbDrift 18s ease-in-out infinite alternate',
      },
      keyframes: {
        heroFloat: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        orbDrift: {
          '0%': { transform: 'translate(0, 0) scale(1)' },
          '100%': { transform: 'translate(12px, -18px) scale(1.04)' },
        },
      },
      borderRadius: {
        card: '1rem',
        btn: '0.5rem',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      },
    },
  },
  plugins: [],
};

export default config;
