import pool from '../lib/db.js';

export async function getAll() {
  const [rows] = await pool.query('SELECT * FROM article_labor');
  return rows;
}
export async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM article_labor WHERE id = ?', [id]);
  return rows[0] || null;
}
export async function create(data) {
  const fields = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const values = Object.values(data);
  const [result] = await pool.query('INSERT INTO article_labor (' + fields + ') VALUES (' + placeholders + ')', values);
  return findById(result.insertId);
}
export async function update(id, patch) {
  const fields = Object.keys(patch).map(k => k + ' = ?').join(', ');
  const values = Object.values(patch);
  await pool.query('UPDATE article_labor SET ' + fields + ' WHERE id = ?', [...values, id]);
  return findById(id);
}
export async function remove(id) {
  const [result] = await pool.query('DELETE FROM article_labor WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
