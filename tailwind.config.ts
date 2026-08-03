import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: '#000000',
          50: '#0a0a0a',
          100: '#0f0f10',
          200: '#141416',
          300: '#1a1a1d',
          400: '#232327',
          500: '#2c2c31'
        },
        gold: {
          DEFAULT: '#C9A24B',
          50: '#F7ECCF',
          100: '#F0DEA9',
          200: '#E5C97C',
          300: '#D9B45F',
          400: '#C9A24B',
          500: '#B08636',
          600: '#8E6B2A',
          700: '#6B5020',
          800: '#4A3716',
          900: '#2C200D'
        },
        champagne: '#E6D3A3',
        parchment: '#F5EAD0'
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif']
      },
      letterSpacing: {
        tightest: '-0.05em',
        widest2: '0.28em'
      },
      backgroundImage: {
        'gold-gradient':
          'linear-gradient(135deg, #F7ECCF 0%, #D9B45F 25%, #C9A24B 50%, #8E6B2A 75%, #6B5020 100%)',
        'gold-shine':
          'linear-gradient(120deg, transparent 20%, rgba(247,236,207,0.35) 50%, transparent 80%)',
        'radial-fade':
          'radial-gradient(circle at 50% 0%, rgba(201,162,75,0.12), transparent 60%)',
        grid: 'linear-gradient(rgba(201,162,75,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(201,162,75,0.06) 1px, transparent 1px)'
      },
      backgroundSize: {
        grid: '48px 48px'
      },
      animation: {
        shimmer: 'shimmer 3s linear infinite',
        'fade-up': 'fadeUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        float: 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 30s linear infinite',
        'pulse-gold': 'pulseGold 3s ease-in-out infinite',
        marquee: 'marquee 40s linear infinite'
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201,162,75,0.35)' },
          '50%': { boxShadow: '0 0 0 18px rgba(201,162,75,0)' }
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' }
        }
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
};

export default config;
