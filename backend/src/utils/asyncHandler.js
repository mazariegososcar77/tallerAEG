/**
 * En palabras simples: es una pequeña herramienta que "envuelve" las
 * funciones que atienden una peticion, para que si algo falla adentro
 * (un error inesperado), ese error se mande automaticamente al manejador
 * de errores en vez de dejar el servidor colgado.
 *
 * Envuelve handlers async para que sus errores lleguen al middleware de errores.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
