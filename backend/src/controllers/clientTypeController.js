// Este archivo recibe las peticiones web relacionadas a los TIPOS DE CLIENTE (catálogo
// configurable para clasificar a los clientes): verlos, crearlos, editarlos, borrarlos.
import * as clientTypeService from '../services/clientTypeService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Cuando el usuario abre la pantalla de Configuración > tipos de cliente, esto trae la lista completa.
export const list = asyncHandler(async (_req, res) => {
  res.json(await clientTypeService.list());
});
// Trae los datos de un tipo de cliente en particular.
export const getById = asyncHandler(async (req, res) => {
  res.json(await clientTypeService.getById(req.params.id));
});
// Cuando el usuario crea un tipo de cliente nuevo desde el formulario, esto lo guarda.
export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await clientTypeService.create(req.body));
});
// Cuando el usuario edita un tipo de cliente y guarda los cambios, esto los aplica.
export const update = asyncHandler(async (req, res) => {
  res.json(await clientTypeService.update(req.params.id, req.body));
});
// Cuando el usuario borra un tipo de cliente, esto lo elimina.
export const remove = asyncHandler(async (req, res) => {
  await clientTypeService.remove(req.params.id);
  res.status(204).end();
});
