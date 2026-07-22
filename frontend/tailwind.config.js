/** @type {import('tailwindcss').Config} */
// Paleta de marca "Taller AEG": verde oscuro + amarillo.
// Nota: los tokens conservan los nombres `navy` (ahora verde) y `orange`
// (ahora amarillo) para no tener que renombrar clases en toda la app.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Tokens semanticos de tema (claro/oscuro). Resuelven a variables CSS
        // definidas en index.css. El sidebar y el naranja NO usan estos: son fijos.
        app: 'var(--c-app)',          // fondo general de la app
        surface: 'var(--c-surface)',  // tarjetas, tablas, modales
        surface2: 'var(--c-surface-2)', // cabecera de tabla, inputs
        line: 'var(--c-line)',        // bordes
        hover: 'var(--c-hover)',      // hover de filas/items
        content: 'var(--c-text)',     // texto principal
        heading: 'var(--c-heading)',  // titulos
        muted: 'var(--c-muted)',      // texto secundario
        // `navy` = verde oscuro de marca (se conserva el nombre del token).
        navy: {
          50: '#ECF6EF',
          100: '#D2E9DA',
          200: '#A9D2B7',
          300: '#78B78E',
          400: '#48986A',
          500: '#2C7A4B',
          600: '#1E5F39',
          700: '#164B2C', // color principal de marca (verde oscuro)
          800: '#103A22',
          900: '#0B2A18',
          DEFAULT: '#164B2C',
        },
        // `orange` = amarillo dorado de marca (se conserva el nombre del token).
        orange: {
          50: '#FEFCE8',
          100: '#FDF6C8',
          200: '#FCEC94',
          300: '#F5D74E',
          400: '#E8BF1E',
          500: '#CA8A04', // acento principal de marca (amarillo dorado)
          600: '#A66F03',
          700: '#875A07',
          800: '#6B470A',
          900: '#54380B',
          DEFAULT: '#CA8A04',
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
