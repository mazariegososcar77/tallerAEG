// Este archivo recibe las peticiones web relacionadas a los TIPOS DE TRABAJO (el catálogo
// configurable que alimenta el selector de Cotizaciones/Órdenes): verlos, crearlos, editarlos, borrarlos.
import * as workTypeService from '../services/workTypeService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Cuando el usuario abre la pantalla de Configuración > tipos de trabajo, esto trae la lista completa.
export const list = asyncHandler(async (_req, res) => {
  res.json(await workTypeService.list());
});
// Trae los datos de un tipo de trabajo en particular.
export const getById = asyncHandler(async (req, res) => {
  res.json(await workTypeService.getById(req.params.id));
});
// Cuando el usuario crea un tipo de trabajo nuevo desde el formulario, esto lo guarda.
export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await workTypeService.create(req.body));
});
// Cuando el usuario edita un tipo de trabajo y guarda los cambios, esto los aplica.
export const update = asyncHandler(async (req, res) => {
  res.json(await workTypeService.update(req.params.id, req.body));
});
// Cuando el usuario borra un tipo de trabajo, esto lo elimina.
export const remove = asyncHandler(async (req, res) => {
  await workTypeService.remove(req.params.id);
  res.status(204).end();
});
