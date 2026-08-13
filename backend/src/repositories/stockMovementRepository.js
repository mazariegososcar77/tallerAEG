// Este archivo guarda y consulta el KARDEX de inventario (stock_movements): el libro
// de entradas y salidas de cada articulo de bodega. Cada vez que el stock de un
// articulo cambia, queda aqui una linea diciendo cuanto, por que y quien lo provoco.
//
// Es la unica fuente de verdad del stock: articles.quantity es solo el saldo corrido
// que se mantiene al dia a partir de estos movimientos, nunca al reves.
//
// Casi todas las funciones reciben un `executor` opcional: normalmente es el pool
// (una consulta suelta), pero cuando se esta dentro de una transaccion hay que
// pasarle la conexion (`conn`) para que la consulta viaje por ahi y se pueda
// deshacer junto con el resto -- ver withTransaction en lib/db.js.
import pool from '../lib/db.js';

// Trae los movimientos del kardex, del mas reciente al mas antiguo, con el nombre
// del articulo y de quien lo registro. Se puede filtrar por articulo.
export async function getAll({ articleId = null, limit = 200 } = {}) {
  const where = articleId ? 'WHERE sm.article_id = ?' : '';
  const params = articleId ? [articleId, Number(limit)] : [Number(limit)];
  const [rows] = await pool.query(`
    SELECT sm.*, a.code as article_code, a.name as article_name, a.unit as article_unit,
           u.name as user_name
    FROM stock_movements sm
    LEFT JOIN articles a ON sm.article_id = a.id
    LEFT JOIN users u ON sm.user_id = u.id
    ${where}
    ORDER BY sm.created_at DESC, sm.id DESC
    LIMIT ?
  `, params);
  return rows;
}

/**
 * Calcula cuanto material lleva consumido NETO una referencia (por ejemplo un
 * reporte de trabajo), articulo por articulo: suma sus salidas y le resta sus
 * entradas de devolucion.
 *
 * Esto es lo que hace que descontar inventario sea idempotente y reversible sin
 * logica aparte: si el reporte ya descargo sus materiales, el neto ya coincide con
 * lo que deberia y no se genera nada nuevo; si se reabrio y se devolvio todo, el
 * neto vuelve a 0. Devuelve un Map de article_id -> cantidad neta.
 */
export async function getNetByReference(referenceType, referenceId, executor = pool) {
  const [rows] = await executor.query(`
    SELECT article_id,
           SUM(CASE WHEN type = 'salida' THEN quantity ELSE -quantity END) as net
    FROM stock_movements
    WHERE reference_type = ? AND reference_id = ?
    GROUP BY article_id
  `, [referenceType, referenceId]);
  return new Map(rows.map((r) => [Number(r.article_id), Number(r.net)]));
}

/**
 * Devuelve, por articulo, el costo con que se valuo la ULTIMA salida de esta referencia.
 *
 * Sirve para devolver material a bodega al mismo costo con que salio: si un reporte
 * descargo un cojinete a Q80 y despues se reabre, la entrada que lo repone tiene que
 * valer Q80 aunque hoy el catalogo diga Q95. De lo contrario reabrir y volver a
 * finalizar un reporte, sin cambiarle nada, movería el valor del inventario.
 *
 * Devuelve un Map de article_id -> unit_cost.
 */
export async function getLastOutCostByReference(referenceType, referenceId, executor = pool) {
  const [rows] = await executor.query(`
    SELECT sm.article_id, sm.unit_cost
    FROM stock_movements sm
    JOIN (
      SELECT article_id, MAX(id) AS id
      FROM stock_movements
      WHERE reference_type = ? AND reference_id = ? AND type = 'salida'
      GROUP BY article_id
    ) ultima ON ultima.id = sm.id
  `, [referenceType, referenceId]);
  return new Map(rows.map((r) => [Number(r.article_id), Number(r.unit_cost)]));
}

// Guarda un movimiento del kardex. No toca articles.quantity: de eso se encarga
// inventoryService, que es el unico que coordina las dos cosas juntas.
export async function create(data, executor = pool) {
  const fields = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const [result] = await executor.query(
    `INSERT INTO stock_movements (${fields}) VALUES (${placeholders})`,
    Object.values(data)
  );
  const [[row]] = await executor.query('SELECT * FROM stock_movements WHERE id = ?', [result.insertId]);
  return row;
}
