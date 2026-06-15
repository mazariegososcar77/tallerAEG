import pool from '../lib/db.js';

export async function getAll() {
  const [rows] = await pool.query('SELECT * FROM users');
  return rows;
}

export async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

export async function findByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  return rows[0] || null;
}

export async function countByRoleId(roleId) {
  const [rows] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role_id = ?', [roleId]);
  return rows[0].count;
}

export async function create({ name, email, password_hash, role_id, is_active = true }) {
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password_hash, role_id, is_active) VALUES (?, ?, ?, ?, ?)',
    [name, email.toLowerCase().trim(), password_hash, role_id, is_active]
  );
  return findById(result.insertId);
}

export async function update(id, patch) {
  const fields = Object.keys(patch).map(k => `${k} = ?`).join(', ');
  const values = Object.values(patch);
  await pool.query(`UPDATE users SET ${fields} WHERE id = ?`, [...values, id]);
  return findById(id);
}

export async function remove(id) {
  const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
