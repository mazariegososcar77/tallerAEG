// Este archivo guarda los NIVELES DE FIDELIZACIÓN de clientes (por ejemplo "Oro", "Plata"):
// su nombre, el descuento que otorgan, sus beneficios y su apariencia visual (color e ícono).
import pool from '../lib/db.js';

// Trae todos los niveles de fidelización registrados.
export async function getAll() {
  const [rows] = await pool.query('SELECT * FROM loyalty_tiers');
  return rows;
}
// Busca un nivel de fidelización por su id. Si no existe, devuelve null.
export async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM loyalty_tiers WHERE id = ?', [id]);
  return rows[0] || null;
}
// Guarda un nuevo nivel de fidelización y devuelve el registro ya creado.
export async function create(data) {
  const fields = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const values = Object.values(data);
  const [result] = await pool.query('INSERT INTO loyalty_tiers (' + fields + ') VALUES (' + placeholders + ')', values);
  return findById(result.insertId);
}
// Actualiza solo los datos indicados (patch) de un nivel de fidelización existente.
export async function update(id, patch) {
  const fields = Object.keys(patch).map(k => k + ' = ?').join(', ');
  const values = Object.values(patch);
  await pool.query('UPDATE loyalty_tiers SET ' + fields + ' WHERE id = ?', [...values, id]);
  return findById(id);
}
// Elimina un nivel de fidelización. Devuelve true si sí se borró algo, false si no existía.
// (El sistema bloquea este borrado desde otra capa si hay clientes usando este nivel.)
export async function remove(id) {
  const [result] = await pool.query('DELETE FROM loyalty_tiers WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
