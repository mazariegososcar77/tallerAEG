import * as maintenanceService from '../services/maintenanceService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const list = asyncHandler(async (req, res) => { res.json(await maintenanceService.list(req.query.client_id)); });
export const getById = asyncHandler(async (req, res) => { res.json(await maintenanceService.getById(req.params.id)); });
export const create = asyncHandler(async (req, res) => { res.status(201).json(await maintenanceService.create(req.body)); });
export const update = asyncHandler(async (req, res) => { res.json(await maintenanceService.update(req.params.id, req.body)); });
export const remove = asyncHandler(async (req, res) => { await maintenanceService.remove(req.params.id); res.status(204).end(); });
export const upcoming = asyncHandler(async (req, res) => { res.json(await maintenanceService.getUpcoming(req.query.days || 30)); });
