/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Retro theme colors (SNES Baseball + SMB4)
        retro: {
          // Primary blue
          blue: {
            DEFAULT: '#1a4b8c',
            bright: '#2563eb',
            dark: '#0f2d5c',
            light: '#3b82f6',
          },
          // Accent red
          red: {
            DEFAULT: '#c41e3a',
            bright: '#dc2626',
            dark: '#991b1b',
            light: '#ef4444',
          },
          // Cream/white
          cream: {
            DEFAULT: '#f5f0e1',
            dark: '#e8e0c8',
          },
          // Gold accent
          gold: {
            DEFAULT: '#d4a017',
            bright: '#fbbf24',
            dark: '#b8860b',
          },
          // Dark backgrounds
          navy: {
            DEFAULT: '#0a1628',
            light: '#1a2744',
          },
          // Field green
          green: {
            DEFAULT: '#2d5a27',
            bright: '#22c55e',
            dark: '#1a4d1a',
          },
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', '"Courier New"', 'monospace'],
        body: ['"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"SF Mono"', '"Monaco"', '"Inconsolata"', 'monospace'],
      },
      boxShadow: {
        'retro-sm': '2px 2px 0 #0a1628',
        'retro': '3px 3px 0 #0a1628',
        'retro-lg': '4px 4px 0 #0a1628',
        'retro-xl': '6px 6px 0 #0a1628',
      },
      animation: {
        'blink': 'blink 0.5s infinite',
        'pulse-slow': 'pulse 2s ease-in-out infinite',
      },
      keyframes: {
        blink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0.3' },
        },
      },
      backgroundImage: {
        'retro-blue': 'linear-gradient(180deg, #2563eb 0%, #1a4b8c 50%, #0f2d5c 100%)',
        'retro-red': 'linear-gradient(180deg, #dc2626 0%, #c41e3a 50%, #991b1b 100%)',
        'retro-gold': 'linear-gradient(180deg, #fbbf24 0%, #d4a017 50%, #b8860b 100%)',
        'retro-cream': 'linear-gradient(180deg, #f5f0e1 0%, #e8e0c8 100%)',
        'field-stripes': 'repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 30px, transparent 30px, transparent 60px)',
        'scanlines': 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0, 0, 0, 0.04) 3px, rgba(0, 0, 0, 0.04) 6px)',
      },
    },
  },
  plugins: [],
}
