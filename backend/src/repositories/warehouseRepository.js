// Este archivo guarda las BODEGAS: el catálogo de lugares físicos donde se guardan los
// artículos del inventario. Se administra desde Configuración.
import pool from '../lib/db.js';

// Trae todas las bodegas registradas.
export async function getAll() {
  const [rows] = await pool.query('SELECT * FROM warehouses');
  return rows;
}
// Busca una bodega por su id. Si no existe, devuelve null.
export async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM warehouses WHERE id = ?', [id]);
  return rows[0] || null;
}
// Guarda una nueva bodega en la base de datos y devuelve el registro ya creado.
export async function create(data) {
  const fields = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const values = Object.values(data);
  const [result] = await pool.query('INSERT INTO warehouses (' + fields + ') VALUES (' + placeholders + ')', values);
  return findById(result.insertId);
}
// Actualiza solo los datos indicados (patch) de una bodega existente.
export async function update(id, patch) {
  const fields = Object.keys(patch).map(k => k + ' = ?').join(', ');
  const values = Object.values(patch);
  await pool.query('UPDATE warehouses SET ' + fields + ' WHERE id = ?', [...values, id]);
  return findById(id);
}
// Elimina una bodega. Devuelve true si sí se borró algo, false si no existía.
// (El sistema bloquea este borrado desde otra capa si hay artículos guardados en esta bodega.)
export async function remove(id) {
  const [result] = await pool.query('DELETE FROM warehouses WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
