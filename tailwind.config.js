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
          dark:    '#f5f4f0',
          surface: '#faf9f7',
          card:    '#ffffff',
          border:  '#e8e6e0',
          cyan:    '#5b4fcf',
          purple:  '#5b4fcf',
          pink:    '#c94d8a',
          green:   '#16a34a',
          amber:   '#b45309',
          red:     '#dc2626',
          blue:    '#2563eb',
          t1:      '#1a1a1a',
          t2:      '#6b6860',
          t3:      '#9e9b94',
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
