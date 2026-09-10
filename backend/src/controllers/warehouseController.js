// Este archivo recibe las peticiones web relacionadas a BODEGAS (los lugares donde se
// guardan los artículos del inventario): verlas, crearlas, editarlas, borrarlas.
import * as warehouseService from '../services/warehouseService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Cuando el usuario abre la pantalla de Configuración > bodegas, esto trae la lista completa.
export const list = asyncHandler(async (_req, res) => {
  res.json(await warehouseService.list());
});
// Trae los datos de una bodega en particular.
export const getById = asyncHandler(async (req, res) => {
  res.json(await warehouseService.getById(req.params.id));
});
// Cuando el usuario crea una bodega nueva desde el formulario, esto la guarda.
export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await warehouseService.create(req.body));
});
// Cuando el usuario edita una bodega y guarda los cambios, esto los aplica.
export const update = asyncHandler(async (req, res) => {
  res.json(await warehouseService.update(req.params.id, req.body));
});
// Cuando el usuario borra una bodega, esto la elimina.
export const remove = asyncHandler(async (req, res) => {
  await warehouseService.remove(req.params.id);
  res.status(204).end();
});
