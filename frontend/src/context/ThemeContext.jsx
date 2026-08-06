/**
 * Este archivo maneja el "tema" visual de la aplicacion: modo oscuro o modo claro.
 *
 * Hay dos cosas distintas en juego:
 *  1. Lo que el usuario elige con el boton de sol/luna del topbar. Eso se guarda
 *     en su navegador y **siempre manda**.
 *  2. El tema por defecto del sistema, que configura el administrador en
 *     Configuracion > Configuracion general (claro, oscuro, o "seguir el
 *     dispositivo"). Solo aplica a quien todavia NO haya elegido nada.
 *
 * Por eso el tema solo se guarda en el navegador cuando el usuario lo cambia a
 * mano: si se guardara siempre, el tema por defecto del sistema nunca se le
 * aplicaria a nadie despues de la primera visita.
 */
import { createContext, useCallback, useEffect, useRef, useState } from 'react';

export const ThemeContext = createContext(null);

const STORAGE_KEY = 'taller_aeg_theme';

/** El tema que el usuario eligio a mano, o null si nunca eligio. */
function getUserChoice() {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'dark' || stored === 'light' ? stored : null;
}

/** Lo que el dispositivo (celular/computadora) tiene configurado. */
function getDeviceTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Traduce el ajuste del sistema ('light' | 'dark' | 'system') a un tema real. */
function resolveDefault(themeDefault) {
  if (themeDefault === 'dark') return 'dark';
  if (themeDefault === 'system') return getDeviceTheme();
  return 'light';
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
}

export function ThemeProvider({ children }) {
  // Arranca con la eleccion del usuario; si no eligio nada, claro (y en cuanto
  // carga la configuracion del sistema se ajusta con applyDefaultTheme).
  const [theme, setTheme] = useState(() => getUserChoice() || 'light');
  // Ultimo valor de "tema por defecto" que mando el sistema, para poder seguir
  // los cambios del dispositivo cuando esta en modo "seguir el dispositivo".
  const systemDefault = useRef(null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // El usuario elige un tema a mano: se recuerda en su navegador.
  const chooseTheme = useCallback((next) => {
    localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    chooseTheme(theme === 'dark' ? 'light' : 'dark');
  }, [chooseTheme, theme]);

  /**
   * Aplica el tema por defecto del sistema. No hace nada si el usuario ya eligio
   * uno a mano (su preferencia manda). Lo llama SettingsContext al cargar la
   * configuracion, y tambien la pantalla de configuracion al guardar.
   */
  const applyDefaultTheme = useCallback((themeDefault) => {
    systemDefault.current = themeDefault;
    if (getUserChoice()) return;
    setTheme(resolveDefault(themeDefault));
  }, []);

  /** Olvida la eleccion manual y vuelve a lo que diga el sistema. */
  const resetToSystemDefault = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setTheme(resolveDefault(systemDefault.current));
  }, []);

  // Si el sistema esta en "seguir el dispositivo" y el usuario no eligio nada,
  // el tema cambia solo cuando el celular pasa a modo oscuro.
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (systemDefault.current === 'system' && !getUserChoice()) setTheme(getDeviceTheme());
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme: chooseTheme,
        applyDefaultTheme,
        resetToSystemDefault,
        /** true si el usuario eligio su tema a mano (ignora el del sistema). */
        hasUserChoice: Boolean(getUserChoice()),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
