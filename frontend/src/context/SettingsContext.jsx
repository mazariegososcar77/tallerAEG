/**
 * Configuracion general del sistema, disponible en cualquier pantalla.
 *
 * En palabras simples: al iniciar sesion, esto le pregunta al servidor como esta
 * configurado el taller (colores de marca, tema por defecto, nombre/direccion
 * del taller, vigencia de las cotizaciones) y lo aplica. Los ajustes se editan
 * en Configuracion > Configuracion general (ver pages/config/GeneralSettingsPage).
 *
 * Detalle importante: los colores se aplican de inmediato al guardar, sin
 * recargar la pagina, porque toda la interfaz usa variables CSS (ver lib/palette.js).
 * Los ajustes que afectan a los PDF (datos del taller) los usa el backend
 * directamente al generarlos, no este archivo.
 */
import { createContext, useCallback, useEffect, useState } from 'react';
import { settingsApi } from '../api/settingsApi.js';
import { applyPalette, BRAND_PRIMARY, BRAND_ACCENT } from '../lib/palette.js';
import { useAuth } from '../hooks/useAuth.js';
import { useTheme } from '../hooks/useTheme.js';

export const SettingsContext = createContext(null);

/**
 * Los mismos valores por defecto que el backend (ver
 * backend/src/services/settingsService.js). Se usan mientras la configuracion
 * carga, en la pantalla de login (sin sesion) y si el servidor no responde.
 */
export const DEFAULT_SETTINGS = {
  theme_default: 'light',
  color_primary: BRAND_PRIMARY,
  color_accent: BRAND_ACCENT,
  company_name: 'TALLER AEG',
  company_tagline: 'Taller de Embobinado Industrial',
  company_address: 'Guatemala, Guatemala',
  company_phone: '(+502) 0000-0000',
  company_email: '',
  company_nit: '',
  quote_valid_days: 15,
};

export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const { applyDefaultTheme } = useTheme();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Aplica a la pantalla lo que se pueda aplicar del lado del cliente: los
  // colores de marca y el tema por defecto.
  const applyToUI = useCallback((s) => {
    applyPalette({ primary: s.color_primary, accent: s.color_accent });
    applyDefaultTheme(s.theme_default);
  }, [applyDefaultTheme]);

  // Trae la configuracion cuando hay sesion. Sin sesion (login) se queda con los
  // valores por defecto: el endpoint exige estar autenticado.
  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      applyToUI(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }
    let cancelled = false;
    settingsApi
      .get()
      .then((s) => {
        if (cancelled) return;
        const merged = { ...DEFAULT_SETTINGS, ...s };
        setSettings(merged);
        applyToUI(merged);
      })
      .catch(() => {
        // La configuracion es "adorno": si falla (sin red, migracion sin aplicar)
        // la app sigue con los colores y textos de siempre.
        if (!cancelled) applyToUI(DEFAULT_SETTINGS);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [user, applyToUI]);

  /** Guarda cambios y los aplica de inmediato. Devuelve la configuracion nueva. */
  const saveSettings = useCallback(async (partial) => {
    const saved = await settingsApi.update(partial);
    const merged = { ...DEFAULT_SETTINGS, ...saved };
    setSettings(merged);
    applyToUI(merged);
    return merged;
  }, [applyToUI]);

  /**
   * Muestra colores "de prueba" sin guardar nada, para que en la pantalla de
   * configuracion se vea el cambio mientras se elige el color. Al salir sin
   * guardar se llama con la configuracion real para dejar todo como estaba.
   */
  const previewColors = useCallback(({ primary, accent }) => {
    applyPalette({ primary, accent });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, saveSettings, previewColors }}>
      {children}
    </SettingsContext.Provider>
  );
}
