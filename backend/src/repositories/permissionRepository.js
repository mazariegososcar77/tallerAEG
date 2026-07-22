// Este archivo consulta los PERMISOS del sistema (por ejemplo "clients.create",
// "billing.certify"): las acciones puntuales que se le pueden dar o quitar a un rol de
// usuario. Este archivo solo lee datos, no crea ni borra permisos.
import pool from '../lib/db.js';

// Trae todos los permisos que existen en el sistema.
export async function getAll() {
  const [rows] = await pool.query('SELECT * FROM permissions');
  return rows;
}
// Busca un permiso por su id. Si no existe, devuelve null.
export async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM permissions WHERE id = ?', [id]);
  return rows[0] || null;
}
// Trae todos los permisos que tiene asignado un rol (por ejemplo, todo lo que puede hacer
// un usuario con rol "Administrador"). Se usa para saber qué puede hacer cada usuario en
// cada petición, según el rol que tenga.
export async function findByRoleId(roleId) {
  const [rows] = await pool.query('SELECT p.* FROM permissions p JOIN role_permissions rp ON p.id = rp.permission_id WHERE rp.role_id = ?', [roleId]);
  return rows;
}
