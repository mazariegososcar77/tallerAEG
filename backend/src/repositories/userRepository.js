// Este archivo guarda y consulta los USUARIOS del sistema: las personas que pueden
// iniciar sesión (nombre, correo, contraseña ya encriptada y el rol que tienen asignado).
import pool from '../lib/db.js';

// Trae todos los usuarios registrados.
export async function getAll() {
  const [rows] = await pool.query('SELECT * FROM users');
  return rows;
}

// Busca un usuario por su id. Si no existe, devuelve null.
export async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

// Busca un usuario por su correo (usado al iniciar sesión). El correo se compara sin
// mayúsculas/minúsculas ni espacios, para evitar errores de escritura.
export async function findByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  return rows[0] || null;
}

// Cuenta cuántos usuarios tienen asignado un rol determinado (por ejemplo, para saber si
// se puede borrar un rol que ya nadie usa).
export async function countByRoleId(roleId) {
  const [rows] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role_id = ?', [roleId]);
  return rows[0].count;
}

// Guarda un nuevo usuario. El correo se guarda siempre en minúsculas y sin espacios, para
// que no se dupliquen cuentas con el mismo correo escrito distinto.
export async function create({ name, email, password_hash, role_id, is_active = true }) {
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password_hash, role_id, is_active) VALUES (?, ?, ?, ?, ?)',
    [name, email.toLowerCase().trim(), password_hash, role_id, is_active]
  );
  return findById(result.insertId);
}

// Actualiza solo los datos indicados (patch) de un usuario existente.
export async function update(id, patch) {
  const fields = Object.keys(patch).map(k => `${k} = ?`).join(', ');
  const values = Object.values(patch);
  await pool.query(`UPDATE users SET ${fields} WHERE id = ?`, [...values, id]);
  return findById(id);
}

// Elimina un usuario. Devuelve true si sí se borró algo, false si no existía.
export async function remove(id) {
  const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
