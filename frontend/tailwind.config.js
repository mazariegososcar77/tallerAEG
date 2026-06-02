/** @type {import('tailwindcss').Config} */
// Paleta tomada del logo "Taller AEG": azul marino + naranja.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#EEF1F8',
          100: '#D5DCEC',
          200: '#ABB8D8',
          300: '#7E91C1',
          400: '#4F6AA8',
          500: '#2C4585',
          600: '#1F3470',
          700: '#16285C', // color principal de marca
          800: '#112048',
          900: '#0C1733',
          DEFAULT: '#16285C',
        },
        orange: {
          50: '#FEF3EC',
          100: '#FCE2D1',
          200: '#F9C2A3',
          300: '#F49B6E',
          400: '#EE7440',
          500: '#E8551C', // acento principal de marca
          600: '#C9430F',
          700: '#A3340C',
          800: '#7E2810',
          900: '#672313',
          DEFAULT: '#E8551C',
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
