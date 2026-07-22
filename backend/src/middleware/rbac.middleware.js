/**
 * Control de acceso por permiso. Usar despues de authenticate.
 * req.user.permissions se consulta en la base de datos en cada peticion
 * (ver auth.middleware.js), no viene de una copia congelada en el JWT: un
 * cambio de permisos de un rol tiene efecto inmediato, sin re-login.
 */
import { ApiError } from '../utils/ApiError.js';

export function requirePermission(code) {
  return (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, 'No autenticado'));
    if (!req.user.permissions.includes(code)) {
      return next(new ApiError(403, 'No tienes permiso para realizar esta accion'));
    }
    next();
  };
}
