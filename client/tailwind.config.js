/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070A14',
          900: '#0B1020',
          850: '#0E152A',
          800: '#111A2E',
          700: '#18233C',
          600: '#223254',
          500: '#324775',
        },
        cyan: {
          400: '#48D7FF',
          500: '#14B8A6',
          300: '#7CE2FF',
        },
        amber: {
          400: '#FFC857',
          500: '#EAB308',
          300: '#FFD780',
        },
        gold: '#FFD700',
        emerald: {
          400: '#34D399',
          500: '#10B981',
        },
        ruby: {
          500: '#EF4444',
          600: '#DC2626',
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(72, 215, 255, 0.4)',
        'glow-amber': '0 0 25px -5px rgba(255, 200, 87, 0.4)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.4)',
      },
      keyframes: {
        pulseFast: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.85, transform: 'scale(1.02)' },
        },
        gavelHit: {
          '0%': { transform: 'rotate(-45deg)' },
          '50%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(-20deg)' },
        }
      },
      animation: {
        'pulse-fast': 'pulseFast 1s ease-in-out infinite',
        'gavel': 'gavelHit 0.4s ease-out',
      }
    },
  },
  plugins: [],
}
