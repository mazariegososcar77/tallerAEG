// Este archivo guarda y consulta las ÓRDENES DE SERVICIO: el formato real que usa el
// taller para documentar una VISITA TÉCNICA DE CAMPO (servicio de bombas/pozos en el
// sitio del cliente) — datos del cliente, fuente de energía, mediciones eléctricas,
// condiciones del equipo, componentes instalados, especificaciones adicionales, reporte
// técnico y firmas (técnico + cliente).
import pool from '../lib/db.js';

// Campos que se guardan como JSON (arreglos/objetos de filas fijas del papel) en vez de
// columnas rígidas — ver 028_service_order_field_report.sql.
const JSON_FIELDS = [
  'electrical_measurements', 'installed_components', 'additional_specs',
  // El talonario (mismo formulario que la Orden de Trabajo) — ver 045_service_orders_talonario.sql.
  'work_types', 'equipment_type', 'physical_parts', 'screws', 'measurement_intake', 'measurement_delivery',
];

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

// Trae todas las órdenes de servicio, la más reciente primero, junto con el nombre del
// cliente (si tiene uno enlazado del catálogo), para no tener que buscarlo aparte. Si se
// indica un clientId, solo trae las de ese cliente (lo usa el historial de equipo por cliente).
export async function getAll(clientId) {
  const [rows] = await pool.query(`
    SELECT so.*,
      CASE
        WHEN c.last_name IS NOT NULL AND c.last_name != ''
          THEN CONCAT(c.first_name, ' ', c.last_name)
        ELSE c.first_name
      END as client_name
    FROM service_orders so
    LEFT JOIN clients c ON so.client_id = c.id
    ${clientId ? 'WHERE so.client_id = ?' : ''}
    ORDER BY so.created_at DESC
  `, clientId ? [clientId] : []);
  return rows.map(parseJsonFields);
}

// Busca una orden de servicio por su id, con el nombre del cliente (si tiene). Si no
// existe, devuelve null.
export async function findById(id) {
  const [[order]] = await pool.query(`
    SELECT so.*,
      CASE
        WHEN c.last_name IS NOT NULL AND c.last_name != ''
          THEN CONCAT(c.first_name, ' ', c.last_name)
        ELSE c.first_name
      END as client_name
    FROM service_orders so
    LEFT JOIN clients c ON so.client_id = c.id
    WHERE so.id = ?
  `, [id]);
  if (!order) return null;
  parseJsonFields(order);
  const [items] = await pool.query('SELECT * FROM service_order_items WHERE service_order_id = ?', [id]);
  order.items = items;
  return order;
}

// Busca la orden de servicio que corresponde a un token de enlace publico de firma
// remota (ver 027/028). Si no existe ese token, devuelve null.
export async function findByPublicToken(token) {
  const [[row]] = await pool.query('SELECT id FROM service_orders WHERE client_signature_token = ?', [token]);
  return row ? findById(row.id) : null;
}

// Inserta la lista de componentes recibidos (service_order_items) de una orden.
async function insertItems(conn, orderId, items) {
  for (const item of items) {
    await conn.query(
      'INSERT INTO service_order_items (service_order_id, name, quantity, has_item, notes) VALUES (?, ?, ?, ?, ?)',
      [orderId, item.name, item.quantity || 1, item.has_item || 0, item.notes || null]
    );
  }
}

// Guarda una nueva orden de servicio junto con sus componentes, todo en una transaccion.
export async function create(data, items = []) {
  stringifyJsonFields(data);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const fields = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const [result] = await conn.query(
      `INSERT INTO service_orders (${fields}) VALUES (${placeholders})`,
      Object.values(data)
    );
    await insertItems(conn, result.insertId, items);
    await conn.commit();
    return findById(result.insertId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Actualiza una orden de servicio. Si vienen componentes (items) se reemplazan por completo.
export async function update(id, data, items) {
  stringifyJsonFields(data);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (Object.keys(data).length > 0) {
      const fields = Object.keys(data).map(k => k + ' = ?').join(', ');
      await conn.query(`UPDATE service_orders SET ${fields} WHERE id = ?`, [...Object.values(data), id]);
    }
    if (items !== undefined) {
      await conn.query('DELETE FROM service_order_items WHERE service_order_id = ?', [id]);
      await insertItems(conn, id, items);
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

// Elimina una orden de servicio. Devuelve true si sí se borró algo, false si no existía.
export async function remove(id) {
  const [result] = await pool.query('DELETE FROM service_orders WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
