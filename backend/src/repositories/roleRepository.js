import pool from '../lib/db.js';

export async function getAll() {
  const [rows] = await pool.query('SELECT * FROM roles');
  return rows;
}
export async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM roles WHERE id = ?', [id]);
  return rows[0] || null;
}
export async function create({ name, description, is_active = true }) {
  const [result] = await pool.query('INSERT INTO roles (name, description, is_active) VALUES (?, ?, ?)', [name, description, is_active]);
  return findById(result.insertId);
}
export async function update(id, patch) {
  const fields = Object.keys(patch).map(k => k + ' = ?').join(', ');
  const values = Object.values(patch);
  await pool.query('UPDATE roles SET ' + fields + ' WHERE id = ?', [...values, id]);
  return findById(id);
}
export async function remove(id) {
  const [result] = await pool.query('DELETE FROM roles WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
