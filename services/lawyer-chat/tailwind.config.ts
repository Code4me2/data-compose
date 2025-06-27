import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#1a1b1e',       // Dark background - Main background
          sidebar: '#25262b',  // Slightly lighter - Sidebar/dropdown background
          text: '#D1D5DB',     // Off-White - Main text
          muted: '#8E8E93',    // Muted Gray - Secondary text
          border: '#2E2E38',   // Dim Gray - Borders/dividers
        },
        legal: {
          blue: '#004A84',     // Primary blue
          gold: '#C7A562',     // Primary gold
          lightGold: '#E1C88E', // Light gold for buttons
          hoverGold: '#C8A665', // Hover state gold (0.8x)
          activeGold: '#B59552' // Active/pressed state gold
        }
      }
    }
  }
}

export default config