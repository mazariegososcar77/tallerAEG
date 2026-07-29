// Este archivo maneja los ROLES de usuario (ej. "Administrador", "Tecnico") y que
// permisos tiene cada uno. Un rol agrupa un conjunto de permisos; a cada usuario
// se le asigna un rol, no permisos sueltos.
import * as roleRepository from '../repositories/roleRepository.js';
import * as permissionRepository from '../repositories/permissionRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import pool from '../lib/db.js';
import { ApiError } from '../utils/ApiError.js';

// Arma la "ficha" publica de un rol, incluyendo la lista de ids de permisos que
// tiene asignados.
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

// Revisa que todos los ids de permisos que se quieren asignar realmente existan
// en el sistema; si viene algun id invalido, rechaza la operacion.
async function validatePermissionIds(permissionIds = []) {
  const unique = [...new Set(permissionIds.map(Number))];
  // Un rol sin ningun permiso es valido (ej. mientras se termina de configurar) --
  // "IN ()" con un arreglo vacio es sintaxis invalida en MySQL, asi que se corta
  // aqui antes de armar la consulta en vez de dejarla tronar con un 500.
  if (unique.length === 0) return unique;
  const [rows] = await pool.query('SELECT id FROM permissions WHERE id IN (?)', [unique]);
  if (rows.length !== unique.length) throw new ApiError(400, 'Uno o mas permisos no existen');
  return unique;
}

// Reemplaza por completo la lista de permisos de un rol: borra los que tenia y
// guarda los nuevos (asi no hay que calcular cuales agregar/quitar uno por uno).
async function setPermissions(roleId, permissionIds) {
  await pool.query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
  if (permissionIds.length > 0) {
    const values = permissionIds.map(pid => [roleId, pid]);
    await pool.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [values]);
  }
}

// Devuelve todos los roles, cada uno con su lista de permisos.
export async function list() {
  const roles = await roleRepository.getAll();
  return Promise.all(roles.map(toPublic));
}

// Busca un rol por id. Si no existe, avisa con un error.
export async function getById(id) {
  const role = await roleRepository.findById(id);
  if (!role) throw new ApiError(404, 'Rol no encontrado');
  return toPublic(role);
}

// Crea un rol nuevo. No deja crear dos roles con el mismo nombre. Si se indican
// permisos, se los asigna de una vez.
export async function create({ name, description = '', permissions }) {
  const [existing] = await pool.query('SELECT id FROM roles WHERE name = ?', [name]);
  if (existing[0]) throw new ApiError(409, 'Ya existe un rol con ese nombre');
  const role = await roleRepository.create({ name, description });
  try {
    if (Array.isArray(permissions)) {
      await setPermissions(role.id, await validatePermissionIds(permissions));
    }
  } catch (err) {
    // Si fallo asignando permisos, no dejar el rol huerfano a medio crear --
    // el usuario ve el error y puede reintentar sin encontrarse un rol
    // duplicado/vacio que ya "existe" por dentro aunque la API haya fallado.
    await roleRepository.remove(role.id);
    throw err;
  }
  return toPublic(await roleRepository.findById(role.id));
}

// Edita el nombre/descripcion/estado activo de un rol. Si se cambia el nombre,
// verifica que no choque con el de otro rol ya existente.
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

// Cambia la lista de permisos asignados a un rol (lo que decide que puede hacer
// cualquier usuario que tenga ese rol).
export async function updatePermissions(id, permissionIds) {
  if (!await roleRepository.findById(id)) throw new ApiError(404, 'Rol no encontrado');
  await setPermissions(id, await validatePermissionIds(permissionIds));
  return toPublic(await roleRepository.findById(id));
}

// Elimina un rol. No deja borrar un rol si todavia hay usuarios que lo tienen
// asignado, para que ningun usuario se quede sin rol.
export async function remove(id) {
  const existing = await roleRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Rol no encontrado');
  const count = await userRepository.countByRoleId(id);
  if (count > 0) throw new ApiError(409, 'No se puede eliminar: hay usuarios con este rol asignado');
  await roleRepository.remove(id);
}
