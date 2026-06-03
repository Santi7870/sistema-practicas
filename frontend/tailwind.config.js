/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff5f5',
          100: '#ffe3e0',
          200: '#ffc9c4',
          300: '#ff9c94',
          400: '#ff6354',
          500: '#ec3724', // ESPOCH Oficial Rojo
          600: '#d32010',
          700: '#b1170a',
          800: '#92150b',
          900: '#79170f',
        },
        indigo: {
          50: '#fff5f5',
          100: '#ffe3e0',
          200: '#ffc9c4',
          300: '#ff9c94',
          400: '#ff6354',
          500: '#ec3724', // Mapeo de indigo a ESPOCH Rojo
          600: '#d32010',
          700: '#b1170a',
          800: '#92150b',
          900: '#79170f',
        },
        secondary: {
          50: '#f8f9fa',
          100: '#e9ecef',
          200: '#dee2e6',
          300: '#ced4da',
          400: '#adb5bd',
          500: '#6c757d',
          600: '#495057',
          700: '#343a40',
          800: '#212529',
          900: '#121416',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}