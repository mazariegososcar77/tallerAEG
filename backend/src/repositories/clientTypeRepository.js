// Este archivo guarda los TIPOS DE CLIENTE: el catálogo que clasifica a los clientes
// (por ejemplo "Empresa", "Particular"). Se administra desde Configuración.
import pool from '../lib/db.js';

// Trae todos los tipos de cliente registrados.
export async function getAll() {
  const [rows] = await pool.query('SELECT * FROM client_types');
  return rows;
}
// Busca un tipo de cliente por su id. Si no existe, devuelve null.
export async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM client_types WHERE id = ?', [id]);
  return rows[0] || null;
}
// Guarda un nuevo tipo de cliente (nombre y descripción) y devuelve el registro creado.
export async function create({ name, description }) {
  const [result] = await pool.query('INSERT INTO client_types (name, description) VALUES (?, ?)', [name, description]);
  return findById(result.insertId);
}
// Actualiza solo los datos indicados (patch) de un tipo de cliente existente.
export async function update(id, patch) {
  const fields = Object.keys(patch).map(k => k + ' = ?').join(', ');
  const values = Object.values(patch);
  await pool.query('UPDATE client_types SET ' + fields + ' WHERE id = ?', [...values, id]);
  return findById(id);
}
// Elimina un tipo de cliente. Devuelve true si sí se borró algo, false si no existía.
// (El sistema bloquea este borrado desde otra capa si hay clientes usando este tipo.)
export async function remove(id) {
  const [result] = await pool.query('DELETE FROM client_types WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
