/** Acceso a datos de bodegas. Unico punto que conoce el origen (hoy JSON). */
import { readCollection, writeCollection, nextId, now } from '../lib/jsonStore.js';

const COLLECTION = 'warehouses';

export function getAll() {
  return readCollection(COLLECTION);
}

export function findById(id) {
  return getAll().find((w) => w.id === Number(id)) || null;
}

export function findByName(name) {
  const target = String(name).toLowerCase().trim();
  return getAll().find((w) => w.name.toLowerCase() === target) || null;
}

export function create({ name, description = '', color = '#16285C', is_active = true }) {
  const rows = getAll();
  const timestamp = now();
  const warehouse = {
    id: nextId(rows),
    name: name.trim(),
    description,
    color,
    is_active,
    created_at: timestamp,
    updated_at: timestamp,
  };
  rows.push(warehouse);
  writeCollection(COLLECTION, rows);
  return warehouse;
}

export function update(id, patch) {
  const rows = getAll();
  const index = rows.findIndex((w) => w.id === Number(id));
  if (index === -1) return null;
  const updated = { ...rows[index], ...patch, id: rows[index].id, updated_at: now() };
  rows[index] = updated;
  writeCollection(COLLECTION, rows);
  return updated;
}

export function remove(id) {
  const rows = getAll();
  const next = rows.filter((w) => w.id !== Number(id));
  if (next.length === rows.length) return false;
  writeCollection(COLLECTION, next);
  return true;
}
