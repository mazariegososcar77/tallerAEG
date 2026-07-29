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
        // `navy` = verde oscuro de marca, `orange` = amarillo dorado de marca
        // (se conservan los nombres historicos de los tokens).
        //
        // Ambas escalas resuelven a variables CSS definidas en index.css, para
        // que se puedan cambiar desde Configuracion > Configuracion general sin
        // recompilar. El formato `rgb(var(--x) / <alpha-value>)` es a proposito:
        // es lo que permite seguir usando transparencias tipo `bg-navy-900/50`.
        navy: {
          50: 'rgb(var(--c-navy-50) / <alpha-value>)',
          100: 'rgb(var(--c-navy-100) / <alpha-value>)',
          200: 'rgb(var(--c-navy-200) / <alpha-value>)',
          300: 'rgb(var(--c-navy-300) / <alpha-value>)',
          400: 'rgb(var(--c-navy-400) / <alpha-value>)',
          500: 'rgb(var(--c-navy-500) / <alpha-value>)',
          600: 'rgb(var(--c-navy-600) / <alpha-value>)',
          700: 'rgb(var(--c-navy-700) / <alpha-value>)', // color principal de marca
          800: 'rgb(var(--c-navy-800) / <alpha-value>)',
          900: 'rgb(var(--c-navy-900) / <alpha-value>)',
          DEFAULT: 'rgb(var(--c-navy-700) / <alpha-value>)',
        },
        orange: {
          50: 'rgb(var(--c-orange-50) / <alpha-value>)',
          100: 'rgb(var(--c-orange-100) / <alpha-value>)',
          200: 'rgb(var(--c-orange-200) / <alpha-value>)',
          300: 'rgb(var(--c-orange-300) / <alpha-value>)',
          400: 'rgb(var(--c-orange-400) / <alpha-value>)',
          500: 'rgb(var(--c-orange-500) / <alpha-value>)', // acento principal de marca
          600: 'rgb(var(--c-orange-600) / <alpha-value>)',
          700: 'rgb(var(--c-orange-700) / <alpha-value>)',
          800: 'rgb(var(--c-orange-800) / <alpha-value>)',
          900: 'rgb(var(--c-orange-900) / <alpha-value>)',
          DEFAULT: 'rgb(var(--c-orange-500) / <alpha-value>)',
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
