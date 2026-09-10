import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { findFirstAccessibleRoute } from '../lib/nav.js';

/**
 * A donde mandar a alguien justo despues de iniciar sesion (o al entrar a "/").
 * Antes era fijo a "/dashboard" para todos, pero eso rompe un rol como
 * "Subcontrato": si no tiene el permiso "dashboard.view" (a proposito, para
 * que no vea los demas modulos que hoy dependen de ese permiso generico),
 * aterrizaria en un "No autorizado" en vez de en su propio modulo. Aqui se
 * navega al primer item del menu (NAV, ver lib/nav.js) para el que el usuario
 * SI tenga permiso -- para la mayoria (que si tiene dashboard.view) sigue
 * siendo exactamente "/dashboard", sin cambios.
 */
export default function HomeRedirect() {
  const { hasPermission } = useAuth();
  const target = findFirstAccessibleRoute(hasPermission) || '/dashboard';
  return <Navigate to={target} replace />;
}
