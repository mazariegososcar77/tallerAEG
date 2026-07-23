// Este archivo guarda y consulta las FACTURAS del taller y sus líneas de detalle
// (invoice_items). Cada factura nace de una orden de trabajo terminada (y, si aplica,
// de la cotización de la que vino esa orden).
import pool from '../lib/db.js';

// Trae todas las facturas, la más reciente primero. Junto con cada factura trae también
// el número de la orden de trabajo, el número de la cotización (si tiene) y el nombre y
// correo del cliente, para no tener que buscarlos aparte.
export async function getAll() {
  const [rows] = await pool.query(`
    SELECT i.*, wo.number as work_order_number, q.number as quote_number,
      CASE
        WHEN c.last_name IS NOT NULL AND c.last_name != ''
          THEN CONCAT(c.first_name, ' ', c.last_name)
        ELSE c.first_name
      END as client_name,
      c.email as client_default_email
    FROM invoices i
    JOIN work_orders wo ON i.work_order_id = wo.id
    LEFT JOIN quotes q ON i.quote_id = q.id
    LEFT JOIN clients c ON i.client_id = c.id
    ORDER BY i.created_at DESC
  `);
  return rows;
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
      c.email as client_default_email
    FROM invoices i
    JOIN work_orders wo ON i.work_order_id = wo.id
    LEFT JOIN quotes q ON i.quote_id = q.id
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.id = ?
  `, [id]);
  if (!invoice) return null;
  const [items] = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [id]);
  invoice.items = items;
  return invoice;
}

// Busca la factura que corresponde a una orden de trabajo (cada orden tiene como máximo
// una factura). Si no tiene, devuelve null.
export async function findByWorkOrderId(workOrderId) {
  const [[row]] = await pool.query('SELECT id FROM invoices WHERE work_order_id = ?', [workOrderId]);
  return row ? findById(row.id) : null;
}

// Calcula el siguiente número correlativo de factura (busca el número más alto ya usado
// y le suma 1), relleno con ceros a la izquierda hasta 4 dígitos (por ejemplo "0007").
export async function getNextNumber() {
  const [[row]] = await pool.query('SELECT MAX(CAST(number AS UNSIGNED)) as max_num FROM invoices');
  return String(row.max_num ? row.max_num + 1 : 1).padStart(4, '0');
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
