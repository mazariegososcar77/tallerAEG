/**
 * Acceso a datos de permisos. Los permisos son catalogo fijo (se crean en el seed),
 * por eso aqui solo hay lectura.
 */
import { readCollection } from '../lib/jsonStore.js';

const COLLECTION = 'permissions';

export function getAll() {
  return readCollection(COLLECTION);
}

export function findById(id) {
  return getAll().find((p) => p.id === Number(id)) || null;
}

export function findByIds(ids) {
  const set = new Set(ids.map(Number));
  return getAll().filter((p) => set.has(p.id));
}

export function findByCodes(codes) {
  const set = new Set(codes);
  return getAll().filter((p) => set.has(p.code));
}
