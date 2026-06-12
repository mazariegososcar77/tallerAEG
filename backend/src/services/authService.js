import * as userRepository from '../repositories/userRepository.js';
import * as permissionRepository from '../repositories/permissionRepository.js';
import pool from '../lib/db.js';
import { comparePassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';

async function getRoleWithPermissions(roleId) {
  const [roles] = await pool.query('SELECT * FROM roles WHERE id = ?', [roleId]);
  const role = roles[0] || null;
  const permissions = await permissionRepository.findByRoleId(roleId);
  return { role, permissions };
}

export async function buildUserProfile(user) {
  const { role, permissions } = await getRoleWithPermissions(user.role_id);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: role ? { id: role.id, name: role.name } : null,
    permissions: permissions.map(p => p.code),
  };
}

export async function login(email, password) {
  const user = await userRepository.findByEmail(email);
  if (!user || !user.is_active) {
    throw new ApiError(401, 'Credenciales invalidas');
  }
  const ok = await comparePassword(password, user.password_hash);
  if (!ok) {
    throw new ApiError(401, 'Credenciales invalidas');
  }
  const profile = await buildUserProfile(user);
  const token = signToken({
    sub: user.id,
    roleId: user.role_id,
    permissions: profile.permissions,
  });
  return { token, user: profile };
}

export async function getMe(userId) {
  const user = await userRepository.findById(userId);
  if (!user || !user.is_active) {
    throw new ApiError(401, 'Sesion invalida');
  }
  return buildUserProfile(user);
}
