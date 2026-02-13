/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'Cascadia Code',
          'Consolas',
          'monospace',
        ],
      },
      animation: {
        slideIn: 'slideIn 0.3s ease-out',
        fadeIn: 'fadeIn 0.2s ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
