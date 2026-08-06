// Este archivo da acceso, desde cualquier pantalla, a la configuracion general
// del sistema (colores de marca, tema por defecto, datos del taller, vigencia de
// cotizaciones) y a la funcion para guardarla.
import { useContext } from 'react';
import { SettingsContext } from '../context/SettingsContext.jsx';

/** Devuelve { settings, loading, saveSettings, previewColors }. */
export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings debe usarse dentro de <SettingsProvider>');
  return ctx;
}
