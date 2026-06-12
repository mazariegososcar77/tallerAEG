import pool from '../lib/db.js';

export async function getAll() {
  const [rows] = await pool.query('SELECT * FROM client_types');
  return rows;
}
export async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM client_types WHERE id = ?', [id]);
  return rows[0] || null;
}
export async function create({ name, description }) {
  const [result] = await pool.query('INSERT INTO client_types (name, description) VALUES (?, ?)', [name, description]);
  return findById(result.insertId);
}
export async function update(id, patch) {
  const fields = Object.keys(patch).map(k => k + ' = ?').join(', ');
  const values = Object.values(patch);
  await pool.query('UPDATE client_types SET ' + fields + ' WHERE id = ?', [...values, id]);
  return findById(id);
}
export async function remove(id) {
  const [result] = await pool.query('DELETE FROM client_types WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
