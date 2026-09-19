// Este archivo guarda y consulta las FACTURAS del taller y sus líneas de detalle
// (invoice_items). Cada factura nace de una orden de trabajo terminada (y, si aplica,
// de la cotización de la que vino esa orden).
import pool from '../lib/db.js';

// Reemplaza `client_contacts_json` (el JSON crudo que devuelve MySQL, o null si el
// cliente no tiene contactos) por `client_contacts`, un arreglo normal ya parseado.
function parseClientContacts(row) {
  if (!row) return row;
  const { client_contacts_json, ...rest } = row;
  rest.client_contacts = typeof client_contacts_json === 'string' ? JSON.parse(client_contacts_json) : (client_contacts_json || []);
  return rest;
}

// Trae todas las facturas, la más reciente primero. Junto con cada factura trae también
// el número de la orden de trabajo, el número de la cotización (si tiene) y el nombre y
// correo del cliente, para no tener que buscarlos aparte. Si se indica un clientId, solo
// trae las de ese cliente (lo usa el historial de equipo por cliente).
export async function getAll(clientId) {
  const [rows] = await pool.query(`
    SELECT i.*, wo.number as work_order_number, q.number as quote_number,
      CASE
        WHEN c.last_name IS NOT NULL AND c.last_name != ''
          THEN CONCAT(c.first_name, ' ', c.last_name)
        ELSE c.first_name
      END as client_name,
      (
        SELECT JSON_ARRAYAGG(JSON_OBJECT('id', cc.id, 'email', cc.email, 'name', cc.name))
        FROM client_contacts cc WHERE cc.client_id = c.id
      ) as client_contacts_json
    FROM invoices i
    JOIN work_orders wo ON i.work_order_id = wo.id
    LEFT JOIN quotes q ON i.quote_id = q.id
    LEFT JOIN clients c ON i.client_id = c.id
    ${clientId ? 'WHERE i.client_id = ?' : ''}
    ORDER BY i.created_at DESC
  `, clientId ? [clientId] : []);
  return rows.map(parseClientContacts);
}

// Busca una factura por su id, con los mismos datos extra que getAll, y además le agrega
// la lista de líneas de detalle (invoice_items) de esa factura. Si no existe, devuelve null.
export async function findById(id) {
  const [[invoice]] = await pool.query(`
    SELECT i.*, wo.number as work_order_number, q.number as quote_number,
      CASE
        WHEN c.last_name IS NOT NULL AND c.last_name != ''
          THEN CONCAT(c.first_name, ' ', c.last_name)
        ELSE c.first_name
      END as client_name,
      (
        SELECT JSON_ARRAYAGG(JSON_OBJECT('id', cc.id, 'email', cc.email, 'name', cc.name))
        FROM client_contacts cc WHERE cc.client_id = c.id
      ) as client_contacts_json
    FROM invoices i
    JOIN work_orders wo ON i.work_order_id = wo.id
    LEFT JOIN quotes q ON i.quote_id = q.id
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.id = ?
  `, [id]);
  if (!invoice) return null;
  const invoiceWithContacts = parseClientContacts(invoice);
  const [items] = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [id]);
  invoiceWithContacts.items = items;
  return invoiceWithContacts;
}

// Busca la factura que corresponde a una orden de trabajo (cada orden tiene como máximo
// una factura). Si no tiene, devuelve null.
export async function findByWorkOrderId(workOrderId) {
  const [[row]] = await pool.query('SELECT id FROM invoices WHERE work_order_id = ?', [workOrderId]);
  return row ? findById(row.id) : null;
}

// Guarda una nueva factura junto con todas sus líneas de detalle. Todo se hace como una
// sola operación (transacción): si algo falla a mitad de camino, se deshace todo para no
// dejar una factura a medio guardar.
export async function create(data, items = []) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const fields = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const [result] = await conn.query(
      `INSERT INTO invoices (${fields}) VALUES (${placeholders})`,
      Object.values(data)
    );
    const invoiceId = result.insertId;
    for (const item of items) {
      const subtotal = (parseFloat(item.quantity) || 1) * (parseFloat(item.unit_price) || 0);
      await conn.query(
        'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)',
        [invoiceId, item.description, item.quantity || 1, item.unit_price || 0, subtotal]
      );
    }
    await conn.commit();
    return findById(invoiceId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Actualiza solo los datos indicados de una factura existente (por ejemplo, su estado al
// certificarla).
export async function update(id, data) {
  if (Object.keys(data).length > 0) {
    const fields = Object.keys(data).map((k) => k + ' = ?').join(', ');
    await pool.query(`UPDATE invoices SET ${fields} WHERE id = ?`, [...Object.values(data), id]);
  }
  return findById(id);
}
