import * as machineService from '../services/machineService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const list = asyncHandler(async (req, res) => { res.json(await machineService.list(req.query.client_id)); });
export const getById = asyncHandler(async (req, res) => { res.json(await machineService.getById(req.params.id)); });
export const create = asyncHandler(async (req, res) => { res.status(201).json(await machineService.create(req.body)); });
export const update = asyncHandler(async (req, res) => { res.json(await machineService.update(req.params.id, req.body)); });
export const remove = asyncHandler(async (req, res) => { await machineService.remove(req.params.id); res.status(204).end(); });
