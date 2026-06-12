import pool from '../lib/db.js';

export async function getAll() {
  const [rows] = await pool.query('SELECT * FROM permissions');
  return rows;
}
export async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM permissions WHERE id = ?', [id]);
  return rows[0] || null;
}
export async function findByRoleId(roleId) {
  const [rows] = await pool.query('SELECT p.* FROM permissions p JOIN role_permissions rp ON p.id = rp.permission_id WHERE rp.role_id = ?', [roleId]);
  return rows;
}
