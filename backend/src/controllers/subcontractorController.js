// Este archivo recibe las peticiones web relacionadas a SUBCONTRATISTAS (los terceros
// externos a los que el taller les manda trabajos afuera): verlos, crearlos, editarlos, borrarlos.
import * as subcontractorService from '../services/subcontractorService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Cuando el usuario abre la pantalla de Configuración > Subcontratistas, esto trae la lista completa.
export const list = asyncHandler(async (_req, res) => {
  res.json(await subcontractorService.list());
});
// Trae los datos de un subcontratista en particular.
export const getById = asyncHandler(async (req, res) => {
  res.json(await subcontractorService.getById(req.params.id));
});
// Cuando el usuario crea un subcontratista nuevo desde el formulario, esto lo guarda.
export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await subcontractorService.create(req.body));
});
// Cuando el usuario edita un subcontratista y guarda los cambios, esto los aplica.
export const update = asyncHandler(async (req, res) => {
  res.json(await subcontractorService.update(req.params.id, req.body));
});
// Cuando el usuario borra un subcontratista, esto lo elimina.
export const remove = asyncHandler(async (req, res) => {
  await subcontractorService.remove(req.params.id);
  res.status(204).end();
});
