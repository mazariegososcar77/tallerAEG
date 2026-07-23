// Este archivo da acceso, desde cualquier pantalla, al modo de apariencia
// actual de la app (claro/oscuro) y a la función para cambiarlo.
import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext.jsx';

/** Devuelve el tema actual (claro/oscuro) y la función para cambiarlo. */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}
