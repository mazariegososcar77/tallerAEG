/**
 * Acceso a datos de roles y de su relacion N:M con permisos (role_permissions).
 * Unico punto que conoce el origen (hoy JSON).
 */
import { readCollection, writeCollection, nextId, now } from '../lib/jsonStore.js';

const COLLECTION = 'roles';
const PIVOT = 'role_permissions';

export function getAll() {
  return readCollection(COLLECTION);
}

export function findById(id) {
  return getAll().find((r) => r.id === Number(id)) || null;
}

export function findByName(name) {
  const target = String(name).toLowerCase().trim();
  return getAll().find((r) => r.name.toLowerCase() === target) || null;
}

export function create({ name, description = '', is_active = true }) {
  const rows = getAll();
  const timestamp = now();
  const role = {
    id: nextId(rows),
    name: name.trim(),
    description,
    is_active,
    created_at: timestamp,
    updated_at: timestamp,
  };
  rows.push(role);
  writeCollection(COLLECTION, rows);
  return role;
}

export function update(id, patch) {
  const rows = getAll();
  const index = rows.findIndex((r) => r.id === Number(id));
  if (index === -1) return null;
  const updated = { ...rows[index], ...patch, id: rows[index].id, updated_at: now() };
  rows[index] = updated;
  writeCollection(COLLECTION, rows);
  return updated;
}

export function remove(id) {
  const rows = getAll();
  const next = rows.filter((r) => r.id !== Number(id));
  if (next.length === rows.length) return false;
  writeCollection(COLLECTION, next);
  // Limpia la relacion con permisos del rol eliminado.
  const pivot = readCollection(PIVOT).filter((rp) => rp.role_id !== Number(id));
  writeCollection(PIVOT, pivot);
  return true;
}

// --- Relacion role_permissions ---

export function getPermissionIds(roleId) {
  return readCollection(PIVOT)
    .filter((rp) => rp.role_id === Number(roleId))
    .map((rp) => rp.permission_id);
}

/** Reemplaza por completo los permisos asignados a un rol. */
export function setPermissions(roleId, permissionIds) {
  const others = readCollection(PIVOT).filter((rp) => rp.role_id !== Number(roleId));
  const fresh = permissionIds.map((pid) => ({
    role_id: Number(roleId),
    permission_id: Number(pid),
  }));
  writeCollection(PIVOT, [...others, ...fresh]);
  return getPermissionIds(roleId);
}
