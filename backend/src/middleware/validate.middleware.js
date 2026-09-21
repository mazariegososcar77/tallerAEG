/**
 * En palabras simples: este archivo revisa que los datos que llegan de un
 * formulario (por ejemplo, al crear un cliente o una orden) esten completos
 * y correctos ANTES de intentar guardarlos, y si algo esta mal, dice CUAL campo
 * y POR QUE, en español ("Teléfono: debe tener 8 números"), en vez de un
 * "Datos inválidos" que no le sirve a nadie.
 *
 * Valida req.body contra un esquema zod. Reemplaza el body por el dato parseado.
 */
import '../config/zodEs.js';
import { ApiError } from '../utils/ApiError.js';

// Cuantos problemas se listan en el mensaje principal (el resto va en `details`, campo por campo).
const MAX_EN_MENSAJE = 3;

// Arma el mensaje principal. Con un solo problema es ese mismo mensaje; con varios, una lista
// corta para que el aviso (toast) de la pantalla ya diga que corregir.
function resumir(mensajes) {
  if (mensajes.length === 1) return mensajes[0];
  const primeros = mensajes.slice(0, MAX_EN_MENSAJE).join(' ');
  const resto = mensajes.length - MAX_EN_MENSAJE;
  return `Revisa los datos: ${primeros}${resto > 0 ? ` (y ${resto} más)` : ''}`;
}

// Crea un filtro que valida los datos enviados (req.body) contra las reglas
// definidas en "schema" (una plantilla de que campos son obligatorios, que
// formato deben tener, etc.). Si algo no cumple, corta la peticion con un
// error 400, con el mensaje de lo que hay que corregir y la lista de campos con
// problema; si todo esta bien, deja pasar los datos ya limpios.
export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      // Un mismo problema puede repetirse (p. ej. una regla con dos causas): se deja una vez.
      const unicos = [...new Set(details.map((d) => d.message))];
      return next(new ApiError(400, resumir(unicos), details));
    }
    req.body = result.data;
    next();
  };
}
