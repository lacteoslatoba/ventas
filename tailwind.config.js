import tailwindcssAnimate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
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
        ice: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        background: {
          light: '#f6f6f8',
          dark: '#101622',
        }
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2.5s infinite',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
