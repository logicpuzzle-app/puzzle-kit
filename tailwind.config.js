/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'office': {
          'bg': '#f3f2f1',
          'ribbon': '#ffffff',
          'ribbon-hover': '#e6e6e6',
          'ribbon-active': '#d4d4d4',
          'border': '#c8c8c8',
          'text': '#323130',
          'text-secondary': '#605e5c',
          'accent': '#0078d4',
          'accent-hover': '#106ebe',
        }
      },
      fontFamily: {
        'segoe': ['Segoe UI', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

