// Este archivo guarda las CATEGORÍAS DE PIEZA: el catálogo que agrupa los repuestos por
// tipo (por ejemplo "Rodamientos", "Cables"), cada una con un prefijo de código
// (por ejemplo "ROD") que se usa para generar códigos correlativos de artículos.
import pool from '../lib/db.js';

// Trae todas las categorías de pieza, ordenadas por nombre.
export async function getAll() {
  const [rows] = await pool.query('SELECT * FROM part_categories ORDER BY name');
  return rows;
}

// Busca una categoría de pieza por su id. Si no existe, devuelve null.
export async function findById(id) {
  const [[row]] = await pool.query('SELECT * FROM part_categories WHERE id = ?', [id]);
  return row || null;
}

// Calcula el siguiente código disponible para un artículo de esta categoría, buscando
// entre los artículos existentes cuál es el número más alto usado con ese prefijo
// (por ejemplo "ROD-0001", "ROD-0002") y devolviendo el que sigue, relleno con ceros
// a la izquierda (por ejemplo "ROD-0003").
export async function getNextCode(prefix) {
  const [[row]] = await pool.query(
    "SELECT MAX(CAST(SUBSTRING(code, LENGTH(?) + 2) AS UNSIGNED)) as max_num FROM articles WHERE code LIKE ?",
    [prefix, prefix + '-%']
  );
  const next = (row.max_num || 0) + 1;
  return prefix + '-' + String(next).padStart(4, '0');
}

// Guarda una nueva categoría de pieza (el prefijo siempre se guarda en mayúsculas).
export async function create(data) {
  const [result] = await pool.query(
    'INSERT INTO part_categories (name, prefix, is_active) VALUES (?, ?, ?)',
    [data.name, data.prefix.toUpperCase(), data.is_active ?? 1]
  );
  return findById(result.insertId);
}

// Actualiza solo los datos indicados de una categoría de pieza existente.
export async function update(id, data) {
  const fields = Object.keys(data).map(k => k + ' = ?').join(', ');
  await pool.query('UPDATE part_categories SET ' + fields + ' WHERE id = ?', [...Object.values(data), id]);
  return findById(id);
}

// Elimina una categoría de pieza. Devuelve true si sí se borró algo, false si no existía.
export async function remove(id) {
  const [result] = await pool.query('DELETE FROM part_categories WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
