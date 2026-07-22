/**
 * En palabras simples: este archivo es el que "atrapa" los errores que
 * pasan en cualquier parte del sistema y los convierte en un mensaje claro
 * para quien hizo la peticion, en vez de dejar que el programa se rompa.
 *
 * Manejo centralizado de 404 y de errores. Respuesta uniforme { error, details? }.
 */
import { ApiError } from '../utils/ApiError.js';
import { isDbError, translateDbError } from '../utils/dbError.js';

// Se ejecuta cuando alguien pide una direccion (URL) que no existe en el
// sistema; responde con un error "no encontrado" (404).
export function notFound(req, _res, next) {
  next(new ApiError(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

// Punto final donde llegan todos los errores del sistema (de validacion, de
// la base de datos o inesperados) y se transforman en una respuesta
// entendible en español, sin mostrar detalles tecnicos al usuario.
// eslint-disable-next-line no-unused-vars -- Express identifica el handler por sus 4 argumentos.
export function errorHandler(err, _req, res, _next) {
  // Normaliza cualquier error a un ApiError con mensaje en español:
  //  - ApiError: ya trae mensaje claro y su código HTTP.
  //  - Error de MySQL: se traduce a un mensaje entendible.
  //  - Con statusCode propio (p.ej. librerías): se respeta.
  //  - Cualquier otro (bug inesperado): mensaje genérico sin filtrar detalles técnicos.
  let error;
  if (err instanceof ApiError) {
    error = err;
  } else if (isDbError(err)) {
    error = translateDbError(err);
  } else if (err && err.statusCode) {
    error = err;
  } else {
    error = new ApiError(500, 'Ocurrió un error inesperado. Inténtalo de nuevo.');
  }

  const statusCode = error.statusCode || 500;
  // Registra el error original (con su detalle técnico) para depuración del servidor.
  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    error: error.message || 'Error interno del servidor',
    ...(error.details ? { details: error.details } : {}),
  });
}
