/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
      mono: ['monospace'],
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1152d4',
          50: '#eef4ff',
          100: '#e0ecff',
          200: '#c6d9ff',
          300: '#a3bfff',
          400: '#799aff',
          500: '#5269ff',
          600: '#3440fa',
          700: '#1152d4',
          800: '#1e38a4',
          900: '#1e3282',
          950: '#131e4e',
        },
        cheese: {
          50: '#fffdf0',
          100: '#fffbe0',
          200: '#fff3c2',
          300: '#ffe690',
          400: '#ffd453',
          500: '#ffb91a',
          600: '#e69800',
          700: '#c07200',
          800: '#9b5807',
          900: '#83470b',
          950: '#4c2600',
        },
        background: {
          light: '#f6f6f8',
          dark: '#101622',
        }
      }
    },
  },
  plugins: [],
}
