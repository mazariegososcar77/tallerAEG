/**
 * Este archivo maneja el "tema" visual de la aplicacion: modo oscuro u modo claro.
 * Recuerda la preferencia del usuario (guardada en el navegador) y agrega/quita
 * la clase que activa los colores oscuros en toda la pantalla.
 */
import { createContext, useCallback, useEffect, useState } from 'react';

export const ThemeContext = createContext(null);

const STORAGE_KEY = 'taller_aeg_theme';

/** Lee el tema inicial: localStorage o, por defecto, claro. */
function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  return localStorage.getItem(STORAGE_KEY) || 'light';
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
