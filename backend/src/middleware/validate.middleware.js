/**
 * En palabras simples: este archivo revisa que los datos que llegan de un
 * formulario (por ejemplo, al crear un cliente o una orden) esten completos
 * y correctos ANTES de intentar guardarlos, y si algo esta mal, avisa con
 * un mensaje claro en vez de dejar que el sistema falle.
 *
 * Valida req.body contra un esquema zod. Reemplaza el body por el dato parseado.
 */
import { ApiError } from '../utils/ApiError.js';

// Crea un filtro que valida los datos enviados (req.body) contra las reglas
// definidas en "schema" (una plantilla de que campos son obligatorios, que
// formato deben tener, etc.). Si algo no cumple, corta la peticion con un
// error 400 y la lista de campos con problema; si todo esta bien, deja
// pasar los datos ya limpios.
export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(new ApiError(400, 'Datos invalidos', details));
    }
    req.body = result.data;
    next();
  };
}
