// Este archivo guarda los TIPOS DE ARTÍCULO: el catálogo que clasifica los artículos del
// inventario (por ejemplo "Repuesto", "Mano de obra"). Se administra desde Configuración.
import pool from '../lib/db.js';

// Trae todos los tipos de artículo registrados.
export async function getAll() {
  const [rows] = await pool.query('SELECT * FROM article_types');
  return rows;
}
// Busca un tipo de artículo por su id. Si no existe, devuelve null.
export async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM article_types WHERE id = ?', [id]);
  return rows[0] || null;
}
// Guarda un nuevo tipo de artículo (nombre y descripción) y devuelve el registro creado.
export async function create({ name, description }) {
  const [result] = await pool.query('INSERT INTO article_types (name, description) VALUES (?, ?)', [name, description]);
  return findById(result.insertId);
}
// Actualiza solo los datos indicados (patch) de un tipo de artículo existente.
export async function update(id, patch) {
  const fields = Object.keys(patch).map(k => k + ' = ?').join(', ');
  const values = Object.values(patch);
  await pool.query('UPDATE article_types SET ' + fields + ' WHERE id = ?', [...values, id]);
  return findById(id);
}
// Elimina un tipo de artículo. Devuelve true si sí se borró algo, false si no existía.
// (El sistema bloquea este borrado desde otra capa si hay artículos usando este tipo.)
export async function remove(id) {
  const [result] = await pool.query('DELETE FROM article_types WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
