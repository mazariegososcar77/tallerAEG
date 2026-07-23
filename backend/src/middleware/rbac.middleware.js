/**
 * En palabras simples: este archivo revisa que el usuario tenga PERMISO
 * para hacer una accion especifica (por ejemplo "crear usuarios"), no solo
 * que haya iniciado sesion. Es como revisar si su carnet tiene el sello
 * correcto para entrar a cierta area.
 *
 * Control de acceso por permiso. Usar despues de authenticate.
 * req.user.permissions se consulta en la base de datos en cada peticion
 * (ver auth.middleware.js), no viene de una copia congelada en el JWT: un
 * cambio de permisos de un rol tiene efecto inmediato, sin re-login.
 */
import { ApiError } from '../utils/ApiError.js';

// Crea un filtro que bloquea la peticion (con un error 403 "no autorizado")
// si el usuario que inicio sesion no tiene el permiso indicado (por
// ejemplo 'users.create'). Se usa poniendolo antes del controlador de cada
// ruta que se quiera proteger.
export function requirePermission(code) {
  return (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, 'No autenticado'));
    if (!req.user.permissions.includes(code)) {
      return next(new ApiError(403, 'No tienes permiso para realizar esta accion'));
    }
    next();
  };
}
