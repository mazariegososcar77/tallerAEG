// Este archivo maneja el INICIO DE SESION (login) y quien es el usuario conectado.
// Verifica el correo y la contrasena, arma el "perfil" del usuario (nombre, rol y
// permisos que tiene) y genera el token con el que el sistema lo reconoce despues
// en cada pantalla, sin pedirle la contrasena de nuevo en cada clic.
import * as userRepository from '../repositories/userRepository.js';
import * as permissionRepository from '../repositories/permissionRepository.js';
import pool from '../lib/db.js';
import { comparePassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';

// Busca el rol de un usuario (ej: "Administrador", "Tecnico") y la lista de permisos
// que ese rol tiene autorizados.
async function getRoleWithPermissions(roleId) {
  const [roles] = await pool.query('SELECT * FROM roles WHERE id = ?', [roleId]);
  const role = roles[0] || null;
  const permissions = await permissionRepository.findByRoleId(roleId);
  return { role, permissions };
}

// Arma la "ficha" publica de un usuario (nombre, correo, rol y que puede hacer en el
// sistema) para mandarla al frontend. Nunca incluye la contrasena.
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

// Revisa el correo y la contrasena para dejar entrar (o no) a un usuario.
// Si el usuario no existe, esta desactivado, o la contrasena no coincide, rechaza
// el ingreso sin decir cual de las dos cosas fallo (por seguridad, no se le da esa
// pista a alguien que intenta adivinar). Si todo esta bien, entrega un token de
// acceso que el sistema usara para reconocerlo en cada pantalla.
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

// Devuelve los datos del usuario que esta usando el sistema en este momento
// (se usa, por ejemplo, para mostrar su nombre arriba a la derecha). Si el usuario
// fue desactivado mientras tenia la sesion abierta, se le cierra el acceso.
export async function getMe(userId) {
  const user = await userRepository.findById(userId);
  if (!user || !user.is_active) {
    throw new ApiError(401, 'Sesion invalida');
  }
  return buildUserProfile(user);
}
