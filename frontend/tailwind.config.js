/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        saffron: { 50: '#fff7ed', 100: '#ffedd5', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12' },
        maroon: { 700: '#9f1239', 800: '#881337', 900: '#4c0519' },
        gold: { 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b' },
        deepblue: { 900: '#0c1445', 950: '#060d2e' },
      }
    },
  },
  plugins: [],
}
