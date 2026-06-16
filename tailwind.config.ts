import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f5f1e7',
        'paper-2': '#efe9da',
        ink: '#1b1b1b',
        'ink-soft': '#5a544a',
        seal: '#c0392b',
      },
      fontFamily: { serif: ["'Songti SC'", "'STSong'", 'serif'] },
    },
  },
  plugins: [],
} satisfies Config
