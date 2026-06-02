/** Logica de negocio de roles y su asignacion de permisos. */
import * as roleRepository from '../repositories/roleRepository.js';
import * as permissionRepository from '../repositories/permissionRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import { ApiError } from '../utils/ApiError.js';

/** Forma publica de un rol, con los ids de permisos asignados. */
function toPublic(role) {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    is_active: role.is_active,
    permissions: roleRepository.getPermissionIds(role.id),
    created_at: role.created_at,
    updated_at: role.updated_at,
  };
}

/** Valida que todos los ids de permiso existan; devuelve la lista normalizada. */
function validatePermissionIds(permissionIds = []) {
  const unique = [...new Set(permissionIds.map(Number))];
  const found = permissionRepository.findByIds(unique);
  if (found.length !== unique.length) {
    throw new ApiError(400, 'Uno o mas permisos no existen');
  }
  return unique;
}

export function list() {
  return roleRepository.getAll().map(toPublic);
}

export function getById(id) {
  const role = roleRepository.findById(id);
  if (!role) throw new ApiError(404, 'Rol no encontrado');
  return toPublic(role);
}

export function create({ name, description = '', permissions }) {
  if (roleRepository.findByName(name)) {
    throw new ApiError(409, 'Ya existe un rol con ese nombre');
  }
  const role = roleRepository.create({ name, description });
  if (Array.isArray(permissions)) {
    roleRepository.setPermissions(role.id, validatePermissionIds(permissions));
  }
  return toPublic(roleRepository.findById(role.id));
}

export function update(id, { name, description, is_active }) {
  const existing = roleRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Rol no encontrado');

  if (name && name.trim().toLowerCase() !== existing.name.toLowerCase()) {
    const clash = roleRepository.findByName(name);
    if (clash && clash.id !== existing.id) {
      throw new ApiError(409, 'Ya existe un rol con ese nombre');
    }
  }

  const patch = {};
  if (name !== undefined) patch.name = name.trim();
  if (description !== undefined) patch.description = description;
  if (is_active !== undefined) patch.is_active = is_active;

  return toPublic(roleRepository.update(id, patch));
}

export function setPermissions(id, permissionIds) {
  if (!roleRepository.findById(id)) throw new ApiError(404, 'Rol no encontrado');
  roleRepository.setPermissions(id, validatePermissionIds(permissionIds));
  return toPublic(roleRepository.findById(id));
}

export function remove(id) {
  const existing = roleRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Rol no encontrado');
  if (userRepository.countByRoleId(id) > 0) {
    throw new ApiError(409, 'No se puede eliminar: hay usuarios con este rol asignado');
  }
  roleRepository.remove(id);
}
