/** Logica de negocio de articulos del inventario (CRUD + carga masiva). */
import * as articleRepository from '../repositories/articleRepository.js';
import * as articlePieceRepository from '../repositories/articlePieceRepository.js';
import * as articleLaborRepository from '../repositories/articleLaborRepository.js';
import * as articleTypeRepository from '../repositories/articleTypeRepository.js';
import * as warehouseRepository from '../repositories/warehouseRepository.js';
import { ApiError } from '../utils/ApiError.js';

/** Forma publica: agrega type_name, warehouse_name, piezas y mano de obra del articulo. */
function toPublic(article) {
  const type = articleTypeRepository.findById(article.type_id);
  const warehouse = warehouseRepository.findById(article.warehouse_id);
  return {
    ...article,
    type_name: type ? type.name : null,
    warehouse_name: warehouse ? warehouse.name : null,
    warehouse_color: warehouse ? warehouse.color || '' : '',
    pieces: articlePieceRepository.getByArticleId(article.id),
    labor: articleLaborRepository.getByArticleId(article.id),
  };
}

function assertRefs(typeId, warehouseId) {
  if (!articleTypeRepository.findById(typeId)) throw new ApiError(400, 'El tipo de articulo no existe');
  if (!warehouseRepository.findById(warehouseId)) throw new ApiError(400, 'La bodega no existe');
}

export function list() {
  return articleRepository.getAll().map(toPublic);
}

export function getById(id) {
  const article = articleRepository.findById(id);
  if (!article) throw new ApiError(404, 'Articulo no encontrado');
  return toPublic(article);
}

export function create(data) {
  // Piezas y mano de obra viajan en el mismo payload pero se guardan en sus propias colecciones.
  const { pieces, labor, ...articleData } = data;
  if (articleRepository.findByCode(articleData.code)) {
    throw new ApiError(409, 'Ya existe un articulo con ese codigo');
  }
  assertRefs(articleData.type_id, articleData.warehouse_id);
  const article = articleRepository.create(articleData);
  if (pieces) articlePieceRepository.replaceForArticle(article.id, pieces);
  if (labor) articleLaborRepository.replaceForArticle(article.id, labor);
  return toPublic(article);
}

export function update(id, data) {
  const { pieces, labor, ...articleData } = data;
  const existing = articleRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Articulo no encontrado');

  if (articleData.code && articleData.code.toLowerCase().trim() !== existing.code.toLowerCase()) {
    const clash = articleRepository.findByCode(articleData.code);
    if (clash && clash.id !== existing.id) {
      throw new ApiError(409, 'Ya existe un articulo con ese codigo');
    }
  }
  const typeId = articleData.type_id ?? existing.type_id;
  const warehouseId = articleData.warehouse_id ?? existing.warehouse_id;
  assertRefs(typeId, warehouseId);

  const patch = { ...articleData };
  if (patch.type_id !== undefined) patch.type_id = Number(patch.type_id);
  if (patch.warehouse_id !== undefined) patch.warehouse_id = Number(patch.warehouse_id);
  const updated = articleRepository.update(id, patch);
  // Solo se sincronizan si el cliente las envio (undefined = no tocar).
  if (pieces !== undefined) articlePieceRepository.replaceForArticle(id, pieces);
  if (labor !== undefined) articleLaborRepository.replaceForArticle(id, labor);
  return toPublic(updated);
}

export function remove(id) {
  if (!articleRepository.findById(id)) throw new ApiError(404, 'Articulo no encontrado');
  articlePieceRepository.removeByArticleId(id);
  articleLaborRepository.removeByArticleId(id);
  articleRepository.remove(id);
}

/**
 * Carga masiva. Cada item trae el tipo y la bodega por NOMBRE.
 * Valida fila por fila; inserta las validas y devuelve un resumen con los errores.
 */
export function bulkCreate(items) {
  const errors = [];
  const valid = [];
  // codigos ya existentes + los que vayan apareciendo en el lote (para detectar duplicados)
  const seenCodes = new Set(articleRepository.getAll().map((a) => a.code.toLowerCase()));

  items.forEach((row, i) => {
    const line = i + 2; // fila 1 = encabezados del Excel
    try {
      valid.push(validateBulkRow(row, seenCodes));
    } catch (err) {
      errors.push({ row: line, message: err.message });
    }
  });

  const created = valid.length ? articleRepository.createMany(valid) : [];
  return { created: created.length, errors };
}

function validateBulkRow(row, seenCodes) {
  const code = String(row.code || '').trim();
  const name = String(row.name || '').trim();
  if (!code) throw new Error('El codigo es obligatorio');
  if (name.length < 2) throw new Error('El nombre es obligatorio (min 2 caracteres)');
  if (seenCodes.has(code.toLowerCase())) throw new Error(`Codigo duplicado: ${code}`);

  const type = articleTypeRepository.findByName(row.type);
  if (!type) throw new Error(`Tipo no encontrado: "${row.type}"`);
  const warehouse = warehouseRepository.findByName(row.warehouse);
  if (!warehouse) throw new Error(`Bodega no encontrada: "${row.warehouse}"`);

  if (row.quantity !== undefined && row.quantity !== '' && Number.isNaN(Number(row.quantity))) {
    throw new Error('La cantidad debe ser numerica');
  }
  if (row.price !== undefined && row.price !== '' && Number.isNaN(Number(row.price))) {
    throw new Error('El precio debe ser numerico');
  }

  seenCodes.add(code.toLowerCase());
  return {
    code,
    name,
    type_id: type.id,
    warehouse_id: warehouse.id,
    quantity: Number(row.quantity) || 0,
    unit: row.unit || 'unidad',
    price: Number(row.price) || 0,
    brand: row.brand || '',
    model: row.model || '',
    location: row.location || '',
    description: row.description || '',
    image_url: row.image_url || '',
  };
}
