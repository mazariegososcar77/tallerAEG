import pool from '../lib/db.js';

export async function getAll() {
  const [rows] = await pool.query('SELECT * FROM part_categories ORDER BY name');
  return rows;
}

export async function findById(id) {
  const [[row]] = await pool.query('SELECT * FROM part_categories WHERE id = ?', [id]);
  return row || null;
}

export async function getNextCode(prefix) {
  const [[row]] = await pool.query(
    "SELECT MAX(CAST(SUBSTRING(code, LENGTH(?) + 2) AS UNSIGNED)) as max_num FROM articles WHERE code LIKE ?",
    [prefix, prefix + '-%']
  );
  const next = (row.max_num || 0) + 1;
  return prefix + '-' + String(next).padStart(4, '0');
}

export async function create(data) {
  const [result] = await pool.query(
    'INSERT INTO part_categories (name, prefix, is_active) VALUES (?, ?, ?)',
    [data.name, data.prefix.toUpperCase(), data.is_active ?? 1]
  );
  return findById(result.insertId);
}

export async function update(id, data) {
  const fields = Object.keys(data).map(k => k + ' = ?').join(', ');
  await pool.query('UPDATE part_categories SET ' + fields + ' WHERE id = ?', [...Object.values(data), id]);
  return findById(id);
}

export async function remove(id) {
  const [result] = await pool.query('DELETE FROM part_categories WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
