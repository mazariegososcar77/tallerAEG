// Este archivo guarda los TIPOS DE EQUIPO: el catálogo que alimenta las casillas "Tipo de
// equipo" de las Órdenes de Trabajo y de Servicio, agrupadas por categoría. Se administra
// desde Configuración.
import pool from '../lib/db.js';

// Trae todos los tipos, ordenados por categoría y nombre.
export async function getAll() {
  const [rows] = await pool.query('SELECT * FROM equipment_types ORDER BY category, name');
  return rows;
}
// Busca un tipo por su id. Si no existe, devuelve null.
export async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM equipment_types WHERE id = ?', [id]);
  return rows[0] || null;
}
// Dice si ya existe un tipo con ese código (para generar uno único).
export async function codeExists(code) {
  const [rows] = await pool.query('SELECT 1 FROM equipment_types WHERE code = ?', [code]);
  return rows.length > 0;
}
// Guarda un tipo nuevo y devuelve el registro creado.
export async function create({ code, name, category, is_active = true }) {
  const [result] = await pool.query(
    'INSERT INTO equipment_types (code, name, category, is_active) VALUES (?, ?, ?, ?)',
    [code, name, category, is_active ? 1 : 0]
  );
  return findById(result.insertId);
}
// Actualiza solo los datos indicados (patch). El código nunca cambia.
export async function update(id, patch) {
  const fields = Object.keys(patch).map(k => k + ' = ?').join(', ');
  await pool.query('UPDATE equipment_types SET ' + fields + ' WHERE id = ?', [...Object.values(patch), id]);
  return findById(id);
}
// Elimina un tipo. Devuelve true si sí se borró algo.
export async function remove(id) {
  const [result] = await pool.query('DELETE FROM equipment_types WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
