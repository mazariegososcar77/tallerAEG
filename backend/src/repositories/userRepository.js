/**
 * Acceso a datos de usuarios. Unico punto que conoce el origen (hoy JSON).
 * Para migrar a MySQL, reescribir solo este archivo manteniendo la firma.
 */
import { readCollection, writeCollection, nextId, now } from '../lib/jsonStore.js';

const COLLECTION = 'users';

export function getAll() {
  return readCollection(COLLECTION);
}

export function findById(id) {
  return getAll().find((u) => u.id === Number(id)) || null;
}

export function findByEmail(email) {
  const target = String(email).toLowerCase().trim();
  return getAll().find((u) => u.email.toLowerCase() === target) || null;
}

export function countByRoleId(roleId) {
  return getAll().filter((u) => u.role_id === Number(roleId)).length;
}

export function create({ name, email, password_hash, role_id, is_active = true }) {
  const rows = getAll();
  const timestamp = now();
  const user = {
    id: nextId(rows),
    name,
    email: email.toLowerCase().trim(),
    password_hash,
    role_id: Number(role_id),
    is_active,
    created_at: timestamp,
    updated_at: timestamp,
  };
  rows.push(user);
  writeCollection(COLLECTION, rows);
  return user;
}

export function update(id, patch) {
  const rows = getAll();
  const index = rows.findIndex((u) => u.id === Number(id));
  if (index === -1) return null;
  const updated = { ...rows[index], ...patch, id: rows[index].id, updated_at: now() };
  if (updated.email) updated.email = updated.email.toLowerCase().trim();
  rows[index] = updated;
  writeCollection(COLLECTION, rows);
  return updated;
}

export function remove(id) {
  const rows = getAll();
  const next = rows.filter((u) => u.id !== Number(id));
  if (next.length === rows.length) return false;
  writeCollection(COLLECTION, next);
  return true;
}
