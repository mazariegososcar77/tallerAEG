// Este archivo guarda los SUBCONTRATISTAS: el catálogo de terceros externos a los que el
// taller les manda trabajos afuera (ej. torneado). Se administra desde Configuración.
import pool from '../lib/db.js';

// Trae todos los subcontratistas registrados.
export async function getAll() {
  const [rows] = await pool.query('SELECT * FROM subcontractors');
  return rows;
}
// Busca un subcontratista por su id. Si no existe, devuelve null.
export async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM subcontractors WHERE id = ?', [id]);
  return rows[0] || null;
}
// Guarda un nuevo subcontratista en la base de datos y devuelve el registro ya creado.
export async function create(data) {
  const fields = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const values = Object.values(data);
  const [result] = await pool.query('INSERT INTO subcontractors (' + fields + ') VALUES (' + placeholders + ')', values);
  return findById(result.insertId);
}
// Actualiza solo los datos indicados (patch) de un subcontratista existente.
export async function update(id, patch) {
  const fields = Object.keys(patch).map(k => k + ' = ?').join(', ');
  const values = Object.values(patch);
  await pool.query('UPDATE subcontractors SET ' + fields + ' WHERE id = ?', [...values, id]);
  return findById(id);
}
// Elimina un subcontratista. Devuelve true si sí se borró algo, false si no existía.
// (Si tiene órdenes de servicio asociadas, la base de datos rechaza el borrado con un
// error que el sistema traduce automáticamente a un 409 legible — ver utils/dbError.js.)
export async function remove(id) {
  const [result] = await pool.query('DELETE FROM subcontractors WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
