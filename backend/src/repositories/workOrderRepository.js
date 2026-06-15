import pool from '../lib/db.js';

export async function getAll() {
  const [rows] = await pool.query(`
    SELECT wo.*,
      CASE
        WHEN c.last_name IS NOT NULL AND c.last_name != ''
          THEN CONCAT(c.first_name, ' ', c.last_name)
        ELSE c.first_name
      END as client_name
    FROM work_orders wo
    LEFT JOIN clients c ON wo.client_id = c.id
    ORDER BY wo.created_at DESC
  `);
  return rows;
}

export async function findById(id) {
  const [[order]] = await pool.query(`
    SELECT wo.*,
      CASE
        WHEN c.last_name IS NOT NULL AND c.last_name != ''
          THEN CONCAT(c.first_name, ' ', c.last_name)
        ELSE c.first_name
      END as client_name
    FROM work_orders wo
    LEFT JOIN clients c ON wo.client_id = c.id
    WHERE wo.id = ?
  `, [id]);
  if (!order) return null;
  const [items] = await pool.query('SELECT * FROM work_order_items WHERE work_order_id = ?', [id]);
  order.items = items;
  return order;
}

export async function getNextNumber() {
  const [[row]] = await pool.query('SELECT MAX(CAST(number AS UNSIGNED)) as max_num FROM work_orders');
  return String(row.max_num ? row.max_num + 1 : 1).padStart(4, '0');
}

export async function create(data, items = []) {
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

export async function update(id, data, items) {
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

export async function remove(id) {
  const [result] = await pool.query('DELETE FROM work_orders WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
