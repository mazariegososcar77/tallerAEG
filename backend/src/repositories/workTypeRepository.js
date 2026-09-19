// Este archivo guarda los TIPOS DE TRABAJO: el catálogo que alimenta el selector
// "Tipo de trabajo" de Cotizaciones y Órdenes de Trabajo. Se administra desde Configuración.
import pool from '../lib/db.js';

// Trae todos los tipos de trabajo registrados.
export async function getAll() {
  const [rows] = await pool.query('SELECT * FROM work_types');
  return rows;
}
// Busca un tipo de trabajo por su id. Si no existe, devuelve null.
export async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM work_types WHERE id = ?', [id]);
  return rows[0] || null;
}
// Guarda un nuevo tipo de trabajo (nombre y descripción) y devuelve el registro creado.
export async function create({ name, description }) {
  const [result] = await pool.query('INSERT INTO work_types (name, description) VALUES (?, ?)', [name, description]);
  return findById(result.insertId);
}
// Actualiza solo los datos indicados (patch) de un tipo de trabajo existente.
export async function update(id, patch) {
  const fields = Object.keys(patch).map(k => k + ' = ?').join(', ');
  const values = Object.values(patch);
  await pool.query('UPDATE work_types SET ' + fields + ' WHERE id = ?', [...values, id]);
  return findById(id);
}
// Elimina un tipo de trabajo. Devuelve true si sí se borró algo, false si no existía.
// (No hay FK que lo bloquee a proposito: quotes.work_type/work_orders.work_type guardan
// el texto elegido, no una referencia a este catalogo -- borrar un tipo no deja nada huerfano.)
export async function remove(id) {
  const [result] = await pool.query('DELETE FROM work_types WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
