/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        saffron: {
          50: '#fff7ed', 100: '#ffedd5',
          400: 'rgb(var(--accent-saffron) / <alpha-value>)',
          500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12',
        },
        maroon: { 700: '#9f1239', 800: '#881337', 900: '#4c0519' },
        gold: {
          300: '#fcd34d',
          400: 'rgb(var(--accent-gold) / <alpha-value>)',
          500: '#f59e0b',
        },
        deepblue: {
          800: 'rgb(var(--bg-card-raised) / <alpha-value>)',
          900: 'rgb(var(--bg-card) / <alpha-value>)',
          950: 'rgb(var(--bg-base) / <alpha-value>)',
        },
        gray: {
          200: 'rgb(var(--text-subtle) / <alpha-value>)',
          300: 'rgb(var(--text-muted) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
}
