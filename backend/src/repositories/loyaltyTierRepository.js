/** Acceso a datos de niveles de fidelizacion. Unico punto que conoce el origen (hoy JSON). */
import { readCollection, writeCollection, nextId, now } from '../lib/jsonStore.js';

const COLLECTION = 'loyalty_tiers';

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

export function create({ name, discount = 0, benefits = '', color = '#E8551C', icon = 'award', is_active = true }) {
  const rows = getAll();
  const timestamp = now();
  const tier = {
    id: nextId(rows),
    name: name.trim(),
    discount: Number(discount) || 0,
    benefits,
    color,
    icon,
    is_active,
    created_at: timestamp,
    updated_at: timestamp,
  };
  rows.push(tier);
  writeCollection(COLLECTION, rows);
  return tier;
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
