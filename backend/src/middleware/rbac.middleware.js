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
//
// `code` tambien acepta un arreglo de codigos: alcanza con tener CUALQUIERA
// de ellos (OR), no todos. Sirve para rutas que dos permisos distintos dejan
// usar por razones distintas -- ej. el historial de un cliente lo puede ver
// quien tiene "clients.view" (el modulo completo) o quien solo tiene
// "clients.history.view" (un rol acotado, sin la lista completa de clientes).
export function requirePermission(code) {
  const codes = Array.isArray(code) ? code : [code];
  return (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, 'No autenticado'));
    if (!codes.some((c) => req.user.permissions.includes(c))) {
      return next(new ApiError(403, 'No tienes permiso para realizar esta accion'));
    }
    next();
  };
}
