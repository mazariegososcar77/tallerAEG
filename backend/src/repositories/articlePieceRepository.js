// Este archivo guarda las PIEZAS que componen un artículo del inventario (por ejemplo,
// los repuestos que forman parte de un motor). Cada fila de "article_pieces" pertenece
// a un artículo (article_id).
import pool from '../lib/db.js';

// Trae todas las piezas de todos los artículos.
export async function getAll() {
  const [rows] = await pool.query('SELECT * FROM article_pieces');
  return rows;
}
// Busca una pieza por su id. Si no existe, devuelve null.
export async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM article_pieces WHERE id = ?', [id]);
  return rows[0] || null;
}
// Guarda una nueva pieza en la base de datos y devuelve el registro ya creado.
export async function create(data) {
  const fields = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const values = Object.values(data);
  const [result] = await pool.query('INSERT INTO article_pieces (' + fields + ') VALUES (' + placeholders + ')', values);
  return findById(result.insertId);
}
// Actualiza solo los datos indicados (patch) de una pieza existente.
export async function update(id, patch) {
  const fields = Object.keys(patch).map(k => k + ' = ?').join(', ');
  const values = Object.values(patch);
  await pool.query('UPDATE article_pieces SET ' + fields + ' WHERE id = ?', [...values, id]);
  return findById(id);
}
// Elimina una pieza. Devuelve true si sí se borró algo, false si no existía.
export async function remove(id) {
  const [result] = await pool.query('DELETE FROM article_pieces WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
// Trae las piezas de un articulo especifico.
export async function findByArticleId(articleId) {
  const [rows] = await pool.query('SELECT * FROM article_pieces WHERE article_id = ?', [articleId]);
  return rows;
}
// Reemplaza por completo la lista de piezas de un articulo: borra las que
// tenia y guarda los nombres nuevos (asi no hay que calcular cuales
// agregar/quitar uno por uno cada vez que se edita el articulo).
export async function replaceForArticle(articleId, names = []) {
  await pool.query('DELETE FROM article_pieces WHERE article_id = ?', [articleId]);
  const clean = names.map(n => (n || '').trim()).filter(Boolean);
  if (clean.length > 0) {
    const values = clean.map(name => [articleId, name]);
    await pool.query('INSERT INTO article_pieces (article_id, name) VALUES ?', [values]);
  }
}
