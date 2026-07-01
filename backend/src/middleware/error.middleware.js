/** Manejo centralizado de 404 y de errores. Respuesta uniforme { error, details? }. */
import { ApiError } from '../utils/ApiError.js';
import { isDbError, translateDbError } from '../utils/dbError.js';

export function notFound(req, _res, next) {
  next(new ApiError(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

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
