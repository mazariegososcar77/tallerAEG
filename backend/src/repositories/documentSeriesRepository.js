// Este archivo guarda las SERIES DE NUMERACION de documentos (una fila fija por cada
// tipo de documento correlativo: cotizacion, orden de trabajo, orden de servicio,
// factura, reporte de trabajo). Se administra desde Configuracion.
import pool from '../lib/db.js';

// Trae las 5 series, en el mismo orden en que las declara numberingService.js.
export async function getAll() {
  const [rows] = await pool.query('SELECT * FROM document_series');
  return rows;
}
// Busca una serie por su tipo de documento. Si no existe, devuelve null.
export async function findByType(documentType) {
  const [rows] = await pool.query('SELECT * FROM document_series WHERE document_type = ?', [documentType]);
  return rows[0] || null;
}
// Actualiza solo los datos indicados (patch: prefix/digits/next_number) de una serie.
export async function update(documentType, patch) {
  const fields = Object.keys(patch).map(k => k + ' = ?').join(', ');
  const values = Object.values(patch);
  await pool.query('UPDATE document_series SET ' + fields + ' WHERE document_type = ?', [...values, documentType]);
  return findByType(documentType);
}

/**
 * Toma el siguiente numero de una serie Y LO AVANZA, las dos cosas en una sola
 * transaccion con `SELECT ... FOR UPDATE` (bloquea esa fila hasta el commit). Es lo
 * que hace que sea imposible que dos documentos del mismo tipo, guardados al mismo
 * tiempo, terminen con el mismo numero -- el viejo `MAX(number)+1` de cada
 * repositorio leia y usaba el maximo en dos pasos separados, con una rendija en
 * medio para esa carrera.
 *
 * Devuelve el numero ya formateado (prefijo + digitos con ceros a la izquierda),
 * listo para guardar en la columna `number` del documento.
 */
export async function takeNextNumber(documentType) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[row]] = await conn.query(
      'SELECT prefix, digits, next_number FROM document_series WHERE document_type = ? FOR UPDATE',
      [documentType],
    );
    if (!row) throw new Error(`No hay serie de numeracion configurada para "${documentType}"`);
    await conn.query(
      'UPDATE document_series SET next_number = next_number + 1 WHERE document_type = ?',
      [documentType],
    );
    await conn.commit();
    return row.prefix + String(row.next_number).padStart(row.digits, '0');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
