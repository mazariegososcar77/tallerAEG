/** Manejo centralizado de 404 y de errores. Respuesta uniforme { error, details? }. */
import { ApiError } from '../utils/ApiError.js';

export function notFound(req, _res, next) {
  next(new ApiError(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars -- Express identifica el handler por sus 4 argumentos.
export function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  if (statusCode >= 500) {
    console.error(err);
  }
  res.status(statusCode).json({
    error: err.message || 'Error interno del servidor',
    ...(err.details ? { details: err.details } : {}),
  });
}
