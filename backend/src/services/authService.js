/** Logica de autenticacion: login y perfil del usuario actual. */
import * as userRepository from '../repositories/userRepository.js';
import * as roleRepository from '../repositories/roleRepository.js';
import * as permissionRepository from '../repositories/permissionRepository.js';
import { comparePassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';

/** Devuelve los codigos de permiso de un rol. */
export function getPermissionCodes(roleId) {
  const ids = roleRepository.getPermissionIds(roleId);
  return permissionRepository.findByIds(ids).map((p) => p.code);
}

/** Arma el perfil publico de un usuario (sin password_hash) con su rol y permisos. */
export function buildUserProfile(user) {
  const role = roleRepository.findById(user.role_id);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: role ? { id: role.id, name: role.name } : null,
    permissions: getPermissionCodes(user.role_id),
  };
}

export async function login(email, password) {
  const user = userRepository.findByEmail(email);
  if (!user || !user.is_active) {
    throw new ApiError(401, 'Credenciales invalidas');
  }
  const ok = await comparePassword(password, user.password_hash);
  if (!ok) {
    throw new ApiError(401, 'Credenciales invalidas');
  }

  const profile = buildUserProfile(user);
  const token = signToken({
    sub: user.id,
    roleId: user.role_id,
    permissions: profile.permissions,
  });
  return { token, user: profile };
}

export function getMe(userId) {
  const user = userRepository.findById(userId);
  if (!user || !user.is_active) {
    throw new ApiError(401, 'Sesion invalida');
  }
  return buildUserProfile(user);
}
