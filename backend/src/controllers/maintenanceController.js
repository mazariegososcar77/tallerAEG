// Este archivo recibe las peticiones web relacionadas al CALENDARIO DE MANTENIMIENTOS
// programados de las máquinas: verlos, crearlos, editarlos, borrarlos y consultar los próximos a vencer.
import * as maintenanceService from '../services/maintenanceService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
// Cuando el usuario abre la pantalla de Mantenimientos, esto trae la lista (se puede filtrar por cliente).
export const list = asyncHandler(async (req, res) => { res.json(await maintenanceService.list(req.query.client_id)); });
// Trae los datos de un mantenimiento programado en particular.
export const getById = asyncHandler(async (req, res) => { res.json(await maintenanceService.getById(req.params.id)); });
// Cuando el usuario programa un mantenimiento nuevo desde el formulario, esto lo guarda.
export const create = asyncHandler(async (req, res) => { res.status(201).json(await maintenanceService.create(req.body)); });
// Cuando el usuario edita un mantenimiento programado y guarda los cambios, esto los aplica.
export const update = asyncHandler(async (req, res) => { res.json(await maintenanceService.update(req.params.id, req.body)); });
// Cuando el usuario borra un mantenimiento programado, esto lo elimina.
export const remove = asyncHandler(async (req, res) => { await maintenanceService.remove(req.params.id); res.status(204).end(); });
// Trae los mantenimientos que están próximos a vencer (por defecto, dentro de los próximos 30 días).
export const upcoming = asyncHandler(async (req, res) => { res.json(await maintenanceService.getUpcoming(req.query.days || 30)); });
