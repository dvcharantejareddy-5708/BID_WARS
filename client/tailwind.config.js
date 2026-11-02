/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        arena: {
          bg: '#F3F0E8',         // warm light ivory
          card: '#FFFFFF',       // elevated pure white
          blue: '#173B78',       // deep royal blue
          blueHover: '#122F61',
          green: '#176B48',      // cricket field green
          greenHover: '#125438',
          ink: '#18243A',        // deep ink navy
          softBlue: '#E6EDF8',   // soft blue surface
          gold: '#F0C65B',       // muted golden yellow
          slate: '#647084',      // secondary text slate
          border: '#D8D8D1',     // warm grey border
          sold: '#167447',       // sold/success deep green
          unsold: '#C74444',     // unsold/error muted red
        },
        cricket: {
          400: '#176B48',
          500: '#125438',
          300: '#1E855A',
        },
        gold: {
          400: '#F0C65B',
          500: '#DDAE3B',
          300: '#F5D783',
        },
        alert: {
          500: '#C74444',
          600: '#A93333',
        },
        stadium: {
          bg: '#F3F0E8',
          secondary: '#FFFFFF',
          panel: '#FFFFFF',
          border: '#D8D8D1',
          lime: '#176B48',
          ice: '#173B78',
          text: '#18243A',
          muted: '#647084',
          success: '#167447',
          warning: '#F0C65B',
          error: '#C74444',
        }
      },
      fontFamily: {
        teko: ['"Teko"', 'Impact', 'sans-serif'],
        display: ['"Teko"', 'Impact', 'sans-serif'],
        heading: ['"Teko"', 'Impact', 'sans-serif'],
        roboto: ['"Roboto Condensed"', 'sans-serif'],
        number: ['"Roboto Condensed"', 'tabular-nums', 'sans-serif'],
        sans: ['"Source Sans 3"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        body: ['"Source Sans 3"', '-apple-system', 'sans-serif'],
        mono: ['"Roboto Condensed"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'arena-card': '0 1px 3px 0 rgba(24, 36, 58, 0.06), 0 1px 2px -1px rgba(24, 36, 58, 0.06)',
        'arena-elevated': '0 4px 16px -2px rgba(24, 36, 58, 0.08), 0 2px 6px -2px rgba(24, 36, 58, 0.04)',
        'arena-modal': '0 20px 40px -10px rgba(24, 36, 58, 0.25)',
        'glow-blue': '0 0 18px -2px rgba(23, 59, 120, 0.35)',
        'glow-green': '0 0 18px -2px rgba(23, 107, 72, 0.35)',
        'glow-gold': '0 0 18px -2px rgba(240, 198, 91, 0.35)',
        'glow-red': '0 0 18px -2px rgba(199, 68, 68, 0.35)',
      }
    },
  },
  plugins: [],
}