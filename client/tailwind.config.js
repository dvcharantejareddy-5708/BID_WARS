/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // BIDWARS Brand System Tokens (from BidWars Brand Board.pdf)
        brand: {
          lime: '#C8FF3D',     // Hammer Lime · Bids, CTAs, selected states
          crimson: '#FF3B5C',  // Ball Crimson · Outbid, heat, competitive alerts
          violet: '#7C5CFF',   // Ultra Violet · Glow, depth, visual accents
          gold: '#FFC93D',     // Purse Gold · Money, purse values, financial highlights
          midnight: '#12142A', // Midnight · Panels and major interface surfaces
          void: '#0A0B14',     // Void · Main canvas and deep background
          surface: '#181A36',  // Slightly elevated panel surface
          surfaceLight: '#20244A', // Hover and active elevated surface
          border: '#23274D',   // Deep subtle panel borders
          borderLight: '#32386E', // Highlight borders
          text: '#F4F6FA',     // Crisp body text
          muted: '#8A92B2',    // Calm secondary text
          dim: '#586082',      // Dim metadata
        },
        // Backward-compatible aliases for components
        arena: {
          bg: '#0A0B14',
          secondary: '#12142A',
          surface: '#181A36',
          accent: '#7C5CFF',
          green: '#C8FF3D',
          gold: '#FFC93D',
          text: '#F4F6FA',
          muted: '#8A92B2',
          border: '#23274D',
          sold: '#C8FF3D',
          unsold: '#FF3B5C',
          card: '#12142A',
        },
        stadium: {
          bg: '#0A0B14',
          secondary: '#12142A',
          panel: '#181A36',
          border: '#23274D',
          lime: '#C8FF3D',
          ice: '#7C5CFF',
          text: '#F4F6FA',
          muted: '#8A92B2',
          success: '#C8FF3D',
          warning: '#FFC93D',
          error: '#FF3B5C',
        },
        cricket: {
          300: '#D9FF66',
          400: '#C8FF3D',
          500: '#AEE620',
        },
        gold: {
          300: '#FFD766',
          400: '#FFC93D',
          500: '#E0AC1B',
        },
        alert: {
          500: '#FF3B5C',
          600: '#E02646',
        },
      },
      fontFamily: {
        // Display font: Unbounded 800 & Bebas Neue for cinematic headlines
        bebas: ['"Bebas Neue"', 'sans-serif'],
        cormorant: ['"Cormorant Garamond"', 'serif'],
        unbounded: ['"Unbounded"', 'sans-serif'],
        display: ['"Bebas Neue"', '"Unbounded"', 'sans-serif'],
        heading: ['"Bebas Neue"', '"Unbounded"', 'sans-serif'],
        // Interface font: Manrope 500/700
        manrope: ['"Manrope"', '-apple-system', 'sans-serif'],
        sans: ['"Manrope"', '-apple-system', 'sans-serif'],
        body: ['"Manrope"', '-apple-system', 'sans-serif'],
        // Numbers font: JetBrains Mono 500
        jetbrains: ['"JetBrains Mono"', 'monospace'],
        mono: ['"JetBrains Mono"', 'monospace'],
        number: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'subtle-surface': 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)',
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
        'card-dark': '0 4px 16px 0 rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
        'modal-dark': '0 24px 48px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'tactile-btn': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.25), 0 2px 6px 0 rgba(0, 0, 0, 0.4)',
        'tactile-btn-dark': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08), 0 2px 6px 0 rgba(0, 0, 0, 0.4)',
        // Retained for backwards-compatibility without glowing slop
        'lime-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.35), 0 2px 8px 0 rgba(0, 0, 0, 0.5)',
        'lime-glow-sm': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.25), 0 1px 4px 0 rgba(0, 0, 0, 0.4)',
        'violet-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.15), 0 2px 8px 0 rgba(0, 0, 0, 0.5)',
        'crimson-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.25), 0 2px 8px 0 rgba(0, 0, 0, 0.5)',
        'gold-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.25), 0 2px 8px 0 rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
}
