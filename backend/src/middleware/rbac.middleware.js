/**
 * Control de acceso por permiso. Usar despues de authenticate.
 * Los permisos viajan en el JWT (se calculan al iniciar sesion); si cambian los
 * permisos de un rol, el usuario debe volver a iniciar sesion para reflejarlo.
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
