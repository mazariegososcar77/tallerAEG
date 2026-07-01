/**
 * Traduce los errores crudos del driver de MySQL (mysql2) a mensajes claros en
 * español para el usuario final. Evita filtrar SQL o nombres técnicos.
 *
 * Uso: el middleware de errores llama a `isDbError` y, si aplica,
 * reemplaza el error por el `ApiError` que devuelve `translateDbError`.
 */
import { ApiError } from './ApiError.js';

// Etiquetas amigables para nombres de columnas frecuentes del esquema.
const FIELD_LABELS = {
  email: 'correo electrónico',
  nit: 'NIT',
  dpi: 'DPI',
  phone: 'teléfono',
  first_name: 'nombre',
  last_name: 'apellido',
  full_name: 'nombre',
  company_name: 'razón social',
  trade_name: 'nombre comercial',
  contact_name: 'contacto',
  name: 'nombre',
  code: 'código',
  description: 'descripción',
  address: 'dirección',
  client_type_id: 'tipo de cliente',
  loyalty_tier_id: 'nivel de fidelización',
  role_id: 'rol',
  type_id: 'tipo',
  warehouse_id: 'bodega',
  client_id: 'cliente',
  password_hash: 'contraseña',
  quantity: 'cantidad',
  price: 'precio',
  number: 'número',
  serial: 'serie',
  brand: 'marca',
  model: 'modelo',
};

// Códigos de error de conexión/acceso a la base de datos.
const CONNECTION_CODES = new Set([
  'ECONNREFUSED', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST', 'ENOTFOUND', 'EPIPE',
  'ER_ACCESS_DENIED_ERROR', 'ER_DBACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ER_CON_COUNT_ERROR',
]);

const labelFor = (col) => FIELD_LABELS[col] || (col ? `«${col}»` : 'un campo obligatorio');

/** ¿El error proviene del driver de MySQL? */
export function isDbError(err) {
  if (!err) return false;
  if (err.sqlState || err.sqlMessage) return true;
  return typeof err.code === 'string' && (err.code.startsWith('ER_') || CONNECTION_CODES.has(err.code));
}

/** Convierte un error de MySQL en un ApiError con mensaje en español. */
export function translateDbError(err) {
  const code = err.code;
  const msg = err.sqlMessage || err.message || '';

  if (CONNECTION_CODES.has(code)) {
    return new ApiError(503, 'No se pudo conectar con la base de datos. Intenta de nuevo en unos momentos.');
  }

  switch (code) {
    case 'ER_DUP_ENTRY': {
      // Ej: "Duplicate entry 'x@y.com' for key 'clients.email'"
      const key = /for key '(?:[^.'`]+\.)?`?([^'`]+)`?'/.exec(msg)?.[1] || '';
      const col = key.replace(/_(unique|uq|idx|key)$/i, '').split('.').pop();
      const label = FIELD_LABELS[col] || FIELD_LABELS[key] || 'ese valor';
      return new ApiError(409, `Ya existe un registro con ese ${label}.`);
    }
    case 'ER_BAD_NULL_ERROR': {
      const col = /Column '([^']+)'/.exec(msg)?.[1];
      return new ApiError(400, `Falta un dato obligatorio: ${labelFor(col)}.`);
    }
    case 'ER_NO_DEFAULT_FOR_FIELD': {
      const col = /Field '([^']+)'/.exec(msg)?.[1];
      return new ApiError(400, `Falta un dato obligatorio: ${labelFor(col)}.`);
    }
    case 'ER_NO_REFERENCED_ROW':
    case 'ER_NO_REFERENCED_ROW_2':
      return new ApiError(400, 'Uno de los datos seleccionados ya no existe. Actualiza la página e inténtalo de nuevo.');
    case 'ER_ROW_IS_REFERENCED':
    case 'ER_ROW_IS_REFERENCED_2':
      return new ApiError(409, 'No se puede eliminar porque está siendo utilizado por otros registros.');
    case 'ER_DATA_TOO_LONG': {
      const col = /column '([^']+)'/i.exec(msg)?.[1];
      return new ApiError(400, `El valor de ${labelFor(col)} es demasiado largo.`);
    }
    case 'ER_TRUNCATED_WRONG_VALUE':
    case 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD':
    case 'WARN_DATA_TRUNCATED':
    case 'ER_WRONG_VALUE':
    case 'ER_INVALID_JSON_TEXT': {
      const col = /column '([^']+)'/i.exec(msg)?.[1];
      return new ApiError(400, `El valor de ${labelFor(col)} no tiene un formato válido.`);
    }
    default:
      // Otros errores del motor (sintaxis, columna inexistente, etc.): no exponer detalles técnicos.
      return new ApiError(500, 'Ocurrió un error al procesar la solicitud. Inténtalo de nuevo.');
  }
}
