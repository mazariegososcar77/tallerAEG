// Este archivo recibe las peticiones web relacionadas a los TIPOS DE EQUIPO (el catálogo con
// categoría de las casillas de las órdenes): verlos, crearlos, editarlos, borrarlos.
import * as equipmentTypeService from '../services/equipmentTypeService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Trae la lista completa de tipos de equipo.
export const list = asyncHandler(async (_req, res) => {
  res.json(await equipmentTypeService.list());
});
// Cuando el usuario crea un tipo desde Configuración, esto lo guarda.
export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await equipmentTypeService.create(req.body));
});
// Cuando el usuario edita un tipo y guarda, esto aplica los cambios.
export const update = asyncHandler(async (req, res) => {
  res.json(await equipmentTypeService.update(req.params.id, req.body));
});
// Cuando el usuario borra un tipo, esto lo elimina.
export const remove = asyncHandler(async (req, res) => {
  await equipmentTypeService.remove(req.params.id);
  res.status(204).end();
});
