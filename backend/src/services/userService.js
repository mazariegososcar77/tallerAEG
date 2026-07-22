// Este archivo maneja los USUARIOS que pueden entrar al sistema (nombre, correo,
// contrasena y a que rol pertenecen). Aqui se controla que no se repita un correo,
// que el rol asignado exista, y que nadie pueda eliminarse a si mismo por error.
import * as userRepository from '../repositories/userRepository.js';
import pool from '../lib/db.js';
import { hashPassword } from '../utils/password.js';
import { ApiError } from '../utils/ApiError.js';

// Arma la "ficha" publica de un usuario con el nombre de su rol incluido.
// Nunca incluye la contrasena (ni siquiera cifrada).
async function toPublic(user) {
  const [roles] = await pool.query('SELECT * FROM roles WHERE id = ?', [user.role_id]);
  const role = roles[0] || null;
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

// Verifica que el rol que se le quiere asignar a un usuario realmente exista.
async function assertRoleExists(roleId) {
  const [rows] = await pool.query('SELECT id FROM roles WHERE id = ?', [roleId]);
  if (!rows[0]) throw new ApiError(400, 'El rol indicado no existe');
}

// Devuelve la lista completa de usuarios.
export async function list() {
  const users = await userRepository.getAll();
  return Promise.all(users.map(toPublic));
}

// Busca un usuario por id. Si no existe, avisa con un error.
export async function getById(id) {
  const user = await userRepository.findById(id);
  if (!user) throw new ApiError(404, 'Usuario no encontrado');
  return toPublic(user);
}

// Crea un usuario nuevo. No deja repetir un correo ya usado por otro usuario, y
// confirma que el rol indicado exista. La contrasena se guarda cifrada, nunca en
// texto plano.
export async function create({ name, email, password, role_id, is_active = true }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) throw new ApiError(409, 'Ya existe un usuario con ese correo');
  await assertRoleExists(role_id);
  const password_hash = await hashPassword(password);
  const user = await userRepository.create({ name, email, password_hash, role_id, is_active });
  return toPublic(user);
}

// Edita un usuario existente. Si se cambia el correo, verifica que no choque con
// el de otro usuario. Si se cambia el rol, confirma que exista. Si se manda una
// contrasena nueva, se vuelve a cifrar; si se deja en blanco, se conserva la
// contrasena anterior (no se borra sin querer).
export async function update(id, { name, email, password, role_id, is_active }) {
  const existing = await userRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Usuario no encontrado');
  if (email && email.toLowerCase().trim() !== existing.email) {
    const clash = await userRepository.findByEmail(email);
    if (clash && clash.id !== existing.id) throw new ApiError(409, 'Ya existe un usuario con ese correo');
  }
  if (role_id !== undefined) await assertRoleExists(role_id);
  const patch = {};
  if (name !== undefined) patch.name = name;
  if (email !== undefined) patch.email = email;
  if (role_id !== undefined) patch.role_id = Number(role_id);
  if (is_active !== undefined) patch.is_active = is_active;
  if (password && password.trim() !== '') patch.password_hash = await hashPassword(password);
  const updated = await userRepository.update(id, patch);
  return toPublic(updated);
}

// Elimina un usuario. No deja que un usuario se elimine a si mismo (para evitar
// que alguien se quede sin acceso al sistema por accidente).
export async function remove(id, currentUserId) {
  const existing = await userRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Usuario no encontrado');
  if (Number(id) === Number(currentUserId)) throw new ApiError(400, 'No puedes eliminar tu propio usuario');
  await userRepository.remove(id);
}
