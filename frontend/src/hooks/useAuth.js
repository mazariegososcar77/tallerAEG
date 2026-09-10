// Este archivo da acceso, desde cualquier pantalla, a los datos de la sesión
// activa: quién inició sesión, con qué permisos cuenta, y cómo cerrar sesión.
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

/** Devuelve los datos de la sesión actual (usuario, permisos, login/logout). */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
