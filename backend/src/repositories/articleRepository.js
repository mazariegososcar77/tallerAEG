/** Acceso a datos de articulos del inventario. Unico punto que conoce el origen (hoy JSON). */
import { readCollection, writeCollection, nextId, now } from '../lib/jsonStore.js';

const COLLECTION = 'articles';

export function getAll() {
  return readCollection(COLLECTION);
}

export function findById(id) {
  return getAll().find((a) => a.id === Number(id)) || null;
}

export function findByCode(code) {
  const target = String(code).toLowerCase().trim();
  return getAll().find((a) => a.code.toLowerCase() === target) || null;
}

export function countByTypeId(typeId) {
  return getAll().filter((a) => a.type_id === Number(typeId)).length;
}

export function countByWarehouseId(warehouseId) {
  return getAll().filter((a) => a.warehouse_id === Number(warehouseId)).length;
}

function buildArticle(rows, data) {
  const timestamp = now();
  return {
    id: nextId(rows),
    code: data.code.trim(),
    name: data.name.trim(),
    type_id: Number(data.type_id),
    warehouse_id: Number(data.warehouse_id),
    quantity: Number(data.quantity) || 0,
    unit: data.unit || 'unidad',
    price: Number(data.price) || 0,
    brand: data.brand || '',
    model: data.model || '',
    location: data.location || '',
    description: data.description || '',
    image_url: data.image_url || '',
    is_active: data.is_active ?? true,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export function create(data) {
  const rows = getAll();
  const article = buildArticle(rows, data);
  rows.push(article);
  writeCollection(COLLECTION, rows);
  return article;
}

/** Inserta varios articulos en una sola escritura (carga masiva). */
export function createMany(items) {
  const rows = getAll();
  const created = [];
  for (const data of items) {
    const article = buildArticle(rows, data);
    rows.push(article);
    created.push(article);
  }
  writeCollection(COLLECTION, rows);
  return created;
}

export function update(id, patch) {
  const rows = getAll();
  const index = rows.findIndex((a) => a.id === Number(id));
  if (index === -1) return null;
  const updated = { ...rows[index], ...patch, id: rows[index].id, updated_at: now() };
  rows[index] = updated;
  writeCollection(COLLECTION, rows);
  return updated;
}

export function remove(id) {
  const rows = getAll();
  const next = rows.filter((a) => a.id !== Number(id));
  if (next.length === rows.length) return false;
  writeCollection(COLLECTION, next);
  return true;
}
