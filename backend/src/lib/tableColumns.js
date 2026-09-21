// Filtra un objeto para dejar SOLO las claves que son columnas reales de una tabla.
//
// Por que existe: varios repositorios arman su INSERT/UPDATE con las claves que llegan del
// formulario. Las pantallas de edicion cargan el registro TAL COMO lo devuelve la API y lo
// reenvian entero al guardar, y esa respuesta trae ademas columnas que no existen en la tabla
// (client_name, report_number, invoice_id, items...: las agrega un JOIN solo para mostrarlas).
// Cada vez que se agregaba una columna derivada nueva habia que acordarse de descartarla en el
// servicio; si se olvidaba, guardar daba "Unknown column ... in 'field list'". Filtrando aqui por
// las columnas reales de la tabla ese error deja de ser posible.
//
// Las columnas se leen una vez por tabla (information_schema) y se recuerdan hasta reiniciar el
// servidor -- un despliegue con migracion nueva ya lo reinicia. Si no se pueden leer (tabla
// inexistente, sin permiso), se devuelve el objeto tal cual para no romper nada.
import pool from './db.js';

const cache = new Map();

async function columnsOf(table, executor) {
  if (cache.has(table)) return cache.get(table);
  const [rows] = await executor.query(
    'SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [table]
  );
  const set = new Set(rows.map((r) => r.name));
  if (set.size > 0) cache.set(table, set);
  return set;
}

export async function pickColumns(table, data, executor = pool) {
  if (!data || typeof data !== 'object') return data;
  let columns;
  try {
    columns = await columnsOf(table, executor);
  } catch {
    return data;
  }
  if (!columns || columns.size === 0) return data;
  return Object.fromEntries(Object.entries(data).filter(([key]) => columns.has(key)));
}

/** Solo para pruebas: olvida las columnas recordadas. */
export function _clearColumnCache() {
  cache.clear();
}
