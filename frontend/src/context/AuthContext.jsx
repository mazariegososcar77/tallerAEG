/**
 * Estado global de sesion. Expone: user, loading, login, logout y hasPermission.
 * Al montar, si hay token, valida la sesion contra /auth/me.
 *
 * Explicacion sencilla: este archivo es la "memoria" de quien inicio sesion en
 * el sistema, disponible en cualquier pantalla de la aplicacion. Guarda los
 * datos del usuario que entro y la lista de permisos que tiene (que pantallas
 * puede ver, que botones puede usar). Cuando alguien inicia sesion, aqui se
 * guarda su credencial (token) y su perfil; cuando cierra sesion, se borra
 * todo. Importante: si un administrador le cambia los permisos a un usuario
 * mientras esa persona ya tiene la sesion abierta, el cambio NO se nota al
 * instante — los permisos solo se vuelven a pedir al servidor cuando se
 * recarga la pagina o se vuelve a iniciar sesion. Por eso a veces hay que
 * pedirle al usuario que cierre sesion y entre de nuevo para que un permiso
 * nuevo tenga efecto.
 */
import { createContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi.js';
import {
  getToken,
  setToken,
  getStoredUser,
  setStoredUser,
  clearAuth,
} from '../lib/authStorage.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(true);

  // Valida el token al cargar la app (y refresca el perfil/permisos).
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((profile) => {
        setUser(profile);
        setStoredUser(profile);
      })
      .catch(() => {
        clearAuth();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user: profile } = await authApi.login(email, password);
    setToken(token);
    setStoredUser(profile);
    setUser(profile);
    return profile;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // best-effort: el token es stateless
    }
    clearAuth();
    setUser(null);
  }, []);

  const hasPermission = useCallback(
    (code) => Boolean(user?.permissions?.includes(code)),
    [user],
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}
