/** Acceso a datos de tipos de articulo. Unico punto que conoce el origen (hoy JSON). */
import { readCollection, writeCollection, nextId, now } from '../lib/jsonStore.js';

const COLLECTION = 'article_types';

export function getAll() {
  return readCollection(COLLECTION);
}

export function findById(id) {
  return getAll().find((t) => t.id === Number(id)) || null;
}

export function findByName(name) {
  const target = String(name).toLowerCase().trim();
  return getAll().find((t) => t.name.toLowerCase() === target) || null;
}

export function create({ name, description = '', is_active = true }) {
  const rows = getAll();
  const timestamp = now();
  const type = {
    id: nextId(rows),
    name: name.trim(),
    description,
    is_active,
    created_at: timestamp,
    updated_at: timestamp,
  };
  rows.push(type);
  writeCollection(COLLECTION, rows);
  return type;
}

export function update(id, patch) {
  const rows = getAll();
  const index = rows.findIndex((t) => t.id === Number(id));
  if (index === -1) return null;
  const updated = { ...rows[index], ...patch, id: rows[index].id, updated_at: now() };
  rows[index] = updated;
  writeCollection(COLLECTION, rows);
  return updated;
}

export function remove(id) {
  const rows = getAll();
  const next = rows.filter((t) => t.id !== Number(id));
  if (next.length === rows.length) return false;
  writeCollection(COLLECTION, next);
  return true;
}
