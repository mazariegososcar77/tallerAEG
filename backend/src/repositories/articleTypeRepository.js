import pool from '../lib/db.js';

export async function getAll() {
  const [rows] = await pool.query('SELECT * FROM article_types');
  return rows;
}
export async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM article_types WHERE id = ?', [id]);
  return rows[0] || null;
}
export async function create({ name, description }) {
  const [result] = await pool.query('INSERT INTO article_types (name, description) VALUES (?, ?)', [name, description]);
  return findById(result.insertId);
}
export async function update(id, patch) {
  const fields = Object.keys(patch).map(k => k + ' = ?').join(', ');
  const values = Object.values(patch);
  await pool.query('UPDATE article_types SET ' + fields + ' WHERE id = ?', [...values, id]);
  return findById(id);
}
export async function remove(id) {
  const [result] = await pool.query('DELETE FROM article_types WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
