/** Logica de negocio de usuarios (CRUD). */
import * as userRepository from '../repositories/userRepository.js';
import * as roleRepository from '../repositories/roleRepository.js';
import { hashPassword } from '../utils/password.js';
import { ApiError } from '../utils/ApiError.js';

/** Mapea un usuario a su forma publica: sin hash y con el nombre del rol. */
function toPublic(user) {
  const role = roleRepository.findById(user.role_id);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role_id: user.role_id,
    role_name: role ? role.name : null,
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

function assertRoleExists(roleId) {
  if (!roleRepository.findById(roleId)) {
    throw new ApiError(400, 'El rol indicado no existe');
  }
}

export function list() {
  return userRepository.getAll().map(toPublic);
}

export function getById(id) {
  const user = userRepository.findById(id);
  if (!user) throw new ApiError(404, 'Usuario no encontrado');
  return toPublic(user);
}

export async function create({ name, email, password, role_id, is_active = true }) {
  if (userRepository.findByEmail(email)) {
    throw new ApiError(409, 'Ya existe un usuario con ese correo');
  }
  assertRoleExists(role_id);
  const password_hash = await hashPassword(password);
  const user = userRepository.create({ name, email, password_hash, role_id, is_active });
  return toPublic(user);
}

export async function update(id, { name, email, password, role_id, is_active }) {
  const existing = userRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Usuario no encontrado');

  if (email && email.toLowerCase().trim() !== existing.email) {
    const clash = userRepository.findByEmail(email);
    if (clash && clash.id !== existing.id) {
      throw new ApiError(409, 'Ya existe un usuario con ese correo');
    }
  }
  if (role_id !== undefined) assertRoleExists(role_id);

  const patch = {};
  if (name !== undefined) patch.name = name;
  if (email !== undefined) patch.email = email;
  if (role_id !== undefined) patch.role_id = Number(role_id);
  if (is_active !== undefined) patch.is_active = is_active;
  if (password) patch.password_hash = await hashPassword(password);

  return toPublic(userRepository.update(id, patch));
}

export function remove(id, currentUserId) {
  const existing = userRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Usuario no encontrado');
  if (Number(id) === Number(currentUserId)) {
    throw new ApiError(400, 'No puedes eliminar tu propio usuario');
  }
  userRepository.remove(id);
}
