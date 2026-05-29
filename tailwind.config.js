/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        nodri: {
          dark:    '#0d0f14',
          surface: '#13161e',
          card:    '#181c27',
          border:  '#232840',
          cyan:    '#00e5c8',
          purple:  '#7c5cfc',
          pink:    '#f43f8e',
          green:   '#22c55e',
          amber:   '#f59e0b',
          red:     '#ef4444',
          blue:    '#3b82f6',
          t1:      '#f0f2ff',
          t2:      '#8891b3',
          t3:      '#4a506b',
        }
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        dm:   ['DM Sans', 'sans-serif'],
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease',
        'slide-up':   'slideUp 0.3s ease',
        'pulse-dot':  'pulseDot 2s infinite',
      },
      keyframes: {
        fadeIn:   { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:  { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseDot: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
      }
    },
  },
  plugins: [],
}
