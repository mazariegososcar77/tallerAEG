import * as roleRepository from '../repositories/roleRepository.js';
import * as permissionRepository from '../repositories/permissionRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import pool from '../lib/db.js';
import { ApiError } from '../utils/ApiError.js';

async function toPublic(role) {
  const permissions = await permissionRepository.findByRoleId(role.id);
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    is_active: role.is_active,
    permissions: permissions.map(p => p.id),
    created_at: role.created_at,
    updated_at: role.updated_at,
  };
}

async function validatePermissionIds(permissionIds = []) {
  const unique = [...new Set(permissionIds.map(Number))];
  const [rows] = await pool.query('SELECT id FROM permissions WHERE id IN (?)', [unique]);
  if (rows.length !== unique.length) throw new ApiError(400, 'Uno o mas permisos no existen');
  return unique;
}

async function setPermissions(roleId, permissionIds) {
  await pool.query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
  if (permissionIds.length > 0) {
    const values = permissionIds.map(pid => [roleId, pid]);
    await pool.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [values]);
  }
}

export async function list() {
  const roles = await roleRepository.getAll();
  return Promise.all(roles.map(toPublic));
}

export async function getById(id) {
  const role = await roleRepository.findById(id);
  if (!role) throw new ApiError(404, 'Rol no encontrado');
  return toPublic(role);
}

export async function create({ name, description = '', permissions }) {
  const [existing] = await pool.query('SELECT id FROM roles WHERE name = ?', [name]);
  if (existing[0]) throw new ApiError(409, 'Ya existe un rol con ese nombre');
  const role = await roleRepository.create({ name, description });
  if (Array.isArray(permissions)) {
    await setPermissions(role.id, await validatePermissionIds(permissions));
  }
  return toPublic(await roleRepository.findById(role.id));
}

export async function update(id, { name, description, is_active }) {
  const existing = await roleRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Rol no encontrado');
  if (name && name.trim().toLowerCase() !== existing.name.toLowerCase()) {
    const [clash] = await pool.query('SELECT id FROM roles WHERE name = ?', [name.trim()]);
    if (clash[0] && clash[0].id !== existing.id) throw new ApiError(409, 'Ya existe un rol con ese nombre');
  }
  const patch = {};
  if (name !== undefined) patch.name = name.trim();
  if (description !== undefined) patch.description = description;
  if (is_active !== undefined) patch.is_active = is_active;
  const updated = await roleRepository.update(id, patch);
  return toPublic(updated);
}

export async function updatePermissions(id, permissionIds) {
  if (!await roleRepository.findById(id)) throw new ApiError(404, 'Rol no encontrado');
  await setPermissions(id, await validatePermissionIds(permissionIds));
  return toPublic(await roleRepository.findById(id));
}

export async function remove(id) {
  const existing = await roleRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Rol no encontrado');
  const count = await userRepository.countByRoleId(id);
  if (count > 0) throw new ApiError(409, 'No se puede eliminar: hay usuarios con este rol asignado');
  await roleRepository.remove(id);
}
