import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#080604',
        'ink-2': '#15110b',
        gold: '#e6bf72',
        'gold-bright': '#f0d68a',
        cinnabar: '#ff6a52',
        seal: '#b8312a',
        paper: '#f0e6cf',
      },
      fontFamily: { serif: ["'Songti SC'", "'STSong'", 'serif'] },
    },
  },
  plugins: [],
} satisfies Config
