// Este archivo recibe las peticiones web relacionadas a MÁQUINAS (los equipos que le
// pertenecen a cada cliente): verlas, crearlas, editarlas, borrarlas.
import * as machineService from '../services/machineService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
// Cuando el usuario abre la pantalla de Máquinas, esto trae la lista (se puede filtrar por cliente).
export const list = asyncHandler(async (req, res) => { res.json(await machineService.list(req.query.client_id)); });
// Trae los datos de una máquina en particular.
export const getById = asyncHandler(async (req, res) => { res.json(await machineService.getById(req.params.id)); });
// Cuando el usuario registra una máquina nueva desde el formulario, esto la guarda.
export const create = asyncHandler(async (req, res) => { res.status(201).json(await machineService.create(req.body)); });
// Cuando el usuario edita una máquina y guarda los cambios, esto los aplica.
export const update = asyncHandler(async (req, res) => { res.json(await machineService.update(req.params.id, req.body)); });
// Cuando el usuario borra una máquina, esto la elimina.
export const remove = asyncHandler(async (req, res) => { await machineService.remove(req.params.id); res.status(204).end(); });
