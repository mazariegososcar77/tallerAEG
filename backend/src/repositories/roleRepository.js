// Este archivo guarda los ROLES de usuario (por ejemplo "Administrador", "Técnico"): los
// perfiles que agrupan permisos y que luego se asignan a cada usuario del sistema.
import pool from '../lib/db.js';

// Trae todos los roles registrados.
export async function getAll() {
  const [rows] = await pool.query('SELECT * FROM roles');
  return rows;
}
// Busca un rol por su id. Si no existe, devuelve null.
export async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM roles WHERE id = ?', [id]);
  return rows[0] || null;
}
// Guarda un nuevo rol (nombre, descripción y si está activo) y devuelve el registro creado.
export async function create({ name, description, is_active = true }) {
  const [result] = await pool.query('INSERT INTO roles (name, description, is_active) VALUES (?, ?, ?)', [name, description, is_active]);
  return findById(result.insertId);
}
// Actualiza solo los datos indicados (patch) de un rol existente.
export async function update(id, patch) {
  const fields = Object.keys(patch).map(k => k + ' = ?').join(', ');
  const values = Object.values(patch);
  await pool.query('UPDATE roles SET ' + fields + ' WHERE id = ?', [...values, id]);
  return findById(id);
}
// Elimina un rol. Devuelve true si sí se borró algo, false si no existía.
export async function remove(id) {
  const [result] = await pool.query('DELETE FROM roles WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
