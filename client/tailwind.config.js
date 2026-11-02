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
          bg: '#101B2D',          // deep midnight blue
          secondary: '#172840',   // secondary background
          surface: '#203650',     // elevated surfaces
          accent: '#2858A5',      // deep blue accent
          green: '#3DBB83',       // cricket green accent
          gold: '#F3C969',        // warm gold accent
          text: '#F4F6FA',        // main text
          muted: '#B0BED0',       // secondary text
          border: '#344B65',      // borders
          sold: '#3DBB83',        // sold/success
          unsold: '#E85D5D',      // unsold/error
          card: '#203650',        // card surfaces
        },
        stadium: {
          bg: '#101B2D',
          secondary: '#172840',
          panel: '#203650',
          border: '#344B65',
          lime: '#3DBB83',
          ice: '#2858A5',
          text: '#F4F6FA',
          muted: '#B0BED0',
          success: '#3DBB83',
          warning: '#F3C969',
          error: '#E85D5D',
        },
        cricket: {
          300: '#5ECCA0',
          400: '#3DBB83',
          500: '#2A9B6A',
        },
        gold: {
          300: '#F8DFA0',
          400: '#F3C969',
          500: '#E0AC3C',
        },
        alert: {
          500: '#E85D5D',
          600: '#C74444',
        },
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
        'arena-card': '0 2px 8px 0 rgba(0, 0, 0, 0.25), 0 1px 3px -1px rgba(0, 0, 0, 0.15)',
        'arena-elevated': '0 8px 24px -4px rgba(0, 0, 0, 0.35), 0 2px 8px -2px rgba(0, 0, 0, 0.2)',
        'arena-modal': '0 24px 48px -12px rgba(0, 0, 0, 0.5)',
        'glow-blue': '0 0 20px -2px rgba(40, 88, 165, 0.4)',
        'glow-green': '0 0 20px -2px rgba(61, 187, 131, 0.4)',
        'glow-gold': '0 0 20px -2px rgba(243, 201, 105, 0.35)',
        'glow-red': '0 0 20px -2px rgba(232, 93, 93, 0.4)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        'stadium-light': '0 0 80px 20px rgba(243, 201, 105, 0.06)',
      }
    },
  },
  plugins: [],
}
