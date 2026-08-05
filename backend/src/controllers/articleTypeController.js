// Este archivo recibe las peticiones web relacionadas a los TIPOS DE ARTÍCULO (el catálogo
// configurable que se usa para clasificar los artículos del inventario): verlos, crearlos, editarlos, borrarlos.
import * as articleTypeService from '../services/articleTypeService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Cuando el usuario abre la pantalla de Configuración > tipos de artículo, esto trae la lista completa.
export const list = asyncHandler(async (_req, res) => {
  res.json(await articleTypeService.list());
});
// Trae los datos de un tipo de artículo en particular.
export const getById = asyncHandler(async (req, res) => {
  res.json(await articleTypeService.getById(req.params.id));
});
// Cuando el usuario crea un tipo de artículo nuevo desde el formulario, esto lo guarda.
export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await articleTypeService.create(req.body));
});
// Cuando el usuario edita un tipo de artículo y guarda los cambios, esto los aplica.
export const update = asyncHandler(async (req, res) => {
  res.json(await articleTypeService.update(req.params.id, req.body));
});
// Cuando el usuario borra un tipo de artículo, esto lo elimina.
export const remove = asyncHandler(async (req, res) => {
  await articleTypeService.remove(req.params.id);
  res.status(204).end();
});
