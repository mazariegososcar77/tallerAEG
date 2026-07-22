// Este archivo recibe las peticiones web relacionadas a ROLES (los perfiles de acceso, como
// "Administrador" o "Técnico"): verlos, crearlos, editarlos, asignarles permisos y borrarlos.
import * as roleService from '../services/roleService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Cuando el usuario abre la pantalla de Roles, esto trae la lista completa.
export const list = asyncHandler(async (_req, res) => {
  res.json(await roleService.list());
});
// Trae los datos de un rol en particular.
export const getById = asyncHandler(async (req, res) => {
  res.json(await roleService.getById(req.params.id));
});
// Cuando el usuario crea un rol nuevo desde el formulario, esto lo guarda.
export const create = asyncHandler(async (req, res) => {
  const role = await roleService.create(req.body);
  res.status(201).json(role);
});
// Cuando el usuario edita un rol (por ejemplo, su nombre) y guarda los cambios, esto los aplica.
export const update = asyncHandler(async (req, res) => {
  res.json(await roleService.update(req.params.id, req.body));
});
// Cuando el usuario marca/desmarca los permisos de un rol y guarda, esto actualiza esa lista de permisos.
export const setPermissions = asyncHandler(async (req, res) => {
  res.json(await roleService.updatePermissions(req.params.id, req.body.permissions));
});
// Cuando el usuario borra un rol, esto lo elimina.
export const remove = asyncHandler(async (req, res) => {
  await roleService.remove(req.params.id);
  res.status(204).end();
});
