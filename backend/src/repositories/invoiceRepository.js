import pool from '../lib/db.js';

export async function getAll() {
  const [rows] = await pool.query(`
    SELECT i.*,
      CASE
        WHEN c.last_name IS NOT NULL AND c.last_name != ''
          THEN CONCAT(c.first_name, ' ', c.last_name)
        ELSE c.first_name
      END as client_name
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    ORDER BY i.created_at DESC
  `);
  return rows;
}

export async function findById(id) {
  const [[invoice]] = await pool.query(`
    SELECT i.*,
      CASE
        WHEN c.last_name IS NOT NULL AND c.last_name != ''
          THEN CONCAT(c.first_name, ' ', c.last_name)
        ELSE c.first_name
      END as client_name
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.id = ?
  `, [id]);
  if (!invoice) return null;
  const [items] = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [id]);
  invoice.items = items;
  return invoice;
}

export async function getNextNumber() {
  const [[row]] = await pool.query('SELECT MAX(CAST(number AS UNSIGNED)) as max_num FROM invoices');
  return String(row.max_num ? row.max_num + 1 : 1).padStart(4, '0');
}

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
        'INSERT INTO invoice_items (invoice_id, description, item_type, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)',
        [invoiceId, item.description, item.item_type || 'servicio', item.quantity || 1, item.unit_price || 0, subtotal]
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

export async function update(id, data, items) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (Object.keys(data).length > 0) {
      const fields = Object.keys(data).map(k => k + ' = ?').join(', ');
      await conn.query(`UPDATE invoices SET ${fields} WHERE id = ?`, [...Object.values(data), id]);
    }
    if (items !== undefined) {
      await conn.query('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);
      for (const item of items) {
        const subtotal = (parseFloat(item.quantity) || 1) * (parseFloat(item.unit_price) || 0);
        await conn.query(
          'INSERT INTO invoice_items (invoice_id, description, item_type, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)',
          [id, item.description, item.item_type || 'servicio', item.quantity || 1, item.unit_price || 0, subtotal]
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

export async function remove(id) {
  const [result] = await pool.query('DELETE FROM invoices WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
