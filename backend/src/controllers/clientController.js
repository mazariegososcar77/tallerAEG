// Este archivo recibe las peticiones web relacionadas a CLIENTES: verlos, crearlos,
// editarlos, borrarlos y validarlos.
import * as clientService from '../services/clientService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Cuando el usuario abre la pantalla de Clientes, esto trae la lista completa.
export const list = asyncHandler(async (_req, res) => {
  res.json(await clientService.list());
});
// Trae los datos de un cliente en particular (para verlo o editarlo).
export const getById = asyncHandler(async (req, res) => {
  res.json(await clientService.getById(req.params.id));
});
// Cuando el usuario guarda un cliente nuevo desde el formulario completo, esto lo recibe y lo manda a guardar.
export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await clientService.create(req.body));
});
// Registra un cliente nuevo desde un formulario rápido (por ejemplo, al crear una cotización u orden sin salir de esa pantalla).
export const quickCreate = asyncHandler(async (req, res) => {
  res.status(201).json(await clientService.quickCreate(req.body));
});
// Revisa que los datos de un cliente sean válidos (por ejemplo, que no tenga NIT/DPI repetido).
export const validate = asyncHandler(async (req, res) => {
  res.json(await clientService.validate(req.params.id));
});
// Cuando el usuario edita un cliente y guarda los cambios, esto los aplica.
export const update = asyncHandler(async (req, res) => {
  res.json(await clientService.update(req.params.id, req.body));
});
// Cuando el usuario borra un cliente, esto lo elimina.
export const remove = asyncHandler(async (req, res) => {
  await clientService.remove(req.params.id);
  res.status(204).end();
});
