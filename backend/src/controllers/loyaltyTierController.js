// Este archivo recibe las peticiones web relacionadas a los NIVELES DE FIDELIZACIÓN de
// clientes (catálogo configurable con su descuento, beneficios, color e icono): verlos, crearlos, editarlos, borrarlos.
import * as loyaltyTierService from '../services/loyaltyTierService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Cuando el usuario abre la pantalla de Configuración > niveles de fidelización, esto trae la lista completa.
export const list = asyncHandler(async (_req, res) => {
  res.json(await loyaltyTierService.list());
});
// Trae los datos de un nivel de fidelización en particular.
export const getById = asyncHandler(async (req, res) => {
  res.json(await loyaltyTierService.getById(req.params.id));
});
// Cuando el usuario crea un nivel de fidelización nuevo desde el formulario, esto lo guarda.
export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await loyaltyTierService.create(req.body));
});
// Cuando el usuario edita un nivel de fidelización y guarda los cambios, esto los aplica.
export const update = asyncHandler(async (req, res) => {
  res.json(await loyaltyTierService.update(req.params.id, req.body));
});
// Cuando el usuario borra un nivel de fidelización, esto lo elimina.
export const remove = asyncHandler(async (req, res) => {
  await loyaltyTierService.remove(req.params.id);
  res.status(204).end();
});
