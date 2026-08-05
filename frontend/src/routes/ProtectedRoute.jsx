import { Navigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import Spinner from '../components/ui/Spinner.jsx';

/**
 * Guarda de ruta. Exige sesion; si se pasa `permission`, ademas exige ese permiso.
 * - Mientras valida la sesion: spinner.
 * - Sin sesion: redirige a /login.
 * - Con sesion pero sin permiso: muestra "No autorizado".
 *
 * Explicacion sencilla: piensa en este archivo como el "guardia de seguridad"
 * de cada pantalla. Antes de mostrar una pantalla, revisa dos cosas: 1) ¿esta
 * persona inicio sesion? Si no, la manda a la pantalla de login. 2) si esa
 * pantalla requiere un permiso especifico, ¿la persona lo tiene? Si no, le
 * muestra un mensaje de "No autorizado" en vez de la pantalla. Como los
 * permisos del usuario se cargan solo al iniciar sesion (ver AuthContext.jsx),
 * si un administrador le da un permiso nuevo a alguien que ya tenia la sesion
 * abierta, ese guardia todavia no se entera — la persona tiene que cerrar
 * sesion y volver a entrar (o recargar la pagina) para que el cambio se
 * aplique.
 */
export default function ProtectedRoute({ permission, children }) {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <Spinner size={32} className="text-orange-500" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (permission && !hasPermission(permission)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert size={48} className="mb-3 text-orange-500" />
        <h2 className="text-xl font-semibold text-navy-800">No autorizado</h2>
        <p className="mt-1 text-sm text-slate-500">No tienes permiso para ver esta seccion.</p>
      </div>
    );
  }

  return children;
}
