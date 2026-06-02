/** Logica de negocio de articulos del inventario (CRUD + carga masiva). */
import * as articleRepository from '../repositories/articleRepository.js';
import * as articleTypeRepository from '../repositories/articleTypeRepository.js';
import * as warehouseRepository from '../repositories/warehouseRepository.js';
import { ApiError } from '../utils/ApiError.js';

/** Forma publica: agrega type_name y warehouse_name resueltos. */
function toPublic(article) {
  const type = articleTypeRepository.findById(article.type_id);
  const warehouse = warehouseRepository.findById(article.warehouse_id);
  return {
    ...article,
    type_name: type ? type.name : null,
    warehouse_name: warehouse ? warehouse.name : null,
    warehouse_color: warehouse ? warehouse.color || '' : '',
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
  if (articleRepository.findByCode(data.code)) {
    throw new ApiError(409, 'Ya existe un articulo con ese codigo');
  }
  assertRefs(data.type_id, data.warehouse_id);
  return toPublic(articleRepository.create(data));
}

export function update(id, data) {
  const existing = articleRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Articulo no encontrado');

  if (data.code && data.code.toLowerCase().trim() !== existing.code.toLowerCase()) {
    const clash = articleRepository.findByCode(data.code);
    if (clash && clash.id !== existing.id) {
      throw new ApiError(409, 'Ya existe un articulo con ese codigo');
    }
  }
  const typeId = data.type_id ?? existing.type_id;
  const warehouseId = data.warehouse_id ?? existing.warehouse_id;
  assertRefs(typeId, warehouseId);

  const patch = { ...data };
  if (patch.type_id !== undefined) patch.type_id = Number(patch.type_id);
  if (patch.warehouse_id !== undefined) patch.warehouse_id = Number(patch.warehouse_id);
  return toPublic(articleRepository.update(id, patch));
}

export function remove(id) {
  if (!articleRepository.findById(id)) throw new ApiError(404, 'Articulo no encontrado');
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
