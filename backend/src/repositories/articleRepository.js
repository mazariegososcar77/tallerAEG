import pool from '../lib/db.js';

export async function getAll(typeId = null) {
  if (typeId) {
    const [rows] = await pool.query(
      'SELECT a.*, at.name as type_name, w.name as warehouse_name FROM articles a LEFT JOIN article_types at ON a.type_id = at.id LEFT JOIN warehouses w ON a.warehouse_id = w.id WHERE a.type_id = ? AND a.is_active = 1 ORDER BY a.name',
      [typeId]
    );
    return rows;
  }
  const [rows] = await pool.query(
    'SELECT a.*, at.name as type_name, w.name as warehouse_name FROM articles a LEFT JOIN article_types at ON a.type_id = at.id LEFT JOIN warehouses w ON a.warehouse_id = w.id ORDER BY a.name'
  );
  return rows;
}
export async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM articles WHERE id = ?', [id]);
  return rows[0] || null;
}
export async function create(data) {
  const fields = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const values = Object.values(data);
  const [result] = await pool.query('INSERT INTO articles (' + fields + ') VALUES (' + placeholders + ')', values);
  return findById(result.insertId);
}
export async function update(id, patch) {
  const fields = Object.keys(patch).map(k => k + ' = ?').join(', ');
  const values = Object.values(patch);
  await pool.query('UPDATE articles SET ' + fields + ' WHERE id = ?', [...values, id]);
  return findById(id);
}
export async function remove(id) {
  const [result] = await pool.query('DELETE FROM articles WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
