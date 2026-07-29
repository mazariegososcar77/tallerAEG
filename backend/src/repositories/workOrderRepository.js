// Este archivo guarda y consulta las ÓRDENES DE TRABAJO del taller: la ficha del equipo
// que se recibió a reparar, con sus piezas/ítems (work_order_items) y su estado
// (recibido, en proceso, listo, entregado o cancelado).
import pool from '../lib/db.js';

// Campos que se guardan como JSON (checkboxes multiples y tablas de filas fijas del
// talonario) en vez de columnas rigidas — ver 029_work_orders_paper_form.sql.
const JSON_FIELDS = ['work_types', 'equipment_type', 'physical_parts', 'screws', 'measurement_intake', 'measurement_delivery'];

// Convierte de vuelta a objeto/arreglo usable los campos JSON que MySQL devuelve como texto.
function parseJsonFields(row) {
  if (!row) return row;
  for (const field of JSON_FIELDS) {
    if (row[field] && typeof row[field] === 'string') row[field] = JSON.parse(row[field]);
  }
  return row;
}

// Convierte a texto los campos JSON que vengan como objeto/arreglo, listos para guardar.
function stringifyJsonFields(data) {
  for (const field of JSON_FIELDS) {
    if (data[field] && typeof data[field] !== 'string') data[field] = JSON.stringify(data[field]);
  }
}

// Piezas de SELECT/JOIN que se repiten en getAll y findById: ademas del nombre del
// cliente, exponen en que va el flujo Post de esta orden (reporte finalizado?
// cotizacion aprobada? ya tiene factura?) para que el frontend sepa que boton
// mostrar (Cotizacion / Generar Factura) sin hacer consultas aparte. Para el
// flujo Pre estas columnas tambien se llenan si aplican, no hacen daño.
const FLOW_STATUS_SELECT = `
  wr.id AS report_id, wr.status AS report_status,
  q.status AS quote_status,
  inv.id AS invoice_id, inv.status AS invoice_status
`;
const FLOW_STATUS_JOIN = `
  LEFT JOIN work_reports wr ON wr.work_order_id = wo.id
  LEFT JOIN quotes q ON q.id = wo.quote_id
  LEFT JOIN invoices inv ON inv.work_order_id = wo.id
`;

// Trae todas las órdenes de trabajo, la más reciente primero, junto con el nombre del
// cliente (armado a partir de nombre y apellido), para no tener que buscarlo aparte. Si se
// indica un clientId, solo trae las de ese cliente (lo usa el historial de equipo por cliente).
export async function getAll(clientId) {
  const [rows] = await pool.query(`
    SELECT wo.*,
      CASE
        WHEN c.last_name IS NOT NULL AND c.last_name != ''
          THEN CONCAT(c.first_name, ' ', c.last_name)
        ELSE c.first_name
      END as client_name,
      ${FLOW_STATUS_SELECT}
    FROM work_orders wo
    LEFT JOIN clients c ON wo.client_id = c.id
    ${FLOW_STATUS_JOIN}
    ${clientId ? 'WHERE wo.client_id = ?' : ''}
    ORDER BY wo.created_at DESC
  `, clientId ? [clientId] : []);
  return rows.map(parseJsonFields);
}

// Busca una orden de trabajo por su id, con el nombre del cliente, y además le agrega su
// lista de piezas/ítems (work_order_items). Si no existe, devuelve null.
export async function findById(id) {
  const [[order]] = await pool.query(`
    SELECT wo.*,
      CASE
        WHEN c.last_name IS NOT NULL AND c.last_name != ''
          THEN CONCAT(c.first_name, ' ', c.last_name)
        ELSE c.first_name
      END as client_name,
      ${FLOW_STATUS_SELECT}
    FROM work_orders wo
    LEFT JOIN clients c ON wo.client_id = c.id
    ${FLOW_STATUS_JOIN}
    WHERE wo.id = ?
  `, [id]);
  if (!order) return null;
  parseJsonFields(order);
  const [items] = await pool.query('SELECT * FROM work_order_items WHERE work_order_id = ?', [id]);
  order.items = items;
  return order;
}

// Calcula el siguiente número correlativo de orden de trabajo (busca el número más alto
// ya usado y le suma 1), relleno con ceros a la izquierda hasta 4 dígitos.
export async function getNextNumber() {
  const [[row]] = await pool.query('SELECT MAX(CAST(number AS UNSIGNED)) as max_num FROM work_orders');
  return String(row.max_num ? row.max_num + 1 : 1).padStart(4, '0');
}

// Guarda una nueva orden de trabajo junto con todas sus piezas/ítems. Todo se hace como
// una sola operación (transacción): si algo falla a mitad de camino, se deshace todo para
// no dejar una orden a medio guardar.
export async function create(data, items = []) {
  stringifyJsonFields(data);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const fields = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const [result] = await conn.query(
      `INSERT INTO work_orders (${fields}) VALUES (${placeholders})`,
      Object.values(data)
    );
    const orderId = result.insertId;
    for (const item of items) {
      await conn.query(
        'INSERT INTO work_order_items (work_order_id, name, quantity, has_item, notes) VALUES (?, ?, ?, ?, ?)',
        [orderId, item.name, item.quantity || 1, item.has_item || 0, item.notes || null]
      );
    }
    await conn.commit();
    return findById(orderId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Actualiza una orden de trabajo existente. Si vienen ítems nuevos (items), primero borra
// todos los ítems anteriores y guarda los nuevos en su lugar (así siempre queda la lista
// completa y correcta). Todo se hace como una sola operación (transacción).
export async function update(id, data, items) {
  stringifyJsonFields(data);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (Object.keys(data).length > 0) {
      const fields = Object.keys(data).map(k => k + ' = ?').join(', ');
      await conn.query(`UPDATE work_orders SET ${fields} WHERE id = ?`, [...Object.values(data), id]);
    }
    if (items !== undefined) {
      await conn.query('DELETE FROM work_order_items WHERE work_order_id = ?', [id]);
      for (const item of items) {
        await conn.query(
          'INSERT INTO work_order_items (work_order_id, name, quantity, has_item, notes) VALUES (?, ?, ?, ?, ?)',
          [id, item.name, item.quantity || 1, item.has_item || 0, item.notes || null]
        );
      }
    }
    await conn.commit();
    return findById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Elimina una orden de trabajo. Devuelve true si sí se borró algo, false si no existía.
export async function remove(id) {
  const [result] = await pool.query('DELETE FROM work_orders WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
