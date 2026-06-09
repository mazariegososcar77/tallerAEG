/** Acceso a datos de clientes. Unico punto que conoce el origen (hoy JSON). */
import { readCollection, writeCollection, nextId, now } from '../lib/jsonStore.js';

const COLLECTION = 'clients';

export function getAll() {
  return readCollection(COLLECTION);
}

export function findById(id) {
  return getAll().find((c) => c.id === Number(id)) || null;
}

/** Busca por NIT (ignora vacios). */
export function findByNit(nit) {
  const target = String(nit || '').toLowerCase().trim();
  if (!target) return null;
  return getAll().find((c) => (c.nit || '').toLowerCase() === target) || null;
}

/** Busca por DPI (ignora vacios). */
export function findByDpi(dpi) {
  const target = String(dpi || '').toLowerCase().trim();
  if (!target) return null;
  return getAll().find((c) => (c.dpi || '').toLowerCase() === target) || null;
}

export function countByTypeId(typeId) {
  return getAll().filter((c) => c.client_type_id === Number(typeId)).length;
}

export function countByLoyaltyTierId(tierId) {
  return getAll().filter((c) => c.loyalty_tier_id === Number(tierId)).length;
}

export function create(data) {
  const rows = getAll();
  const timestamp = now();
  const client = {
    id: nextId(rows),
    nit: data.nit || '',
    dpi: data.dpi || '',
    first_name: data.first_name.trim(),
    last_name: data.last_name.trim(),
    email: data.email || '',
    address: data.address || '',
    phone: data.phone.trim(),
    client_type_id: data.client_type_id ?? null,
    loyalty_tier_id: data.loyalty_tier_id ?? null,
    is_active: data.is_active ?? true,
    created_at: timestamp,
    updated_at: timestamp,
  };
  rows.push(client);
  writeCollection(COLLECTION, rows);
  return client;
}

export function update(id, patch) {
  const rows = getAll();
  const index = rows.findIndex((c) => c.id === Number(id));
  if (index === -1) return null;
  const updated = { ...rows[index], ...patch, id: rows[index].id, updated_at: now() };
  rows[index] = updated;
  writeCollection(COLLECTION, rows);
  return updated;
}

export function remove(id) {
  const rows = getAll();
  const next = rows.filter((c) => c.id !== Number(id));
  if (next.length === rows.length) return false;
  writeCollection(COLLECTION, next);
  return true;
}
