/**
 * Estado global de sesion. Expone: user, loading, login, logout y hasPermission.
 * Al montar, si hay token, valida la sesion contra /auth/me.
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
