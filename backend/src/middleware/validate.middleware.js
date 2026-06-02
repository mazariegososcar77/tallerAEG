/** Valida req.body contra un esquema zod. Reemplaza el body por el dato parseado. */
import { ApiError } from '../utils/ApiError.js';

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
