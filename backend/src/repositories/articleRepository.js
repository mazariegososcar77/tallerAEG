// Este archivo guarda y consulta los ARTÍCULOS del inventario del taller: repuestos, mano de
// obra y demás productos que se pueden usar en cotizaciones y órdenes de trabajo. Cada
// artículo pertenece a un tipo (article_types) y a una bodega (warehouses).
import pool from '../lib/db.js';
import * as articlePieceRepository from './articlePieceRepository.js';
import * as articleLaborRepository from './articleLaborRepository.js';

// Trae la lista de artículos activos, opcionalmente filtrada por tipo de artículo (typeId).
// Junto con cada artículo trae también el nombre de su tipo y el nombre de su bodega,
// para no tener que buscarlos por separado.
export async function getAll(typeId = null) {
  if (typeId) {
    const [rows] = await pool.query(
      'SELECT a.*, at.name as type_name, w.name as warehouse_name FROM articles a LEFT JOIN article_types at ON a.type_id = at.id LEFT JOIN warehouses w ON a.warehouse_id = w.id WHERE a.type_id = ? AND a.is_active = 1 ORDER BY a.name',
      [typeId]
    );
    return rows;
  }
  const [rows] = await pool.query(
    'SELECT a.*, at.name as type_name, w.name as warehouse_name FROM articles a LEFT JOIN article_types at ON a.type_id = at.id LEFT JOIN warehouses w ON a.warehouse_id = w.id ORDER BY a.name'
  );
  return rows;
}
// Busca un artículo por su id, junto con su lista de piezas y mano de obra. Si no existe, devuelve null.
export async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM articles WHERE id = ?', [id]);
  const article = rows[0];
  if (!article) return null;
  article.pieces = await articlePieceRepository.findByArticleId(id);
  article.labor = await articleLaborRepository.findByArticleId(id);
  return article;
}
// Guarda un nuevo artículo en la base de datos y devuelve el registro ya creado.
export async function create(data) {
  const fields = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const values = Object.values(data);
  const [result] = await pool.query('INSERT INTO articles (' + fields + ') VALUES (' + placeholders + ')', values);
  return findById(result.insertId);
}
// Actualiza solo los datos indicados (patch) de un artículo existente.
export async function update(id, patch) {
  const fields = Object.keys(patch).map(k => k + ' = ?').join(', ');
  const values = Object.values(patch);
  await pool.query('UPDATE articles SET ' + fields + ' WHERE id = ?', [...values, id]);
  return findById(id);
}
// Elimina un artículo. Devuelve true si sí se borró algo, false si no existía.
export async function remove(id) {
  const [result] = await pool.query('DELETE FROM articles WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
