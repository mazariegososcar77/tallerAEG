// Este archivo recibe las peticiones web relacionadas a los PERMISOS del sistema (la lista
// de acciones que se le pueden asignar a un rol, como "crear cliente" o "borrar artículo").
import * as permissionService from '../services/permissionService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Cuando el usuario abre la pantalla de Roles y Permisos, esto trae la lista completa de
// permisos disponibles para poder marcarlos/desmarcarlos en un rol.
export const list = asyncHandler(async (_req, res) => {
  res.json(await permissionService.list());
});
