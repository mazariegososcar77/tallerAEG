// Este archivo guarda la MANO DE OBRA de un artículo del inventario: la lista de trabajos
// (por ejemplo "Rebobinado", "Balanceo") que se pueden cobrar cuando se usa ese artículo.
// Cada fila de la tabla "article_labor" pertenece a un artículo (article_id).
import pool from '../lib/db.js';

// Trae todas las manos de obra de todos los artículos (sin filtrar por ninguno en particular).
export async function getAll() {
  const [rows] = await pool.query('SELECT * FROM article_labor');
  return rows;
}
// Busca una mano de obra por su id. Si no existe, devuelve null.
export async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM article_labor WHERE id = ?', [id]);
  return rows[0] || null;
}
// Guarda una nueva mano de obra en la base de datos y devuelve el registro ya creado.
export async function create(data) {
  const fields = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const values = Object.values(data);
  const [result] = await pool.query('INSERT INTO article_labor (' + fields + ') VALUES (' + placeholders + ')', values);
  return findById(result.insertId);
}
// Actualiza solo los datos indicados (patch) de una mano de obra existente.
export async function update(id, patch) {
  const fields = Object.keys(patch).map(k => k + ' = ?').join(', ');
  const values = Object.values(patch);
  await pool.query('UPDATE article_labor SET ' + fields + ' WHERE id = ?', [...values, id]);
  return findById(id);
}
// Elimina una mano de obra. Devuelve true si sí se borró algo, false si no existía.
export async function remove(id) {
  const [result] = await pool.query('DELETE FROM article_labor WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
// Trae la mano de obra de un articulo especifico.
export async function findByArticleId(articleId) {
  const [rows] = await pool.query('SELECT * FROM article_labor WHERE article_id = ?', [articleId]);
  return rows;
}
// Reemplaza por completo la lista de mano de obra de un articulo: borra la que
// tenia y guarda los nombres nuevos (asi no hay que calcular cuales
// agregar/quitar uno por uno cada vez que se edita el articulo).
export async function replaceForArticle(articleId, names = []) {
  await pool.query('DELETE FROM article_labor WHERE article_id = ?', [articleId]);
  const clean = names.map(n => (n || '').trim()).filter(Boolean);
  if (clean.length > 0) {
    const values = clean.map(name => [articleId, name]);
    await pool.query('INSERT INTO article_labor (article_id, name) VALUES ?', [values]);
  }
}
