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
        dark: {
          950: '#000000', // Pure black
          900: '#0D0D0D', // Near-black main panel
          850: '#151515', // Secondary panels and cards
          800: '#1E1E1E',
          700: '#292929', // Borders & dividers
          600: '#3D3D3D',
          500: '#525252',
        },
        cricket: {
          400: '#00E676', // Vibrant cricket green
          500: '#00C853',
          300: '#69F0AE',
        },
        gold: {
          400: '#FFC857', // Warm gold
          500: '#FFB300',
          300: '#FFE082',
        },
        alert: {
          500: '#FF5252', // Red error
          600: '#D50000',
        }
      },
      fontFamily: {
        display: ['"Manrope"', 'sans-serif'],
        sans: ['"Manrope"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-green': '0 0 25px -5px rgba(0, 230, 118, 0.35)',
        'glow-gold': '0 0 25px -5px rgba(255, 200, 87, 0.35)',
        'glow-red': '0 0 25px -5px rgba(255, 82, 82, 0.35)',
      }
    },
  },
  plugins: [],
}
