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
        stadium: {
          bg: '#080D18',
          secondary: '#0E1626',
          panel: '#141F33',
          border: '#26354D',
          lime: '#C8FF45',
          ice: '#54C8FF',
          text: '#F4F7FC',
          muted: '#9BAAC0',
          success: '#43D995',
          warning: '#FFC857',
          error: '#FF647C',
        },
        dark: {
          950: '#080D18', // Stadium midnight navy base
          900: '#0E1626', // Secondary background
          850: '#141F33', // Elevated panel
          800: '#1B2942', // Interactive surfaces
          700: '#26354D', // Stadium borders
          600: '#3D506E',
          500: '#5A6F8F',
        },
        cricket: {
          400: '#C8FF45', // Electric Lime accent
          500: '#B0E635',
          300: '#D9FF75',
        },
        ice: {
          400: '#54C8FF', // Ice Blue supporting accent
          500: '#38B6FF',
          300: '#8AE0FF',
        },
        gold: {
          400: '#FFC857', // Trophy gold
          500: '#FFB300',
          300: '#FFE082',
        },
        alert: {
          500: '#FF647C', // Error red
          600: '#E04860',
        }
      },
      fontFamily: {
        display: ['"Barlow Condensed"', '"Sora"', 'sans-serif'],
        heading: ['"Barlow Condensed"', '"Sora"', 'sans-serif'],
        number: ['"Archivo Black"', 'tabular-nums', 'sans-serif'],
        sans: ['"IBM Plex Sans"', '"DM Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"Archivo Black"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'glow-lime': '0 0 25px -4px rgba(200, 255, 69, 0.4)',
        'glow-ice': '0 0 25px -4px rgba(84, 200, 255, 0.35)',
        'glow-gold': '0 0 25px -5px rgba(255, 200, 87, 0.35)',
        'glow-red': '0 0 25px -5px rgba(255, 100, 124, 0.35)',
        'stadium-card': '0 8px 24px -6px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(38, 53, 77, 0.8)',
      }
    },
  },
  plugins: [],
}
