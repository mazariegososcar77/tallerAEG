/**
 * Error de aplicacion con codigo HTTP. Lo lanzan los servicios y lo formatea
 * el middleware de errores como { error, details? }.
 */
export class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}
