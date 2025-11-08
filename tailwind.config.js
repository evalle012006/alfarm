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
        // AlFarm brand colors from logo
        primary: {
          DEFAULT: '#4A90A4', // Blue from logo
          50: '#E8F4F7',
          100: '#D1E9EF',
          200: '#A3D3DF',
          300: '#75BDCF',
          400: '#4A90A4', // Main blue
          500: '#3B7483',
          600: '#2C5862',
          700: '#1D3C42',
          800: '#0E2021',
          900: '#000000',
        },
        secondary: {
          DEFAULT: '#6FB96F', // Green from logo
          50: '#F0F9F0',
          100: '#E1F3E1',
          200: '#C3E7C3',
          300: '#A5DBA5',
          400: '#87CF87',
          500: '#6FB96F', // Main green
          600: '#599459',
          700: '#436F43',
          800: '#2C4A2C',
          900: '#162516',
        },
        accent: {
          DEFAULT: '#2C3E50', // Navy from logo
          light: '#34495E',
          dark: '#1A252F',
        },
      },
    },
  },
  plugins: [],
}
